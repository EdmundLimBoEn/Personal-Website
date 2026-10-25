/**
 * Photo import pipeline.
 *
 * Reads curated originals from photos-src/<Album Name>/*.{jpg,jpeg,png,webp},
 * writes optimized WebPs to public/photos/<album-slug>/ and a manifest to
 * content/photos.json. The site renders exclusively from the manifest.
 *
 * Privacy guarantees:
 *  - Output images carry NO metadata (sharp strips EXIF/GPS by default).
 *  - GPS is never read into the manifest; only camera/exposure fields are.
 *  - Folders named like "close ups" are refused outright.
 *
 * Usage: bun run photos
 */
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import exifr from "exifr";
import { withPhotoLock } from "./photo-lock";
import { hasPhotoTransaction, publishPhotos } from "./photo-publication";
import { formatPhotoError } from "./photo-diagnostics";

const ROOT = path.join(import.meta.dirname, "..");

const MAX_EDGE = 2560;
const QUALITY = 85;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

// Folders that must never be published, however they're spelled.
const DENYLIST = /^close-?ups?$/;

type Photo = {
  src: string;
  width: number;
  height: number;
  blurDataURL: string;
  exif?: string;
};

type Album = { slug: string; title: string; year?: string; photos: Photo[] };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatShutter(t?: number): string | undefined {
  if (!t) return undefined;
  return t >= 1 ? `${t}s` : `1/${Math.round(1 / t)}`;
}

async function readExif(file: string): Promise<{ line?: string; year?: string }> {
  try {
    // Pick only the fields we display — GPS is never parsed.
    const tags = await exifr.parse(file, {
      pick: ["Model", "FNumber", "ExposureTime", "ISO", "FocalLength", "DateTimeOriginal"],
      gps: false,
    });
    if (!tags) return {};
    const parts = [
      tags.Model,
      tags.FocalLength ? `${Math.round(tags.FocalLength)}mm` : undefined,
      tags.FNumber ? `f/${tags.FNumber}` : undefined,
      formatShutter(tags.ExposureTime),
      tags.ISO ? `ISO ${tags.ISO}` : undefined,
    ].filter(Boolean);
    const year =
      tags.DateTimeOriginal instanceof Date
        ? String(tags.DateTimeOriginal.getFullYear())
        : undefined;
    return { line: parts.length ? parts.join(" · ") : undefined, year };
  } catch {
    return {};
  }
}

async function processPhoto(srcFile: string, outDir: string, slug: string, outName: string): Promise<Photo> {
  const outFile = path.join(outDir, outName);

  // .rotate() bakes in EXIF orientation; no .withMetadata() => all metadata stripped.
  const image = sharp(srcFile).rotate();
  const { data, info } = await image
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer({ resolveWithObject: true });
  await writeFile(outFile, data);

  const blur = await sharp(data)
    .resize({ width: 24, fit: "inside" })
    .webp({ quality: 30 })
    .toBuffer();

  const { line } = await readExif(srcFile);

  return {
    src: `/photos/${slug}/${outName}`,
    width: info.width,
    height: info.height,
    blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
    exif: line,
  };
}

// Resolve and validate the complete plan before creating any output.
async function planImport(root: string) {
  const source = path.join(root, "photos-src");
  const output = path.join(root, "public", "photos");
  const entries = (await readdir(source, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name).sort((a, b) => a.localeCompare(b));
  const slugs = new Set<string>();
  const plan = [];
  for (const title of entries) {
    const slug = slugify(title);
    if (DENYLIST.test(slug)) {
      console.warn(`✗ REFUSED "${title}" — this folder is on the denylist.`);
      continue;
    }
    const relative = path.relative(output, path.resolve(output, slug));
    if (!slug || !relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Invalid album slug: ${title}`);
    }
    if (slugs.has(slug)) throw new Error(`Duplicate album slug: ${slug}`);
    slugs.add(slug);
    const names = new Set<string>();
    const files = (await readdir(path.join(source, title)))
      .filter((f) => IMAGE_EXT.test(f) && !f.startsWith("."))
      .sort((a, b) => a.localeCompare(b)).map((file) => {
        const base = slugify(file.replace(IMAGE_EXT, ""));
        if (!base) throw new Error(`Invalid image slug: ${title}/${file}`);
        const outName = `${base}.webp`;
        if (names.has(outName)) throw new Error(`Duplicate image filename: ${title}/${outName}`);
        names.add(outName);
        return { source: path.join(source, title, file), outName };
      });
    plan.push({ title, slug, files });
  }
  return plan;
}

export async function importPhotos(root = ROOT, clear = false) {
  await withPhotoLock(root, async () => {
    // A missing source is an error. Only the explicit clear operation bypasses it.
    const plan = clear ? [] : await planImport(root);
    const stage = await mkdtemp(path.join(root, ".photos-stage-"));
    const stagedPhotos = path.join(stage, "photos");
    const output = path.join(root, "public", "photos");
    const manifest = path.join(root, "content", "photos.json");
    try {
      await mkdir(stagedPhotos);
      const albums: Album[] = [];
      for (const { title, slug, files } of plan) {
        if (!files.length) continue;
        const outDir = path.join(stagedPhotos, slug);
        await mkdir(outDir);
        const photos: Photo[] = [];
        let year: string | undefined;
        for (const file of files) {
          const photo = await processPhoto(file.source, outDir, slug, file.outName);
          if (!year) year = (await readExif(file.source)).year;
          photos.push(photo);
        }
        albums.push({ slug, title, year, photos });
      }
      // Every manifest reference must resolve to a nonempty generated file.
      for (const album of albums) {
        for (const photo of album.photos) {
          const file = await stat(path.join(stage, photo.src.slice(1)));
          if (!file.isFile() || !file.size) throw new Error(`Missing generated image: ${photo.src}`);
        }
      }
      const stagedManifest = path.join(stage, "photos.json");
      await writeFile(stagedManifest, JSON.stringify({ albums }, null, 2) + "\n");
      await mkdir(path.dirname(output), { recursive: true });
      await mkdir(path.dirname(manifest), { recursive: true });
      await publishPhotos(root, stage);
      console.log(`Manifest written: ${albums.length} album(s).`);
    } finally {
      if (!hasPhotoTransaction(root)) await rm(stage, { recursive: true, force: true });
    }
  });
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(import.meta.filename)) {
  importPhotos(ROOT, process.argv.includes("--clear")).catch((error) => {
    console.error(`Photo import failed: ${formatPhotoError(error)}`);
    process.exitCode = 1;
  });
}

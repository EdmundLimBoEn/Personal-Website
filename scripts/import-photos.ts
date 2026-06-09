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
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import exifr from "exifr";

const ROOT = path.join(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "photos-src");
const OUT_DIR = path.join(ROOT, "public", "photos");
const MANIFEST = path.join(ROOT, "content", "photos.json");

const MAX_EDGE = 2560;
const QUALITY = 85;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

// Folders that must never be published, however they're spelled.
const DENYLIST = /^close[\s_-]*ups?$/i;

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

async function processPhoto(srcFile: string, outDir: string, slug: string): Promise<Photo> {
  const base = path.basename(srcFile).replace(IMAGE_EXT, "");
  const outName = `${slugify(base)}.webp`;
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

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.log(`No ${path.relative(ROOT, SRC_DIR)}/ directory — writing empty manifest.`);
    await writeFile(MANIFEST, JSON.stringify({ albums: [] }, null, 2) + "\n");
    return;
  }

  const entries = (await readdir(SRC_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  const albums: Album[] = [];

  for (const dirName of entries) {
    if (DENYLIST.test(dirName.trim())) {
      console.warn(`✗ REFUSED "${dirName}" — this folder is on the denylist and will not be published.`);
      continue;
    }
    const slug = slugify(dirName);
    const albumSrc = path.join(SRC_DIR, dirName);
    const outDir = path.join(OUT_DIR, slug);
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });

    const files = (await readdir(albumSrc))
      .filter((f) => IMAGE_EXT.test(f) && !f.startsWith("."))
      .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) continue;

    const photos: Photo[] = [];
    let year: string | undefined;
    for (const f of files) {
      const srcFile = path.join(albumSrc, f);
      try {
        const photo = await processPhoto(srcFile, outDir, slug);
        if (!year) year = (await readExif(srcFile)).year;
        photos.push(photo);
        console.log(`  ✓ ${dirName}/${f} → ${photo.width}×${photo.height}`);
      } catch (err) {
        console.error(`  ✗ ${dirName}/${f}: ${err}`);
      }
    }
    if (photos.length > 0) albums.push({ slug, title: dirName, year, photos });
  }

  // Remove output dirs for albums that no longer exist in photos-src/.
  if (existsSync(OUT_DIR)) {
    const keep = new Set(albums.map((a) => a.slug));
    for (const e of await readdir(OUT_DIR, { withFileTypes: true })) {
      if (e.isDirectory() && !keep.has(e.name)) {
        await rm(path.join(OUT_DIR, e.name), { recursive: true, force: true });
        console.log(`  – removed stale album output: ${e.name}`);
      }
    }
  }

  await writeFile(MANIFEST, JSON.stringify({ albums }, null, 2) + "\n");
  const total = albums.reduce((n, a) => n + a.photos.length, 0);
  console.log(`\nManifest written: ${albums.length} album(s), ${total} photo(s).`);
}

main();

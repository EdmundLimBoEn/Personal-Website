import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, cp, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { importPhotos } from "./import-photos";
import { withPhotoLock } from "./photo-lock";

async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), "photo-import-test-"));
  try {
    await mkdir(path.join(root, "public/photos/previous"), { recursive: true });
    await mkdir(path.join(root, "content"));
    await writeFile(path.join(root, "public/photos/previous/old.webp"), "previous image");
    await writeFile(path.join(root, "content/photos.json"), '{"albums":["previous"]}\n');
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
async function originals(root: string, names: string[], valid = false) {
  const data = valid
    ? await sharp({ create: { width: 8, height: 6, channels: 3, background: "#123456" } }).png().toBuffer()
    : Buffer.from("damaged image");
  for (const name of names) {
    const file = path.join(root, "photos-src", name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }
}
async function unchanged(root: string) {
  assert.equal(await readFile(path.join(root, "content/photos.json"), "utf8"), '{"albums":["previous"]}\n');
  assert.equal(await readFile(path.join(root, "public/photos/previous/old.webp"), "utf8"), "previous image");
  assert.deepEqual(await readdir(path.join(root, "public/photos")), ["previous"]);
  assert.equal((await readdir(root)).some((name) => name.startsWith(".photos")), false);
}

for (const [label, files, error] of [
  ["empty album slug", ["旅行/a.png"], /Invalid album slug/],
  ["colliding albums", ["A B/a.png", "A-B/b.png"], /Duplicate album slug/],
  ["empty image slug", ["Album/旅行.png"], /Invalid image slug/],
  ["colliding image extensions", ["Album/photo.jpg", "Album/photo.png"], /Duplicate image filename/],
  ["colliding image punctuation", ["Album/A B.png", "Album/A-B.png"], /Duplicate image filename/],
] as const) {
  test(label + " rejects before decoding and preserves publication", () => fixture(async (root) => {
    await originals(root, [...files]);
    await assert.rejects(importPhotos(root), error);
    await unchanged(root);
  }));
}

for (const title of ["Close Ups", "Close.Ups", "Close–Ups", "Close_Up", "CloseUps"]) {
  test(`privacy denylist refuses ${title} while publishing allowed albums`, () => fixture(async (root) => {
    await originals(root, [`${title}/private.png`, "Landscapes/public.png"], true);
    await importPhotos(root);
    const manifest = JSON.parse(await readFile(path.join(root, "content/photos.json"), "utf8"));
    assert.deepEqual(manifest.albums.map((album: { slug: string }) => album.slug), ["landscapes"]);
    assert.deepEqual(await readdir(path.join(root, "public/photos")), ["landscapes"]);
  }));
}

test("missing originals preserve the catalogue and images", () => fixture(async (root) => {
  await assert.rejects(importPhotos(root), /ENOENT/);
  await unchanged(root);
}));

test("a failed conversion after a valid image leaves all published output intact", () => fixture(async (root) => {
  await originals(root, ["Album/a.png"], true);
  await originals(root, ["Album/z.png"]);
  await assert.rejects(importPhotos(root));
  await unchanged(root);
}));

test("successful import publishes valid references and removes stale images", () => fixture(async (root) => {
  await originals(root, ["New Album/First.png", "New Album/Second.png"], true);
  await importPhotos(root);
  const manifest = JSON.parse(await readFile(path.join(root, "content/photos.json"), "utf8"));
  assert.equal(manifest.albums[0].slug, "new-album");
  assert.equal(manifest.albums[0].photos.length, 2);
  for (const photo of manifest.albums[0].photos) {
    const metadata = await sharp(path.join(root, "public", photo.src)).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, photo.width);
    assert.equal(metadata.height, photo.height);
  }
  assert.deepEqual(await readdir(path.join(root, "public/photos")), ["new-album"]);
}));

test("manifest publication failure rolls back the image replacement", () => fixture(async (root) => {
  await originals(root, ["Album/a.png"], true);
  await rm(path.join(root, "content/photos.json"));
  await mkdir(path.join(root, "content/photos.json"));
  await assert.rejects(importPhotos(root));
  assert.equal(await readFile(path.join(root, "public/photos/previous/old.webp"), "utf8"), "previous image");
  assert.deepEqual(await readdir(path.join(root, "public/photos")), ["previous"]);
}));

test("shared lock excludes concurrent imports and is released on failure", () => fixture(async (root) => {
  await withPhotoLock(root, async () => {
    await assert.rejects(importPhotos(root), /already locked/);
    await assert.rejects(withPhotoLock(root, async () => assert.fail("build must not start")), /already locked/);
  });
  await assert.rejects(withPhotoLock(root, async () => { throw new Error("failure"); }), /failure/);
  await unchanged(root);
}));

test("explicit clear removes both catalogue and published assets without originals", () => fixture(async (root) => {
  await importPhotos(root, true);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, "content/photos.json"), "utf8")), { albums: [] });
  assert.deepEqual(await readdir(path.join(root, "public/photos")), []);
}));

test("CLI failures exit nonzero and preserve previous output", () => fixture(async (root) => {
  await cp(path.join(import.meta.dirname, "import-photos.ts"), path.join(root, "scripts/import-photos.ts"), { recursive: true });
  await cp(path.join(import.meta.dirname, "photo-lock.ts"), path.join(root, "scripts/photo-lock.ts"));
  await symlink(path.resolve(import.meta.dirname, "../node_modules"), path.join(root, "node_modules"));
  for (const corrupt of [false, true]) {
    if (corrupt) await originals(root, ["Album/broken.png"]);
    const result = spawnSync(process.execPath, [path.join(root, "scripts/import-photos.ts")], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Photo import failed/);
    assert.doesNotMatch(result.stdout, /Manifest written/);
    await unchanged(root);
  }
}));

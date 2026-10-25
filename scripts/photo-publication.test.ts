import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { publishPhotos, recoverPhotoPublication } from "./photo-publication";
import { recoverPhotos } from "./recover-photos";
import { importPhotos } from "./import-photos";
import { build } from "./build";

async function fixture(run: (root: string, stage: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(tmpdir(), "photo-recovery-"));
  const stage = path.join(root, ".photos-stage-test");
  try {
    await fs.mkdir(path.join(root, "public/photos"), { recursive: true });
    await fs.mkdir(path.join(root, "content"));
    await fs.mkdir(path.join(stage, "photos"), { recursive: true });
    await fs.writeFile(path.join(root, "public/photos/old.webp"), "old");
    await fs.writeFile(path.join(root, "content/photos.json"), "old");
    await fs.writeFile(path.join(stage, "photos/new.webp"), "new");
    await fs.writeFile(path.join(stage, "photos.json"), "new");
    await run(root, stage);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
async function matching(root: string, version: string) {
  assert.equal(await fs.readFile(path.join(root, "content/photos.json"), "utf8"), version);
  assert.deepEqual(await fs.readdir(path.join(root, "public/photos")), [`${version}.webp`]);
  assert.equal(await fs.readFile(path.join(root, `public/photos/${version}.webp`), "utf8"), version);
}
async function crash(root: string, stage: string, checkpoint: number) {
  const script = path.join(root, "crash.ts");
  await fs.writeFile(script, `
    import * as fs from 'node:fs/promises';
    import { publishPhotos } from ${JSON.stringify(path.join(import.meta.dirname, "photo-publication.ts"))};
    await fs.mkdir(${JSON.stringify(path.join(root, ".photos.lock"))});
    let count = 0;
    await publishPhotos(${JSON.stringify(root)}, ${JSON.stringify(stage)}, {
      rm: fs.rm,
      rename: async (...args) => {
        await fs.rename(...args);
        if (++count === ${checkpoint}) process.kill(process.pid, 'SIGKILL');
      }
    });
  `);
  const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(result.signal, "SIGKILL", result.stderr);
}
for (const checkpoint of [1, 2, 3, 4]) {
  test(`SIGKILL after publication rename ${checkpoint} recovers before clearing stale lock`, () => fixture(async (root, stage) => {
    await crash(root, stage, checkpoint);
    await assert.rejects(importPhotos(root, true), /already locked/);
    await assert.rejects(build(root), /already locked/);
    await recoverPhotos(root, true);
    await matching(root, checkpoint === 4 ? "new" : "old");
    await recoverPhotos(root);
    assert.equal((await fs.readdir(root)).some((name) => name.startsWith(".photos")), false);
  }));
}

test("failed rollback retains state and next import recovers before source validation", () => fixture(async (root, stage) => {
  await assert.rejects(publishPhotos(root, stage, {
    rename: async (from, to) => {
      if (String(from).endsWith("/photos.json")) throw new Error("manifest failure");
      return fs.rename(from, to);
    },
    rm: async () => { throw new Error("rollback failure"); },
  }), /recovery failed/);
  await assert.rejects(importPhotos(root), /ENOENT/);
  await matching(root, "old");
}));

test("recovery interrupted after restoring backup can safely repeat", () => fixture(async (root, stage) => {
  await crash(root, stage, 3);
  await assert.rejects(recoverPhotoPublication(root, {
    rm: fs.rm,
    rename: async (from, to) => { await fs.rename(from, to); throw new Error("interrupted"); },
  }), /interrupted/);
  await recoverPhotos(root, true);
  await matching(root, "old");
}));

test("committed publication resolves with a cleanup warning and can retry partial cleanup", () => fixture(async (root, stage) => {
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    await publishPhotos(root, stage, {
      rename: fs.rename,
      rm: async (target, options) => {
        if (target === stage) {
          await fs.rm(path.join(stage, "previous-photos"), { recursive: true, force: true });
          throw new Error("cleanup failure");
        }
        return fs.rm(target, options);
      },
    });
  } finally { console.warn = warn; }
  assert.match(warnings.join("\n"), /publication succeeded; cleanup pending/);
  assert.ok(warnings[0].includes(stage));
  await matching(root, "new");
  await recoverPhotos(root);
  await matching(root, "new");
  assert.equal((await fs.readdir(root)).some((name) => name.startsWith(".photos")), false);
}));

test("build recovers before spawning its child and propagates child exit status", () => fixture(async (root, stage) => {
  await crash(root, stage, 2);
  // Simulate an ordinary exception releasing the lock with recovery still pending.
  await fs.rmdir(path.join(root, ".photos.lock"));
  const next = path.join(root, "node_modules/next/dist/bin");
  await fs.mkdir(next, { recursive: true });
  await fs.writeFile(path.join(next, "next"), `
    const fs = require('node:fs');
    if (!fs.existsSync('.photos.lock')) process.exit(2);
    if (fs.readFileSync('content/photos.json', 'utf8') !== 'old') process.exit(3);
    if (fs.readFileSync('public/photos/old.webp', 'utf8') !== 'old') process.exit(4);
    process.exit(7);
  `);
  assert.equal(await build(root), 7);
  await matching(root, "old");
  assert.equal((await fs.readdir(root)).includes(".photos.lock"), false);
}));

test("interrupted first publication restores an absent image tree", () => fixture(async (root, stage) => {
  await fs.rm(path.join(root, "public/photos"), { recursive: true });
  // With no backup rename, checkpoint two is installation of the new tree.
  await crash(root, stage, 2);
  await recoverPhotos(root, true);
  await assert.rejects(fs.stat(path.join(root, "public/photos")), { code: "ENOENT" });
  assert.equal(await fs.readFile(path.join(root, "content/photos.json"), "utf8"), "old");
}));

test("identical manifest bytes still distinguish a committed image replacement", () => fixture(async (root, stage) => {
  await fs.writeFile(path.join(stage, "photos.json"), "old");
  await crash(root, stage, 4);
  await recoverPhotos(root, true);
  assert.equal(await fs.readFile(path.join(root, "content/photos.json"), "utf8"), "old");
  assert.deepEqual(await fs.readdir(path.join(root, "public/photos")), ["new.webp"]);
}));

test("invalid recovery state blocks build and stale-lock removal", () => fixture(async (root) => {
  await fs.writeFile(path.join(root, ".photos-transaction.json"), "{}");
  await assert.rejects(build(root), /Invalid photo transaction/);
  await fs.mkdir(path.join(root, ".photos.lock"));
  await assert.rejects(recoverPhotos(root, true), /Invalid photo transaction/);
  assert.ok((await fs.stat(path.join(root, ".photos.lock"))).isDirectory());
  await matching(root, "old");
}));

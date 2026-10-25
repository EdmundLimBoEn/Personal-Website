import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { importPhotos } from "./import-photos";

async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), "photo-build-test-"));
  try {
    await mkdir(path.join(root, "scripts"));
    await mkdir(path.join(root, "node_modules/next/dist/bin"), { recursive: true });
    await cp(path.resolve(import.meta.dirname, "../package.json"), path.join(root, "package.json"));
    for (const name of ["build.ts", "photo-lock.ts", "photo-publication.ts"]) {
      await cp(path.join(import.meta.dirname, name), path.join(root, "scripts", name));
    }
    // Stand in for Next only; exercise the actual package build command and wrapper.
    await writeFile(path.join(root, "node_modules/next/dist/bin/next"), `#!${process.execPath}
const fs = require("node:fs");
fs.writeFileSync("build-started", JSON.stringify(process.argv.slice(2)));
if (process.argv.includes("--hold")) {
  console.log("build ready");
  const deadline = Date.now() + 10000;
  setInterval(() => {
    if (fs.existsSync("build-finish")) process.exit(0);
    if (Date.now() > deadline) process.exit(99);
  }, 10);
} else if (process.argv.includes("--signal")) {
  process.kill(process.pid, "SIGTERM");
} else {
  process.exit(Number(process.argv.at(-1)));
}
`, { mode: 0o755 });
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function build(root: string, ...args: string[]) {
  return spawnSync(process.execPath, ["run", "build", ...args], {
    cwd: root, encoding: "utf8", timeout: 10000,
  });
}

test("package build cannot start while an actual import holds the photo lock", () => fixture(async (root) => {
  let checked = false;
  const log = console.log;
  // The importer reports publication before releasing its lock. Run the build
  // synchronously here so the real import remains in progress throughout it.
  console.log = (...args) => {
    if (!String(args[0]).startsWith("Manifest written:")) return;
    assert.equal(existsSync(path.join(root, ".photos.lock")), true);
    const result = build(root, "0");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /already locked/);
    assert.equal(existsSync(path.join(root, "build-started")), false);
    assert.equal(existsSync(path.join(root, ".photos.lock")), true);
    checked = true;
  };
  try {
    await importPhotos(root, true);
  } finally {
    console.log = log;
  }
  assert.equal(checked, true);
  assert.equal(build(root, "0").status, 0);
  assert.equal(existsSync(path.join(root, ".photos.lock")), false);
}));

test("package build holds the lock until the child exits, excluding imports", () => fixture(async (root) => {
  const child = spawn(process.execPath, ["run", "build", "--hold"], { cwd: root, stdio: "pipe" });
  const closed = once(child, "close");
  try {
    // File readiness also works when Bun buffers inherited child stdout.
    const deadline = Date.now() + 3000;
    while (!existsSync(path.join(root, "build-started"))) {
      assert.equal(child.exitCode, null, "Build exited before ready");
      assert.ok(Date.now() < deadline, "Build did not become ready");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await assert.rejects(importPhotos(root, true), /already locked/);
  } finally {
    await writeFile(path.join(root, "build-finish"), "");
    assert.deepEqual(await closed, [0, null]);
  }
  assert.equal(existsSync(path.join(root, ".photos.lock")), false);
  await importPhotos(root, true);
}));

for (const [arg, status] of [["0", 0], ["23", 23], ["--signal", 143]] as const) {
  test(`package build propagates child status ${status} and releases the lock`, () => fixture(async (root) => {
    const result = build(root, arg);
    assert.equal(result.status, status);
    assert.deepEqual(JSON.parse(await readFile(path.join(root, "build-started"), "utf8")), ["build", arg]);
    assert.equal(existsSync(path.join(root, ".photos.lock")), false);
  }));
}

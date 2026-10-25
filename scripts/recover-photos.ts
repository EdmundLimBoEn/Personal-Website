import { mkdir, rmdir } from "node:fs/promises";
import path from "node:path";
import { recoverPhotoPublication } from "./photo-publication";
import { withPhotoLock } from "./photo-lock";

export async function recoverPhotos(root: string, staleLock = false) {
  if (!staleLock) return withPhotoLock(root, async () => {});
  // Explicit operator assertion: no import/build/recovery process is running.
  const lock = path.join(root, ".photos.lock");
  await mkdir(lock).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
  });
  if (await recoverPhotoPublication(root) === false) throw new Error("Publication succeeded; cleanup pending. Lock retained; retry recovery.");
  await rmdir(lock);
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(import.meta.filename)) {
  recoverPhotos(path.join(import.meta.dirname, ".."), process.argv.includes("--stale-lock"))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}

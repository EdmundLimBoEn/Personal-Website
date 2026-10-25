import { mkdir, rmdir } from "node:fs/promises";
import { recoverPhotoPublication } from "./photo-publication";
import path from "node:path";

// Shared by imports and the production build, held for the entire operation.
export async function withPhotoLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  const lock = path.join(root, ".photos.lock");
  try {
    await mkdir(lock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("Photo import/build already locked. If a process crashed, confirm no import/build is running, then run bun run photos:recover --stale-lock; do not delete the lock or staging files.");
    }
    throw error;
  }
  try {
    if (await recoverPhotoPublication(root) === false) {
      throw new Error("Previous photo publication succeeded, but cleanup is still pending; retry bun run photos:recover before importing/building.");
    }
    return await action();
  } finally {
    await rmdir(lock);
  }
}

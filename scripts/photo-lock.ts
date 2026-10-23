import { mkdir, rmdir } from "node:fs/promises";
import path from "node:path";

// Shared by imports and the production build, held for the entire operation.
export async function withPhotoLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  const lock = path.join(root, ".photos.lock");
  try {
    await mkdir(lock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("Photo import/build already locked. If a process crashed, remove .photos.lock only after confirming no import or build is running.");
    }
    throw error;
  }
  try {
    return await action();
  } finally {
    await rmdir(lock);
  }
}

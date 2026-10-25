import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { formatPhotoError } from "./photo-diagnostics";

type IO = Pick<typeof fs, "rename" | "rm">;
const journalName = ".photos-transaction.json";

// Call only while holding the photo lock. The staged manifest's rename is the
// commit point: its absence means the new catalogue and images are published.
export async function recoverPhotoPublication(root: string, io: IO = fs) {
  const journal = path.join(root, journalName);
  if (!existsSync(journal)) return;
  const transaction = JSON.parse(await fs.readFile(journal, "utf8"));
  if (!/^\.photos-stage-[\w-]+$/.test(transaction.stage) || typeof transaction.hadOutput !== "boolean") {
    throw new Error("Invalid photo transaction; retain the journal and staging directory for manual recovery.");
  }
  const stage = path.join(root, transaction.stage);
  const output = path.join(root, "public/photos");
  const backup = path.join(stage, "previous-photos");
  const committed = !existsSync(path.join(stage, "photos.json"));
  if (!committed) {
    if (existsSync(backup)) {
      await io.rm(output, { recursive: true, force: true });
      await io.rename(backup, output);
    } else if (!transaction.hadOutput) {
      await io.rm(output, { recursive: true, force: true });
    }
    // Removing the journal first makes rollback cleanup restartable too.
    await io.rm(journal);
  }
  try {
    await io.rm(stage, { recursive: true, force: true });
    if (committed) await io.rm(journal);
  } catch (error) {
    if (!committed) throw new Error(`Photo rollback succeeded; staging cleanup failed at ${stage}`, { cause: error });
    console.warn(formatPhotoError(new Error(`Photo publication succeeded; cleanup pending at ${stage}. Run bun run photos:recover to retry.`, { cause: error })));
    return false;
  }
  return true;
}

export async function publishPhotos(root: string, stage: string, io: IO = fs) {
  const output = path.join(root, "public/photos");
  const journal = path.join(root, journalName);
  const temporary = path.join(stage, "transaction.json");
  await fs.writeFile(temporary, JSON.stringify({ stage: path.basename(stage), hadOutput: existsSync(output) }));
  await io.rename(temporary, journal);
  try {
    if (existsSync(output)) await io.rename(output, path.join(stage, "previous-photos"));
    await io.rename(path.join(stage, "photos"), output);
    await io.rename(path.join(stage, "photos.json"), path.join(root, "content/photos.json"));
  } catch (error) {
    try {
      await recoverPhotoPublication(root, io);
    } catch (recoveryError) {
      throw new AggregateError([error, recoveryError], `Photo recovery failed; retain ${journal} and ${stage} and run bun run photos:recover.`);
    }
    throw error;
  }
  await recoverPhotoPublication(root, io);
}

export function hasPhotoTransaction(root: string) {
  return existsSync(path.join(root, journalName));
}

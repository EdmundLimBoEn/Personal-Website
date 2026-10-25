import { spawn } from "node:child_process";
import { constants } from "node:os";
import path from "node:path";
import { withPhotoLock } from "./photo-lock";

const root = path.resolve(import.meta.dirname, "..");

withPhotoLock(root, () => new Promise<number>((resolve, reject) => {
  const child = spawn("next", ["build", ...process.argv.slice(2)], {
    cwd: root,
    stdio: "inherit",
  });
  child.once("error", reject);
  child.once("close", (code, signal) => {
    resolve(code ?? (signal ? 128 + constants.signals[signal] : 1));
  });
})).then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
});

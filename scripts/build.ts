import { spawn } from "node:child_process";
import path from "node:path";
import { withPhotoLock } from "./photo-lock";

export async function build(root: string, args: string[] = []) {
  return withPhotoLock(root, () => new Promise<number>((resolve, reject) => {
    const child = spawn("node", [path.join(root, "node_modules/next/dist/bin/next"), "build", ...args], { cwd: root, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  }));
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(import.meta.filename)) {
  build(path.join(import.meta.dirname, ".."), process.argv.slice(2))
    .then((code) => { process.exitCode = code; })
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}

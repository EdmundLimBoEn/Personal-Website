import { spawn, type ChildProcess } from "node:child_process";
import { constants } from "node:os";
import path from "node:path";
import { withPhotoLock } from "./photo-lock";
import { formatPhotoError } from "./photo-diagnostics";

export async function build(root: string, args: string[] = []) {
  let child: ChildProcess | undefined;
  let cancellation: NodeJS.Signals | undefined;
  const signals = ["SIGINT", "SIGTERM", "SIGHUP"] as const;
  const handlers = signals.map((signal) => {
    const handler = () => {
      cancellation ??= signal;
      child?.kill(signal);
    };
    process.on(signal, handler);
    return handler;
  });
  try {
    const code = await withPhotoLock(root, () => {
      // Cancellation during lock acquisition/recovery must not start a build.
      if (cancellation) return Promise.resolve(128 + constants.signals[cancellation]);
      return new Promise<number>((resolve, reject) => {
        child = spawn("node", [path.join(root, "node_modules/next/dist/bin/next"), "build", ...args], { cwd: root, stdio: "inherit" });
        let childError: Error | undefined;
        child.once("error", (error) => { childError = error; });
        child.once("close", (code, signal) => {
          child = undefined;
          if (childError) reject(childError);
          else resolve(code ?? (signal ? 128 + constants.signals[signal] : 1));
        });
      });
    });
    return cancellation ? 128 + constants.signals[cancellation] : code;
  } finally {
    // Keep handlers installed until both the child and lock cleanup finish.
    signals.forEach((signal, index) => process.off(signal, handlers[index]));
  }
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(import.meta.filename)) {
  build(path.join(import.meta.dirname, ".."), process.argv.slice(2))
    .then((code) => { process.exitCode = code; })
    .catch((error) => { console.error(`Build failed: ${formatPhotoError(error)}`); process.exitCode = 1; });
}

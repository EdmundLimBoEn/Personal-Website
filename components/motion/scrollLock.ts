import type Lenis from "lenis";

let lenis: Lenis | null = null;
let locks = 0;
let resume = false;

function stop() {
  if (!lenis) return;
  resume = !lenis.isStopped;
  lenis.stop();
}

/** Register the layout's instance, including one recreated after a motion change. */
export function registerSmoothScroll(instance: Lenis) {
  lenis = instance;
  if (locks > 0) stop();
  return () => {
    lenis = null;
    resume = false;
  };
}

/** Restore only a running instance that this lock stopped. */
export function lockSmoothScroll() {
  if (locks++ === 0) stop();
  return () => {
    if (--locks === 0) {
      if (resume) lenis?.start();
      resume = false;
    }
  };
}

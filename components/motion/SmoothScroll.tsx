"use client";

import { useMotionOK } from "./useMotionOK";
import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { registerSmoothScroll } from "./scrollLock";

export default function SmoothScroll() {
  const ok = useMotionOK();
  useEffect(() => {
    if (!ok) return;
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      lerp: 0.22,
      wheelMultiplier: 1.25,
    });
    const unregister = registerSmoothScroll(lenis);
    return () => {
      unregister();
      lenis.destroy();
    };
  }, [ok]);
  return null;
}

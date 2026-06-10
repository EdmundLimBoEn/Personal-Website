"use client";

import { useEffect, useRef } from "react";
import { useMotionMode } from "./MotionMode";

/**
 * Splits text into per-letter spans that idle-bob in zero-G and get
 * repelled by the pointer, springing back home. Decorative — callers keep
 * the accessible text via aria-label on the parent heading.
 */
export default function FloatingLetters({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const { full } = useMotionMode();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !full) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(pointer: fine)").matches
    )
      return;

    const letters = Array.from(root.children) as HTMLElement[];
    const n = letters.length;
    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const vx = new Float32Array(n);
    const vy = new Float32Array(n);
    let px = -9999;
    let py = -9999;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
    };

    const RADIUS = 170;
    const loop = (t: number) => {
      for (let i = 0; i < n; i++) {
        const r = letters[i].getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // home target = gentle idle bob
        let txp = Math.sin(t * 0.0011 + i * 1.7) * 2.5;
        let typ = Math.cos(t * 0.0009 + i * 2.3) * 3.5;
        // pointer repulsion
        const dx = cx - px;
        const dy = cy - py;
        const d = Math.hypot(dx, dy);
        if (d < RADIUS && d > 0.01) {
          const f = ((RADIUS - d) / RADIUS) * 34;
          txp += (dx / d) * f;
          typ += (dy / d) * f;
        }
        // critically-damped-ish spring toward target
        vx[i] += (txp - x[i]) * 0.045;
        vy[i] += (typ - y[i]) * 0.045;
        vx[i] *= 0.86;
        vy[i] *= 0.86;
        x[i] += vx[i];
        y[i] += vy[i];
        letters[i].style.transform = `translate3d(${x[i].toFixed(2)}px, ${y[i].toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      for (const l of letters) l.style.transform = "";
    };
  }, [full]);

  return (
    <span ref={ref} className={className} aria-hidden="true">
      {text.split("").map((ch, i) => (
        <span key={i} className="inline-block will-change-transform">
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

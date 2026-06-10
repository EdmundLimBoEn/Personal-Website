"use client";

import { useEffect, useRef } from "react";
import { useMotionMode } from "./MotionMode";

/** Pulls its child toward the pointer while hovered; springs back on leave. */
export default function Magnetic({
  children,
  strength = 0.3,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const { full } = useMotionMode();
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = outer.current;
    const target = inner.current;
    if (!el || !target || !full) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(pointer: fine)").matches
    )
      return;

    let tx = 0,
      ty = 0,
      x = 0,
      y = 0;
    let raf = 0;
    let running = false;

    const loop = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      target.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      if (Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05 && tx === 0 && ty === 0) {
        target.style.transform = "";
        running = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      target.style.transform = "";
    };
  }, [strength, full]);

  return (
    <span ref={outer} className={`inline-block ${className}`}>
      <span ref={inner} className="inline-block will-change-transform">
        {children}
      </span>
    </span>
  );
}

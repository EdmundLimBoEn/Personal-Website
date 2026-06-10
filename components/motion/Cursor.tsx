"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_SIZE = 34;
/** Don't snap brackets onto targets bigger than this (px). */
const MAX_SNAP = 360;

/**
 * Viewfinder cursor: four focus brackets + a center dot that follow the
 * pointer and snap onto interactive targets (links, buttons, [data-cursor]).
 * Desktop only — mounted when (pointer: fine) and motion is allowed.
 */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    setEnabled(true);
    document.body.classList.add("has-custom-cursor");
    return () => document.body.classList.remove("has-custom-cursor");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = frame.current;
    if (!el) return;

    // current and target box: center x/y, width, height
    const cur = { x: innerWidth / 2, y: innerHeight / 2, w: DEFAULT_SIZE, h: DEFAULT_SIZE };
    const tgt = { ...cur };
    let mode = "";
    let visible = false;
    let raf = 0;

    const apply = () => {
      el.style.transform = `translate3d(${cur.x - cur.w / 2}px, ${cur.y - cur.h / 2}px, 0)`;
      el.style.width = `${cur.w}px`;
      el.style.height = `${cur.h}px`;
    };

    const loop = () => {
      cur.x += (tgt.x - cur.x) * 0.5;
      cur.y += (tgt.y - cur.y) * 0.5;
      cur.w += (tgt.w - cur.w) * 0.28;
      cur.h += (tgt.h - cur.h) * 0.28;
      apply();
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      if (!visible) {
        visible = true;
        el.classList.add("on");
        cur.x = e.clientX;
        cur.y = e.clientY;
      }
      const hit = (e.target as Element | null)?.closest?.(
        '[data-cursor], a, button, [role="button"]'
      ) as HTMLElement | null;

      const nextMode = hit ? hit.dataset.cursor || "link" : "";
      if (nextMode !== mode) {
        mode = nextMode;
        el.dataset.mode = mode;
      }

      if (hit) {
        const r = hit.getBoundingClientRect();
        if (r.width <= MAX_SNAP && r.height <= MAX_SNAP) {
          tgt.x = r.left + r.width / 2;
          tgt.y = r.top + r.height / 2;
          tgt.w = r.width + 14;
          tgt.h = r.height + 14;
          return;
        }
        // target too large to frame — follow pointer, slightly expanded
        tgt.x = e.clientX;
        tgt.y = e.clientY;
        tgt.w = tgt.h = DEFAULT_SIZE * 1.6;
        return;
      }
      tgt.x = e.clientX;
      tgt.y = e.clientY;
      tgt.w = tgt.h = DEFAULT_SIZE;
    };

    const onLeave = (e: PointerEvent) => {
      if (!e.relatedTarget) {
        visible = false;
        el.classList.remove("on");
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div ref={frame} className="vf-cursor" aria-hidden="true">
      <span className="vfc tl" />
      <span className="vfc tr" />
      <span className="vfc bl" />
      <span className="vfc br" />
      <span className="vfc-dot" />
      <span className="vfc-label" />
    </div>
  );
}

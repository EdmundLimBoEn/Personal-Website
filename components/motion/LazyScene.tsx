"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useMotionMode } from "./MotionMode";

// Next 16: ssr:false dynamic imports must live in a client component.
const HeroScene = dynamic(() => import("../scenes/HeroScene"), { ssr: false });
const PhotoPile = dynamic(() => import("../scenes/PhotoPile"), { ssr: false });

export type PrintPhoto = {
  src: string;
  width: number;
  height: number;
  album: string;
  title: string;
};

function useMotionOK() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return ok;
}

/** Transparent WebGL layer over the hero; unmounts once scrolled past.
 *  Calm mode: cursor-reactive particles only. Full mode: + HUD chips & brackets. */
export function LazyHeroScene() {
  const ok = useMotionOK();
  const { full } = useMotionMode();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: "20% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
      {ok && visible && <HeroScene full={full} />}
    </div>
  );
}

/** Physics photo-pile section; full-FX mode only, loads when scrolled near. */
export function LazyPhotoPile({ prints }: { prints: PrintPhoto[] }) {
  const ok = useMotionOK();
  const { full } = useMotionMode();
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "150% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (prints.length === 0) return null;
  return <div ref={ref}>{ok && full && near && <PhotoPile prints={prints} />}</div>;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Reveal from "@/components/motion/Reveal";
import type { Photo } from "@/lib/photos";

export default function Gallery({
  photos,
  albumTitle,
}: {
  photos: Photo[];
  albumTitle: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback(
    (dir: 1 | -1) => {
      setOpen((cur) =>
        cur === null ? cur : (cur + dir + photos.length) % photos.length
      );
    },
    [photos.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  return (
    <>
      <div className="masonry">
        {photos.map((photo, i) => (
          <Reveal key={photo.src} delay={(i % 3) * 0.07} className="mb-2 break-inside-avoid">
            <button
              onClick={() => setOpen(i)}
              data-cursor="photo"
              className="group block w-full cursor-zoom-in"
              aria-label={`Open photo ${i + 1} of ${photos.length}`}
            >
              <Image
                src={photo.src}
                alt={`Photograph ${i + 1} from ${albumTitle}`}
                width={photo.width}
                height={photo.height}
                placeholder="blur"
                blurDataURL={photo.blurDataURL}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="w-full transition-opacity duration-300 group-hover:opacity-80"
              />
            </button>
          </Reveal>
        ))}
      </div>

      {open !== null && (
        <div
          className="lightbox-enter fixed inset-0 z-[60] flex flex-col bg-bg"
          role="dialog"
          aria-modal="true"
          aria-label={`${albumTitle} — photo viewer`}
        >
          <div className="flex items-center justify-between px-5 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
            <span>
              {albumTitle} · {String(open + 1).padStart(2, "0")}/
              {String(photos.length).padStart(2, "0")}
            </span>
            <button
              onClick={() => setOpen(null)}
              className="cursor-pointer hover:text-accent transition-colors"
            >
              esc / close ✕
            </button>
          </div>

          <div className="relative flex-1" onClick={() => setOpen(null)}>
            <Image
              src={photos[open].src}
              alt={`Photograph ${open + 1} from ${albumTitle}`}
              fill
              placeholder="blur"
              blurDataURL={photos[open].blurDataURL}
              sizes="100vw"
              className="object-contain px-2"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="flex items-center justify-between px-5 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
            <button
              onClick={() => step(-1)}
              className="cursor-pointer hover:text-accent transition-colors"
            >
              ← prev
            </button>
            <span className="hidden text-faint sm:block">
              {photos[open].exif ?? ""}
            </span>
            <button
              onClick={() => step(1)}
              className="cursor-pointer hover:text-accent transition-colors"
            >
              next →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

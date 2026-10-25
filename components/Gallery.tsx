"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Reveal from "@/components/motion/Reveal";
import { lockSmoothScroll } from "@/components/motion/scrollLock";
import type { Photo } from "@/lib/photos";

export default function Gallery({
  photos,
  albumTitle,
}: {
  photos: Photo[];
  albumTitle: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const isOpen = open !== null;

  const step = useCallback(
    (dir: 1 | -1) => {
      setOpen((cur) =>
        cur === null ? cur : (cur + dir + photos.length) % photos.length
      );
    },
    [photos.length]
  );

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    const unlockSmoothScroll = lockSmoothScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      unlockSmoothScroll();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen, step]);

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
        <dialog
          ref={dialogRef}
          onCancel={() => setOpen(null)}
          className="lightbox-enter fixed inset-0 z-[60] m-0 flex h-dvh max-h-none w-screen max-w-none flex-col border-0 bg-bg p-0 text-ink"
          aria-label={`${albumTitle} · photo viewer`}
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
        </dialog>
      )}
    </>
  );
}

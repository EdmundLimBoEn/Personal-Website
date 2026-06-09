import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAlbums } from "@/lib/photos";

export const metadata: Metadata = {
  title: "Photos",
  description: "Photo albums by Edmund Lim — events, airshows, night skies. Singapore.",
};

export default function PhotosPage() {
  const albums = getAlbums();
  return (
    <div className="px-6 pt-28 pb-20 sm:px-12">
      <h1 className="font-display text-5xl tracking-tight sm:text-7xl">
        Photo<span className="italic font-light">s</span>
      </h1>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-dim">
        {albums.length} album{albums.length === 1 ? "" : "s"} · curated picks only
      </p>

      {albums.length === 0 ? (
        <div className="focus-frame mt-14 flex h-[50vh] items-center justify-center border border-dashed border-line">
          <span className="bracket tl" />
          <span className="bracket tr" />
          <span className="bracket bl" />
          <span className="bracket br" />
          <p className="px-6 text-center font-mono text-xs uppercase tracking-[0.25em] text-faint">
            [ no albums yet — the card is still in the camera ]
          </p>
        </div>
      ) : (
        <div className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album, i) => {
            const cover = album.photos[0];
            return (
              <Link key={album.slug} href={`/photos/${album.slug}`} className="group">
                <div className="overflow-hidden border border-line">
                  <Image
                    src={cover.src}
                    alt={`Cover photograph of ${album.title}`}
                    width={cover.width}
                    height={cover.height}
                    placeholder="blur"
                    blurDataURL={cover.blurDataURL}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="font-display text-2xl transition-colors group-hover:text-accent">
                    {album.title}
                  </h2>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                    {String(i + 1).padStart(2, "0")} · {album.photos.length} frame
                    {album.photos.length === 1 ? "" : "s"}
                    {album.year ? ` · ${album.year}` : ""}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Gallery from "@/components/Gallery";
import AlbumNavLinks from "@/components/AlbumNavLinks";
import Reveal from "@/components/motion/Reveal";
import { getAlbum, getAlbums } from "@/lib/photos";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAlbums().map((a) => ({ album: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ album: string }>;
}): Promise<Metadata> {
  const { album: slug } = await params;
  const album = getAlbum(slug);
  if (!album) return {};
  return {
    title: album.title,
    description: `${album.photos.length} photographs from ${album.title} by Edmund Lim.`,
    alternates: { canonical: `/photos/${slug}` },
  };
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ album: string }>;
}) {
  const { album: slug } = await params;
  const album = getAlbum(slug);
  if (!album) notFound();

  return (
    <div className="px-4 pt-28 pb-20 sm:px-8">
      <Reveal className="mb-10 px-2 sm:px-4">
        <AlbumNavLinks />
        <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-6xl">
          {album.title}
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.25em] text-dim">
          {album.photos.length} frame{album.photos.length === 1 ? "" : "s"}
          {album.year ? ` · ${album.year}` : ""}
        </p>
      </Reveal>
      <Gallery photos={album.photos} albumTitle={album.title} />
    </div>
  );
}

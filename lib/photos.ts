import manifest from "@/content/photos.json";

export type Photo = {
  src: string;
  width: number;
  height: number;
  blurDataURL: string;
  exif?: string;
};

export type Album = {
  slug: string;
  title: string;
  year?: string;
  photos: Photo[];
};

export function getAlbums(): Album[] {
  return (manifest as { albums: Album[] }).albums;
}

export function getAlbum(slug: string): Album | undefined {
  return getAlbums().find((a) => a.slug === slug);
}

/** First photo overall — used as the hero / OG image when available. */
export function getHeroPhoto(): { photo: Photo; album: Album } | null {
  for (const album of getAlbums()) {
    if (album.photos.length > 0) return { photo: album.photos[0], album };
  }
  return null;
}

/** A flat strip of recent photos for the home page. */
export function getStripPhotos(limit = 8): { photo: Photo; album: Album }[] {
  const out: { photo: Photo; album: Album }[] = [];
  for (const album of getAlbums()) {
    for (const photo of album.photos) {
      out.push({ photo, album });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function totalPhotoCount(): number {
  return getAlbums().reduce((n, a) => n + a.photos.length, 0);
}

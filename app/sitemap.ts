import type { MetadataRoute } from "next";
import { getAlbums } from "@/lib/photos";

const SITE = "https://edmundlim.systems";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE}/photos`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${SITE}/accessibility`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const albumRoutes: MetadataRoute.Sitemap = getAlbums().map((album) => ({
    url: `${SITE}/photos/${album.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...albumRoutes];
}

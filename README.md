# edmundlim.systems

Personal portfolio — photographer · vibe coder · tech enthusiast.

Dark, photo-first design: near-black canvas, photos carry the color, terminal-styled
projects section. Fully static — no DB, no CMS.

**Stack:** Next.js (App Router) · TypeScript · Tailwind 4 · Bun · Vercel

## Develop

```bash
bun install
bun dev
```

## Adding photos

The site never reads the NAS at runtime. It renders only from `content/photos.json`,
which is generated from a curated set of originals:

1. Drop picks into `photos-src/<Album Name>/*.jpg` — the folder name becomes the
   album title. `photos-src/` is gitignored (originals stay local).
2. Run `bun run photos`. For each image this:
   - resizes to max 2560px and re-encodes as WebP into `public/photos/<album-slug>/`
   - **strips all EXIF/GPS metadata** from the published file
   - records only camera/exposure info (never GPS) in the manifest for captions
3. Commit `content/photos.json` and `public/photos/` — both are checked in so
   builds are deterministic.

Folders named `close ups` (any spelling) are refused by a hard-coded denylist and
will never be published.

The hero image is the first photo of the first album (albums and files sort
alphabetically) — rename files to control ordering.

## Projects list

Hand-edited in `content/projects.ts`.

## Deploy

```bash
bunx vercel          # preview
bunx vercel --prod   # production
```

Domain: `edmundlim.systems` (root). The timetable stays at
`timetable.edmundlim.systems`.

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

Imports reject empty or colliding album/image slugs before writing output. Missing
originals or conversion failures leave the published catalogue intact. Replacements
are staged and validated before publication. To intentionally remove all published
photos and empty the catalogue, run `bun run photos:clear`.

Imports and `bun run build` share an exclusive `.photos.lock` and recover any
unfinished `.photos-transaction.json` before starting. Use this build command rather
than invoking `next build` directly. Publication records its staging location before
moving images; recovery restores the previous images if the manifest was not
replaced, or keeps the new publication if it was. Recovery can be retried if interrupted.

After a crash, confirm that **no import, build, or recovery process is running**,
then run `bun run photos:recover --stale-lock`. This repairs publication before
removing the stale lock. Do not manually delete the lock, transaction journal, or
`.photos-stage-*` directories. If recovery fails, retain these files and resolve the
reported filesystem problem before retrying. For failures from older importers
without a journal, restore the matching images from `previous-photos` in the retained
staging directory (or restore both tracked images and manifest from the same Git
revision) before clearing the old lock.

A post-publication cleanup warning explicitly means publication **succeeded**; the
import exits successfully and reports the retained staging location. Run
`bun run photos:recover` to retry cleanup, not another import. Subsequent imports
and builds refuse to proceed while cleanup remains pending. Pre-commit errors
still fail the import. This protocol covers process interruption; it does not promise
filesystem durability across hardware failure or power loss.

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

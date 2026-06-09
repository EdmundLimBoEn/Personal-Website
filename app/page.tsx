import Image from "next/image";
import Link from "next/link";
import { PROJECTS, GITHUB_PROFILE, EMAIL } from "@/content/projects";
import { getHeroPhoto, getStripPhotos, getAlbums, totalPhotoCount } from "@/lib/photos";

function Brackets() {
  return (
    <>
      <span className="bracket tl" />
      <span className="bracket tr" />
      <span className="bracket bl" />
      <span className="bracket br" />
    </>
  );
}

function Hero() {
  const hero = getHeroPhoto();
  return (
    <section className="relative flex min-h-svh flex-col justify-end overflow-hidden">
      {hero && (
        <>
          <Image
            src={hero.photo.src}
            alt={`Photograph from ${hero.album.title}`}
            fill
            priority
            placeholder="blur"
            blurDataURL={hero.photo.blurDataURL}
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/20" />
        </>
      )}

      {/* viewfinder frame */}
      <div className="focus-frame pointer-events-none absolute inset-4 sm:inset-6">
        <Brackets />
      </div>

      <div className="relative z-10 px-6 pb-20 sm:px-12 sm:pb-24">
        <p
          className="rise mb-5 font-mono text-[11px] uppercase tracking-[0.3em] text-dim"
          style={{ "--rise-delay": "0.1s" } as React.CSSProperties}
        >
          <span className="rec mr-2 inline-block size-[7px] rounded-full bg-accent align-middle" />
          Singapore — student, media club
        </p>
        <h1
          className="rise font-display text-[17vw] leading-[0.85] tracking-tight sm:text-[11rem]"
          style={{ "--rise-delay": "0.25s" } as React.CSSProperties}
        >
          Edmund
          <br />
          <span className="italic font-light">Lim</span>
        </h1>
        <p
          className="rise mt-8 max-w-md font-mono text-sm leading-relaxed text-dim"
          style={{ "--rise-delay": "0.45s" } as React.CSSProperties}
        >
          photographer <span className="text-accent">·</span> vibe coder{" "}
          <span className="text-accent">·</span> tech enthusiast
        </p>
      </div>

      {/* camera HUD baseline */}
      <div className="relative z-10 flex items-baseline justify-between border-t border-line px-6 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-faint sm:px-12">
        <span>AF-ON · ISO 400 · ƒ/2.8</span>
        <span className="hidden sm:block">1.35°N 103.82°E</span>
        <span>scroll ↓</span>
      </div>
    </section>
  );
}

function PhotoStrip() {
  const strip = getStripPhotos(8);
  const albums = getAlbums();
  return (
    <section className="border-t border-line">
      <div className="flex items-baseline justify-between px-6 pt-14 pb-8 sm:px-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-dim">
          01 <span className="text-accent">/</span> Photos
        </h2>
        <Link
          href="/photos"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim hover:text-accent transition-colors"
        >
          all albums →
        </Link>
      </div>

      {strip.length > 0 ? (
        <div className="strip flex gap-2 overflow-x-auto px-6 pb-14 sm:px-12">
          {strip.map(({ photo, album }) => (
            <Link
              key={photo.src}
              href={`/photos/${album.slug}`}
              className="group relative shrink-0"
            >
              <Image
                src={photo.src}
                alt={`Photograph from ${album.title}`}
                width={photo.width}
                height={photo.height}
                placeholder="blur"
                blurDataURL={photo.blurDataURL}
                sizes="(min-width: 640px) 40vw, 75vw"
                className="h-[280px] w-auto max-w-none object-cover transition-transform duration-500 group-hover:scale-[1.015] sm:h-[360px]"
              />
              <span className="absolute bottom-2 left-2 bg-bg/80 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-dim opacity-0 transition-opacity group-hover:opacity-100">
                {album.title}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-6 pb-14 sm:px-12">
          <div className="focus-frame flex h-[280px] items-center justify-center border border-dashed border-line sm:h-[360px]">
            <Brackets />
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-faint">
              [ awaiting curation — {albums.length} albums on the card ]
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Projects() {
  return (
    <section id="projects" className="border-t border-line scroll-mt-14">
      <div className="px-6 pt-14 pb-8 sm:px-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-dim">
          02 <span className="text-accent">/</span> Projects
        </h2>
      </div>

      <div className="mx-6 mb-14 border border-line sm:mx-12">
        {/* terminal title bar */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="size-2.5 rounded-full border border-line" />
          <span className="size-2.5 rounded-full border border-line" />
          <span className="size-2.5 rounded-full border border-line" />
          <span className="ml-3 font-mono text-[11px] text-faint">
            edmund@edserve: ~/projects
          </span>
        </div>

        <p className="px-4 pt-4 font-mono text-xs text-dim sm:px-6">
          <span className="text-accent">$</span> ls --featured
        </p>

        <ol>
          {PROJECTS.map((p, i) => {
            const href = p.live ?? p.github;
            const Row = (
              <div className="group grid grid-cols-[2rem_1fr] gap-x-4 border-b border-line px-4 py-5 transition-colors last:border-b-0 hover:bg-accent/[0.04] sm:grid-cols-[3rem_14rem_1fr_auto] sm:items-baseline sm:px-6">
                <span className="font-mono text-xs text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-sm font-medium text-ink transition-colors group-hover:text-accent">
                  {p.name}
                  {href && <span className="ml-1 text-faint group-hover:text-accent">↗</span>}
                </span>
                <span className="col-start-2 mt-1 text-sm leading-relaxed text-dim sm:col-start-3 sm:mt-0 sm:pr-8">
                  {p.tagline}
                </span>
                <span className="col-start-2 mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint sm:col-start-4 sm:mt-0 sm:text-right">
                  {p.stack.map((s) => `[${s}]`).join(" ")}
                </span>
              </div>
            );
            return (
              <li key={p.slug}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {Row}
                  </a>
                ) : (
                  Row
                )}
              </li>
            );
          })}
        </ol>

        <p className="px-4 py-4 font-mono text-xs text-dim sm:px-6">
          <span className="text-accent">$</span> open {GITHUB_PROFILE.replace("https://", "")}
          <span className="blink ml-1 inline-block h-[0.95em] w-[0.55em] translate-y-[2px] bg-ink" />
        </p>
      </div>
    </section>
  );
}

function About() {
  const count = totalPhotoCount();
  return (
    <section id="about" className="border-t border-line scroll-mt-14">
      <div className="px-6 pt-14 pb-8 sm:px-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-dim">
          03 <span className="text-accent">/</span> About
        </h2>
      </div>
      <div className="grid gap-10 px-6 pb-20 sm:grid-cols-[1.4fr_1fr] sm:px-12">
        <p className="font-display text-3xl leading-snug sm:text-5xl">
          I shoot school halls, airshows and{" "}
          <span className="italic text-accent">the moon</span> — and I ship small tools
          that scratch my own itches.
        </p>
        <div className="flex flex-col gap-4 font-mono text-xs leading-loose text-dim sm:pt-2">
          <p>
            Student at the School of Science and Technology, Singapore. Media club
            photographer{count > 0 ? ` — ${count} frames on this site and counting` : ""}.
            When I&apos;m not behind a camera I&apos;m in a terminal, usually with Claude Code
            open.
          </p>
          <div className="flex flex-col gap-1 uppercase tracking-[0.15em]">
            <a href={`mailto:${EMAIL}`} className="hover:text-accent transition-colors">
              → {EMAIL}
            </a>
            <a
              href={GITHUB_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              → github.com/EdmundLimBoEn
            </a>
            <a
              href="https://timetable.edmundlim.systems"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              → timetable.edmundlim.systems
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <PhotoStrip />
      <Projects />
      <About />
    </>
  );
}

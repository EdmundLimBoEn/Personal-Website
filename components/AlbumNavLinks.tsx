"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const linkClass =
  "font-mono text-[11px] uppercase tracking-[0.2em] text-dim hover:text-accent transition-colors";

function Links() {
  const fromHome = useSearchParams().get("from") === "home";
  if (!fromHome) {
    return (
      <Link href="/photos" className={linkClass}>
        ← all albums
      </Link>
    );
  }
  return (
    <span className="flex gap-6">
      <Link href="/" className={linkClass}>
        ← back
      </Link>
      <Link href="/photos" className={linkClass}>
        all albums →
      </Link>
    </span>
  );
}

/** Album-page breadcrumbs: arriving from the Darkroom pile (?from=home)
 *  offers "back to home" plus "all albums"; otherwise just "all albums". */
export default function AlbumNavLinks() {
  return (
    <Suspense
      fallback={
        <Link href="/photos" className={linkClass}>
          ← all albums
        </Link>
      }
    >
      <Links />
    </Suspense>
  );
}

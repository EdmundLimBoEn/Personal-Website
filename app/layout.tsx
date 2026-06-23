import type { Metadata } from "next";
import { Fraunces, Archivo, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { GITHUB_PROFILE, EMAIL } from "@/content/projects";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Cursor from "@/components/motion/Cursor";
import Magnetic from "@/components/motion/Magnetic";
import { MotionProvider, FxToggle } from "@/components/motion/MotionMode";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const SITE_URL = "https://edmundlim.systems";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const plex = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Edmund Lim — photographer · vibe coder · tech enthusiast",
    template: "%s — Edmund Lim",
  },
  description:
    "Edmund Lim — a Singapore event photographer and developer. Browse a photography portfolio and small, practical tools built to scratch my own itches.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Edmund Lim",
    description: "Photographer · vibe coder · tech enthusiast — Singapore.",
    url: SITE_URL,
    siteName: "Edmund Lim",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Edmund Lim",
    description: "Photographer · vibe coder · tech enthusiast — Singapore.",
    creator: "@edmundlimboen",
    site: "@edmundlimboen",
  },
};

// Person + ProfilePage structured data. Also satisfies the audit's "contact schema markup"
// finding via the ContactPoint email. sameAs links the canonical off-site identities.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: "Edmund Lim",
      url: SITE_URL,
      jobTitle: "Photographer & Developer",
      description:
        "Singapore event photographer and developer building small, practical tools.",
      knowsAbout: ["Event photography", "Web development", "Software engineering"],
      email: `mailto:${EMAIL}`,
      sameAs: [GITHUB_PROFILE, "https://x.com/edmundlimboen"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "personal",
        email: EMAIL,
      },
    },
    {
      "@type": "ProfilePage",
      "@id": `${SITE_URL}/#profilepage`,
      url: SITE_URL,
      name: "Edmund Lim — photographer · vibe coder · tech enthusiast",
      mainEntity: { "@id": `${SITE_URL}/#person` },
    },
  ],
};

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 mix-blend-difference">
      <nav className="flex items-center justify-between px-5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] sm:px-8">
        <Magnetic>
          <Link
            href="/"
            className="inline-flex min-h-[48px] items-center text-ink transition-colors hover:text-accent"
          >
            EL<span className="text-accent">—</span>26
          </Link>
        </Magnetic>
        <div className="flex items-center gap-5 sm:gap-9">
          <FxToggle />
          <Magnetic>
            <Link
              href="/photos"
              className="inline-flex min-h-[48px] items-center text-ink transition-colors hover:text-accent"
            >
              Photos
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              href="/#projects"
              className="inline-flex min-h-[48px] items-center text-ink transition-colors hover:text-accent"
            >
              Projects
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              href="/#about"
              className="inline-flex min-h-[48px] items-center text-ink transition-colors hover:text-accent"
            >
              About
            </Link>
          </Magnetic>
        </div>
        <span className="hidden text-dim sm:block">SG · UTC+8</span>
      </nav>
    </header>
  );
}

function Footer() {
  const linkClass =
    "inline-flex min-h-[44px] items-center transition-colors hover:text-accent";
  return (
    <footer className="border-t border-line px-5 py-6 sm:px-8">
      <div className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-dim sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex min-h-[44px] items-center">© 2026 Edmund Lim</span>
        <span className="flex flex-wrap items-center gap-x-3">
          <span className="hidden items-center sm:inline-flex">
            shot on Canon · built with Next.js
          </span>
          <a href={GITHUB_PROFILE} className={linkClass}>
            GitHub
          </a>
          <span aria-hidden>·</span>
          <a href={`mailto:${EMAIL}`} className={linkClass}>
            Email
          </a>
          <span aria-hidden>·</span>
          <Link href="/privacy" className={linkClass}>
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className={linkClass}>
            Terms
          </Link>
          <span aria-hidden>·</span>
          <Link href="/accessibility" className={linkClass}>
            Accessibility
          </Link>
        </span>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${archivo.variable} ${plex.variable} h-full antialiased`}
    >
      <body className="grain min-h-full flex flex-col" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MotionProvider>
          <SmoothScroll />
          <Cursor />
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </MotionProvider>
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Fraunces, Archivo, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { GITHUB_PROFILE, EMAIL } from "@/content/projects";
import "./globals.css";

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
  metadataBase: new URL("https://edmundlim.systems"),
  title: {
    default: "Edmund Lim — photographer · vibe coder · tech enthusiast",
    template: "%s — Edmund Lim",
  },
  description:
    "Portfolio of Edmund Lim: event photography from Singapore and tools built to scratch my own itches.",
  openGraph: {
    title: "Edmund Lim",
    description: "Photographer · vibe coder · tech enthusiast — Singapore.",
    url: "https://edmundlim.systems",
    siteName: "Edmund Lim",
    type: "website",
  },
};

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 mix-blend-difference">
      <nav className="flex items-baseline justify-between px-5 py-4 font-mono text-[11px] uppercase tracking-[0.2em] sm:px-8">
        <Link href="/" className="text-ink hover:text-accent transition-colors">
          EL<span className="text-accent">—</span>26
        </Link>
        <div className="flex gap-6 sm:gap-10">
          <Link href="/photos" className="text-ink hover:text-accent transition-colors">
            Photos
          </Link>
          <Link href="/#projects" className="text-ink hover:text-accent transition-colors">
            Projects
          </Link>
          <Link href="/#about" className="text-ink hover:text-accent transition-colors">
            About
          </Link>
        </div>
        <span className="hidden text-dim sm:block">SG · UTC+8</span>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line px-5 py-8 sm:px-8">
      <div className="flex flex-col gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-dim sm:flex-row sm:items-baseline sm:justify-between">
        <span>© 2026 Edmund Lim</span>
        <span>
          shot on Canon · built with Next.js ·{" "}
          <a href={GITHUB_PROFILE} className="hover:text-accent transition-colors">
            GitHub
          </a>{" "}
          ·{" "}
          <a href={`mailto:${EMAIL}`} className="hover:text-accent transition-colors">
            Email
          </a>
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
      <body className="grain min-h-full flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  stack: string[];
  year: string;
  live?: string;
  github?: string;
};

export const GITHUB_PROFILE = "https://github.com/EdmundLimBoEn";
export const EMAIL = "limboenedmund@gmail.com";

export const PROJECTS: Project[] = [
  {
    slug: "s2-05-timetable",
    name: "s2-05-timetable",
    tagline:
      "Live school timetable PWA — now bar, exam countdowns, announcements, offline support. Used daily by my class.",
    stack: ["vanilla js", "express", "pwa"],
    year: "2026",
    live: "https://timetable.edmundlim.systems",
    github: "https://github.com/EdmundLimBoEn/s2-05-timetable",
  },
  {
    slug: "ikeyboard",
    name: "iKeyboard",
    tagline:
      "Turns an iPhone into a wireless keyboard and trackpad for the Mac over Wi-Fi — Bonjour discovery, low-latency TCP, CGEvent injection.",
    stack: ["swift", "swiftui", "bonjour"],
    year: "2026",
  },
  {
    slug: "mts-converter",
    name: "mts-converter",
    tagline:
      "macOS app that digs AVCHD .MTS files out of JVC camcorder cards and converts them to H.265 MP4 at ~30% of the size.",
    stack: ["python", "tkinter", "ffmpeg"],
    year: "2026",
    github: "https://github.com/EdmundLimBoEn/mts-converter",
  },
  {
    slug: "server-dashboard",
    name: "server-dashboard",
    tagline:
      "Self-hosted single-page monitor for my Linux home server — CPU, RAM, disk, temps and fans over Tailscale.",
    stack: ["fastapi", "psutil", "docker"],
    year: "2025",
    github: "https://github.com/EdmundLimBoEn/server-dashboard",
  },
 {
    slug: "statusline-builder",
    name: "statusline-builder",
    tagline:
      "The bash + jq statusline this site was built under — model, git, burn rate and context meter on one line of my Claude Code terminal.",
    stack: ["bash", "jq"],
    year: "2025",
  },
];

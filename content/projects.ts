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
export const EMAIL = "me@edmundlim.systems";

export const PROJECTS: Project[] = [
  {
    slug: "s2-05-timetable",
    name: "s2-05-timetable",
    tagline:
      "My class timetable, with the current lesson, exam countdowns, announcements and offline support. We use it every day.",
    stack: ["vanilla js", "express", "pwa"],
    year: "2026",
    live: "https://timetable.edmundlim.systems",
    github: "https://github.com/EdmundLimBoEn/s2-05-timetable",
  },
  {
    slug: "stage-wand",
    name: "Stage Wand",
    tagline:
      "Turns your phone into a presentation clicker and trackpad over Wi-Fi or Bluetooth. Use the volume buttons to change slides on Mac, Windows or Linux.",
    stack: ["swift", "go", "kotlin"],
    year: "2026",
    github: "https://github.com/EdmundLimBoEn/stage-wand",
  },
  {
    slug: "mts-converter",
    name: "mts-converter",
    tagline:
      "A macOS app that pulls .MTS clips off JVC camcorder cards and converts them to H.265 MP4 at about 30% of the original size.",
    stack: ["python", "tkinter", "ffmpeg"],
    year: "2026",
    github: "https://github.com/EdmundLimBoEn/mts-converter",
  },
  {
    slug: "server-dashboard",
    name: "server-dashboard",
    tagline:
      "A dashboard for my Linux home server. I check CPU, RAM, disk space, temperatures and fans over Tailscale.",
    stack: ["fastapi", "psutil", "docker"],
    year: "2025",
    github: "https://github.com/EdmundLimBoEn/server-dashboard",
  },
  {
    slug: "statusline-builder",
    name: "statusline-builder",
    tagline:
      "My Claude Code statusline, built with bash and jq. Shows the model, git status, spending rate and context usage in one line.",
    stack: ["bash", "jq"],
    year: "2025",
  },
];

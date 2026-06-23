import Reveal from "@/components/motion/Reveal";

/** Shared shell for the privacy / terms / accessibility pages. */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 pt-28 pb-24 sm:px-12">
      <Reveal>
        <h1 className="font-display text-4xl tracking-tight sm:text-6xl">{title}</h1>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-dim">
          Last updated · {updated}
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <div className="legal-prose mt-12 flex flex-col gap-6 text-base leading-relaxed text-dim">
          {children}
        </div>
      </Reveal>
    </div>
  );
}

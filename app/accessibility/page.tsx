import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { EMAIL } from "@/content/projects";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Accessibility on edmundlim.systems, including reduced-motion support and how to report an issue.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility" updated="June 2026">
      <p>
        I want this site to be usable by as many people as possible and aim to meet{" "}
        <strong>WCAG 2.1 AA</strong> where practical. I&apos;m still working on it.
      </p>

      <h2>What&apos;s in place</h2>
      <ul>
        <li>Semantic HTML, descriptive alt text on photographs, and keyboard-navigable links.</li>
        <li>
          Full support for <strong>prefers-reduced-motion</strong>: the film grain, scroll
          animations, 3D scenes, and custom cursor are turned off when you ask your system to
          reduce motion.
        </li>
        <li>Touch targets sized for comfortable tapping on mobile.</li>
        <li>A persistent &quot;FX&quot; switch in the navigation to turn motion effects on or off.</li>
      </ul>

      <h2>Known limitations</h2>
      <p>
        Some decorative elements (animated hero lettering, the camera-HUD labels) are styled
        for effect. They are marked decorative for assistive technology, but if anything gets
        in your way I&apos;d like to know.
      </p>

      <h2>Report an issue</h2>
      <p>
        If you hit an accessibility barrier, email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> and
        I&apos;ll do my best to fix it.
      </p>
    </LegalPage>
  );
}

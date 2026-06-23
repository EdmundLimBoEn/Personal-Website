import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { EMAIL } from "@/content/projects";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of use for edmundlim.systems — content ownership, acceptable use, and disclaimer for this personal portfolio site.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="June 2026">
      <p>
        By using <strong>edmundlim.systems</strong> you agree to these terms. They are
        deliberately short — this is a personal portfolio, not a commercial service.
      </p>

      <h2>Content &amp; ownership</h2>
      <p>
        All photographs, text, and design on this site are © Edmund Lim unless stated
        otherwise. You may view and share links to the site, but please do not republish or
        reuse the photographs without permission. Linked projects are released under their own
        licenses on GitHub.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t attempt to disrupt, scrape at scale, or misuse the site or its hosting. The
        site is provided for personal, non-commercial viewing.
      </p>

      <h2>Disclaimer</h2>
      <p>
        The site and its content are provided &quot;as is&quot;, without warranty of any kind.
        I make no guarantee that it will be available, accurate, or error-free, and I am not
        liable for any loss arising from its use. External links are provided for convenience
        and I&apos;m not responsible for their content.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>
    </LegalPage>
  );
}

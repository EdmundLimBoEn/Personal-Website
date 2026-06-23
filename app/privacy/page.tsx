import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { EMAIL } from "@/content/projects";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How edmundlim.systems handles your data: no cookies, no third-party tracking, cookieless analytics, and EXIF/location stripped from every photo.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="June 2026">
      <p>
        This is a personal portfolio site. It is built to collect as little of your data as
        possible. There are no accounts, no logins, and no advertising.
      </p>

      <h2>Cookies</h2>
      <p>
        This site sets <strong>no cookies</strong> and uses no client-side storage to track
        you across visits. Because nothing identifying is stored on your device, there is no
        cookie-consent banner — there is nothing to consent to.
      </p>

      <h2>Analytics</h2>
      <p>
        The site uses <strong>Vercel Web Analytics</strong>, which is privacy-friendly and
        cookieless. It records aggregate, anonymised page views and does not build a profile of
        you, fingerprint your device, or share data with advertisers. IP addresses are not
        stored. See Vercel&apos;s privacy documentation for details.
      </p>

      <h2>Photographs</h2>
      <p>
        All photos published here have their embedded metadata removed during processing —
        including <strong>GPS location, camera serial numbers, and timestamps</strong>. Images
        are served as optimised WebP from this domain.
      </p>

      <h2>Contact &amp; third parties</h2>
      <p>
        If you email me, I receive whatever you choose to send. Outbound links (e.g. GitHub)
        are governed by their own privacy policies. This site is hosted on Vercel.
      </p>

      <h2>Your rights</h2>
      <p>
        Since no personal data is collected or stored, there is nothing to access, correct, or
        delete. For any privacy question, reach me at{" "}
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>
    </LegalPage>
  );
}

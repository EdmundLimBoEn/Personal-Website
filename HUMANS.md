# Human-only follow-ups

Tasks that require a human (dashboards, registrars, external validators) — these can't be
done from code. From the `edmundlim.systems` audit fix pass (June 2026):

- [ ] **Enable Web Analytics** for this project in the Vercel dashboard
  (Project → Analytics → enable). The `@vercel/analytics` `<Analytics />` component is already
  wired in `app/layout.tsx`, but it only collects data once Analytics is turned on for the
  project. It is a no-op locally / in dev.
- [ ] **Quick visual smoke test after deploy:** open the deployed site, check the browser
  DevTools console for any CSP violations, and confirm the hero 3D scene + the `PhotoPile`
  physics (which uses WebAssembly via `@react-three/rapier`) still run. The CSP already
  includes `'wasm-unsafe-eval'` and `worker-src blob:` for this, so it should be fine.
- [ ] **Submit `sitemap.xml`** in Google Search Console
  (`https://edmundlim.systems/sitemap.xml`) and request indexing.
- [ ] **Validate the share card**: run the homepage URL through the Facebook Sharing Debugger
  and an X/Twitter card preview to confirm the generated OG image renders (1200×630).
- [ ] *(Optional, registrar-level)* **Enable DNSSEC** at Name.com for `edmundlim.systems`
  (DNS settings → DS records). Cannot be done in code.

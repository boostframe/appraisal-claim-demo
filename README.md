# Appraisal Claim Intake — DocuSign Demo

A playable demo of a payment-gated claim workflow: customer intake → real DocuSign
embedded signing → (simulated) payment → claim created — only when both succeed,
never twice.

Built on **React + Vite** (front-end), **Netlify Functions** (serverless API),
**Netlify Postgres / Neon** (persistence), and **Netlify Blobs** (signed-PDF storage).
The DocuSign layer ships a fully tested in-memory fake for local development and unit
tests, and a real JWT-grant implementation ready for the sandbox.

---

## Run locally — no external accounts

> **Caveat:** `netlify dev` prompts to link a Netlify site because `@netlify/neon`
> and `@netlify/blobs` need a site context at startup, even when `DEMO_FAKE=1`.
> Two workarounds:
>
> 1. Run `netlify link` once to associate the project with a Netlify site, then
>    `DEMO_FAKE=1 netlify dev` works normally.
> 2. For pure UI work (no API calls needed), run the Vite dev server directly:
>    `npx vite` — it serves the front-end on `http://localhost:5173`.
>
> Tests need nothing — run them with plain `npm test`.

```bash
npm install
netlify link          # one-time: links to your Netlify site
DEMO_FAKE=1 netlify dev
# open http://localhost:8888/?key=appraise
```

In fake mode the DocuSign embedded ceremony is simulated in-browser, state is held
in memory, and no database or blob store is contacted.

> **Local signing completion:** Because there is no DocuSign Connect webhook locally,
> the signing step does not auto-complete after the embedded iframe. Instead, an
> on-screen **"✅ Complete signing (sandbox simulation)"** button appears beneath the
> iframe — click it to advance the lead to `signed=true` and proceed to payment.
> In deployed/real mode this button is absent and signing is completed by the real
> DocuSign Connect webhook firing at `/api/docusign-webhook`.

---

## Run against real DocuSign + Netlify DB

1. `netlify db init` — provisions a Neon Postgres instance and injects
   `NETLIFY_DATABASE_URL` automatically.
2. Copy `.env.example` to `.env` and fill in the DocuSign sandbox vars.
   Grant JWT consent once by visiting the consent URL printed by the DocuSign SDK
   (or run `npx tsx scripts/ds-spike.ts` to verify credentials).
3. Configure **DocuSign Connect** in your sandbox account to POST envelope events to:
   ```
   https://YOUR-SITE.netlify.app/api/docusign-webhook
   ```
4. `netlify dev` (with the site linked) or push to GitHub and let Netlify deploy.

> **Live end-to-end verification** — the full E2E acceptance run (embedded signing
> → webhook → PDF download → payment → claim creation + all three attack scenarios)
> is the final step to be performed once the DocuSign sandbox and Netlify DB are
> connected. See `ARCHITECTURE.md` for the verification checklist.

---

## What to try

Open the app with the passcode (`?key=appraise` or type it on the splash screen).

| Scenario | Expected result |
|---|---|
| Submit intake → sign (iframe) → click **"Complete signing (sandbox simulation)"** → pay | Claim created, PDF download appears |
| Submit intake → **Simulate payment** before signing | No claim (payment recorded, waiting for signature) |
| Submit intake → sign → **Simulate payment** twice | Second payment is a no-op (idempotent) |
| **Replay last event** button | Duplicate ignored, claim count unchanged |
| **Reset demo** | Session wiped, ready for a fresh run |

> **Note:** The "Complete signing" button appears only in local fake mode (`DEMO_FAKE=1`).
> In the deployed Netlify app with a real DocuSign sandbox, signing completes via the
> DocuSign Connect webhook and the button is not present.

The **State panel** on the right shows live `signed`, `paid`, and `claimed` flags so
the gating logic is visible in real time.

---

## Project structure

```
netlify/functions/   Thin HTTP handlers (Netlify Functions v2)
server/
  config.ts          Env-var loader (throws on missing vars, unless DEMO_FAKE=1)
  wiring.ts          Dependency factory — swaps real vs fake impls
  domain/            Pure business logic: reconcile, createClaim, event handlers
  repo/              Repository interface + memory (tests) and Postgres (prod) impls
  docusign/          DocuSignClient interface + fake and real (JWT) impls
  blobs/             BlobStore interface + memory and Netlify Blobs impls
  templates/         DocuSign document HTML builder
  session.ts         Passcode / session cookie helpers
scripts/
  ds-spike.ts        One-shot DocuSign credential verification script
src/                 React front-end (Vite)
```

---

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Hosting & functions | Netlify | Zero-config serverless; Postgres and Blobs co-located |
| Database | Netlify Postgres (Neon) | Auto-provisioned; connection pooling built in |
| Blob storage | Netlify Blobs | First-class integration; no S3 setup |
| e-Signature | DocuSign embedded signing | Requirement; JWT grant for server-side auth |
| Front-end | React + Vite | Fast iteration; no framework overhead needed |
| Language | TypeScript (strict) | End-to-end type safety across domain, repo, and API layers |
| Tests | Vitest | Native ESM; no config needed alongside Vite |

---

## Running tests

```bash
npm test          # run once (29 tests, 1 skipped — Postgres test needs NETLIFY_DATABASE_URL)
npm run test:watch
```

All unit and integration tests run against in-memory fakes and require no external
services.

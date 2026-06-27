# Auto Appraisal Claims — Onboarding Portal (demo)

A working demo of a **payment-gated customer onboarding portal** for vehicle total-loss
appraisals: customer intake (with document uploads) → **real DocuSign embedded signing** →
payment → a claim is created **only after both the signature and the payment have succeeded,
and never twice.**

It exists to prove the part the workflow hangs on: the ordering guarantee and the DocuSign
integration. Live (test mode): **https://client-onboarding-demo.netlify.app** — open, no login required.

**Stack:** React + Vite (UI) · Netlify Functions (serverless API) · **Netlify Database** (GA,
Postgres) · Netlify Blobs (file + signed-PDF storage) · DocuSign eSignature (JWT grant + embedded
signing + Connect webhook). Payment is **simulated** in this demo — see *Scope* below.

---

## What it demonstrates

| Capability | Where |
|---|---|
| Embedded DocuSign signing in-app | real sandbox `createRecipientView` rendered in the portal |
| Document generation from intake | Appraisal Agreement, Letter of Authorization (+ Right to Appraisal, if requested) |
| Document-completion handling | completed PDF pulled from DocuSign and stored, downloadable |
| **Webhook processing** | DocuSign **Connect** → `/api/docusign-webhook`, idempotent |
| Status transitions | Submitted → Signed → Paid → Claim opened (live case-file rail) |
| **Gating** | claim created only when `signed` **and** `paid`; never twice |
| File uploads | vehicle photos, valuation report, supporting docs — stored + attached to the claim |
| Claim creation | status set to **`New Intake - Paid`**, with intake + files + signed PDF attached |

---

## Run locally — no external accounts

Local **fake mode** swaps in in-memory storage and a simulated signing button, so the full
flow runs with nothing external:

```bash
npm install
netlify link              # one-time: associate the folder with a Netlify site
DEMO_FAKE=1 netlify dev
# open http://localhost:8888
```

- Use `netlify dev` (not `npx vite`) so the `/api/*` functions run alongside the UI.
- Because there's no DocuSign Connect locally, an on-screen **"✅ Complete signing (sandbox
  simulation)"** button appears under the iframe — click it to mark the lead `signed`. In the
  deployed app this button is absent; signing completes via the real Connect webhook.
- State is in-memory and resets when you restart `netlify dev`.

Tests need nothing: `npm test`.

---

## Deploy (real DocuSign + database)

The live site is deployed from this repo on Netlify. To stand up your own:

1. **Database** — provision **Netlify Database** (GA): `netlify db init` (choose raw SQL / no
   Drizzle). It auto-injects `NETLIFY_DB_URL`; the app's `@netlify/database` client reads it
   automatically. Tables are created on first request. *(Do not use the deprecated
   `@netlify/neon` / `NETLIFY_DATABASE_URL` extension — creation is blocked.)*
2. **DocuSign sandbox** — create a developer account + an integration key (app). Under the app's
   **Service Integration**, generate an RSA keypair and copy the **private** key. Grant one-time
   JWT consent (scopes `signature impersonation`).
3. **DocuSign Connect** — add a Custom configuration: URL `https://YOUR-SITE/api/docusign-webhook`,
   JSON (SIM) format, trigger on **Envelope Completed**, all users, no HMAC.
4. **Env vars** (Netlify → Environment variables):

   | Var | Value |
   |---|---|
   | `APP_URL` | `https://YOUR-SITE.netlify.app` |
   | `DS_INTEGRATION_KEY` | integration key (GUID) |
   | `DS_USER_ID` | API user ID (GUID) |
   | `DS_ACCOUNT_ID` | API account ID (GUID) |
   | `DS_PRIVATE_KEY` | the RSA private key — **base64-encoded is recommended** (see tip) |
   | `DS_SPIKE_EMAIL` | a test signer email (optional) |

   > **Private-key tip:** env-var UIs often flatten a multi-line PEM's newlines, which breaks
   > RS256 signing. Store it **base64-encoded** (`[Convert]::ToBase64String([IO.File]::ReadAllBytes("key.pem"))`)
   > — the app decodes it. (It also tolerates `\n`-escaped and raw multi-line forms, and reconstructs
   > a PEM whose newlines were flattened to spaces.)

5. Deploy (push to the connected repo, or `netlify deploy --build --prod`).

---

## What to try

Open the live URL. The **case-file rail** on the right shows the live
state machine and an event ledger, so the gating is visible in real time.

| Scenario | Expected |
|---|---|
| Intake (+ optional uploads) → sign → Simulate payment | **Claim `CLM-####` created**, `New Intake - Paid`, signed PDF downloadable, files attached |
| **Simulate payment before signing** | No claim — needs both |
| **Sign, don't pay** | No claim — needs both |
| **Replay last event** | Duplicate ignored, no second claim |
| **Reset session** | Fresh run |

---

## Project structure

```
netlify/functions/   HTTP handlers: create-lead, recipient-view, docusign-webhook,
                     simulate-payment, replay-event, upload, get-upload, get-pdf,
                     get-state, reset, dev-complete-signing (fake mode)
server/
  config.ts          Env loader + private-key normalization
  wiring.ts          Dependency factory — real vs fake impls (DEMO_FAKE)
  domain/            Pure logic: reconcile, createClaim, idempotent event handlers
  repo/              Repository interface + memory (tests) and Netlify-Database (prod) impls
  docusign/          DocuSignClient interface + fake and real (JWT) impls
  blobs/             BlobStore interface + memory and Netlify Blobs impls
  templates/         Auto-appraisal document HTML builder
src/                 React front end (Vite): intake, uploads, signing host, case-file rail
```

---

## Scope (demo vs. production engagement)

Built to be reusable. The hexagonal design means the core transfers and only the adapters change:

- **Reusable as-is:** intake model + document population, the DocuSign client + embedded-signing
  flow, the gating/idempotency state machine, the lead→claim model, the upload/storage interface.
- **Engagement work (simulated/deferred here):** real **Stripe** (Checkout, failed-payment
  handling, receipts — currently a simulated `payment.succeeded` event through the same gating
  path); **Google Drive** storage (swap the `BlobStore` adapter); integration into the **existing
  claim tracker** (point `createClaim()` at its service layer); **Replit** deployment.

See `ARCHITECTURE.md` for the ordering guarantee, idempotency, the service-layer claim path, and
the before-production list.

---

## Tests

```bash
npm test     # 38 passing, 1 skipped (the live-DB repo test, gated on a database URL)
```

All unit/integration tests run against in-memory fakes — no external services required.

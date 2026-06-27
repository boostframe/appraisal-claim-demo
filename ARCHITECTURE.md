# Architecture

This document explains the key design decisions behind the Appraisal Claim Intake demo.
It is written as a reference for the proposal's Q4 (ordering / idempotency guarantee)
and Q7 (integration path into an existing app) answers.

---

## The ordering guarantee

A claim is created only by `reconcile()`, which calls the single transactional
`createClaim()` path, and only when a lead's `signed` and `paid` flags are both true.

```typescript
// server/domain/reconcile.ts
export async function reconcile(leadId, repo, deps): Promise<Claim | null> {
  const lead = await repo.getLead(leadId);
  if (!lead) return null;
  if (lead.signed && lead.paid) return createClaim(leadId, repo, deps);
  return null;
}
```

`claims.lead_id` carries a `UNIQUE` constraint in the Postgres schema, so
`createClaim()` can never produce a second claim for the same lead even if called
concurrently (the second writer gets the existing row back from `insertClaim()`).

The function is called from exactly two places:

| Caller | Event |
|---|---|
| `handleEnvelopeCompleted()` | DocuSign Connect webhook fires after signing |
| `handlePaymentSucceeded()` | Simulate-payment endpoint |

Both paths go through `reconcile()` — there is no other route to a claim.

---

## Idempotency

Every inbound event — whether a DocuSign Connect POST or a simulated payment — is
written to the `processed_events` table **before** any business logic runs.
`recordEvent()` returns `false` if the `eventId` was already present; the handler
returns `{ duplicate: true }` immediately and performs no further work.

```
eventId = envelopeId + ":completed:" + generatedDateTime   (DocuSign Connect webhook)
eventId = "pay:" + leadId                                  (simulated payment — intentionally stable)
eventId = "dev-sign:" + leadId                             (fake-mode signing completion — intentionally stable)
```

The simulated-payment event id is intentionally stable (`pay:${leadId}` with no
timestamp) so that a second click on "Simulate payment" collides in the ledger and is
treated as a duplicate immediately — that's what makes the idempotency demo work.
The same pattern applies to the fake-mode signing completion endpoint.

This makes duplicate delivery and out-of-order delivery harmless — the property
that keeps the workflow correct when DocuSign Connect retries a failed POST.

---

## Why a service-layer claim path (not a direct DB write)

Claim creation runs through one narrow function (`createClaim()`) that validates both
gates, enforces the `UNIQUE` constraint, and wraps the insert + lead-status update in
a transaction. This mirrors the pattern recommended for integrating with an existing
app: when this demo targets a real system, **only `createClaim()` changes** — it calls
the existing app's service layer or a single guarded SQL path. The handlers, the
idempotency ledger, the DocuSign client, and the blob store all stay as-is.

---

## Layer boundaries

```
netlify/functions/          Thin HTTP wiring — parse request, call domain, return Response
server/domain/              Pure business logic — no I/O, fully unit-tested
server/repo/                Repository interface
  memory.ts                 In-memory impl used by unit tests (no DB)
  postgres.ts               Netlify Database (GA) impl — @netlify/database, auto NETLIFY_DB_URL
server/docusign/            DocuSignClient interface
  fake.ts                   In-memory fake — self-contained signing ceremony
  real.ts                   JWT Server-Side Grant + embedded signing (real sandbox)
server/blobs/               BlobStore interface
  store.ts                  MemoryBlobStore (tests) + NetlifyBlobStore (prod)
server/templates/           Document HTML builder (produces DocuSign-ready HTML)
server/session.ts           Session-cookie helpers
```

The fake/real swap is driven by a single env var (`DEMO_FAKE=1`) resolved in
`server/wiring.ts`. No conditional logic leaks into domain code.

---

## Data flow: happy path

```
Browser
  └─► POST /api/create-lead          → insert Lead (status: pending)
  └─► POST /api/recipient-view       → createEnvelope → createRecipientView
      ↓
  DocuSign embedded iframe (signing ceremony)
      ↓
  DocuSign Connect → POST /api/docusign-webhook
      └─► recordEvent (idempotency check)
      └─► getCompletedPdf → store in Netlify Blobs
      └─► updateLead: signed=true, pdfBlobKey set
      └─► reconcile() → (paid=false) → no claim yet
  Browser
  └─► POST /api/simulate-payment
      └─► recordEvent (idempotency check)
      └─► updateLead: paid=true
      └─► reconcile() → signed=true AND paid=true → createClaim()
              └─► INSERT claims (UNIQUE on lead_id)
              └─► updateLead: status=claimed
  Browser
  └─► GET /api/get-state  → { signed, paid, claimed, claimNumber, pdfUrl }
  └─► GET /api/get-pdf    → stream PDF from Netlify Blobs
```

---

## Live verification (2026-06-18)

**VERIFIED end-to-end against the real DocuSign sandbox + Netlify Database on the deployed
site.** A scripted browser test passed 11/11:

- [x] `create-lead` returns a real `envelopeId` + embedded signing URL (JWT auth → envelope).
- [x] Embedded signing ceremony renders and completes in-app.
- [x] DocuSign **Connect** fires `/api/docusign-webhook`; the lead flips to `signed` live.
- [x] `getDocument('combined')` returns a valid PDF; `/api/get-pdf` serves it (HTTP 200, `application/pdf`).
- [x] Gating: pay-without-sign → no claim; both → exactly one claim, status `New Intake - Paid`.
- [x] Idempotency: replaying an event → "duplicate ignored", no second claim.

### Operational notes from the live setup

- **Database:** uses the GA **Netlify Database** (`@netlify/database`, auto `NETLIFY_DB_URL`).
  The deprecated `@netlify/neon` extension (`NETLIFY_DATABASE_URL`) is blocked for new creation.
- **DocuSign private key:** env-var storage flattens PEM newlines, which breaks RS256 signing.
  `config.ts` `normalizePrivateKey()` accepts base64 (recommended), `\n`-escaped, or raw multi-line,
  and reconstructs a valid PEM when newlines were flattened to spaces.
- **JWT consent:** one-time grant (`signature impersonation`) is required, or the token request
  returns `consent_required`.

---

## Known limitations / before production

The following items are intentionally deferred for a demo and must be addressed before
any production deployment.

### (a) DocuSign Connect webhook — HMAC signature not verified

The `/api/docusign-webhook` handler does not verify the HMAC-SHA256 signature that
DocuSign includes in the `X-DocuSign-Signature-1` header. In production, validate the
signature against the shared Connect HMAC secret before processing the payload to
prevent spoofed webhook events.

### (b) `recipient-view` endpoint is not session-gated

`POST /api/recipient-view` accepts a `leadId` in the request body and returns a
DocuSign signing URL without confirming that the caller owns the session that created
the lead. Any caller who knows a `leadId` can request a signing URL. For production,
verify that the session cookie's `sessionId` matches `lead.sessionId` before issuing
the URL.

### (c) Claim numbers lack a uniqueness constraint

`CLM-####` numbers are derived from `CLAIM_BASE + countClaims()`. Under true
concurrent writes two callers could read the same count and produce the same claim
number. This is harmless for a single-evaluator demo (one session at a time), but
for production the claim number should be generated by a `SEQUENCE` or an
auto-increment column with a `UNIQUE` constraint.

### (d) `server/docusign/real.ts` uses loose typing

The `docusign-esign` npm package ships no TypeScript declarations; the project
includes a minimal hand-written `.d.ts` (`server/docusign/docusign-esign.d.ts`).
Two call sites should be verified against the live sandbox response before relying on
them:

- `token.body.access_token` — ✅ confirmed against the live sandbox.
- `envApi.getDocument(accountId, envelopeId, 'combined')` — ✅ confirmed: returns a binary
  string handled by `Buffer.from(result, 'binary')`; `/api/get-pdf` serves a valid PDF.

Both were validated during the live spike (2026-06-18). The loose typing itself remains a
maintainability note — a proper typed declaration would restore full compile-time safety.

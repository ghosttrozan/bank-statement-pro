# Wire Node Backend to the Java Statement Service — Design

## 1. Context

The Java statement-generation service (`java-backend/`, merged into `main` in commit `5bb6200`) fully replicates the transaction-engine + PDF-rendering + signing + password-encryption pipeline that today lives in the Node/Express backend (`backend/src/controllers/pdfController.ts` and its dependencies). The Java side was built and merged as a standalone service; wiring it into the live request path was explicitly deferred. This spec covers that wiring.

## 2. Goal

Make `POST /api/pdf/generate-statement` (the endpoint the frontend actually calls to download a statement PDF) delegate to the Java service instead of running its own Node/Puppeteer pipeline, while keeping the frontend and its request/response contract completely unchanged.

## 3. Non-Goals

- No frontend code changes. `frontend/src/lib/pdfExport.ts`'s `downloadStatementPdfFromBackend()` keeps calling `/api/pdf/generate-statement` with the same request body and expects the same binary PDF response with the same headers.
- No change to `POST /api/pdf/generate` (the generic raw-HTML-to-PDF endpoint used by the preview screen's export button, `exportStatementToPdfViaBackend`). It doesn't use the transaction engine or bank templates and is unrelated to the Java service.
- No Render/production deployment changes (no Dockerfile, no `render.yaml` service block for `java-backend`). This pass wires local dev only; production deployment is a separate follow-up task.
- No change to the frontend's own local copy of `transactionEngine.ts` (used only to populate a local preview list after download — a pre-existing, unrelated inconsistency where the previewed transactions don't match the downloaded PDF's transactions).
- No dual-pipeline / fallback logic. If the Java service is unreachable or errors, the endpoint fails with a clear error — the old Node pipeline is deleted, not kept as a safety net.

## 4. Architecture

```
Frontend (unchanged)
  │  POST /api/pdf/generate-statement  { customerDetails, branchDetails, accountInfo, settings }
  ▼
Express: pdfController.generateStatementPdf
  │  POST {JAVA_SERVICE_URL}/api/statements/generate  (same body, field-for-field)
  ▼
Java: StatementController.generate
  │  { record: StatementRecord, pdfBase64: string }
  ▼
Express: decode base64 → Buffer → stream back with existing headers
  ▼
Frontend: unchanged blob-download handling
```

Express remains the only service the browser talks to. Auth, rate-limiting, and subscription/daily-limit middleware (already applied at the Express layer elsewhere in the app) are untouched by this change since they don't currently wrap `/api/pdf/generate-statement` — this spec does not add or change any auth/rate-limit behavior on that route, it only swaps what happens inside the handler.

## 5. Components

### 5.1 New: `backend/src/services/javaStatementServiceClient.ts`

```ts
export async function generateStatementViaJavaService(payload: {
  customerDetails: unknown;
  branchDetails: unknown;
  accountInfo: unknown;
  settings: unknown;
}): Promise<{ record: any; pdfBuffer: Buffer }>
```

- Reads `JAVA_SERVICE_URL` from `process.env`, defaulting to `http://localhost:8080`.
- Uses Node's built-in global `fetch` (Node 18+, already required by Express 5) — no new dependency.
- `POST {JAVA_SERVICE_URL}/api/statements/generate`, `Content-Type: application/json`, body = the four fields verbatim (matches Java's `GenerateStatementRequest` record field-for-field).
- On non-OK response: read the JSON error body if present (`{ message, error }` per `StatementController`'s error shape) and throw an `Error` with that message; otherwise throw a generic error with the HTTP status.
- On OK: parse JSON as `{ record, pdfBase64 }`, decode with `Buffer.from(pdfBase64, 'base64')`, return `{ record, pdfBuffer }`.

### 5.2 Modified: `backend/src/controllers/pdfController.ts`

`generateStatementPdf`:
- Keep the existing request validation (`customerDetails`/`branchDetails`/`accountInfo`/`settings` required).
- Replace the body (transaction generation, HTML rendering, Puppeteer launch, font/metadata patching, PKCS#7 signing, password encryption) with a single call to `generateStatementViaJavaService(...)`.
- Build the filename the same way as today (`${settings.bankStyle || 'Bank'}_Statement_${randCode}.pdf`).
- Set the same response headers as today: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="..."`, `Content-Length`, `X-Statement-ID: <record.id from the Java response>`.
- On failure (network error or thrown error from the client): respond `502` with `{ message: 'Statement PDF generation failed', error: <message> }` (matching the existing error-shape convention used elsewhere in this file). No retry, no fallback to the old pipeline.

`generatePdf` (the raw-HTML endpoint) is untouched — it keeps its own Puppeteer + `encryptPdfBuffer` usage.

### 5.3 Deleted (confirmed dead after the swap — each is imported only by the code being replaced)

- `backend/src/services/transactionEngine.ts`
- `backend/src/templates/statementTemplates.ts`
- `backend/src/utils/pdfSigner.ts`
- The `patchPdfFontsAndMetadata` helper function inside `pdfController.ts` (used only by `generateStatementPdf`)

`encryptPdfBuffer` (also in `pdfController.ts`) stays — `generatePdf` still uses it.

### 5.4 Config

- `backend/.env` and `backend/.env.example`: add `JAVA_SERVICE_URL=http://localhost:8080`.

## 6. Local Dev Workflow

Three processes run side by side during development:
1. `cd java-backend && mvn spring-boot:run` (port 8080)
2. `cd backend && npm run dev` (port 5000)
3. `cd frontend && npm run dev`

## 7. Testing

The Node backend has no automated test suite (`backend/package.json` defines no `test` script), so verification is manual:
- Start the Java service and the Node backend.
- `curl -X POST http://localhost:5000/api/pdf/generate-statement` with a representative JSON body (sample `customerDetails`/`branchDetails`/`accountInfo`/`settings`) and confirm a valid `application/pdf` response with the expected headers.
- Stop the Java service and repeat the request; confirm a `502` with a clear error message (no hang, no silent fallback).
- Exercise the existing frontend "Generate & Download" flow (`GenerateTab.tsx` / `GeneratorPage.tsx`) end-to-end and confirm the downloaded PDF opens correctly and matches the SBI2/standard-bank layouts already validated in the Java service's own test suite.

## 8. Self-Review Notes

- **Scope:** single endpoint swap plus three dead-file deletions plus one env var. No frontend changes, no deployment changes, no dual-pipeline complexity — matches the approved design exactly.
- **Contract stability:** request/response shape of `/api/pdf/generate-statement` is byte-for-byte unchanged from the frontend's point of view.
- **Dead-code claim verified:** grepped `backend/src` for importers of `transactionEngine`, `statementTemplates`, and `pdfSigner` — each has exactly one importer (`pdfController.ts`), confirming safe deletion once that importer is rewritten.

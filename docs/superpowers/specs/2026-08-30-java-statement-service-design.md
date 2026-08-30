# Java Statement Generation Service — Design Spec

Date: 2026-08-30

## 1. Goal

Move bank-statement generation (transaction synthesis + PDF rendering + digital
signing) out of the frontend/Node split it lives in today, into a single new
Java (Spring Boot) service. This also fixes an existing bug: today the
frontend generates one random transaction set for on-screen preview
(`frontend/src/lib/transactionEngine.ts`) while the Node backend independently
generates a *different* random set for the actual downloaded PDF
(`backend/src/services/transactionEngine.ts`, called from
`generateStatementPdf`) — the two can diverge. The new service generates once
and returns both the data and the PDF from that single generation.

## 2. Non-goals (explicitly out of scope for this project)

- JWT/auth, session/cookie handling
- User/admin management, roles
- Database persistence (Mongo or otherwise) — this service is stateless
- Rate limiting, activity logging, login history, analytics, statement logs
- Removing or modifying the existing Node backend or its routes — `backend/`
  keeps running as-is; `/api/pdf/*` and `/api/statements/*` are simply not
  called by the frontend's generation flow anymore once this ships. Nothing
  in `backend/` is deleted as part of this project.

## 3. Architecture

A new standalone project at `java-backend/` (Maven, Spring Boot), sibling to
`backend/` and `frontend/`. Runs on its own port (default `8080`), no shared
code or process with the Node service.

```
frontend  ──POST /api/statements/generate──▶  java-backend (Spring Boot)
                                                 ├─ engine   (transaction synthesis)
                                                 ├─ pdf      (iText layouts, one per bank style)
                                                 └─ signing  (self-signed PKCS#7 + password protection)
```

The frontend adds an env var (e.g. `VITE_JAVA_API_URL`) pointing at this
service and calls it directly for generation. The existing
`downloadStatementPdfFromBackend` call in `frontend/src/lib/pdfExport.ts` is
retargeted to the new endpoint and response shape (see §4).

## 4. API Contract

**`POST /api/statements/generate`**

Request body (same shape as today's `generateStatementPdf` input):

```json
{
  "customerDetails": { "accountHolderName": "...", "email": "...", "address": "...", "accountNumber": "...", "cifNumber": "...", "accountOpenDate": "...", "nomineeName": "...", "city": "...", "pinCode": "..." },
  "branchDetails": { "branchName": "...", "branchAddress": "...", "branchCode": "...", "branchEmail": "...", "branchPhone": "...", "ifscCode": "...", "micrCode": "...", "ckycrNumber": "...", "city": "...", "pinCode": "..." },
  "accountInfo": { "openingBalance": 0, "interestRate": 0, "currency": "INR", "accountStatus": "Active", "accountType": "..." },
  "settings": {
    "bankStyle": "SBI | SBI2 | Kotak | BOI | PNB",
    "duration": "1 Month | 2 Months | 3 Months | 6 Months | 12 Months",
    "generationMode": "duration | custom",
    "fromDate": "...", "toDate": "...",
    "pageCount": "1 Page | 2 Pages | 3 Pages | 5 Pages | 10 Pages | 12 Pages | 15 Pages | 20 Pages | 30 Pages | Custom",
    "customTransactionsCount": 0,
    "transactionMode": "Low | Normal | High",
    "profile": "Personal | Business",
    "salaryMode": "auto | manual", "companyName": "...", "monthlySalary": 0, "salaryDay": "...",
    "pdfPassword": "...", "enablePdfPassword": false
  }
}
```

Response body — single call returns both the record (for the app's
preview/history UI) and the finished PDF (for download), generated from the
same transaction list:

```json
{
  "record": {
    "id": "stmt_...",
    "createdAt": "2026-08-30T...",
    "customerDetails": { ... },
    "branchDetails": { ... },
    "accountInfo": { ... },
    "settings": { ... },
    "transactions": [ { "id": "...", "valueDate": "...", "postDate": "...", "details": "...", "refNo": "...", "debit": null, "credit": 0, "balance": 0 } ],
    "closingBalance": 0,
    "totalCredits": 0,
    "totalDebits": 0,
    "drCount": 0,
    "crCount": 0
  },
  "pdfBase64": "..."
}
```

Frontend decodes `pdfBase64` to trigger the file download and uses `record`
directly for the in-app preview/history entry — no second generation, no
divergence.

Validation: 400 if `customerDetails`/`branchDetails`/`accountInfo`/`settings`
missing, mirroring today's check in `generateStatementPdf`.

## 5. Component Design

### 5.1 `engine` package — port of `transactionEngine.ts`

A faithful, function-for-function port of the ~30 functions in
`backend/src/services/transactionEngine.ts` (identical to the frontend copy
save for import path) into Java, preserving exact randomization behavior
(same distributions, weights, ranges):

- Primitives: `randRange`, `pick`, `genRef`, `weightedPick`, `getRandomPaise`
- Formatting/refs: `getRandomOpeningBalance`, `generateRefNo`, `formatDate`,
  `isoToIndianFormat`
- Settings interpretation: `getDurationDays`, `getPageToTxCount`,
  `getDateRange`
- Narrative builders: `detectPrimaryCity`, `getRandomUpiBank`,
  `buildUpiNarrativeForMerchant`, `buildUpiNarrative`,
  `buildSalaryNeftNarrative`, `buildSOLNarrative`, `buildSBIntNarrative`
- Salary logic: `getRandomCompany`, `getRandomSalaryAmount`, `getSalaryInfo`,
  `getSalaryDayOfMonth`, `adjustSalaryDate`, `getLastWorkingDay`,
  `getSalaryDateForMonth`
- Amount generators: `getMerchantDebit`, `getP2pDebitAmount`,
  `getContinuousCreditAmount`, `getRefundAmount`
- Top-level generators: `generateRawSalariedTransactions`,
  `generateStatementTransactions`, `generateSalariedStatementTransactions`

Port the *current* state of the file, including the in-flight uncommitted
tuning (lower P2P credit ratio/amounts, expanded refund templates) already
sitting in the working tree — that's the source of truth, not the last
commit.

### 5.2 `pdf` package — rebuild of `statementTemplates.ts` in iText

`statementTemplates.ts` (`renderStatementHtml`, 358 lines) currently branches
on `bankStyle` to produce HTML for SBI, SBI2, BOI, Kotak, and PNB. Each
becomes its own iText layout class implementing a common interface:

```java
interface StatementTemplate {
    byte[] render(StatementRecord record);
}
```

- `SbiTemplate`, `Sbi2Template`, `KotakTemplate`, `BoiTemplate`, `PnbTemplate`
- Shared helpers ported from the TS file: `chunkTransactions` (pagination:
  first page 8 rows, subsequent pages 20), `formatCurrency`,
  `formatAddress4Lines`, `formatSbiDate`, `formatSbiAccountNumber`
- A4 page size, matching today's Puppeteer output (`format: 'A4'`, zero
  margins, `printBackground` equivalent — iText draws backgrounds/borders
  natively via `Table`/`Cell` styling)

### 5.3 `signing` package — port of `pdfSigner.ts` and password protection

Today's Node code hand-builds a fake PKCS#7 signature block by splicing raw
PDF bytes (`pdfSigner.ts`) and separately *pretends* the PDF came from real
iText by string-patching `/Producer`, `/Creator`, and font metadata
(`patchPdfFontsAndMetadata` in `pdfController.ts`) to erase Puppeteer/Chromium
fingerprints. Since the new service uses **real** iText, that spoofing step
disappears entirely — instead, set `/Producer` and `/Creator` explicitly via
iText's `PdfDocumentInfo` to match the existing brand convention (e.g.
`"State Bank of India Internet Banking System"`), and use standard
Type1/Helvetica/WinAnsiEncoding fonts natively (no post-hoc regex patching
needed).

- **Digital signature**: use iText's built-in `PdfSigner` +
  BouncyCastle, with a self-signed RSA-2048 cert generated at startup
  (mirrors `getSbiCertPair()`'s subject/issuer attributes: CN "State Bank of
  India Corporate Signer", O "State Bank of India", etc.), detached PKCS#7,
  SHA-256 digest — same visible signature panel/reason/location/signer-name
  fields as today (`reason`, `location`, `signerName` per bank style).
- **Password protection**: iText's `WriterProperties.setStandardEncryption`
  with user password == owner password (matches `muhammara.recrypt`'s
  current behavior), applied only when
  `settings.enablePdfPassword && settings.pdfPassword` is set.

## 6. Testing Strategy

- **Engine unit tests**: weighted amount generators land within their
  documented ranges over many samples; running balance stays arithmetically
  consistent across a generated transaction list; `getDurationDays`/
  `getPageToTxCount` map settings to the same values as the TS version;
  salary date logic lands on a valid working day.
- **PDF smoke tests**: for each of the 5 bank styles, generate a statement
  from representative settings and assert the PDF is well-formed (parses,
  correct page count for the requested `pageCount`, non-empty text layer).
- **API test**: `POST /api/statements/generate` with a full valid payload
  returns 200 with a `record.transactions` list whose totals match the
  embedded PDF's rendered numbers (spot-check a few via PDF text
  extraction); malformed payload returns 400.

## 7. Deployment / Integration Notes

- `java-backend/` ships with its own `render.yaml`-equivalent or is added as
  a second service in the existing `render.yaml` if deploying to Render;
  exact deployment config is a detail for the implementation plan, not this
  spec.
- Frontend change is narrow: `frontend/src/lib/pdfExport.ts`'s
  `downloadStatementPdfFromBackend` points at the new service and handles
  the new `{ record, pdfBase64 }` response shape instead of a raw PDF
  stream; `GenerateTab.tsx`'s local fallback call to
  `generateStatementTransactions` (used only to populate the preview/history
  record after download) is removed since `record` now comes back from the
  same call that produced the PDF.
- `frontend/src/lib/transactionEngine.ts` and
  `backend/src/services/transactionEngine.ts` are left in place, untouched,
  until a later cleanup project explicitly removes them (out of scope here).

## 8. Assumptions / Open Questions

- **iText licensing**: iText 7/8's core library is AGPL v3 (free) or
  commercial-licensed. AGPL requires the service's own source to be
  disclosed if distributed/offered as a network service. **Resolved:** AGPL
  accepted — proceed with iText under AGPL v3.
- **Build tool**: Maven assumed for `java-backend/`; swap for Gradle if
  preferred — no impact on the design above.
- **Java/Spring Boot version**: not pinned here; the implementation plan
  should pick current stable versions (e.g. latest Spring Boot 3.x on a
  current LTS JDK).

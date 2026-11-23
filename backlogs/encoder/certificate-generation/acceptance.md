# Encoder: Certificate Generation (Template, Print and PDF Export)

| Field | Value |
|-------|-------|
| **Jira** | MP-64 |
| **Type** | Feature (a certificate module in the backend, and a Certificates section in the Encoder panel) |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira default, reassign if needed) |
| **Depends on** | MP-60 (the form and the status values), MP-61 and MP-62 (the Trainer and Registrar validations), MP-63 (the Encoder page, Process and Release). The real template artwork from MCCTEST, **not supplied yet (TBA)**, see open question 1 |
| **Related** | FUNC-010 (certificate management) and FUNC-017 (public certificate verification, later). The paper, Figure 36 (automated certificate generation) and Figures 26 to 29 (Encoder interfaces) |
| **Interface** | The Certificates section in the side panel of `/encoder/clearance-requests` (MP-63). No new page |
| **Added** | 2026-11-23 |
| **TBA (to be announced)** | Four things are not decided yet: the **real template** (not supplied yet), the **certificate control number format**, the **paper size and orientation**, and **whether Process (MP-63) needs the certificate generated first**. See the Open Questions. The build can start with a placeholder template and settings that can change without touching the code |

---

## User Story

**As** an encoder,
**I want** a Generate certificate button that makes the certificate by itself, with the student's name already on the template,
**so that** I can print it or export it to PDF without typing or designing anything.

## Background

- Today the certificates are made by hand in Canva (paper, Technology Stack table), then signed and logged. The paper's design (Figure 36) is: the Encoder clicks one button, the system fills a template, and the Encoder exports or prints it. Physical signatures are added after printing.
- **The button turns on when the Trainer and the Registrar have both validated**, which is status `REGISTRAR_VALIDATED` (MP-61, MP-62). Before that it is disabled. It also works while the request is `PROCESSED` (MP-63).
- Tables that already exist (empty on 2026-11-23): `certificate_type` (COC, COT, NC, OTHER, filled), `certificates` (the templates: `template_name`, `template_image`, `is_active`, `certificate_type_id`), `generated_certificate` (`clearance_id`, `enrollment_id`, `certificate_type_id`, `template_id`, `date_generated`, `date_released`, `released_by`, `release_status` PENDING, RELEASED or CANCELLED, unique `control_number`, `remarks`), and `ctrl_num_seq` (per program, year and sequence type).
- There are **two numbers**: the **request control number** printed on the form and the claim stub (MP-60), and the **certificate control number** printed on the certificate (this ticket). The certificate number is the one the later public verification page will look up (FUNC-017).
- The paper names PDFKit or Puppeteer for PDF generation. This ticket uses **PDFKit**: a template image with text placed on it. Puppeteer needs a browser and is much heavier.

## When the Button Is On

| Request status | Generate certificate | View, Print, Export PDF |
|----------------|----------------------|-------------------------|
| `PENDING_VALIDATION` (waiting for the Trainer) | Disabled: "Waiting for the Trainer" | Nothing to show |
| `TRAINER_VALIDATED` (waiting for the Registrar) | Disabled: "Waiting for the Registrar" | Nothing to show |
| **`REGISTRAR_VALIDATED`** | **On** | Once generated |
| **`PROCESSED`** | **On** if a requested certificate is not generated yet. Regenerate for a correction | Yes |
| `RELEASED` | Off (no new certificate after release) | Yes |
| `REJECTED`, `CANCELLED` | Off | Nothing to show |

The API enforces the same table. The button is only the screen.

## What the Certificate Shows

| Field on the template | Filled from |
|-----------------------|-------------|
| **Student's full name**, in capitals (first, middle, last) | The trainee's user record. Never typed |
| Certificate title (Certificate of Completion or Certificate of Training) | The certificate type |
| Program (qualification) name | The enrollment's program |
| Training dates | The batch start and end dates |
| Total training hours | `programs.total_training_hours`, shown only when it is set |
| Date issued | The day it is generated |
| **Certificate control number** | Made by the system (see below) |
| Signature lines with the printed names of the signatories | Fixed on the template. The lines are blank for the physical signatures |

**Certificate control number:** made by the system from a running sequence in `ctrl_num_seq` (sequence type `CERTIFICATE`). Unique. A gap is allowed (a failed generation may use a number). **The format is TBA** (open question 2). Until it is decided the build uses the program's `control_number_prefix`, the year and the sequence as a placeholder.

## Open Questions

| # | Question | Assumption until answered |
|---|----------|---------------------------|
| 1 | The real template (artwork and wording) | **Not supplied yet (TBA).** MCCTEST makes it in Canva today. Until it is supplied, a plain placeholder template is seeded for COC and COT so the feature can be built and tested. The field positions are set with each template, so swapping in the real one needs no code change (CG-23) |
| 2 | The certificate control number format | **TBA.** The paper's examples ("MCCTEST-221", "COC 01-2") need MCCTEST's confirmation. The format is kept in one place, so it can change without touching the rest |
| 3 | Who signs, and is a signature image printed? | **Assumed:** no. The names and titles are printed and the lines are left blank, because the paper says physical signatures are added after printing (Figure 36) |
| 4 | Paper size and orientation | **TBA.** To confirm with MCCTEST's printer. The size and orientation are a setting on the template, not fixed in the code |
| 5 | What about "Other" and the National Certificate? | **Assumed:** not generated. "Other" has no template. A National Certificate (NC) is TESDA's to issue (interview), so the system only tracks it |
| 6 | Does Process (MP-63) need the certificate generated first? | **TBA.** Until it is decided, Process (MP-63) does not require it, and generating is a separate click |
| 7 | Is the PDF stored, or made again each time? | **Assumed:** stored in private storage, so a reprint is identical even if the template changes later. Adds a `file_path` column |
| 8 | Can the trainee download the certificate? | **Assumed:** no. The trainee gets the paper certificate at release. A download comes later |
| 9 | Can an Admin manage templates? | **Assumed:** later. For now templates are seeded and changed by a developer |

## Scope

### A. In the Encoder side panel (`/encoder/clearance-requests`)

- A **Certificates** section listing each requested type: "Not generated", or "Generated" with the control number and the date.
- The **Generate certificate** button (see the table above). One click makes every requested type that has an active template.
- For each generated certificate: a **preview** with the student's name, **Print**, **Export PDF** and **Regenerate**.
- A short message while generating, and a clear error if it fails.

### B. Backend

- A certificate module (service, controller, PDF renderer, template loader, control number sequence) next to the clearance module, used by the Encoder controller of MP-63.
- A transaction per generation: the control number, the `generated_certificate` rows, the stored files' paths and the history row are saved together.

### C. The logs

- Generating or regenerating writes one `clearance_status_history` row. The status does not change, so the old and new status are the same and the remark says what happened (for example "Certificate generated: COC, PREFIX-26-0001").

## Design

### Backend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| Module | `src/certificates/` (module, service, PDF renderer, DTOs) | Availability rules, generation, regenerate, file access |
| Controller | `src/users/encoder/clearance/` (extend the MP-63 controller) | `@Roles(Role.ENCODER)` |
| Renderer | `src/certificates/certificate-pdf.service.ts` | PDFKit: template image, text placed by the template's layout, fonts embedded |
| Storage | A private storage bucket `certificates` | The generated PDFs. No public URL |

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/encoder/clearance-requests/:id/certificates` | The requested types, what is generated, and whether the button is on |
| POST | `/api/encoder/clearance-requests/:id/certificates` | Generate every requested type that has a template |
| POST | `/api/encoder/clearance-requests/:id/certificates/:certificateId/regenerate` | Regenerate with a reason |
| GET | `/api/encoder/certificates/:certificateId/file` | The PDF, inline for printing, or `?download=1` as a file |

### Schema (one additive migration)

- `generated_certificate`: add `generated_by` (FK to users), `file_path`, and a partial unique index on (`clearance_id`, `certificate_type_id`) where `release_status` is not `CANCELLED`.
- `certificates`: add `layout` (jsonb, where each field sits on the template). Seed one active template each for COC and COT.
- `ctrl_num_seq`: use the existing table with `sequence_type = 'CERTIFICATE'`.

### Frontend

| Piece | Location |
|-------|----------|
| Section | `src/pages/users/encoder/clearance/` (a Certificates component inside the MP-63 side panel) |
| API | `src/api/users/encoder-certificate.api.ts` |
| Print | Opens the PDF in a print dialog with no extra margins |

### Dependency

- Add `pdfkit` (and its types). `npm audit` must show no new high or critical items.

## Out of Scope

- A template editor or upload page, and an Admin screen for templates.
- The public certificate verification page (FUNC-017) and a QR code.
- The trainee downloading the certificate.
- "Other" and National Certificate types. Image export (PNG).
- Notifications (MP-52).

---

## Acceptance Criteria

### Availability

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CG-1 | Only an encoder can use the certificate endpoints and the Certificates section. Trainee, trainer, registrar and admin get 403, and every endpoint returns 401 without a token | NOT STARTED | |
| CG-2 | The **Generate certificate** button is on only when the request status is `REGISTRAR_VALIDATED` or `PROCESSED`. It is disabled with the reason "Waiting for the Trainer" or "Waiting for the Registrar" before that, and off for `RELEASED`, `REJECTED` and `CANCELLED` | NOT STARTED | See the table |
| CG-3 | Generating on `PENDING_VALIDATION`, `TRAINER_VALIDATED`, `RELEASED`, `REJECTED` or `CANCELLED` returns 400 by API and creates nothing. The button cannot be bypassed | NOT STARTED | |
| CG-4 | When both the Trainer and the Registrar have validated, the button turns on without a page reload on the next refresh of the panel, and it is the only thing the encoder has to click | NOT STARTED | "Automated" |

### Generating

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CG-5 | One click makes one certificate for every requested type that has an active template (Certificate of Completion, Certificate of Training). No field is typed or chosen | NOT STARTED | |
| CG-6 | The student's name is filled in automatically from the trainee record, in capitals, as first, middle and last name. Accents, `ñ`, hyphens and apostrophes print correctly | NOT STARTED | |
| CG-7 | The template also shows the program name, the certificate title, the training dates (batch start and end), the total training hours (only when set), the date issued and the certificate control number, all from the records | NOT STARTED | |
| CG-8 | A long name or a long program name fits on the template (the text shrinks or wraps within its area). Nothing is cut off or overlaps another field | NOT STARTED | |
| CG-9 | The certificate control number is made by the system from a sequence (`ctrl_num_seq`). It is unique, also when two certificates are generated at the same moment. The format is TBA | NOT STARTED | Open question 2 (TBA) |
| CG-10 | Each certificate saves a `generated_certificate` record: the clearance, the enrollment, the type, the template, the date generated, `release_status = PENDING`, the control number, who generated it and the file path | NOT STARTED | |
| CG-11 | There is one active certificate per request per type. A second click returns 409 "already generated" and creates no duplicate | NOT STARTED | Partial unique index |
| CG-12 | A request that asks only for "Other" or a National Certificate has nothing to generate: the button is disabled with "Prepared outside the system". If it asks for COC and Other, only the COC is generated and "Other" shows "Prepared outside the system" | NOT STARTED | Open question 5 |
| CG-13 | If a requested type has no active template, the request returns a clear error ("No active template for Certificate of Completion") and nothing is saved | NOT STARTED | |
| CG-14 | Generation is one transaction: the certificate records, the file paths and the history row are saved together. If the PDF cannot be made or stored, nothing is saved (a control number may be skipped) | NOT STARTED | |
| CG-15 | Generating writes one `clearance_status_history` row per request. The status does not change. The remark names the type, the control number and the encoder | NOT STARTED | |

### Print and Export

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CG-16 | After generating, the panel shows a preview of each certificate with the student's name | NOT STARTED | |
| CG-17 | **Print** opens the certificate in a print dialog at the template's paper size and orientation, with nothing cropped | NOT STARTED | Paper size TBA, open question 4 |
| CG-18 | **Export PDF** downloads one PDF named `<certificate control number> - <student name>.pdf`. It is a single page, opens in a normal viewer, has the fonts embedded and the text can be selected | NOT STARTED | |
| CG-19 | Print and Export give exactly the same file every time, including after the template is changed later, because the PDF is stored | NOT STARTED | Open question 7 |
| CG-20 | View, Print and Export work for an already generated certificate in `REGISTRAR_VALIDATED`, `PROCESSED` and `RELEASED` | NOT STARTED | |
| CG-21 | **Regenerate** (for a correction) needs a reason and works while the request is not `RELEASED`. The old certificate becomes `CANCELLED` and is no longer offered for print. A new certificate with a new control number is made. The reason is in the history row. The old file is kept | NOT STARTED | |

### Templates

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CG-22 | Templates are rows in `certificates` (type, name, image, `is_active`, `layout`). One active template each for COC and COT is seeded. Generation uses the active one for the type | NOT STARTED | Open question 1 (the real template is not supplied yet) |
| CG-23 | The positions and sizes of the fields come from the template's `layout`. A new template with a different layout needs no change in the renderer code. The signature lines are left blank for physical signatures | NOT STARTED | Open question 3 |

### In the Pipeline

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CG-24 | **TBA.** If it is decided that Process (MP-63) needs the certificate, then **Process** returns 400 "Generate the certificate first" unless every requested COC or COT has been generated. Until decided, Process does not require it | NOT STARTED | Open question 6 (TBA). Would change MP-63 CE-13 |
| CG-25 | When the request is released (MP-63), its `generated_certificate` rows are set to `RELEASED` with `released_by` and `date_released`. A request cancelled or rejected after generation sets them to `CANCELLED` | NOT STARTED | |
| CG-26 | A generated certificate can be found by its control number in the database, ready for the later public verification (FUNC-017). No public endpoint is added here | NOT STARTED | |

### Security, Performance and Quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CG-27 | The certificate and the responses contain only the name, program, dates, hours, date issued and control number. No contact details, address, birth date or password hash | NOT STARTED | |
| CG-28 | The PDFs are stored in a private bucket. They are served only through the Encoder endpoint (streamed, or a short-lived signed link). A direct storage link does not work | NOT STARTED | |
| CG-29 | Generating a request's certificates takes under 15 seconds (SRS 5.1) and under 5 seconds locally for two certificates. The server stays responsive for other requests meanwhile | NOT STARTED | |
| CG-30 | Two encoders clicking Generate at the same moment, or one encoder double-clicking: exactly one set of certificates is made, the other call gets 409, control numbers stay unique and the history has one row | NOT STARTED | |
| CG-31 | The button is disabled while generating, so it cannot be double-submitted. The panel shows a loading state, a success message and a clear error. Print works in current Chrome, Edge and Firefox | NOT STARTED | |
| CG-32 | `pdfkit` is the only new dependency. `npm audit` shows no new high or critical item. The fonts used are embedded in the PDF | NOT STARTED | |
| CG-33 | Backend and frontend lint, type-check and build pass with 0 problems. Unit tests cover the availability by status, one certificate per type, no template, control number uniqueness, name formatting (accents, long names), regenerate, the transaction failure and Process needing the certificate. A test reads the text of a generated PDF and finds the name and the control number | NOT STARTED | |
| CG-34 | The MP-63 Encoder page, the release log, the trainee pages and the Trainee Information pages (MP-51) are not affected | NOT STARTED | |

---

## Test Cases

### TC-01: The button follows the pipeline
- **Precondition:** Four requests, one in each of `PENDING_VALIDATION`, `TRAINER_VALIDATED`, `REGISTRAR_VALIDATED` and `RELEASED`.
- **Steps:** Open each as the encoder and look at the Certificates section.
- **Expected:** The first shows the button disabled with "Waiting for the Trainer", the second disabled with "Waiting for the Registrar", the third **on**, the fourth off. Then validate the first two requests through the Trainer and the Registrar and open them again: the button turns on when the Registrar's validation is done.

### TC-02: Generate a Certificate of Completion
- **Precondition:** A `REGISTRAR_VALIDATED` request for "Maria Dela Cruz" asking for Certificate of Completion.
- **Steps:** Click Generate certificate.
- **Expected:** One certificate is made. The preview shows "MARIA DELA CRUZ" without anything being typed, with the program, the training dates, the date issued, the title and a control number. The Certificates section shows "Generated" with the number. A `generated_certificate` row exists with `release_status = PENDING`, and one history row says "Certificate generated".

### TC-03: Two types in one request
- **Precondition:** A request asking for both Certificate of Completion and Certificate of Training.
- **Steps:** Click Generate certificate once.
- **Expected:** Two certificates are made, each with its own title and its own control number. Both show Print and Export PDF.

### TC-04: "Other" and a missing template
- **Steps:** Open a request that asks only for "Other". Open one that asks for COC and "Other". Then deactivate the COC template in a test database and try to generate.
- **Expected:** The first has the button disabled with "Prepared outside the system". The second makes only the COC and marks "Other" as prepared outside. With no active template the request returns "No active template for Certificate of Completion" and nothing is saved.

### TC-05: Names on the template
- **Steps:** Generate for trainees named "Ana María Peña-Ñañez", "D'Angelo O'Brien", a four-word name and a name of about 60 characters, with a long program name.
- **Expected:** Each name prints in capitals with the accents, `ñ`, hyphen and apostrophe intact, fits inside its area and overlaps nothing.

### TC-06: Print
- **Steps:** Click Print on a generated certificate.
- **Expected:** A print dialog opens with the certificate on one page at the template's paper size (TBA), nothing cropped, no extra header or footer from the app.

### TC-07: Export PDF
- **Steps:** Click Export PDF. Open the file. Try to select the name and search for the control number.
- **Expected:** A file named `<control number> - <student name>.pdf` downloads. It is one page, opens in a normal viewer, the text can be selected, and the name and the control number are found.

### TC-08: Twice, and two encoders at once
- **Steps:** Click Generate again on a request that already has its certificate. Then, on a new request, send two Generate calls at the same moment.
- **Expected:** The repeat returns 409 and makes no duplicate. In the race one wins and the other gets 409. There is one set of certificates, unique control numbers and one history row.

### TC-09: Regenerate
- **Precondition:** A generated certificate with a spelling mistake in the trainee's name, now fixed in the record.
- **Steps:** Click Regenerate. Try with no reason, then give "Name corrected" and confirm.
- **Expected:** The empty reason is refused. With a reason the old certificate becomes `CANCELLED` and is no longer offered for print. A new certificate with the corrected name and a new control number is made. The history row holds the reason.

### TC-10: Wrong status by API
- **Steps:** Call generate on requests in `PENDING_VALIDATION`, `TRAINER_VALIDATED`, `RELEASED`, `REJECTED` and `CANCELLED`.
- **Expected:** 400 for every one. No certificate and no history row are created. No control number is used.

### TC-11: Process needs the certificate (only if decided, TBA)
- **Precondition:** A `REGISTRAR_VALIDATED` request with no certificate generated.
- **Steps:** Try to Process it. Generate the certificate, then Process again.
- **Expected:** The first returns 400 "Generate the certificate first". After generating, Process works and the request is `PROCESSED`.

### TC-12: Release updates the certificate
- **Precondition:** A `PROCESSED` request with a generated certificate.
- **Steps:** Release the request with the control number from the claim stub.
- **Expected:** The request is `RELEASED`, and its certificate row is `RELEASED` with `released_by` and `date_released`. View, Print and Export still work. Generate is off.

### TC-13: Roles and private files
- **Steps:** Call every certificate endpoint as Trainee, Trainer, Registrar and Admin, and with no token. Try the raw storage link of a stored PDF.
- **Expected:** 403 for the four roles, 401 without a token. The raw storage link does not give the file.

### TC-14: Same file later, and a failed generation
- **Steps:** Export a certificate, change the template's layout in a test database, export it again. Then make the PDF step fail on purpose (storage unavailable) and click Generate.
- **Expected:** The two exports are identical. The failed generation shows an error and saves no certificate record and no history row.

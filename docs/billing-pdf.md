# Billing PDF downloads

Invoices and quotes have two separate actions:

- **Download PDF** creates a local PDF with the filename `Client Month Year - Number.pdf`.
- **Print / Preview** keeps the existing HTML preview and browser print flow.

The download is generated on the client. No invoice content is uploaded to an external PDF service, and generating a PDF does not change invoice/quote status or write to Supabase. A company logo is loaded from its existing URL; inaccessible logos produce an explicit error rather than silently omitting branding.

## Structure

- `public/app.js` builds the existing shared document HTML, provides the safe filename, and lazy-loads the PDF engine.
- `src/billing-pdf.js` reads that HTML for labels, values, customer details, Notes and quote exclusions. It draws a vector A4 PDF using jsPDF and AutoTable; no billing calculation is repeated.
- `public/vendor/billing-pdf.js` is the committed browser bundle, including regular/bold Liberation Sans fonts (Arial-compatible metrics), so Firebase Hosting can deploy the static files without a build server.

Tables repeat their headings on later pages. Normal rows remain together; a row taller than a full page can split. Totals are right-aligned and bottom-anchored when they fit, and long Notes continue full-width onto later pages. Footers show the actual PDF page count.

## Build and check

Use Node 22.13+ (required by the font-source package):

```sh
npm ci
npm run build:billing-pdf
npm run test:billing-pdf
node --check public/app.js
```

Tests use synthetic data and write QA PDFs to ignored `tmp/pdfs/`. The test harness (`node scripts/serve-billing-pdf-test.cjs`) serves only synthetic documents and the PDF bundle at `http://127.0.0.1:5187`. It does not load Supabase or the live app.

Visually inspect the generated single-page, multi-page and long-Notes PDFs when changing layout. Changing the shared preview's markup/classes may require a matching parser change. Rebuild the vendor bundle after source edits, and bump its script URL/cache version when publishing updates. The font licence and bundled third-party notices are distributed alongside the engine.

Firebase Hosting is the only deployment required for this feature; there is no database migration.

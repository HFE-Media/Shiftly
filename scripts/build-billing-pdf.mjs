import { build } from "esbuild";
import { copyFile } from "node:fs/promises";

await build({
  entryPoints: ["src/billing-pdf.js"],
  outfile: "public/vendor/billing-pdf.js",
  bundle: true,
  minify: true,
  format: "iife",
  globalName: "ShiftlyBillingPdf",
  platform: "browser",
  target: ["es2020"],
  loader: { ".ttf": "base64" },
  // These optional jsPDF HTML-rendering dependencies are not used: our renderer
  // draws selectable text/tables directly, not screenshots or untrusted HTML.
  external: ["canvg", "html2canvas", "dompurify"],
  legalComments: "linked"
});
await copyFile("node_modules/pdfjs-dist/standard_fonts/LICENSE_LIBERATION", "public/vendor/LICENSE_LIBERATION.txt");

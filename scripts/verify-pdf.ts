import { createTextPdfBuffer } from "../src/lib/pdf";

async function main() {
  const pdf = await createTextPdfBuffer({
    title: "HomeBase MLS PDF Verification",
    body: [
      "This verifies that generated PDFs are created by pdf-lib.",
      "The document should contain multiple wrapped lines, a footer, and metadata.",
      "LongWordWithoutSpacesLongWordWithoutSpacesLongWordWithoutSpacesLongWordWithoutSpaces",
      "Unicode safety check: café, résumé, jalapeño, and unsupported glyphs like emoji 😀 should not crash generation."
    ].join("\n")
  });

  if (!pdf.subarray(0, 5).toString().startsWith("%PDF-")) {
    throw new Error("PDF output did not start with a valid PDF header.");
  }

  if (pdf.length < 1_000) {
    throw new Error("PDF output was unexpectedly small.");
  }

  console.log(`PDF verification passed (${pdf.length} bytes).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

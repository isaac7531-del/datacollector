import { createHash } from "node:crypto";
import { PDFParse } from "pdf-parse";
import type { ProductDocument } from "../operations/types";

export async function extractPublicDocument(options: {
  url: string;
  productIds: string[];
  fetchImpl?: typeof fetch;
  parserVersion?: string;
}): Promise<ProductDocument> {
  const fetcher = options.fetchImpl ?? fetch;
  const response = await fetcher(options.url, { headers: { "user-agent": "@equibets/nutrition-data/0.1.0" } });
  if (!response.ok) throw new Error(`Unable to fetch document ${options.url}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const contentType = response.headers.get("content-type") ?? "";
  let textExcerpt = "";
  let extractionMethod: ProductDocument["extractionMethod"] = "unsupported";
  if (/pdf/i.test(contentType) || options.url.toLowerCase().endsWith(".pdf")) {
    const parser = new PDFParse({ data: bytes });
    try {
      const parsed = await parser.getText();
      textExcerpt = parsed.text.slice(0, 5000);
      extractionMethod = parsed.text.trim().length ? "embedded_text" : "ocr_required";
    } finally {
      await parser.destroy();
    }
  } else {
    textExcerpt = bytes.toString("utf8").slice(0, 5000);
    extractionMethod = "embedded_text";
  }
  return {
    id: checksum.slice(0, 24),
    productIds: options.productIds,
    url: options.url,
    checksum,
    capturedAt: new Date().toISOString(),
    parserVersion: options.parserVersion ?? "document-ingestion-v1",
    extractionMethod,
    confidence: extractionMethod === "embedded_text" ? "medium" : "low",
    textExcerpt
  };
}

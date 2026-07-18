import { createHash } from "crypto";
import { PDFParse } from "pdf-parse";

export async function fetchText(url: string, userAgent?: string): Promise<{ text: string; checksum: string; contentType: string }> {
  const response = await fetch(url, {
    headers: { "user-agent": userAgent ?? "EquiBetsCompetitionDataEngine/0.2.0 (+rechenstelle)" }
  });
  if (!response.ok) throw new Error(`Fetch failed for ${url}: ${response.status}`);
  const text = await response.text();
  return {
    text,
    checksum: createHash("sha256").update(text).digest("hex"),
    contentType: response.headers.get("content-type") ?? "text/plain"
  };
}

export async function fetchPdfText(url: string, options: { userAgent?: string; maxBytes?: number } = {}): Promise<{ text: string; checksum: string; bytes: number }> {
  const response = await fetch(url, {
    headers: { "user-agent": options.userAgent ?? "EquiBetsCompetitionDataEngine/0.2.0 (+rechenstelle)" }
  });
  if (!response.ok) throw new Error(`PDF fetch failed for ${url}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  if (buffer.length > maxBytes) throw new Error(`PDF exceeds maximum size of ${maxBytes} bytes.`);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return {
      text: result.text,
      checksum: createHash("sha256").update(buffer).digest("hex"),
      bytes: buffer.length
    };
  } finally {
    await parser.destroy();
  }
}

/**
 * PDF text extraction utility
 * Uses pdf-parse v2 (ESM) to extract raw text from PDF buffers.
 */
import { PDFParse } from "pdf-parse";

export interface PdfExtractResult {
  text: string;
  numPages: number;
  info: Record<string, unknown>;
}

/**
 * Extract plain text from a PDF buffer.
 * Returns cleaned text with normalised whitespace.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractResult> {
  // PDFParse accepts a LoadParameters object; data can be Buffer or Uint8Array
  const parser = new PDFParse({ data: buffer } as any);

  // getText() internally calls load() and iterates all pages
  const textResult = await parser.getText();

  const numPages: number = (textResult as any).total ?? 0;
  const rawText: string = (textResult as any).text ?? "";

  // Normalise whitespace: collapse multiple blank lines, trim
  const text = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")   // collapse 3+ blank lines → 2
    .replace(/[ \t]{2,}/g, " ")   // collapse inline spaces
    .trim();

  return {
    text,
    numPages,
    info: {},
  };
}

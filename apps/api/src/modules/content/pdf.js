// Text extraction uses Mozilla pdf.js (pdfjs-dist). The pdf-parse package named in A.3 bundles
// pdf.js 1.10 from 2018, which fails on PDFs from current tools ("bad XRef entry").
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/** Fewer non-space characters than this per page means the PDF is almost certainly a scan. */
const MIN_CHARS_PER_PAGE = 30;
const MAX_PAGES = 500;

/**
 * Extracts text from a PDF. OCR is out of scope for v1 (A.3), so scanned PDFs are flagged.
 * @param {Buffer} buffer
 * @returns {Promise<{ text: string, pageCount: number, scanned: boolean, warning?: string }>}
 */
export async function extractPdfText(buffer) {
  let doc;
  try {
    doc = await getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false, // never evaluate code embedded in a PDF
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    }).promise;
  } catch {
    return {
      text: '',
      pageCount: 0,
      scanned: false,
      warning: 'Could not read this PDF. It may be damaged or password protected.',
    };
  }
  try {
    const pageCount = doc.numPages;
    const pages = [];
    for (let i = 1; i <= Math.min(pageCount, MAX_PAGES); i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : '')).join(''),
      );
      page.cleanup();
    }
    const text = normalise(pages.join('\n\n'));
    const scanned = text.replace(/\s/g, '').length < MIN_CHARS_PER_PAGE * Math.max(pageCount, 1);
    const warnings = [];
    if (scanned)
      warnings.push(
        'Scanned PDF not supported: no text could be extracted. Upload a text-based PDF (OCR is not available in v1).',
      );
    if (pageCount > MAX_PAGES) warnings.push(`Only the first ${MAX_PAGES} pages were read.`);
    return {
      text,
      pageCount,
      scanned,
      ...(warnings.length ? { warning: warnings.join(' ') } : {}),
    };
  } finally {
    await doc.destroy();
  }
}

function normalise(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

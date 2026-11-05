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
      pages.push(joinItems(content.items));
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

/**
 * Joins pdf.js text items into lines. pdf.js has no items for blank lines, so a paragraph break
 * is rebuilt from the vertical gap: a jump of more than ~1.6 line heights becomes a blank line.
 * The A2 chunker splits on those breaks and on headings.
 */
export function joinItems(items) {
  let out = '';
  let lastY = null;
  let lastH = 0;
  for (const it of items) {
    if (!('str' in it)) continue;
    const y = it.transform?.[5];
    const h = it.height || lastH || 10;
    if (lastY !== null && y !== undefined && Math.abs(lastY - y) > h * 0.5) {
      // A new line: decide between a line break and a paragraph break.
      if (!out.endsWith('\n')) out += '\n';
      if (Math.abs(lastY - y) > Math.max(h, lastH) * 1.6 && !out.endsWith('\n\n')) out += '\n';
    }
    out += it.str;
    if (it.hasEOL && !out.endsWith('\n')) out += '\n';
    else if (!it.hasEOL && it.str && !out.endsWith(' ')) out += ' ';
    if (y !== undefined) lastY = y;
    if (it.height) lastH = it.height;
  }
  return out;
}

function normalise(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

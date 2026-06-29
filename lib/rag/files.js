/**
 * File text extraction for the RAG knowledge base.
 *
 * PDF  → unpdf (serverless-friendly pdf.js build), merged to a single string.
 * DOCX → mammoth (raw text).
 * txt / md / fallback → utf-8 decode.
 */

import { extractText } from 'unpdf';
import mammoth from 'mammoth';

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Whether we can extract text from this upload (by mime or extension). */
export function isSupportedFile(mime, filename = '') {
  const name = (filename || '').toLowerCase();
  if (mime === PDF_MIME || mime === DOCX_MIME) return true;
  if (mime && (mime.startsWith('text/'))) return true;
  return /\.(pdf|docx|txt|md|markdown)$/i.test(name);
}

/**
 * Extract plain text from an uploaded file buffer.
 * @param {Buffer} buffer
 * @param {string} mime
 * @param {string} filename
 * @returns {Promise<string>}
 */
export async function extractFileText(buffer, mime, filename = '') {
  const name = (filename || '').toLowerCase();
  const isPdf = mime === PDF_MIME || name.endsWith('.pdf');
  const isDocx = mime === DOCX_MIME || name.endsWith('.docx');

  if (isPdf) {
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    return (text || '').trim();
  }
  if (isDocx) {
    const { value } = await mammoth.extractRawText({ buffer });
    return (value || '').trim();
  }
  // txt / md / anything else we accepted → treat as utf-8 text.
  return buffer.toString('utf-8').trim();
}

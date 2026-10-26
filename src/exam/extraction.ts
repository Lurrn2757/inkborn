import { normalizeAnswer, type ExamQuestion } from './engine.js';

export const MAX_PAPER_BYTES = 10 * 1024 * 1024;
export const MAX_PAPER_PAGES = 30;
export const MAX_IMAGE_PIXELS = 20_000_000;
const MAX_TEXT_LENGTH = 250_000;
const MAX_QUESTIONS = 300;
export type PaperExtraction = { questions: ExamQuestion[]; warnings: string[]; pages: number; markingUnsupported: boolean };
export type ExtractionProgress = (message: string) => void;

type PageText = { text: string; page: number };

/** Checks cheap boundaries before any decoder, worker or network asset request. */
export function validatePaperFile(file: Pick<File, 'name' | 'type' | 'size'>): 'pdf' | 'image' {
  if (file.size <= 0) throw new Error('This file is empty. Select a PDF or image containing an examination.');
  if (file.size > MAX_PAPER_BYTES) throw new Error('Each examination file must be 10 MB or smaller.');
  const extension = file.name.split('.').at(-1)?.toLowerCase();
  const kind = extension === 'pdf' ? 'pdf' : ['png', 'jpg', 'jpeg', 'webp'].includes(extension ?? '') ? 'image' : null;
  const mime = file.type.toLowerCase();
  const allowed = kind === 'pdf' ? ['application/pdf'] : ['image/png', 'image/jpeg', 'image/webp'];
  if (!kind || (mime && !allowed.includes(mime))) throw new Error('Supported files: selectable-text PDF, PNG, JPEG and WEBP.');
  return kind;
}

function parsePages(pages: PageText[]): PaperExtraction {
  if (pages.reduce((length, item) => length + item.text.length, 0) > MAX_TEXT_LENGTH) throw new Error('The extracted paper is too long. Split it into smaller examinations.');
  const warnings: string[] = [];
  const combined = pages.map(item => item.text).join('\n');
  const markingUnsupported = /negative\s+mark|partial\s+(?:mark|credit)|\bpenalt(?:y|ies)\b|\bdeduct(?:ed|ion)?\b|\b(?:answer|attempt|choose)\s+any\b/i.test(combined);
  if (markingUnsupported) warnings.push('This paper appears to use negative marking, partial credit or optional question choices. The engine supports positive marks and every included question only. Review and explicitly replace unsupported rules before graded play.');
  warnings.push('Automatic extraction is a draft. Compare every question, option, mark and page reference with the original. An extraction warning is not evidence of correctness.');
  type Block = { number: string; lines: string[]; page: number; lastPage: number };
  const blocks: Block[] = [];
  let block: Block | null = null;
  for (const page of pages) {
    for (const rawLine of page.text.replace(/\r\n?/g, '\n').split('\n')) {
      const line = rawLine.trim();
      const heading = line.match(/^(?:Q(?:uestion)?\.?\s*)?(\d{1,4}[a-z]?)[.)]\s*(.*)$/i)
        ?? line.match(/^(?:Q(?:uestion)?\.?\s*)(\d{1,4}[a-z]?)\s*[:-]\s*(.*)$/i);
      if (heading) {
        block = { number: heading[1]!, lines: [heading[2]!], page: page.page, lastPage: page.page };
        blocks.push(block);
        if (blocks.length > MAX_QUESTIONS) throw new Error('A maximum of 300 questions is supported per examination.');
      } else if (block && line) { block.lines.push(line); block.lastPage = page.page; }
    }
  }
  const seen = new Set<string>();
  const questions = blocks.map((item, index): ExamQuestion => {
    const raw = item.lines.join('\n').trim();
    const markMatch = raw.match(/(?:\[|\()\s*(\d+(?:\.\d+)?)\s*(?:marks?|pts?|points?)\s*(?:\]|\))/i)
      ?? raw.match(/\bmarks?\s*:\s*(\d+(?:\.\d+)?)/i)
      ?? raw.match(/\[\s*(\d+(?:\.\d+)?)\s*\]\s*$/);
    const proposedMarks = markMatch ? Number(markMatch[1]) : 1;
    const validMarks = proposedMarks > 0 && proposedMarks <= 10000 && Math.abs(proposedMarks * 100 - Math.round(proposedMarks * 100)) < 1e-7;
    if (!markMatch) warnings.push(`Question ${item.number}: marks not found; 1 mark is a review placeholder.`);
    else if (!validMarks) warnings.push(`Question ${item.number}: unsupported marks; replace the 1-mark placeholder before play.`);
    let text = markMatch ? raw.replace(markMatch[0], '').trim() : raw;
    const optionMatches = [...text.matchAll(/(?:^|\s)([A-Ha-h])[).]\s+/g)];
    const options = optionMatches.map((match, optionIndex) => {
      const start = match.index! + match[0].length;
      const end = optionMatches[optionIndex + 1]?.index ?? text.length;
      return { id: match[1]!.toUpperCase(), text: text.slice(start, end).trim() };
    });
    if (optionMatches.length) text = text.slice(0, optionMatches[0]!.index).trim();
    const malformedOptions = options.length === 1 || options.some(option => !option.text) || new Set(options.map(option => option.id)).size !== options.length;
    if (malformedOptions) warnings.push(`Question ${item.number}: options are malformed. Correct or exclude this question.`);
    if (!text) warnings.push(`Question ${item.number}: question text is empty. Correct or exclude this question.`);
    if (!options.length) warnings.push(`Question ${item.number}: no choices detected. Enter a confirmed exact-text answer; essays and partial-credit grading are unsupported.`);
    if (item.lastPage !== item.page) warnings.push(`Question ${item.number} continues across pages ${item.page}–${item.lastPage}; check its boundary.`);
    if (seen.has(item.number)) warnings.push(`Repeated printed question number ${item.number}; verify whether these are distinct questions.`);
    seen.add(item.number);
    return {
      id: `upload-p${item.page}-q${index + 1}`, number: item.number, text, options,
      correctAnswer: null, marks: validMarks ? proposedMarks : 1, keyStatus: 'missing',
      topic: null, topicReviewed: false, explanation: null, excluded: false,
      source: { page: item.page, evidence: `${item.number}. ${raw}`, label: 'Uploaded examination · extraction awaiting review' },
    };
  });
  if (!questions.length) warnings.push('No numbered questions were detected. Paste a corrected numbered transcription or add questions manually.');
  return { questions, warnings, pages: pages.length, markingUnsupported };
}

/** Deliberately literal parser: never solves questions or infers an answer key. */
export function parseExamText(text: string, page = 1): PaperExtraction {
  if (!Number.isInteger(page) || page < 1 || page > 500) throw new Error('Invalid source page number.');
  return parsePages([{ text, page }]);
}

/** Literal, numbered key import. Supplying a key is not the same as confirming it. */
export function parseAnswerKey(text: string, questions: ExamQuestion[]): { questions: ExamQuestion[]; warnings: string[] } {
  if (!text.trim()) throw new Error('Enter a numbered answer key, one answer per line (for example: 1. A).');
  if (text.length > MAX_TEXT_LENGTH) throw new Error('The answer key is too long.');
  const supplied = new Map<string, string>();
  for (const [index, line] of text.replace(/\r\n?/g, '\n').split('\n').entries()) {
    if (!line.trim()) continue;
    const match = line.trim().match(/^(?:Q(?:uestion)?\.?\s*)?(\d{1,4}[a-z]?)\s*[.):=-]\s*(.+)$/i);
    if (!match) throw new Error(`Answer-key line ${index + 1} is not a numbered answer. Use one entry such as "1. A" per line.`);
    const number = match[1]!.toLowerCase(), answer = match[2]!.trim();
    if (supplied.has(number)) throw new Error(`The answer key repeats question number ${match[1]}.`);
    const matches = questions.filter(q => q.number.toLowerCase() === number);
    if (!matches.length) throw new Error(`Answer-key question ${match[1]} is not present in this paper.`);
    if (matches.length > 1) throw new Error(`Question number ${match[1]} is ambiguous. Give repeated printed numbers distinct numbers before importing its key.`);
    const question = matches[0]!;
    if (answer.length > 3000) throw new Error(`The answer for question ${match[1]} is too long.`);
    if (question.options.length) {
      const option = question.options.find(o => normalizeAnswer(o.id) === normalizeAnswer(answer.replace(/^\(([A-Za-z])\)$/, '$1')));
      if (!option) throw new Error(`Question ${match[1]} needs an existing option ID (${question.options.map(o => o.id).join(', ')}).`);
      supplied.set(number, option.id);
    } else supplied.set(number, answer);
  }
  const updated = questions.map(q => supplied.has(q.number.toLowerCase()) ? { ...q, correctAnswer: supplied.get(q.number.toLowerCase())!, keyStatus: 'missing' as const } : { ...q });
  const missing = updated.filter(q => !q.excluded && q.correctAnswer === null).length;
  return { questions: updated, warnings: [`Imported ${supplied.size} answer(s) as an unconfirmed key. Compare them with your authoritative key before confirming.${missing ? ` ${missing} included question(s) still have no answer.` : ''}`] };
}

async function verifySignature(file: File, kind: 'pdf' | 'image') {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  const pdf = starts(0x25, 0x50, 0x44, 0x46, 0x2d);
  const png = starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  const jpeg = starts(0xff, 0xd8, 0xff);
  const webp = starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if ((kind === 'pdf' && !pdf) || (kind === 'image' && !png && !jpeg && !webp)) throw new Error('The file contents do not match a supported examination format.');
}

async function extractPdf(file: File, onProgress: ExtractionProgress): Promise<PaperExtraction> {
  const [pdfjs, workerAsset] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerAsset.default;
  const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true, stopAtErrors: true, disableAutoFetch: true });
  const timeout = setTimeout(() => { void loading.destroy(); }, 45_000);
  try {
    const pdf = await loading.promise;
    if (pdf.numPages > MAX_PAPER_PAGES) throw new Error('PDFs must contain 30 pages or fewer. Split this paper into smaller files.');
    const pages: PageText[] = [];
    let textLength = 0;
    const emptyPages: number[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      onProgress(`Extracting PDF page ${pageNumber} / ${pdf.numPages} locally…`);
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = '', previousY: number | null = null;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = Number(item.transform[5]);
        if (previousY !== null && Math.abs(y - previousY) > 3 && !text.endsWith('\n')) text += '\n';
        text += item.str + (item.hasEOL ? '\n' : ' ');
        previousY = y;
      }
      page.cleanup();
      textLength += text.length;
      if (textLength > MAX_TEXT_LENGTH) throw new Error('The extracted paper is too long. Split it into smaller examinations.');
      if (!text.trim()) emptyPages.push(pageNumber);
      pages.push({ page: pageNumber, text });
    }
    const result = parsePages(pages);
    if (emptyPages.length) result.warnings.unshift(`No selectable text on page(s) ${emptyPages.join(', ')}. Scanned-PDF OCR is not implemented. Upload those pages as images or transcribe them; do not assume this extraction contains the entire paper.`);
    return result;
  } catch (error) {
    if (error instanceof Error && /30 pages|too long/.test(error.message)) throw error;
    throw new Error('This PDF could not be read. Use an unlocked, valid selectable-text PDF. Scanned PDFs need image upload or a corrected transcription.', { cause: error });
  } finally { clearTimeout(timeout); await loading.destroy(); }
}

async function extractImage(file: File, onProgress: ExtractionProgress): Promise<PaperExtraction> {
  const image = await createImageBitmap(file).catch(() => { throw new Error('The image is malformed or cannot be decoded.'); });
  const pixels = image.width * image.height;
  image.close();
  if (!pixels || pixels > MAX_IMAGE_PIXELS) throw new Error('Images must contain 20 megapixels or fewer. Resize this page before uploading.');
  const [{ createWorker }, workerAsset] = await Promise.all([import('tesseract.js'), import('tesseract.js/dist/worker.min.js?url')]);
  // The worker is bundled locally. Only public runtime and English model files are
  // fetched from CDNs; image bytes are passed to the worker on this device.
  onProgress('Loading local OCR. The first run downloads public English recognition assets…');
  const workerRef: { current: Awaited<ReturnType<typeof createWorker>> | null } = { current: null };
  let expired = false;
  let rejectWorker: (reason: Error) => void = () => {};
  const failure = new Promise<never>((_resolve, reject) => { rejectWorker = reject; });
  const timeout = setTimeout(() => { expired = true; rejectWorker(new Error('OCR timed out. Check the connection for recognition assets, or paste a corrected transcription.')); void workerRef.current?.terminate(); }, 90_000);
  try {
    const workerPromise = createWorker('eng', 1, {
      workerPath: workerAsset.default, workerBlobURL: false, cacheMethod: 'none',
      logger: message => onProgress(`Local OCR · ${message.status} ${Math.round(message.progress * 100)}%`),
      errorHandler: () => rejectWorker(new Error('OCR recognition assets could not load. Check your connection or paste a corrected transcription.')),
    }).then(worker => { if (expired) { void worker.terminate(); throw new Error('OCR timed out.'); } workerRef.current = worker; return worker; });
    const worker = await Promise.race([workerPromise, failure]);
    const { data } = await Promise.race([worker.recognize(file), failure]);
    const result = parseExamText(data.text);
    result.warnings.unshift(`Image OCR is provisional (engine confidence ${Math.round(data.confidence)}%, not a correctness guarantee). Verify every character against the image. Handwriting, equations, tables and poor scans are not reliably supported.`);
    return result;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Local image recognition failed. Try a clearer image or paste a corrected transcription.');
  } finally { expired = true; clearTimeout(timeout); if (workerRef.current) await workerRef.current.terminate(); }
}

/** No paper bytes leave this browser. Raw files are not persisted by this module. */
export async function extractPaper(file: File, onProgress: ExtractionProgress = () => {}): Promise<PaperExtraction> {
  const kind = validatePaperFile(file);
  await verifySignature(file, kind);
  return kind === 'pdf' ? extractPdf(file, onProgress) : extractImage(file, onProgress);
}

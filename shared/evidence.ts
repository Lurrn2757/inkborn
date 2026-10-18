/** A block retains offsets into the unmodified UTF-16 notes string. */
export interface SourceBlock {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface Evidence {
  id: string;
  blockId: string;
  start: number;
  end: number;
  quote: string;
}

/** Paragraph boundaries are deterministic; whitespace in a paragraph is preserved. */
export function segmentSourceBlocks(notes: string): SourceBlock[] {
  const blocks: SourceBlock[] = [];
  const separator = /\r?\n[\t ]*\r?\n(?:[\t ]*\r?\n)*/g;
  let start = 0;
  const append = (end: number) => {
    const text = notes.slice(start, end);
    if (text.trim()) blocks.push({ id: `block-${blocks.length + 1}`, start, end, text });
  };
  for (const match of notes.matchAll(separator)) {
    append(match.index);
    start = match.index + match[0].length;
  }
  append(notes.length);
  return blocks;
}

/** Resolve a quote in its stated block, choosing its first occurrence there. */
export function createEvidence(notes: string, blockId: string, quote: string, id: string): Evidence {
  const block = segmentSourceBlocks(notes).find((candidate) => candidate.id === blockId);
  if (!block || !quote.trim()) throw new Error('Evidence requires a known block and a nonblank quote.');
  const relativeStart = block.text.indexOf(quote);
  if (relativeStart < 0) throw new Error('The evidence quote is absent from its stated source block.');
  const start = block.start + relativeStart;
  return { id, blockId, start, end: start + quote.length, quote };
}

export function isExactEvidence(notes: string, evidence: Evidence): boolean {
  const block = segmentSourceBlocks(notes).find((candidate) => candidate.id === evidence.blockId);
  return Boolean(
    block && evidence.quote.trim() && Number.isInteger(evidence.start) && Number.isInteger(evidence.end)
    && evidence.start >= block.start && evidence.end <= block.end && evidence.end > evidence.start
    && notes.slice(evidence.start, evidence.end) === evidence.quote,
  );
}

/** A reproducible content fingerprint, not a security or authenticity claim. */
export function hashNotes(notes: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < notes.length; index += 1) {
    hash ^= notes.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

import fs from 'node:fs';
import { tokenize, translationRanges } from '../translation-layout.mjs';
import { cleanedTranscriptTokens } from '../transcript-cleanup.mjs';
import { punctuationMarks } from '../punctuation-engine.mjs';

const root = new URL('../', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const transcript = read('data/transcript.json');
const aligned = read('data/translations.aligned.json');
const timings = read('data/word-timings.json');
const from = Number(process.argv[2] || 0);
const to = Number(process.argv[3] || Number.MAX_SAFE_INTEGER);

let rowNumber = 0;
for (const [segmentIndex, segment] of transcript.entries()) {
  const tokens = tokenize(segment.text);
  const display = cleanedTranscriptTokens(segment.start, tokens);
  const ranges = translationRanges(segment.text, aligned[segment.start]);
  let spokenIndex = 0;
  const tokenWords = tokens.map((token, tokenIndex) => {
    if (!/^[A-Za-z]+(?:['’][A-Za-z]+)*$/.test(token)) return null;
    const timing = timings[segmentIndex][spokenIndex++];
    if (!display[tokenIndex]) return null;
    return { text: display[tokenIndex], start: timing[0], end: timing[1], noPause: false };
  });

  for (const row of ranges) {
    const current = rowNumber++;
    if (current < from || current >= to) continue;
    const words = tokenWords.slice(row.start, row.end).filter(Boolean);
    const marks = punctuationMarks(words, row.chinese);
    const rendered = words.map((word, index) => `${word.text}${marks.get(index) || ''}`).join(' ');
    const minutes = Math.floor(segment.start / 60);
    const seconds = String(segment.start % 60).padStart(2, '0');
    console.log(`R${String(current).padStart(3, '0')} [${minutes}:${seconds}] ${rendered}`);
    console.log(`ZH ${row.chinese}`);
  }
}

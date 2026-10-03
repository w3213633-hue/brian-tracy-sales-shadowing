import fs from 'node:fs';
import assert from 'node:assert/strict';
import { tokenize, translationRanges } from '../translation-layout.mjs';
import { cleanedTranscriptTokens } from '../transcript-cleanup.mjs';
import { punctuationMarks } from '../punctuation-engine.mjs';

const root = new URL('../', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const transcript = read('data/transcript.json');
const aligned = read('data/translations.aligned.json');
const timings = read('data/word-timings.json');
const samples = new Set([5, 356, 390, 457, 1977, 2597]);
let rowCount = 0;
let sentenceMarks = 0;
let commaMarks = 0;

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
    const words = tokenWords.slice(row.start, row.end).filter(Boolean);
    const marks = punctuationMarks(words, row.chinese);
    marks.forEach((mark, index) => {
      assert(index >= 0 && index < words.length, `Invalid punctuation index at ${segment.start}`);
      assert(/[,:.!?]/.test(mark), `Invalid punctuation mark at ${segment.start}`);
      if (mark === ',') commaMarks += 1;
      else sentenceMarks += 1;
    });
    const finalChinese = /[。！？!?][”’"）】]*\s*$/u.test(row.chinese);
    if (finalChinese && words.length) assert(/[.!?]/.test(marks.get(words.length - 1) || ''), `Missing row-end punctuation at ${segment.start}`);
    rowCount += 1;

    if (samples.has(segment.start)) {
      const rendered = words.map((word, index) => `${word.text}${marks.get(index) || ''}`).join(' ');
      console.log(`${segment.start}: ${rendered}`);
    }
  }
}

console.log(JSON.stringify({ rows: rowCount, sentenceMarks, commaMarks }));

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

const grammarSample = 'So the average person when they have a problem complains and blames other people about the problem'.split(' ')
  .map((text, index) => ({ text, start: index, end: index + 0.4, noPause: false }));
const grammarMarks = punctuationMarks(grammarSample, '普通人遇到问题时，往往会抱怨这个问题，把责任推到别人身上。');
assert.equal(grammarMarks.get(3), ',', 'Missing comma before embedded when-clause');
assert.equal(grammarMarks.get(8), ',', 'Missing comma after embedded when-clause');
assert.equal(grammarMarks.get(grammarSample.length - 1), '.', 'Missing final period');

const imperativeSample = 'So when they finish speaking pause and let them think and maybe they want to continue'.split(' ')
  .map((text, index) => ({ text, start: index, end: index + 0.4, noPause: false }));
const imperativeMarks = punctuationMarks(imperativeSample, '所以，当他们说完后，先停一下，让他们想一想，也许他们还想继续说。');
assert.equal(imperativeMarks.get(4), ',', 'Missing comma after fronted when-clause');
assert.notEqual(imperativeMarks.get(10), ',', 'Incorrect comma after maybe');

const restrictiveSample = 'IBM did a study when they got into trouble in the 90s and they paid three million dollars'.split(' ')
  .map((text, index) => ({ text, start: index, end: index + 0.4, noPause: false }));
const restrictiveMarks = punctuationMarks(restrictiveSample, 'IBM在90年代陷入困境时做了一项研究，并支付了三百万美元。');
assert.notEqual(restrictiveMarks.get(3), ',', 'Restrictive when-clause should not get an opening comma');
assert.notEqual(restrictiveMarks.get(12), ',', 'Comma must not be placed after and');

const repeatedSubjectSample = 'Every salesperson when they went in to see a prospect they would click on the stopwatch'.split(' ')
  .map((text, index) => ({ text, start: index, end: index + 0.4, noPause: false }));
const repeatedSubjectMarks = punctuationMarks(repeatedSubjectSample, '每个销售人员去见潜在客户时，都会按下秒表。');
assert.equal(repeatedSubjectMarks.get(1), ',', 'Missing comma before embedded when-clause');
assert.equal(repeatedSubjectMarks.get(9), ',', 'Missing comma after embedded when-clause');

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

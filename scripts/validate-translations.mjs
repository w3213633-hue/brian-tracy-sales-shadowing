import fs from 'node:fs';
import assert from 'node:assert/strict';
import { tokenize, translationRanges } from '../translation-layout.mjs';
import { cleanedTranscriptTokens } from '../transcript-cleanup.mjs';

const root = new URL('../', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const source = read('data/transcript.json');
const aligned = read('data/translations.aligned.json');
const wordTimings = read('data/word-timings.json');
const translations = {};
let rowCount = 0;
let wordCount = 0;
let noteCount = 0;
assert.deepEqual(Object.keys(aligned), source.map(segment => String(segment.start)));
for (const [segmentIndex, segment] of source.entries()) {
  const rows = aligned[segment.start];
  const ranges = translationRanges(segment.text, rows);
  const tokens = tokenize(segment.text);
  const cleanedTokens = cleanedTranscriptTokens(segment.start, tokens);
  assert.equal(cleanedTokens.length, tokens.length, `Display correction changed token count at ${segment.start}`);
  assert.equal(tokens.filter(token => /^[A-Za-z]+(?:['’][A-Za-z]+)*$/.test(token)).length, wordTimings[segmentIndex].length, `Audio timings shifted at ${segment.start}`);
  const restored = ranges.flatMap(range => tokens.slice(range.start, range.end));
  assert.deepEqual(restored, tokens, `Missing/repeated English tokens at ${segment.start}`);
  assert(ranges.every(row => /[\u3400-\u9fff]/u.test(row.chinese)));
  for (const row of ranges) {
    const english = tokens.slice(row.start, row.end).join(' ');
    assert(!/(?:其实|显然|竟然|足足|按讲者)/u.test(row.chinese), `Unsupported interpretive tone at ${segment.start}: ${row.chinese}`);
    const causalChinese = /(?:于是|所以|因此)/u.test(row.chinese.replace(/之所以/g, ''));
    const causalEnglish = /\b(?:so|because|since|therefore)\b|as a result/iu.test(english);
    assert(!causalChinese || causalEnglish, `Unsupported causal link at ${segment.start}: ${row.chinese}`);
  }
  translations[segment.start] = rows.map(row => row[1]).join('');
  wordCount += tokens.filter(token => /^[A-Za-z]+(?:['’][A-Za-z]+)*$/.test(token)).length;
  rowCount += ranges.length;
  noteCount += rows.filter(row => row[2]).length;
}
assert.throws(() => translationRanges('one two three', [['missing', '译文'], ['', '其余']]), /not found/);
assert.throws(() => translationRanges('one two one three', [['one', '译文'], ['', '其余']]), /Ambiguous/);
assert.throws(() => translationRanges('one two three', [['one', '译文']]), /trailing/);
assert.throws(() => translationRanges('one two three', [['', '译文'], ['', '其余']]), /Only the final/);
if (process.argv.includes('--write')) {
  fs.writeFileSync(new URL('data/translations.full.json', root), JSON.stringify(translations, null, 2) + '\n');
} else {
  assert.deepEqual(read('data/translations.full.json'), translations, 'Full paragraph translations must match aligned rows');
}
console.log(JSON.stringify({ segments: source.length, rowCount, wordCount, noteCount, chineseCharacters: Object.values(translations).join('').length }));

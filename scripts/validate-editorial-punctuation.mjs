import fs from 'node:fs';
import assert from 'node:assert/strict';
import { tokenize, translationRanges } from '../translation-layout.mjs';
import { cleanedTranscriptTokens } from '../transcript-cleanup.mjs';
import { EDITORIAL_BOUNDARIES } from '../editorial-punctuation.mjs';

const root = new URL('../', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const transcript = read('data/transcript.json');
const aligned = read('data/translations.aligned.json');
const normalize = value => String(value || '').toLowerCase().replace(/[’']/g, ' ').match(/[a-z]+|\d+/g) || [];

let rowIndex = 0;
let boundaryCount = 0;
const missingAnchors = [];
for (const segment of transcript) {
  const tokens = tokenize(segment.text);
  const display = cleanedTranscriptTokens(segment.start, tokens);
  const ranges = translationRanges(segment.text, aligned[segment.start]);
  for (const row of ranges) {
    const sequence = display.slice(row.start, row.end).flatMap(normalize);
    let cursor = 0;
    for (const [phrase, mark] of EDITORIAL_BOUNDARIES[rowIndex] || []) {
      const wanted = normalize(phrase);
      let match = -1;
      for (let index = cursor; index <= sequence.length - wanted.length; index += 1) {
        if (wanted.every((token, offset) => sequence[index + offset] === token)) { match = index; break; }
      }
      if (match < 0) {
        missingAnchors.push(`row ${rowIndex}: ${phrase}`);
        continue;
      }
      assert(/[,:.!?—]/.test(mark), `Invalid editorial mark in row ${rowIndex}: ${mark}`);
      cursor = match + wanted.length;
      boundaryCount += 1;
    }
    rowIndex += 1;
  }
}

assert.equal(rowIndex, 264, 'Unexpected bilingual row count');
assert.deepEqual(missingAnchors, [], `Editorial anchors not found:\n${missingAnchors.join('\n')}`);
console.log(JSON.stringify({ rowCount: rowIndex, reviewedRows: Object.keys(EDITORIAL_BOUNDARIES).length, boundaryCount }));

import assert from 'node:assert/strict';
import { grammarAnalysis, readingGroups } from '../grammar-coach.mjs';

const titles = (selected, sentence = selected) => grammarAnalysis(selected, sentence).map(item => item.title).join(' | ');

assert.match(titles('what he did give me', 'what he did give me was a very simple presentation'), /what \+ 从句/);
assert.match(titles('what he did give me', 'what he did give me was a very simple presentation'), /肯定句中的强调/);
assert.match(titles('my sales went up'), /go up/);
assert.match(titles('instead of going out and talking'), /instead of/);
assert.match(titles('as opposed to talking'), /as opposed to/);
assert.match(titles('who have sold all their lives'), /现在完成时/);
assert.match(titles('the more you ask the more confident you become'), /越……，越……/);
assert.match(titles("why don't you give it a try"), /提出建议或邀请/);
assert.match(titles('Thank you'), /按意群理解/);
assert.match(readingGroups('I asked questions and my sales went up'), /｜ and/);

console.log(JSON.stringify({ grammarChecks: 10, status: 'ok' }));

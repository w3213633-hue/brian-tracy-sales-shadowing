const HARD_JOINERS = new Set([
  'a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'our', 'their',
  'and', 'or', 'nor', 'but', 'because', 'if', 'when', 'while', 'although', 'though', 'unless',
  'to', 'of', 'in', 'on', 'at', 'for', 'from', 'with', 'by', 'about', 'as', 'than', 'into', 'over',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'have', 'has', 'had', 'do', 'does', 'did',
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'not',
  'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'how',
]);

const CONTINUATION_STARTS = new Set([
  'which', 'who', 'whom', 'whose', 'that', 'than', 'to', 'of', 'from', 'with', 'by', 'as', 'into',
  'onto', 'upon', 'through', 'during', 'without', 'within', 'about', 'against', 'between', 'among',
]);

const FRESH_STARTS = new Set([
  'i', 'we', 'you', 'he', 'she', 'they', 'it', 'this', 'these', 'those', 'there', 'so', 'and', 'but',
  'if', 'when', 'because', 'however', 'now', 'then', 'remember', 'well', 'okay', 'yes', 'no',
  'finally', 'first', 'second', 'who', 'what', 'where', 'why', 'how', 'which',
]);

const QUESTION_AUXILIARIES = new Set([
  'do', 'does', 'did', 'can', 'could', 'would', 'will', 'is', 'are', 'was', 'were', 'have', 'has',
  'had', 'should', 'may',
]);
const QUESTION_WORDS = new Set(['who', 'what', 'when', 'where', 'why', 'how', 'which', 'whose']);

function plainWord(value) {
  return String(value || '').toLowerCase().replace(/[^a-z']/g, '');
}

function finalChineseMark(chinese) {
  const match = String(chinese || '').match(/([。！？!?])[”’"）】]*\s*$/u);
  if (!match) return '';
  return /[？?]/u.test(match[1]) ? '?' : /[！!]/u.test(match[1]) ? '!' : '.';
}

function chineseTerminalMarks(chinese) {
  return [...String(chinese || '')].filter(char => /[。！？!?]/u.test(char)).map(char => /[？?]/u.test(char) ? '?' : /[！!]/u.test(char) ? '!' : '.');
}

function looksLikeQuestion(words) {
  const clean = words.map(word => plainWord(word.text)).filter(Boolean);
  const first = clean.find(word => !['and', 'but', 'so', 'well', 'then', 'now'].includes(word));
  const firstIndex = clean.indexOf(first);
  if (QUESTION_AUXILIARIES.has(first)) return true;
  const following = clean.slice(firstIndex + 1);
  if (QUESTION_WORDS.has(first) && QUESTION_AUXILIARIES.has(following[0])) return true;
  if (first === 'how' && following.slice(0, 5).some(word => QUESTION_AUXILIARIES.has(word))) return true;
  if (first === 'who' && following.length) return true;
  if (first === 'why' && ['not', "don't"].includes(following[0])) return true;
  return false;
}

function safeBoundary(words, index) {
  const current = plainWord(words[index]?.text);
  const next = plainWord(words[index + 1]?.text);
  return !HARD_JOINERS.has(current) && !CONTINUATION_STARTS.has(next) && !words[index]?.noPause;
}

function gapAfter(words, index) {
  return Number(words[index + 1]?.start) - Number(words[index]?.end);
}

function earlyQuestionBoundary(words, chinese) {
  const text = String(chinese || '');
  if (!/^\s*——/u.test(text)) return -1;
  const match = text.match(/^[^。！？!?]*[？?]/u);
  if (!match || match[0].length > text.length * 0.42) return -1;
  const target = Math.max(1, Math.round((match[0].length / text.length) * words.length) - 1);
  let best = -1;
  let bestScore = -Infinity;
  for (let index = 1; index < Math.min(words.length - 1, target + 6); index += 1) {
    if (!safeBoundary(words, index)) continue;
    const next = plainWord(words[index + 1]?.text);
    const gap = gapAfter(words, index);
    const score = -Math.abs(index - target) + (Number.isFinite(gap) ? Math.min(1.2, gap) * 4 : 0) + (FRESH_STARTS.has(next) ? 2 : 0);
    if (score > bestScore) { best = index; bestScore = score; }
  }
  return best;
}

export function punctuationMarks(words, chinese) {
  const marks = new Map();
  if (!words.length) return marks;

  const earlyQuestion = earlyQuestionBoundary(words, chinese);
  if (earlyQuestion >= 0) marks.set(earlyQuestion, '?');

  let sentenceStart = 0;
  for (let index = 1; index < words.length - 1; index += 1) {
    if (marks.has(index)) { sentenceStart = index + 1; continue; }
    if (!safeBoundary(words, index) || index - sentenceStart < 3) continue;
    const gap = gapAfter(words, index);
    const next = plainWord(words[index + 1]?.text);
    const nextNext = plainWord(words[index + 2]?.text);
    const strongPause = Number.isFinite(gap) && gap >= 0.82;
    const freshClausePause = Number.isFinite(gap) && gap >= 0.5 && FRESH_STARTS.has(next);
    const coordinatedRestart = Number.isFinite(gap) && gap >= 0.32 && ['and', 'but', 'so'].includes(next) && FRESH_STARTS.has(nextNext);
    const newQuestion = Number.isFinite(gap) && gap >= 0.22 && QUESTION_WORDS.has(next);
    const questionRestart = QUESTION_WORDS.has(next) && looksLikeQuestion(words.slice(sentenceStart, index + 1));
    if (!strongPause && !freshClausePause && !coordinatedRestart && !newQuestion && !questionRestart) continue;
    const sentenceWords = words.slice(sentenceStart, index + 1);
    const first = plainWord(sentenceWords.find(word => plainWord(word.text))?.text);
    const subordinateContinuation = first === 'if' && next === 'then';
    const current = plainWord(words[index]?.text);
    const introducesQuestion = ['ask', 'asked', 'say', 'said', 'then'].includes(current) && QUESTION_WORDS.has(next);
    marks.set(index, subordinateContinuation ? ',' : introducesQuestion ? ':' : looksLikeQuestion(sentenceWords) ? '?' : '.');
    sentenceStart = index + 1;
  }

  const finalMark = finalChineseMark(chinese);
  if (finalMark) marks.set(words.length - 1, finalMark);

  const desiredSentenceMarks = chineseTerminalMarks(chinese);
  let missing = Math.max(0, desiredSentenceMarks.length - [...marks.values()].filter(mark => mark !== ',').length);
  if (missing) {
    const restartCandidates = [];
    for (let index = 2; index < words.length - 2; index += 1) {
      if (marks.has(index) || marks.has(index - 1) || marks.has(index + 1)) continue;
      const phrasalComingIn = plainWord(words[index - 1]?.text) === 'coming' && plainWord(words[index]?.text) === 'in';
      if (!safeBoundary(words, index) && !phrasalComingIn) continue;
      const next = plainWord(words[index + 1]?.text);
      const nextNext = plainWord(words[index + 2]?.text);
      const nextThird = plainWord(words[index + 3]?.text);
      let score = 0;
      if (next === 'and' && nextNext === 'i' && nextThird === 'remember') score = 9;
      else if (next === 'then' && ['i', 'we', 'he', 'she', 'they', 'you'].includes(nextNext)) score = 8;
      else if (next === 'and' && nextNext === 'then') score = 7;
      else if (['i', 'he', 'she', 'they', 'we', 'you'].includes(next) && ['said', 'asked', 'noticed', 'remember'].includes(nextNext)) score = 7;
      else if ((next === 'let' && nextNext === 'me') || (next === 'call' && nextNext === 'me')) score = 6;
      else if (['now', 'however', 'finally'].includes(next)) score = 5;
      else if (QUESTION_WORDS.has(next) && looksLikeQuestion(words.slice(index + 1, index + 9))) score = 5;
      if (!score) continue;
      const gap = gapAfter(words, index);
      if (Number.isFinite(gap)) score += Math.min(1, Math.max(0, gap)) * 2;
      restartCandidates.push({ index, score });
    }
    const selected = [];
    for (const candidate of restartCandidates.sort((a, b) => b.score - a.score)) {
      if (!missing) break;
      if (selected.some(index => Math.abs(index - candidate.index) < 3)) continue;
      selected.push(candidate.index);
      missing -= 1;
    }
    selected.sort((a, b) => a - b).forEach((boundary) => {
      const prior = [...marks.keys()].filter(index => index < boundary && marks.get(index) !== ',').sort((a, b) => b - a)[0] ?? -1;
      const current = plainWord(words[boundary]?.text);
      const next = plainWord(words[boundary + 1]?.text);
      const introducesQuestion = ['ask', 'asked', 'say', 'said', 'then'].includes(current) && QUESTION_WORDS.has(next);
      marks.set(boundary, introducesQuestion ? ':' : looksLikeQuestion(words.slice(prior + 1, boundary + 1)) ? '?' : '.');
    });
  }

  let lastMark = -1;
  for (let index = 0; index < words.length - 1; index += 1) {
    if (marks.has(index)) { lastMark = index; continue; }
    const gap = gapAfter(words, index);
    if (!Number.isFinite(gap) || gap < 0.44 || index - lastMark < 3 || !safeBoundary(words, index)) continue;
    marks.set(index, ',');
    lastMark = index;
  }
  return marks;
}

export function capitalizeEnglish(value) {
  return String(value || '').replace(/[A-Za-z]/, letter => letter.toUpperCase());
}

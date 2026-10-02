export function tokenize(text) {
  return text.match(/\[[^\]]+\]|[A-Za-z]+(?:['’][A-Za-z]+)*|\d+(?::\d+)?(?:%|th)?|[^\s]/g) || [];
}

// Each editorial boundary names the actual final English phrase. Never infer
// translation correspondence from sentence counts or character lengths.
export function translationRanges(text, rows) {
  const tokens = tokenize(text).map(token => token.toLowerCase());
  let cursor = 0;
  return rows.map(([ending, chinese, note], index) => {
    let end = tokens.length;
    if (ending) {
      const anchor = tokenize(ending).map(token => token.toLowerCase());
      let match = -1;
      for (let i = cursor; i <= tokens.length - anchor.length; i++) {
        if (anchor.every((token, j) => token === tokens[i + j])) {
          if (match >= 0) throw new Error(`Ambiguous translation boundary: ${ending}`);
          match = i;
        }
      }
      if (match < 0) throw new Error(`Translation boundary not found: ${ending}`);
      end = match + anchor.length;
    } else if (index !== rows.length - 1) {
      throw new Error('Only the final translation row may consume remaining words');
    }
    if (end <= cursor || !chinese.trim()) throw new Error('Empty bilingual row');
    const range = { start: cursor, end, chinese, note };
    cursor = end;
    if (index === rows.length - 1 && end !== tokens.length) throw new Error('Untranslated trailing words');
    return range;
  });
}

// Conservative display-only fixes for clear captioning errors. The original
// token stream remains unchanged so every audio timestamp keeps its position.
const fixes = {
  5: [[["challenging", "e", "economic"], ["challenging", "", "economic"]]],
  107: [
    [["in", "uh", "far", "on", "farms"], ["", "", "", "on", "farms"]],
    [["farmers's"], ["farmer's"]],
    [["would", "could", "no", "longer"], ["", "could", "no", "longer"]],
  ],
  323: [[["he", "was", "had", "no"], ["he", "", "had", "no"]]],
  425: [[["the", "Seven", "step"], ["the", "seventh", "step"]]],
  146: [[["hitting", "something", "W", "you"], ["hitting", "something", "when", "you"]]],
  457: [[["then", "would", "actually", "started"], ["then", "I", "actually", "started"]]],
  489: [[["took", "no", "action", "is", "they"], ["took", "no", "action", "", "they"]]],
  593: [[["they", "think", "about", "they", "want"], ["they", "think", "about", "what they", "want"]]],
  629: [[["Have", "have", "a", "natural"], ["", "have", "a", "natural"]]],
  666: [[["the", "way", "reason", "the", "way", "that"], ["the", "way", "", "", "", "that"]]],
  700: [[["only", "only", "three"], ["", "only", "three"]]],
  764: [[["year", "after", "after", "year"], ["year", "", "after", "year"]]],
  866: [[["seminar", "I", "I", "introduced"], ["seminar", "", "I", "introduced"]]],
  899: [[["they", "'", "spent"], ["they'd", "", "spent"]]],
  1166: [
    [["sales", "man", "manager"], ["sales", "", "manager"]],
    [["maybe", "he", "taken"], ["maybe", "he'd", "taken"]],
  ],
  1197: [[["with", "c", "customers"], ["with", "", "customers"]]],
  1487: [[["start", "dying"], ["start", "dialing"]]],
  1805: [[["I", "see", "I", "coming", "here"], ["I", "see", "", "coming", "here"]]],
  1869: [[["Rapport", "and", "Trust", "TR", "by"], ["Rapport", "and", "Trust", "", "by"]]],
  1977: [[["When", "the", "C", "when", "the", "the", "person"], ["When", "", "", "", "", "the", "person"]]],
  2008: [[["a", "b", "c", "DF"], ["A", "B", "C", "D"]]],
  2076: [[["trying", "to", "to", "do"], ["trying", "", "to", "do"]]],
  2143: [[["they", "customers", "love", "it"], ["", "Customers", "love", "it"]]],
  2177: [
    [["Nordic", "business", "for"], ["Nordic", "Business", "Forum"]],
    [["Cosmic", "num"], ["cosmic", "number"]],
  ],
  2360: [[["tour", "to", "to", "the"], ["tour", "", "to", "the"]]],
  2503: [
    [["because", "because", "they"], ["", "because", "they"]],
    [["Ben", "feltman"], ["Ben", "Feldman"]],
  ],
  2712: [[["this", "they", "IBM", "did"], ["this", "", "IBM", "did"]]],
  2747: [[["saidwell"], ["said—well"]]],
};

export function cleanedTranscriptTokens(start, tokens) {
  const display = [...tokens];
  for (const [source, replacement] of fixes[start] || []) {
    const wanted = source.map(token => token.toLowerCase());
    for (let i = 0; i <= tokens.length - wanted.length; i += 1) {
      if (!wanted.every((token, offset) => tokens[i + offset].toLowerCase() === token)) continue;
      replacement.forEach((token, offset) => { display[i + offset] = token; });
      break;
    }
  }
  return display;
}

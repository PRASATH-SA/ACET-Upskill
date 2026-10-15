/** Plain-text helpers shared by the tutor guardrails and the mock embedder. */

const STOPWORDS = new Set(
  'a an and are as at be by do does for from how in is it of on or that the this to was we what when where which why with you your'.split(
    ' ',
  ),
);

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map((w) => w.replace(/(ing|ed|es|s)$/, '')); // crude stemming: "tables" ≈ "table"
}

/**
 * Compact builders for the Biology content pack (biologyContent*.js).
 *
 *   mcq(stem, [[option, whyItIsRightOrWrong], ...], correctIndex, explanation, difficulty)
 *   hook(stem, options, correctIndex, explanation) — the curiosity question
 */
export const mcq = (stem, options, correctIndex, explanation, difficulty = 'easy') => ({
  stem,
  options: options.map(([o]) => o),
  correctIndex,
  explanation,
  optionExplanations: options.map(([, why]) => why),
  difficulty,
});

export const hook = (stem, options, correctIndex, explanation) => ({
  stem,
  options,
  correctIndex,
  explanation,
});

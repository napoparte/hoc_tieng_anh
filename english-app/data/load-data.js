// Tai du lieu JSON — sua noi dung trong thu muc data/*.json
let VOCAB_DATA = {};
let VOCAB_CONFIG = { cardsPerSession: 8 };
let GRAMMAR_DATA = {};
let QUIZ_DATA = {};
let READING_DATA = {};
let WORD_OF_DAY = [];
let PRON_DATA = {};
let HARD_SOUNDS = [];

async function loadAppData() {
  const base = 'data/';

  // ── A1 grammar is split into topic-group files under data/grammar/
  //    Each file exports { beginner: [ ...topics ] }
  //    Files are merged by concatenating the topics arrays.
  const a1GrammarFiles = [
    'grammar/a1/a1-01-present-tenses.json',
    'grammar/a1/a1-02-have-got.json',
    'grammar/a1/a1-03-past-tenses.json',
    'grammar/a1/a1-04-future.json',
    'grammar/a1/a1-05-modals-imperative.json',
    'grammar/a1/a1-06-articles-nouns.json',
    'grammar/a1/a1-07-there-it.json',
    'grammar/a1/a1-08-adjectives-adverbs.json',
    'grammar/a1/a1-09-conjunctions.json',
    'grammar/a1/a1-10-prepositions.json',
    'grammar/a1/a1-11-questions-wordorder.json',
  ];

  const a2GrammarFiles = [
    'grammar/a2/a2-01-present-tenses.json',
    'grammar/a2/a2-02-past-tenses.json',
    'grammar/a2/a2-03-future.json',
    'grammar/a2/a2-04-modal-imperative-phrase-verbs.json',
    'grammar/a2/a2-05-conditional-if-passive.json',
    'grammar/a2/a2-06-reported-ing-inf.json',
    'grammar/a2/a2-07-article-noun-pron-determiner.json',
    'grammar/a2/a2-08-relative-aux.json',
    'grammar/a2/a2-09-adj-adv-conj.json',
    'grammar/a2/a2-10-prep-question.json',
  ];

  const b1GrammarFiles = [
    'grammar/b1/b1-01-present-tenses.json',
    'grammar/b1/b1-02-past-future-review.json',
    'grammar/b1/b1-03-modal-imperative-phrasal.json',
    'grammar/b1/b1-04-conditional-if-wish.json',
    'grammar/b1/b1-05-passive-reported-ing-inf.json',
    'grammar/b1/b1-06-article-noun-pron-deter.json',
    'grammar/b1/b1-07-relative-aux-conj.json',
    'grammar/b1/b1-08-adj-adv.json',
    'grammar/b1/b1-09-prepositions.json',
  ];

  const b1pGrammarFiles = [
    'grammar/b1p/b1p-01-present-past-future-verb-tenses.json',
    'grammar/b1p/b1p-02-modal-imperative.json',
    'grammar/b1p/b1p-03-conditional-if-wish.json',
    'grammar/b1p/b1p-04-passive.json',
    'grammar/b1p/b1p-05-ing-inf.json',
    'grammar/b1p/b1p-06-article-relative-aux.json',
    'grammar/b1p/b1p-07-adj-adv.json',
    'grammar/b1p/b1p-08-conj-question-word.json',
  ];

  const b2GrammarFiles = [
    'grammar/b2/b2-01-past-future.json',
    'grammar/b2/b2-02-modal-imperative.json',
    'grammar/b2/b2-03-conditional-if-wish.json',
    'grammar/b2/b2-04-passive-ing-inf.json',
    'grammar/b2/b2-05-article-noun-pron-determiner.json',
    'grammar/b2/b2-06-relative-there-it-aux.json',
    'grammar/b2/b2-07-adj-adv-prep.json',
    'grammar/b2/b2-08-conj-clause-word.json',
  ];

  const c1GrammarFiles = [
    'grammar/c1/c1-01-modal-clause-linking-register.json',
    'grammar/c1/c1-02-present-past-modal-subjuction.json',
  ];

  const higherGrammarFiles = [
  //  'grammar-c1.json',
  ];

  // Fetch everything in parallel
  const [vocab, quiz, reading, misc, ...allGrammarParts] = await Promise.all([
    fetch(base + 'vocab.json').then(r => { if (!r.ok) throw new Error('vocab.json'); return r.json(); }),
    fetch(base + 'quiz.json').then(r => { if (!r.ok) throw new Error('quiz.json'); return r.json(); }),
    fetch(base + 'reading.json').then(r => { if (!r.ok) throw new Error('reading.json'); return r.json(); }),
    fetch(base + 'misc.json').then(r => { if (!r.ok) throw new Error('misc.json'); return r.json(); }),
    ...a1GrammarFiles.map(f => fetch(base + f).then(r => { if (!r.ok) throw new Error(f); return r.json(); })),
    ...a2GrammarFiles.map(f => fetch(base + f).then(r => { if (!r.ok) throw new Error(f); return r.json(); })),
    ...b1GrammarFiles.map(f => fetch(base + f).then(r => { if (!r.ok) throw new Error(f); return r.json(); })),
    ...b1pGrammarFiles.map(f => fetch(base + f).then(r => { if (!r.ok) throw new Error(f); return r.json(); })),
    ...b2GrammarFiles.map(f => fetch(base + f).then(r => { if (!r.ok) throw new Error(f); return r.json(); })),
    ...c1GrammarFiles.map(f => fetch(base + f).then(r => { if (!r.ok) throw new Error(f); return r.json(); })),
    ...higherGrammarFiles.map(f => fetch(base + f).then(r => { if (!r.ok) throw new Error(f); return r.json(); })),
  ]);

  // Split the grammar parts
  let idx = 0;
  const a1Parts = allGrammarParts.slice(idx, idx += a1GrammarFiles.length);
  const a2Parts = allGrammarParts.slice(idx, idx += a2GrammarFiles.length);
  const b1Parts = allGrammarParts.slice(idx, idx += b1GrammarFiles.length);
  const b1pParts = allGrammarParts.slice(idx, idx += b1pGrammarFiles.length);
  const b2Parts = allGrammarParts.slice(idx, idx += b2GrammarFiles.length);
  const c1Parts = allGrammarParts.slice(idx, idx += c1GrammarFiles.length);
  const higherParts = allGrammarParts.slice(idx);

  // Merge A1
  const mergedA1 = { beginner: [] };
  for (const part of a1Parts) {
    if (part.beginner) mergedA1.beginner.push(...part.beginner);
  }

  // Merge A2
  const mergedA2 = { elementary: [] };
  for (const part of a2Parts) {
    if (part.elementary) mergedA2.elementary.push(...part.elementary);
  }

  // Merge B1
  const mergedB1 = { intermediate: [] };
  for (const part of b1Parts) {
    if (part.intermediate) mergedB1.intermediate.push(...part.intermediate);
  }

  // Merge B1P
  const mergedB1P = { upper_intermediate: [] };
  for (const part of b1pParts) {
    if (part.upper_intermediate) mergedB1P.upper_intermediate.push(...part.upper_intermediate);
  }

  // Merge B2
  const mergedB2 = { upper: [] };
  for (const part of b2Parts) {
    if (part.upper) mergedB2.upper.push(...part.upper);
  }

  // Merge C1
  const mergedC1 = { advanced: [] };
  for (const part of c1Parts) {
    if (part.advanced) mergedC1.advanced.push(...part.advanced);
  }

  // Merge all grammar into one GRAMMAR_DATA object
  GRAMMAR_DATA = Object.assign({}, mergedA1, mergedA2, mergedB1, mergedB1P, mergedB2, mergedC1, ...higherParts);

  VOCAB_CONFIG = { cardsPerSession: vocab.cardsPerSession || 8, ...vocab.config };
  VOCAB_DATA = vocab.levels || vocab;
  QUIZ_DATA = quiz;
  READING_DATA = reading;
  WORD_OF_DAY = misc.wordOfDay || [];
  PRON_DATA = misc.pron || {};
  HARD_SOUNDS = misc.hardSounds || [];
}

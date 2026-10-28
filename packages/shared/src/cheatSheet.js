/**
 * Infographic cheat sheet for a topic (ADR 0016). Built from the published topic page
 * (GET /topics/:id/page), so every topic with content gets one and nothing unpublished shows.
 * Pure and deterministic: the same page always gives the same sheet.
 */

/** Sections of the exam notes that become the hero line or the takeaway, not tiles. */
const HERO_HEADINGS = /^(definition|meaning|introduction|what is)/i;
const TAKEAWAY_HEADINGS = /^(conclusion|summary)/i;

export const CHEAT_SHEET_LIMITS = {
  tiles: 6,
  pointsPerTile: 4,
  pointChars: 120,
  recall: 4,
  realWorld: 3,
};

/** Markdown inline syntax to plain text: links, emphasis, code ticks. */
export function plainText(md) {
  return (
    String(md ?? '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      // Only at word edges, so snake_case names and 2*3*4 survive.
      .replace(/(?<![\w*])([*_])(?!\s)(.+?)(?<!\s)\1(?![\w*])/g, '$2')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Cut at a word boundary with an ellipsis. */
export function clip(text, max = CHEAT_SHEET_LIMITS.pointChars) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

/**
 * The first sentence. A stop after a lone capital ("E. F. Codd") or within the first 20
 * characters ("e.g.") does not end it.
 */
export function firstSentence(text) {
  const t = plainText(text);
  const re = /[.!?]\s+(?=[A-Z0-9("'])/g;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    const before = t.slice(0, m.index);
    if (
      m.index < 20 ||
      /(^|[\s.])[A-Z]$/.test(before) ||
      /(^|[\s(])(e\.g|i\.e|etc|vs)$/i.test(before)
    )
      continue;
    return t.slice(0, m.index + 1);
  }
  return t;
}

/** "**Term:** text" or "**Term** – text" → { term, text }; anything else → { text }. */
export function toPoint(line) {
  const m = line.match(/^\*\*(.+?)\*\*\s*[:\-–—]?\s*(.*)$/);
  if (m && m[2]) {
    const term = plainText(m[1]).replace(/[:\-–—]\s*$/, '');
    return { term, text: clip(plainText(m[2]), CHEAT_SHEET_LIMITS.pointChars - term.length) };
  }
  return { text: clip(plainText(line)) };
}

const cellsOf = (row) =>
  row
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => plainText(c));

/** Lines of the first code block kept on a tile, when a section is only code. */
const CODE_LINES = 4;

/**
 * Splits notes markdown into `{ heading, points[] }` sections. List items and table rows (first
 * cell as the term) are points; a section with only paragraphs gives its first sentence, and one
 * with only code gives the start of its first code block as `{ code }`. A section with both text
 * and code also keeps that start as `code` (the poster's "Syntax" / "Example" box).
 */
export function sectionsOf(md) {
  const sections = [];
  let cur = null;
  let code = null;
  const start = (heading) => {
    cur = { heading, items: [], paras: [], code: [] };
    sections.push(cur);
  };
  for (const raw of String(md ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      if (code) {
        if (!cur.code.length) cur.code = code;
        code = null;
      } else {
        if (!cur) start('');
        code = [];
      }
      continue;
    }
    if (code) {
      if (line) code.push(raw.trimEnd());
      continue;
    }
    if (!line || /^[-*_]{3,}$/.test(line)) continue;
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (h) {
      start(plainText(h[1]));
      continue;
    }
    if (!cur) start('');
    if (line.startsWith('|')) {
      // The separator row follows the header row: drop the header.
      if (/^\|?[\s:|-]+\|?$/.test(line)) cur.items.pop();
      else {
        const [term, ...rest] = cellsOf(line);
        cur.items.push(rest.length ? `**${term}:** ${rest.filter(Boolean).join(' · ')}` : term);
      }
      continue;
    }
    const li = line.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (li) cur.items.push(li[1]);
    else cur.paras.push(line);
  }
  return sections
    .map(({ heading, items, paras, code: lines }) => {
      const snippet = lines.length ? lines.slice(0, CODE_LINES).join('\n') : null;
      const points = items.length
        ? items.map(toPoint)
        : paras.length
          ? [{ text: clip(firstSentence(paras.join(' '))) }]
          : snippet
            ? [{ code: snippet }]
            : [];
      return snippet && points.length && !points[0].code
        ? { heading, points, code: snippet }
        : { heading, points };
    })
    .filter((s) => s.points.length);
}

export const CHEAT_BLOCK_LIMITS = {
  blocks: 3,
  bullets: 5,
  steps: 6,
  tableRows: 6,
  tableCols: 4,
  cellChars: 60,
  flowSteps: 7,
  flowChars: 48,
  codeLines: 6,
  textChars: 230,
};

/**
 * "Stages: A → B → C" (three or more short parts) as `{ label, parts }`: drawn as a flowchart.
 * Formulas ("if X → Y then XZ → YZ") and lists of pairs ("A → B, C → D") are not flows. A part
 * that is too long loses its brackets.
 */
function flowOf(text) {
  const max = CHEAT_BLOCK_LIMITS.flowChars;
  let t = firstSentence(text).replace(/[.;]$/, '');
  const lead = t.match(/^([A-Z][\w ]{1,24}):\s+(.*)$/);
  if (lead) t = lead[2];
  const parts = t
    .split(/\s*(?:→|->|⟶)\s*/)
    .map((p) => (p.length > max ? p.replace(/\s*\([^)]*\)/g, '') : p));
  const ok =
    parts.length >= 3 &&
    parts.every(
      (p) =>
        p.length >= 2 &&
        p.length <= max &&
        !/[,;]/.test(p.replace(/\([^)]*\)/g, '')) &&
        !/\b(if|then|gives?|with|where)\b/i.test(p) &&
        // An arrow inside brackets, as in "transcription (DNA → mRNA)".
        (p.match(/\(/g) ?? []).length === (p.match(/\)/g) ?? []).length,
    );
  return ok ? { label: lead ? lead[1] : null, parts } : null;
}

/** The first `n` sentences of a paragraph, split as firstSentence() does. */
function sentenceList(text, n) {
  let rest = plainText(text);
  const out = [];
  while (rest && out.length < n) {
    const s = firstSentence(rest);
    out.push(s);
    rest = rest.slice(s.length).trim();
  }
  return out;
}

/** Up to `n` sentences of a paragraph, clipped. */
const sentencesOf = (text, n = 2, max = CHEAT_BLOCK_LIMITS.textChars) =>
  clip(sentenceList(text, n).join(' '), max);

/**
 * Splits notes markdown into `{ heading, blocks[] }` sections for the poster, keeping the
 * structure the notes already have:
 * - `text`: the first two sentences of the paragraphs,
 * - `bullets` / `steps`: unordered / numbered list items as points (`**Term:** text`),
 * - `table`: a markdown table (`head` and `rows`, capped),
 * - `flow`: a line such as "DNA → RNA → protein", with a bold lead-in as its `label`,
 * - `code`: the start of a code block.
 * Each block that was capped reports the hidden count as `more`.
 */
export function blocksOf(md) {
  const L = CHEAT_BLOCK_LIMITS;
  const sections = [];
  let cur = null;
  let code = null;
  let prev = null; // the kind of the previous non-blank line
  const start = (heading) => {
    cur = { heading, blocks: [] };
    sections.push(cur);
  };
  const add = (type, item) => {
    if (!cur) start('');
    const last = cur.blocks[cur.blocks.length - 1];
    if (last?.type === type && prev === type) last.items.push(item);
    else cur.blocks.push({ type, items: [item] });
    prev = type;
  };
  for (const raw of String(md ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      if (code) {
        code = null;
        prev = 'code';
      } else {
        if (!cur) start('');
        code = { type: 'code', items: [], lang: line.slice(3).trim() || null };
        cur.blocks.push(code);
      }
      continue;
    }
    if (code) {
      if (line) code.items.push(raw.trimEnd());
      continue;
    }
    if (!line || /^[-*_]{3,}$/.test(line)) {
      prev = null;
      continue;
    }
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (h) {
      start(plainText(h[1]));
      prev = null;
      continue;
    }
    if (line.startsWith('|')) {
      if (/^\|?[\s:|-]+\|?$/.test(line)) {
        const last = cur?.blocks[cur.blocks.length - 1];
        if (last?.type === 'table' && last.items.length === 1) last.head = last.items.pop();
      } else add('table', cellsOf(line));
      continue;
    }
    const li = line.match(/^(?:([-*+])|\d+[.)])\s+(.*)$/);
    const text = li ? li[2] : line;
    const term = text.match(/^\*\*(.+?)\*\*\s*[:\-–—]?\s*(.*)$/);
    const flow = flowOf(term?.[2] || text);
    if (flow) {
      if (!cur) start('');
      cur.blocks.push({
        type: 'flow',
        items: flow.parts,
        label: term?.[2] ? plainText(term[1]).replace(/[:\-–—]\s*$/, '') : flow.label,
      });
      prev = 'flow';
    } else if (li) add(li[1] ? 'bullets' : 'steps', text);
    else add('text', line);
  }

  const capped = (items, n, map) => ({
    items: items.slice(0, n).map(map),
    more: Math.max(0, items.length - n),
  });
  const finish = (b) => {
    switch (b.type) {
      case 'text':
        return { type: 'text', text: sentencesOf(b.items.join(' ')) };
      case 'bullets':
        return { type: 'bullets', ...capped(b.items, L.bullets, toPoint) };
      case 'steps':
        return { type: 'steps', ...capped(b.items, L.steps, toPoint) };
      case 'flow':
        return {
          type: 'flow',
          label: b.label,
          ...capped(b.items, L.flowSteps, (s) => clip(s, L.flowChars)),
        };
      case 'code':
        return b.items.length
          ? { type: 'code', lang: b.lang, code: b.items.slice(0, L.codeLines).join('\n') }
          : null;
      default: {
        // A one-column table is a list.
        const cell = (c) => clip(c, L.cellChars);
        const width = Math.max(b.head?.length ?? 0, ...b.items.map((r) => r.length));
        if (width < 2)
          return { type: 'bullets', ...capped(b.items, L.bullets, (r) => toPoint(r[0])) };
        return {
          type: 'table',
          head: b.head ? b.head.slice(0, L.tableCols).map(cell) : null,
          ...capped(b.items, L.tableRows, (r) => r.slice(0, L.tableCols).map(cell)),
        };
      }
    }
  };
  return sections
    .map(({ heading, blocks }) => ({
      heading,
      blocks: blocks
        .map(finish)
        .filter((b) => b && (b.type !== 'text' || b.text))
        .slice(0, L.blocks),
    }))
    .filter((s) => s.blocks.length);
}

/** Sentences of a block, one per line: for the intro and conclusion bullets. */
const linesOf = (b) =>
  b.type === 'text'
    ? sentenceList(b.text, 3)
    : b.type === 'bullets' || b.type === 'steps'
      ? b.items.map((p) => (p.term ? `${p.term}: ${p.text}` : p.text))
      : [];

/**
 * The structured notes for the poster: the intro (Definition/Introduction section), the other
 * sections as blocks, and the conclusion as lines. Without exam notes, the easy explanation's
 * sections stand in.
 */
function posterSections(page) {
  let notes = blocksOf(page.tenMark?.body);
  const marks = notes.length ? 10 : null;
  if (!notes.length) notes = blocksOf(page.easy?.body);
  if (notes.length && !notes[0].heading) notes[0].heading = 'Key points';
  const hero = notes.find((s) => HERO_HEADINGS.test(s.heading));
  const end = notes.find((s) => TAKEAWAY_HEADINGS.test(s.heading));
  return {
    marks,
    intro: hero ? { heading: hero.heading, blocks: hero.blocks } : null,
    sections: notes.filter((s) => s !== hero && s !== end),
    conclusion: end ? end.blocks.flatMap(linesOf).slice(0, 4) : [],
  };
}

/**
 * @param {object} page the student topic page from GET /topics/:id/page
 * @returns {null | {
 *   title: string, subject: { code: string, name: string }, unit: { number: number, title: string } | null,
 *   bigIdea: string | null, definition: string | null,
 *   tiles: { heading: string, points: { term?: string, text: string }[], more: number, code?: string }[],
 *   recall: { q: string, a: string }[], realWorld: { term?: string, text: string }[],
 *   buildsOn: string[], unlocks: string[],
 *   exam: { count: number, marks: number[] } | null, takeaway: string | null,
 *   marks: number | null, intro: { heading: string, blocks: object[] } | null,
 *   sections: { heading: string, blocks: object[] }[], conclusion: string[],
 * }} null when the topic has nothing published to summarise; `sections` holds blocksOf() output
 */
export function buildCheatSheet(page) {
  if (!page?.topic) return null;
  const L = CHEAT_SHEET_LIMITS;
  const { topic } = page;
  const notes = sectionsOf(page.tenMark?.body);
  // Notes without headings still give tiles: one "Key points" tile.
  if (notes.length && !notes[0].heading) notes[0].heading = 'Key points';

  const hero = notes.find((s) => HERO_HEADINGS.test(s.heading));
  const end = notes.find((s) => TAKEAWAY_HEADINGS.test(s.heading));
  const definition = hero ? hero.points.map((p) => p.text).join(' ') : null;
  const easy = page.easy?.body ? clip(firstSentence(page.easy.body), 180) : null;
  const bigIdea = topic.summary ? plainText(topic.summary) : (definition ?? easy);

  const toTile = (s, heading = s.heading) => ({
    heading,
    points: s.points.slice(0, L.pointsPerTile),
    more: Math.max(0, s.points.length - L.pointsPerTile),
    ...(s.code ? { code: s.code } : {}),
  });
  let tiles = notes
    .filter((s) => s !== hero && s !== end)
    .slice(0, L.tiles)
    .map((s) => toTile(s));
  // No exam notes: the easy explanation's own sections (or bullets) stand in.
  if (!tiles.length && page.easy?.body) {
    tiles = sectionsOf(page.easy.body)
      .slice(0, L.tiles)
      .map((s) => toTile(s, s.heading || 'Key points'));
  }

  const recall = (page.shortAnswers ?? []).slice(0, L.recall).map((c) => ({
    q: clip(plainText(c.question), 90),
    a: clip(plainText(c.answer), 140),
  }));
  const realWorld = sectionsOf(page.realWorld?.body)
    .flatMap((s) => s.points)
    .slice(0, L.realWorld);
  const pyqs = page.pyqs ?? [];
  const exam = pyqs.length
    ? { count: pyqs.length, marks: [...new Set(pyqs.map((p) => p.marks))].sort((a, b) => a - b) }
    : null;

  const sheet = {
    title: topic.title,
    subject: { code: topic.subject?.code ?? '', name: topic.subject?.name ?? '' },
    unit: topic.unit ? { number: topic.unit.number, title: topic.unit.title } : null,
    bigIdea: bigIdea || null,
    // Shown under the big idea only when it adds something.
    definition: definition && definition !== bigIdea ? clip(definition, 220) : null,
    tiles,
    recall,
    realWorld,
    buildsOn: (page.prerequisites ?? []).map((t) => t.title),
    unlocks: (page.unlocks ?? []).map((t) => t.title),
    exam,
    takeaway: end ? clip(end.points.map((p) => p.text).join(' '), 200) : null,
    ...posterSections(page),
  };
  // A summary alone is not a cheat sheet: it needs notes or recall cards to summarise.
  return tiles.length || recall.length ? sheet : null;
}

/** "1. if statement" → "if statement": the poster numbers its cards itself. */
const NUMBERED = /^\d+[.)]\s*/;
/** Card colours in order, as in the reference posters; the conclusion is pink. */
export const CHEAT_POSTER_CARD_COLORS = [
  'pink',
  'blue',
  'green',
  'orange',
  'purple',
  'sky',
  'mint',
  'yellow',
];
export const CHEAT_POSTER_LIMITS = { cards: 10, columns: 4, wide: 16, introLines: 4, realWorld: 3 };

/** The title's key words (yellow on the poster) and the rest: "Cell Division: Mitosis…". */
export function titleParts(title) {
  const t = String(title ?? '').trim();
  const split = t.match(/^(.+?)(\s*[:–—]\s+|\s+-\s+)(.+)$/);
  if (split) return { key: split[1], rest: `${split[2].includes(':') ? ':' : ' –'} ${split[3]}` };
  const joint = t.match(/\s(?:in|of|for|on|with|to|from|by|using|vs\.?)\s/i);
  return joint
    ? { key: t.slice(0, joint.index), rest: t.slice(joint.index) }
    : { key: t, rest: '' };
}

/** Rough height of a block in lines of a one-column card (about 46 characters a line). */
const lines = (s) => Math.ceil(String(s ?? '').length / 46) || 1;
function weight(block) {
  switch (block.type) {
    case 'text':
      return lines(block.text);
    case 'bullets':
    case 'steps':
      return block.items.reduce((n, p) => n + lines(`${p.term ?? ''} ${p.text}`), 0);
    case 'table':
      return (block.items.length + 1) * 1.8;
    case 'flow':
      return block.items.length * 1.9;
    case 'code':
      return block.code.split('\n').length * 1.1 + 1.5;
    case 'recall':
      return block.items.reduce((n, r) => n + lines(`${r.q} ${r.a}`), 0);
    default:
      return 1;
  }
}

/** Packs cards into rows of `columns` grid columns, in order; a wide card takes two. */
function packRows(cards, columns) {
  const rows = [];
  let row = [];
  let used = 0;
  for (const card of cards) {
    if (used + card.span > columns) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(card);
    used += card.span;
  }
  if (row.length) rows.push(row);
  return rows;
}

/**
 * The cheat sheet laid out as the study poster (ADR 0016), in the style of the faculty's
 * reference answer posters: a navy title bar ("CELL DIVISION: MITOSIS… (10 MARKS)" with the key
 * words in yellow, a unit pill and an exam pill), then numbered pastel cards packed into rows of
 * four columns: Introduction, one card per note section (its bullets, numbered steps, tables,
 * flowcharts and code), Key points to remember (the flashcards), In the real world when there is
 * room, and the Conclusion. A card with a wide table, or a lot of content, spans two columns.
 * Everything comes from buildCheatSheet() output, so it is published content.
 * @param {ReturnType<typeof buildCheatSheet>} sheet
 */
export function cheatPoster(sheet) {
  if (!sheet) return null;
  const P = CHEAT_POSTER_LIMITS;
  const cards = [];

  const intro = sheet.intro;
  const introLines = [
    ...new Set([sheet.bigIdea, ...(intro?.blocks ?? []).flatMap(linesOf)].filter(Boolean)),
  ].slice(0, P.introLines);
  const introExtra = (intro?.blocks ?? []).filter(
    (b) => !['text', 'bullets', 'steps'].includes(b.type),
  );
  if (introLines.length || introExtra.length) {
    cards.push({
      kind: 'notes',
      heading: intro?.heading.replace(NUMBERED, '') || 'Introduction',
      blocks: [
        ...(introLines.length
          ? [{ type: 'bullets', items: introLines.map((text) => ({ text })), more: 0 }]
          : []),
        ...introExtra,
      ].slice(0, 3),
    });
  }

  const recall = sheet.recall.length
    ? {
        kind: 'recall',
        heading: 'Key points to remember',
        blocks: [{ type: 'recall', items: sheet.recall }],
      }
    : null;
  const conclusion = sheet.conclusion.length
    ? {
        kind: 'conclusion',
        heading: 'Conclusion',
        blocks: [{ type: 'bullets', items: sheet.conclusion.map((text) => ({ text })), more: 0 }],
      }
    : null;
  const room = P.cards - cards.length - !!recall - !!conclusion;
  for (const s of sheet.sections.slice(0, room)) {
    cards.push({
      kind: 'notes',
      heading: s.heading.replace(NUMBERED, '') || 'Key points',
      blocks: s.blocks,
    });
  }
  if (recall) cards.push(recall);
  if (sheet.realWorld.length && cards.length + !!conclusion < P.cards) {
    cards.push({
      kind: 'notes',
      heading: 'In the real world',
      blocks: [{ type: 'bullets', items: sheet.realWorld.slice(0, P.realWorld), more: 0 }],
    });
  }
  if (conclusion) cards.push(conclusion);

  const C = CHEAT_POSTER_CARD_COLORS;
  const numbered = cards.map((card, i) => {
    const tableWide = card.blocks.some(
      (b) => b.type === 'table' && (b.head ?? b.items[0]).length >= 3,
    );
    const heavy = card.blocks.reduce((n, b) => n + weight(b), 0) > P.wide;
    // The conclusion is pink, unless the card before it already is.
    const pinkBefore = i > 0 && C[(i - 1) % C.length] === 'pink';
    const color = card.kind === 'conclusion' && !pinkBefore ? 'pink' : C[i % C.length];
    return { ...card, n: i + 1, color, span: tableWide || heavy ? 2 : 1 };
  });
  const { key, rest } = titleParts(sheet.title);
  const exam = sheet.exam;

  return {
    title: sheet.title,
    titleKey: key,
    titleRest: rest,
    marks: sheet.marks,
    unit: sheet.unit,
    subject: sheet.subject,
    badge: sheet.unit ? `Unit ${sheet.unit.number}` : sheet.subject.code || null,
    tag: exam ? `Asked ${exam.count}× · ${exam.marks.join(' & ')} marks` : 'Exam ready',
    rows: packRows(numbered, P.columns),
  };
}

import { ArrowDown, ArrowRight, CheckCircle2, ClipboardCheck, Globe2, Target } from 'lucide-react';
import { CHEAT_POSTER_COLORS as C } from '@acet/shared';

/** Poster width in CSS pixels; it is as tall as its cards. CheatSheetImage draws it at 2x. */
export const POSTER_SIZE = { width: 1500 };

/** Flowchart boxes take these colours in turn, as in the reference posters. */
const FLOW_COLORS = ['pink', 'purple', 'green', 'yellow', 'blue', 'orange', 'sky'];
const CARD_ICONS = { recall: ClipboardCheck, conclusion: Target };

/**
 * Title size in px so the bar fits on one line where it can, down to 26px (a longer title wraps).
 * Poppins ExtraBold capitals average about 0.7em.
 */
function titleSize(text, side) {
  const room = POSTER_SIZE.width - 56 - 48 - side;
  return Math.max(26, Math.min(44, Math.floor(room / (text.length * 0.7))));
}

const PY_KEYWORDS = new Set(
  'and as break class continue def elif else except False finally for from if import in is lambda None not or pass print range return True try while with input int float str len list dict set tuple map'.split(
    ' ',
  ),
);
const SQL_KEYWORDS = new Set(
  'SELECT FROM WHERE INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE PRIMARY KEY FOREIGN REFERENCES JOIN INNER LEFT RIGHT OUTER ON GROUP BY ORDER HAVING AND OR NOT NULL AS DISTINCT INDEX ALTER DROP UNIQUE CHECK DEFAULT UNION VIEW COUNT SUM AVG MIN MAX LIKE IN BETWEEN'.split(
    ' ',
  ),
);
const TOKEN =
  /(#.*$|--.*$|\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/gm;

/** Light syntax colouring: blue keywords, red strings, green numbers, grey comments. */
function highlight(code) {
  const out = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const [text, comment, string, number, word] = m;
    const color = comment
      ? C.code.comment
      : string
        ? C.code.string
        : number
          ? C.code.number
          : word &&
              (PY_KEYWORDS.has(word) || (word === word.toUpperCase() && SQL_KEYWORDS.has(word)))
            ? C.code.keyword
            : null;
    out.push(
      color ? (
        <span key={m.index} style={{ color }}>
          {text}
        </span>
      ) : (
        text
      ),
    );
    last = m.index + text.length;
  }
  out.push(code.slice(last));
  return out;
}

/** A tinted label pill, like "Key points:" or "Overall reaction:" on the reference posters. */
function Pill({ color, children }) {
  const c = C[color];
  return (
    <span
      className="inline-block rounded-md px-2.5 py-0.5 text-[12px] font-bold"
      style={{ background: c.tint, color: c.ink, border: `1px solid ${c.border}` }}
    >
      {children}
    </span>
  );
}

function Point({ point, color }) {
  return (
    <>
      {point.term && (
        <strong className="font-semibold" style={{ color: C[color].ink }}>
          {point.term}:{' '}
        </strong>
      )}
      {point.text}
    </>
  );
}

function Bullets({ block, color }) {
  return (
    <ul className="space-y-1.5">
      {block.items.map((p, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-snug">
          <span
            className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: C[color].ink }}
            aria-hidden
          />
          <span>
            <Point point={p} color={color} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Steps({ block, color }) {
  return (
    <ol className="space-y-1.5">
      {block.items.map((p, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-snug">
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
            style={{ background: C[color].ink }}
          >
            {i + 1}
          </span>
          <span>
            <Point point={p} color={color} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function Table({ block, color }) {
  const c = C[color];
  const cell = { borderBottom: `1px solid ${c.border}` };
  return (
    <div
      className="overflow-hidden rounded-xl bg-white"
      style={{ border: `1px solid ${c.border}` }}
    >
      <table className="w-full border-collapse text-left text-[12px] leading-snug">
        {block.head && (
          <thead style={{ background: c.tint }}>
            <tr>
              {block.head.map((h, i) => (
                <th key={i} className="px-2 py-1.5 font-bold text-navy" style={cell}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {block.items.map((row, r) => (
            <tr key={r}>
              {row.map((v, i) => (
                <td
                  key={i}
                  className={i === 0 ? 'px-2 py-1 font-semibold text-navy' : 'px-2 py-1'}
                  style={r < block.items.length - 1 ? cell : undefined}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A flowchart: boxes in turn colours joined by arrows, down a narrow card or across a wide one. */
function Flow({ block, color, wide }) {
  const Arrow = wide ? ArrowRight : ArrowDown;
  return (
    <div>
      {block.label && <Pill color={color}>{block.label}</Pill>}
      <div
        className={
          wide
            ? 'mt-2 flex flex-wrap items-center justify-center gap-1.5'
            : 'mt-2 flex flex-col items-center gap-1'
        }
      >
        {block.items.map((step, i) => {
          const c = C[FLOW_COLORS[i % FLOW_COLORS.length]];
          return (
            <div key={i} className={wide ? 'flex items-center gap-1.5' : 'contents'}>
              {i > 0 && <Arrow className="h-4 w-4 shrink-0 text-navy" aria-hidden />}
              <div
                className="rounded-lg px-3 py-1.5 text-center text-[12.5px] font-semibold leading-snug text-navy"
                style={{
                  background: c.tint,
                  border: `1.5px solid ${c.border}`,
                  minWidth: wide ? 0 : '70%',
                }}
              >
                {step}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Code({ block, heading }) {
  return (
    <pre className="whitespace-pre-wrap break-words rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 font-mono text-[12px] leading-relaxed text-navy">
      <code aria-label={/syntax/i.test(heading) ? 'Syntax' : 'Example'}>
        {highlight(block.code)}
      </code>
    </pre>
  );
}

function Recall({ block, color }) {
  return (
    <ul className="space-y-2">
      {block.items.map((r, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-snug">
          <CheckCircle2
            className="mt-px h-4 w-4 shrink-0"
            style={{ color: C[color].ink }}
            aria-hidden
          />
          <span>
            <strong className="font-semibold text-navy">{r.q}</strong> {r.a}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Block({ block, card }) {
  const wide = card.span > 1;
  switch (block.type) {
    case 'text':
      return <p className="text-[13px] leading-snug">{block.text}</p>;
    case 'bullets':
      return <Bullets block={block} color={card.color} />;
    case 'steps':
      return <Steps block={block} color={card.color} />;
    case 'table':
      return <Table block={block} color={card.color} />;
    case 'flow':
      return <Flow block={block} color={card.color} wide={wide} />;
    case 'code':
      return <Code block={block} heading={card.heading} />;
    case 'recall':
      return <Recall block={block} color={card.color} />;
    default:
      return null;
  }
}

/** A numbered pastel card: a circle badge and title, then the section's blocks in order. */
function Card({ card }) {
  const c = C[card.color];
  const Icon = CARD_ICONS[card.kind] ?? (card.heading === 'In the real world' ? Globe2 : null);
  const more = card.blocks.reduce((n, b) => n + (b.more ?? 0), 0);
  return (
    <section
      className="flex min-w-0 flex-col rounded-2xl"
      style={{ flex: `${card.span} 1 0`, background: c.wash, border: `1.5px solid ${c.border}` }}
    >
      <header className="flex items-center gap-2.5 px-4 pb-2 pt-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[16px] font-extrabold text-white"
          style={{ background: c.ink }}
        >
          {card.n}
        </span>
        <h3 className="flex-1 text-[17px] font-bold leading-tight text-navy">{card.heading}</h3>
        {Icon && <Icon className="h-6 w-6 shrink-0" style={{ color: c.ink }} aria-hidden />}
      </header>
      <div className="flex-1 space-y-2.5 px-4 pb-3.5">
        {card.blocks.map((b, i) => (
          <Block key={i} block={b} card={card} />
        ))}
        {more > 0 && <p className="text-[11px]">+{more} more in the exam notes</p>}
      </div>
    </section>
  );
}

/**
 * The topic cheat sheet as a study poster (ADR 0016) in the style of the faculty's reference
 * answer posters: a navy title bar, then rows of numbered pastel cards. Drawn off-screen and
 * turned into a PNG by CheatSheetImage. `poster` comes from cheatPoster(buildCheatSheet(page)).
 */
export function CheatSheetPoster({ poster }) {
  const marks = poster.marks ? ` (${poster.marks} MARKS)` : '';
  const side = (poster.badge ? poster.badge.length * 11 + 60 : 0) + poster.tag.length * 10 + 60;
  const size = titleSize(`${poster.title}${marks}`, side);
  return (
    <div
      className="flex flex-col gap-3.5 bg-white p-7 font-sans text-body"
      style={{ width: POSTER_SIZE.width }}
    >
      <header
        className="flex items-center gap-4 rounded-2xl px-6 py-3.5"
        style={{ background: C.bar.bg }}
      >
        {poster.badge && (
          <span
            className="shrink-0 rounded-lg px-3 py-1 text-[20px] font-extrabold uppercase"
            style={{ background: C.bar.pill, color: C.bar.pillText }}
          >
            {poster.badge}
          </span>
        )}
        <h2
          className="min-w-0 flex-1 font-extrabold uppercase leading-[1.1] tracking-tight text-white"
          style={{ fontSize: size }}
        >
          <span style={{ color: C.marker }}>{poster.titleKey}</span>
          {poster.titleRest}
          {marks && <span className="text-white">{marks}</span>}
        </h2>
        <span
          className="shrink-0 rounded-lg px-3.5 py-1.5 text-[17px] font-bold"
          style={{ background: C.bar.pill, color: C.bar.pillText }}
        >
          {poster.tag}
        </span>
      </header>

      {poster.rows.map((row, r) => (
        <div key={r} className="flex items-stretch gap-3.5">
          {row.map((card) => (
            <Card key={card.n} card={card} />
          ))}
        </div>
      ))}
    </div>
  );
}

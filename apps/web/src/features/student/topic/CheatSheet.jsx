import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Globe2,
  Lightbulb,
  Printer,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { item, stagger } from '../../../lib/motion';

/** Tile accents in turn: the brand palette's solid fills (ADR 0010), each with readable text. */
const ACCENTS = [
  { dot: 'bg-brand text-white', bar: 'border-t-brand' },
  { dot: 'bg-navy text-white', bar: 'border-t-navy' },
  { dot: 'bg-gold text-navy', bar: 'border-t-gold' },
  { dot: 'bg-accent text-navy', bar: 'border-t-accent' },
  { dot: 'bg-success text-white', bar: 'border-t-success' },
  { dot: 'bg-blue-dark text-white', bar: 'border-t-blue-dark' },
];

function Point({ point }) {
  if (point.code) {
    return (
      <li>
        <pre className="overflow-x-auto rounded-xl bg-surface p-3 font-mono text-xs leading-relaxed text-navy">
          <code>{point.code}</code>
        </pre>
      </li>
    );
  }
  return (
    <li className="flex gap-2 text-sm leading-snug">
      <span
        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50"
        aria-hidden
      />
      <span>
        {point.term && <strong className="font-semibold text-navy">{point.term}: </strong>}
        {point.text}
      </span>
    </li>
  );
}

function Panel({ icon: Icon, title, className, children }) {
  return (
    <motion.section
      {...item}
      className={cn('rounded-2xl border border-line bg-card p-4', className)}
    >
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-navy">
        <Icon className="h-4 w-4" aria-hidden /> {title}
      </h3>
      <div className="mt-3">{children}</div>
    </motion.section>
  );
}

/** Where the topic sits: what it builds on → the topic → what it unlocks. */
function FlowStrip({ sheet }) {
  if (!sheet.buildsOn.length && !sheet.unlocks.length) return null;
  const chip = (t) => (
    <span
      key={t}
      className="rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold"
    >
      {t}
    </span>
  );
  return (
    <motion.div
      {...item}
      aria-label="Where this topic fits"
      className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-surface p-3"
    >
      {sheet.buildsOn.length > 0 && (
        <>
          <span className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-body">
            Builds on
          </span>
          {sheet.buildsOn.map(chip)}
          <ArrowRight className="h-4 w-4 text-body" aria-hidden />
        </>
      )}
      <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
        {sheet.title}
      </span>
      {sheet.unlocks.length > 0 && (
        <>
          <ArrowRight className="h-4 w-4 text-body" aria-hidden />
          {sheet.unlocks.map(chip)}
          <span className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-body">
            Unlocks
          </span>
        </>
      )}
    </motion.div>
  );
}

/**
 * The topic on one printable page (ADR 0016): the big idea, the notes as numbered tiles, quick
 * recall, real-world uses, exam radar and the takeaway. `sheet` comes from buildCheatSheet().
 * It is the text version of the cheat-sheet image (CheatSheetImage), and its fallback.
 */
export function CheatSheet({ sheet, onPrint }) {
  const eyebrow = [sheet.subject.code, sheet.unit && `Unit ${sheet.unit.number}`]
    .filter(Boolean)
    .join(' · ');
  return (
    <motion.article
      {...stagger}
      id="cheat-sheet"
      aria-labelledby="cheat-sheet-h"
      className="cheat-sheet space-y-4 overflow-hidden rounded-card border border-line bg-card p-4 shadow-card sm:p-6"
    >
      <motion.header {...item} className="rounded-2xl bg-navy text-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-gold">Cheat sheet{eyebrow && ` · ${eyebrow}`}</p>
            <h2 id="cheat-sheet-h" className="mt-1 text-white text-2xl sm:text-3xl">
              {sheet.title}
            </h2>
            {sheet.unit && <p className="mt-1 text-sm text-white/80">{sheet.unit.title}</p>}
          </div>
          {onPrint && (
            <Button
              variant="secondary"
              size="sm"
              icon={Printer}
              onClick={onPrint}
              className="no-print"
            >
              Print
            </Button>
          )}
        </div>
        {sheet.bigIdea && (
          <div className="mt-4 flex gap-3 rounded-2xl bg-gold p-4 text-navy">
            <Lightbulb className="h-6 w-6 shrink-0" aria-hidden />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Big idea</p>
              <p className="mt-0.5 font-semibold leading-snug">{sheet.bigIdea}</p>
              {sheet.definition && <p className="mt-1 text-sm leading-snug">{sheet.definition}</p>}
            </div>
          </div>
        )}
      </motion.header>

      <FlowStrip sheet={sheet} />

      {sheet.tiles.length > 0 && (
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Key points">
          {sheet.tiles.map((tile, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <motion.li
                {...item}
                key={`${tile.heading}-${i}`}
                className={cn('rounded-2xl border border-line border-t-4 bg-card p-4', accent.bar)}
              >
                <h3 className="flex items-center gap-2 text-base">
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold',
                      accent.dot,
                    )}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  {tile.heading}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {tile.points.map((p, j) => (
                    <Point key={j} point={p} />
                  ))}
                </ul>
                {tile.more > 0 && (
                  <p className="mt-2 text-xs text-body">+{tile.more} more in the exam notes</p>
                )}
              </motion.li>
            );
          })}
        </ol>
      )}

      {(sheet.recall.length > 0 || sheet.realWorld.length > 0 || sheet.exam) && (
        <div className="grid gap-3 md:grid-cols-3">
          {sheet.recall.length > 0 && (
            <Panel icon={Brain} title="Quick recall" className="md:col-span-2">
              <dl className="grid gap-2 sm:grid-cols-2">
                {sheet.recall.map((r) => (
                  <div key={r.q} className="rounded-xl bg-surface p-3 text-sm">
                    <dt className="font-semibold text-navy">{r.q}</dt>
                    <dd className="mt-1 leading-snug">{r.a}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
          <div className="space-y-3">
            {sheet.realWorld.length > 0 && (
              <Panel icon={Globe2} title="In the real world">
                <ul className="space-y-1.5">
                  {sheet.realWorld.map((p, i) => (
                    <Point key={i} point={p} />
                  ))}
                </ul>
              </Panel>
            )}
            {sheet.exam && (
              <Panel icon={Target} title="Exam radar">
                <p className="text-sm">
                  Asked{' '}
                  <strong className="text-2xl font-bold text-brand">{sheet.exam.count}</strong> time
                  {sheet.exam.count === 1 ? '' : 's'} in past papers
                </p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {sheet.exam.marks.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-gold-tint px-2.5 py-0.5 text-xs font-bold text-navy"
                    >
                      {m} marks
                    </span>
                  ))}
                </p>
              </Panel>
            )}
          </div>
        </div>
      )}

      {sheet.takeaway && (
        <motion.footer
          {...item}
          className="flex gap-3 rounded-2xl border border-gold-border bg-gold-tint p-4 text-navy"
        >
          <Star className="h-5 w-5 shrink-0 fill-gold text-gold-border" aria-hidden />
          <p className="text-sm leading-snug">
            <strong>Remember: </strong>
            {sheet.takeaway}
          </p>
        </motion.footer>
      )}
      <p className="flex items-center justify-end gap-1 text-xs text-body">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Summarised from your faculty&apos;s published notes
      </p>
    </motion.article>
  );
}

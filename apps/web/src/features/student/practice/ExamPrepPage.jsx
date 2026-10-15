import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BookOpen, CalendarDays, FileText, Target, Trophy } from 'lucide-react';
import { Page } from '../../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  Select,
} from '../../../components/ui';
import { useExamPrep, useSubjectMap, useSubjects } from '../api';

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

/** /exam-prep — pick a subject (or jump straight in when there is only one). */
export function ExamPrepIndex() {
  const subjects = useSubjects();
  if (subjects.isPending) {
    return (
      <Page>
        <LoadingBlock label="Loading subjects" />
      </Page>
    );
  }
  const list = subjects.data ?? [];
  if (list.length === 1) return <Navigate to={`/exam-prep/${list[0].id}`} replace />;
  return (
    <Page>
      <EyebrowHeading eyebrow="Exam prep" title="Previous-year questions" level={1}>
        <p>See which topics are asked most, then open their 10-mark answers.</p>
      </EyebrowHeading>
      {list.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={BookOpen}
          title="No subjects yet"
          description="Exam prep appears once your subjects are published."
          action={
            <Button as={Link} to="/learn">
              Go to Learn
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <li key={s.id}>
              <Link
                to={`/exam-prep/${s.id}`}
                className="block rounded-card border border-line bg-card p-5 hover:border-blue hover:no-underline"
              >
                <p className="text-xs font-semibold text-body">
                  {s.code} · Semester {s.semester}
                </p>
                <h2 className="mt-1 text-lg">{s.name}</h2>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

/** /exam-prep/:subjectId — PYQs by unit with marks and frequency filters (F5). */
export function ExamPrepPage() {
  const { subjectId } = useParams();
  const [unitId, setUnitId] = useState('');
  const [marks, setMarks] = useState('');
  const [minFrequency, setMinFrequency] = useState('');
  const filters = useMemo(
    () => ({
      years: 5,
      unitId: unitId || undefined,
      marks: marks || undefined,
      minFrequency: minFrequency || undefined,
    }),
    [unitId, marks, minFrequency],
  );
  const prep = useExamPrep(subjectId, filters);
  const map = useSubjectMap(subjectId);
  const units = map.data?.units ?? [];
  const rows = prep.data?.topics ?? [];
  const asked = rows.filter((r) => r.frequency > 0);
  const byUnit = new Map();
  for (const r of rows) {
    const key = r.unit?.id ?? 'none';
    if (!byUnit.has(key)) byUnit.set(key, { unit: r.unit, rows: [] });
    byUnit.get(key).rows.push(r);
  }

  return (
    <Page>
      <EyebrowHeading
        eyebrow="Exam prep"
        title={map.data ? map.data.subject.name : 'Previous-year questions'}
        level={1}
      >
        <p>Questions from the last 5 years, most asked first.</p>
      </EyebrowHeading>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Select
          label="Unit"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          placeholder="All units"
          options={units.map((u) => ({ value: u.id, label: `Unit ${u.number} · ${u.title}` }))}
        />
        <Select
          label="Marks"
          value={marks}
          onChange={(e) => setMarks(e.target.value)}
          placeholder="Any marks"
          options={[2, 5, 10, 15, 16].map((m) => ({ value: String(m), label: `${m} marks` }))}
        />
        <Select
          label="Asked at least"
          value={minFrequency}
          onChange={(e) => setMinFrequency(e.target.value)}
          placeholder="Any number of times"
          options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n}× or more` }))}
        />
      </div>

      {prep.isPending ? (
        <LoadingBlock className="mt-6" label="Loading previous-year questions" lines={5} />
      ) : prep.isError ? (
        <EmptyState
          className="mt-6"
          tone="error"
          icon={Target}
          title="Could not load exam prep"
          description={prep.error.message}
          action={<Button onClick={() => prep.refetch()}>Try again</Button>}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Target}
          title="No topics match these filters"
          description="Clear a filter to see more."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setUnitId('');
                setMarks('');
                setMinFrequency('');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {asked.length > 0 && (
            <Card tone="navy" className="mt-6">
              <p className="eyebrow text-gold">Most asked</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                {asked.slice(0, 3).map((r, i) => (
                  <li
                    key={r.topicId}
                    className="flex items-center gap-3 rounded-2xl bg-white/10 p-3"
                  >
                    <Trophy className="h-5 w-5 shrink-0 text-gold" aria-hidden />
                    <span className="min-w-0">
                      <span className="sr-only">Rank {i + 1}: </span>
                      <span className="block truncate font-semibold text-white">{r.title}</span>
                      <span className="text-xs text-white/80">Asked {r.frequency}×</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {[...byUnit.values()].map(({ unit, rows: unitRows }) => (
            <section
              key={unit?.id ?? 'none'}
              className="mt-8"
              aria-label={unit ? `Unit ${unit.number}` : 'Other'}
            >
              <h2 className="text-lg">
                {unit ? `Unit ${unit.number} · ${unit.title}` : 'Other topics'}
              </h2>
              <ul className="mt-3 space-y-3">
                {unitRows.map((r) => (
                  <li key={r.topicId}>
                    <Card padded={false} className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3>{r.title}</h3>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <Badge tone={r.frequency > 0 ? 'navy' : 'neutral'}>
                              Asked {r.frequency}×
                            </Badge>
                            {Object.entries(r.marksBreakdown).map(([m, n]) => (
                              <Badge key={m}>
                                {m} marks × {n}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          as={Link}
                          to={`/topics/${r.topicId}#step-prepare`}
                          size="sm"
                          variant="secondary"
                          icon={FileText}
                          className="hover:no-underline"
                        >
                          10-mark answer
                        </Button>
                      </div>
                      {r.pyqs.length > 0 && (
                        <ul className="mt-4 space-y-2 border-t border-line pt-3">
                          {r.pyqs.map((p) => (
                            <li key={p.id} className="text-sm">
                              <p className="text-navy">{p.text}</p>
                              <p className="mt-0.5 flex items-center gap-1 text-xs">
                                <CalendarDays className="h-3.5 w-3.5" aria-hidden />{' '}
                                {fmt(p.examDate)} · {p.marks} marks
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {prep.data.untaggedCount > 0 && (
            <p className="mt-6 text-sm">
              {prep.data.untaggedCount} more question{prep.data.untaggedCount === 1 ? '' : 's'} not
              yet tagged to a topic.
            </p>
          )}
        </>
      )}
    </Page>
  );
}

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, CalendarDays, FileText, Target } from 'lucide-react';
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
import { theoryOnly, useExamPrep, useSubjectMap, useSubjects } from '../api';
import { SubjectTabs } from '../SubjectTabs';

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

/**
 * /exam-prep and /exam-prep/:subjectId — one page with a tab per subject; each tab is a
 * self-contained SubjectExamPrep component. The URL remembers the open subject.
 */
export function ExamPrepPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const subjects = useSubjects();
  if (subjects.isPending) {
    return (
      <Page>
        <LoadingBlock label="Loading subjects" />
      </Page>
    );
  }
  const list = theoryOnly(subjects.data);
  const current = list.find((s) => s.id === subjectId) ?? list[0];
  return (
    <Page>
      <EyebrowHeading eyebrow="Exam prep" title="Prepare for your exams" level={1}>
        <p>Each subject has its own tab: every topic by unit, with its exam study material.</p>
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
        <div className="mt-6">
          <SubjectTabs
            label="Subjects"
            subjects={list}
            value={current.id}
            onChange={(id) => navigate(`/exam-prep/${id}`, { replace: true })}
          >
            {(s) => <SubjectExamPrep key={s.id} subject={s} />}
          </SubjectTabs>
        </div>
      )}
    </Page>
  );
}

/** Kept as a route name: the index is the same page with the first subject open. */
export const ExamPrepIndex = ExamPrepPage;

/** One subject's exam prep: topics by unit with their questions and study material (F5). */
function SubjectExamPrep({ subject }) {
  const subjectId = subject.id;
  const [unitId, setUnitId] = useState('');
  const [marks, setMarks] = useState('');
  const filters = useMemo(
    () => ({
      years: 5,
      unitId: unitId || undefined,
      marks: marks || undefined,
    }),
    [unitId, marks],
  );
  const prep = useExamPrep(subjectId, filters);
  const map = useSubjectMap(subjectId);
  const units = map.data?.units ?? [];
  const rows = prep.data?.topics ?? [];
  const byUnit = new Map();
  for (const r of rows) {
    const key = r.unit?.id ?? 'none';
    if (!byUnit.has(key)) byUnit.set(key, { unit: r.unit, rows: [] });
    byUnit.get(key).rows.push(r);
  }

  return (
    <section aria-labelledby={`prep-${subjectId}`}>
      <p className="text-xs font-semibold">
        {subject.code} · Semester {subject.semester}
      </p>
      <h2 id={`prep-${subjectId}`} className="mt-1 text-xl">
        {subject.name}
      </h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
      </div>

      {prep.isPending ? (
        <LoadingBlock className="mt-6" label="Loading exam prep" lines={5} />
      ) : prep.isError ? (
        <EmptyState
          className="mt-6"
          tone="error"
          icon={Target}
          title="Could not load exam prep"
          description={prep.error.message}
          action={<Button onClick={() => prep.refetch()}>Try again</Button>}
        />
      ) : rows.length === 0 && !(unitId || marks) ? (
        <EmptyState
          className="mt-6"
          icon={BookOpen}
          title="No topics yet"
          description="Topics appear here once your faculty publish this subject's map."
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
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {[...byUnit.values()].map(({ unit, rows: unitRows }) => (
            <section
              key={unit?.id ?? 'none'}
              className="mt-8"
              aria-label={unit ? `Unit ${unit.number}` : 'Other'}
            >
              <h3 className="text-lg">
                {unit ? `Unit ${unit.number} · ${unit.title}` : 'Other topics'}
              </h3>
              <ul className="mt-3 space-y-3">
                {unitRows.map((r) => (
                  <li key={r.topicId}>
                    <Card padded={false} className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4>{r.title}</h4>
                          <div className="mt-1 flex flex-wrap gap-1.5">
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
                          Study material
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
    </section>
  );
}

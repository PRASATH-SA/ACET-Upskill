import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Map as MapIcon, Pencil, Route } from 'lucide-react';
import { get } from '../../../api/client';
import { Page } from '../../../components/layout/AppShell';
import { QueryError } from '../../../components/QueryError';
import { Button, EyebrowHeading, LoadingBlock, ProgressRing } from '../../../components/ui';
import { UnitJourney } from './UnitJourney';

export const useSubjectOverview = (subjectId) =>
  useQuery({
    queryKey: ['subjects', subjectId, 'overview'],
    queryFn: () => get(`/subjects/${subjectId}/overview`),
    enabled: Boolean(subjectId),
  });

/**
 * /subjects/:subjectId — the subject root page: a hero with progress, then the units as a visual
 * journey joined by arrows (UnitJourney). Kept visual on purpose: no long text sections.
 */
export function SubjectOverviewPage() {
  const { subjectId } = useParams();
  const q = useSubjectOverview(subjectId);

  if (q.isPending)
    return (
      <Page>
        <LoadingBlock label="Loading the subject" lines={6} />
      </Page>
    );
  if (q.isError)
    return (
      <Page>
        <QueryError query={q} what="this subject" />
      </Page>
    );

  const { subject, overview: o, units, unitLinks, courseOutcomes, progress, canEdit } = q.data;
  const pct = progress?.total ? (progress.mastered / progress.total) * 100 : 0;
  const started = progress && (progress.mastered > 0 || progress.started > 0);

  return (
    <Page>
      {/* Hero */}
      <header className="glass-navy overflow-hidden rounded-sheet p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <p className="eyebrow text-gold">
              {subject.code} · Semester {subject.semester}
            </p>
            <h1 className="mt-2 text-3xl text-white sm:text-4xl">{subject.name}</h1>
            {o?.tagline && <p className="mt-3 text-lg text-white/90">{o.tagline}</p>}
            <p className="mt-3 text-sm text-white/80">
              {units.length} unit{units.length === 1 ? '' : 's'} ·{' '}
              {units.reduce((n, u) => n + u.topicCount, 0)} topics
              {courseOutcomes.length ? ` · ${courseOutcomes.length} course outcomes` : ''}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                as={Link}
                to={`/learn/${subject.id}`}
                size="lg"
                icon={Route}
                className="hover:no-underline"
              >
                {started ? 'Continue learning path' : 'Start learning path'}
              </Button>
              <Button
                as={Link}
                to={`/learn/${subject.id}?view=map`}
                size="lg"
                variant="light"
                icon={MapIcon}
                className="hover:no-underline"
              >
                Concept map
              </Button>
              {canEdit && (
                <Button
                  as={Link}
                  to={`/studio/subjects/${subject.id}/overview`}
                  size="lg"
                  variant="light"
                  icon={Pencil}
                  className="hover:no-underline"
                >
                  Edit overview
                </Button>
              )}
            </div>
          </div>
          {progress && (
            <div className="flex flex-col items-center rounded-3xl bg-white p-4">
              <ProgressRing value={pct} label={`${subject.name} mastery`} size={96} stroke={8}>
                <span className="text-lg">{Math.round(pct)}%</span>
              </ProgressRing>
              <p className="mt-2 text-sm font-semibold text-navy">
                {progress.mastered} of {progress.total} mastered
              </p>
            </div>
          )}
        </div>
      </header>

      {canEdit && o?.status && o.status !== 'published' && (
        <p className="mt-4 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm text-navy">
          Preview: this overview is a <strong>{o.status}</strong> and students can&apos;t see it
          yet.
        </p>
      )}

      <section aria-labelledby="ov-journey" className="mt-10">
        <EyebrowHeading
          id="ov-journey"
          eyebrow="Your journey"
          title="How the units connect"
          level={2}
          className="mb-4"
        />
        {units.length === 0 ? (
          <p className="text-sm">The units of this subject are not published yet.</p>
        ) : (
          <UnitJourney
            units={units}
            unitLinks={unitLinks}
            subjectId={subject.id}
            careers={o?.careers ?? []}
          />
        )}
      </section>
    </Page>
  );
}

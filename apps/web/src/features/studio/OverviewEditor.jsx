import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Eye, Plus, Sparkles, Trash2 } from 'lucide-react';
import { post, put } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import { QueryError } from '../../components/QueryError';
import {
  Button,
  Card,
  EyebrowHeading,
  IconButton,
  Input,
  LoadingBlock,
  Textarea,
  toast,
} from '../../components/ui';
import { useSession } from '../auth/session';
import { useSubjectOverview } from '../student/overview/SubjectOverviewPage';
import { aiOffline, useAiHealth, useStartJob } from './api';
import { ItemBadges } from './content/ItemStatus';
import { MarkdownField } from './content/editors';
import { JobProgress } from './JobProgress';

const lines = (s) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

/** Rows of { title, <second> } with add/remove (prerequisites, applications). */
function PairList({ label, items, second, secondLabel, onChange, max = 8 }) {
  const set = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold text-navy">{label}</legend>
      {items.map((it, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <Input
            label="Title"
            value={it.title}
            maxLength={80}
            onChange={(e) => set(i, { title: e.target.value })}
          />
          <Input
            label={secondLabel}
            value={it[second]}
            maxLength={240}
            onChange={(e) => set(i, { [second]: e.target.value })}
          />
          <IconButton
            icon={Trash2}
            label={`Remove ${it.title || 'row'}`}
            variant="outline"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      {items.length < max && (
        <Button
          size="sm"
          variant="ghost"
          icon={Plus}
          onClick={() => onChange([...items, { title: '', [second]: '' }])}
        >
          Add
        </Button>
      )}
    </fieldset>
  );
}

const fromData = (data) => {
  const o = data.overview;
  return {
    tagline: o?.tagline ?? '',
    why: o?.why ?? '',
    prerequisites: o?.prerequisites ?? [],
    outcomes: (o?.outcomes ?? []).join('\n'),
    applications: o?.applications ?? [],
    careers: (o?.careers ?? []).join('\n'),
    units: Object.fromEntries(
      data.units.map((u) => [
        u.id,
        { summary: u.summary, youWillBeAbleTo: u.youWillBeAbleTo, leadsTo: u.leadsTo },
      ]),
    ),
  };
};

/** /studio/subjects/:subjectId/overview — write, AI-draft, preview and publish the root page. */
export function OverviewEditor() {
  const { subjectId } = useParams();
  const [params, setParams] = useSearchParams();
  const jobId = params.get('job');
  const q = useSubjectOverview(subjectId);
  const qc = useQueryClient();
  const health = useAiHealth();
  const offline = aiOffline(health);
  const canApprove = useSession((s) => s.user.role === 'faculty');
  const draftAi = useStartJob(`/ai/subjects/${subjectId}/draft-overview`);
  const [f, setF] = useState(null);

  useEffect(() => {
    if (q.data) setF(fromData(q.data));
  }, [q.data]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['subjects', subjectId, 'overview'] });
  const save = useMutation({
    mutationFn: () =>
      put(`/subjects/${subjectId}/overview`, {
        tagline: f.tagline,
        why: f.why,
        prerequisites: f.prerequisites.filter((p) => p.title.trim()),
        outcomes: lines(f.outcomes),
        applications: f.applications.filter((a) => a.title.trim()),
        careers: lines(f.careers),
        units: Object.entries(f.units).map(([unitId, u]) => ({ unitId, ...u })),
      }),
    onSuccess: async () => {
      await refresh();
      toast.success('Saved', 'Students see it once it is published.');
    },
  });
  const publish = useMutation({
    mutationFn: ({ id, status }) => post(`/subject-overviews/${id}/status`, { status }),
    onSuccess: refresh,
  });

  if (q.isPending || !f)
    return (
      <Page>
        <LoadingBlock label="Loading the overview" />
      </Page>
    );
  if (q.isError)
    return (
      <Page>
        <QueryError query={q} what="this subject" />
      </Page>
    );

  const { subject, overview: o, units } = q.data;
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const setUnit = (id, patch) =>
    setF((x) => ({ ...x, units: { ...x.units, [id]: { ...x.units[id], ...patch } } }));

  return (
    <Page>
      <Link to="/studio" className="inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Studio
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <EyebrowHeading
          eyebrow={`${subject.code} · Subject overview`}
          title={subject.name}
          level={1}
        >
          <p className="text-sm">
            The subject&apos;s root page: why it matters, what to know first, how the units connect
            and what students can do afterwards. The unit map and progress are added automatically.
          </p>
        </EyebrowHeading>
        <div className="flex flex-wrap items-center gap-2">
          {o && <ItemBadges item={o} />}
          <Button
            as={Link}
            to={`/subjects/${subject.id}`}
            variant="secondary"
            icon={Eye}
            className="hover:no-underline"
          >
            Preview
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="space-y-4">
            <Input
              label="Tagline (one line under the subject name)"
              value={f.tagline}
              maxLength={160}
              onChange={(e) => set({ tagline: e.target.value })}
            />
            <MarkdownField
              label="Why learn this subject"
              value={f.why}
              onChange={(why) => set({ why })}
              rows={5}
            />
          </Card>

          <Card className="space-y-6">
            <PairList
              label="Before you start: prerequisites"
              items={f.prerequisites}
              second="why"
              secondLabel="Why it's needed"
              onChange={(prerequisites) => set({ prerequisites })}
            />
            <PairList
              label="Where it's used"
              items={f.applications}
              second="description"
              secondLabel="One sentence"
              onChange={(applications) => set({ applications })}
            />
            <Textarea
              label="Students will be able to (one per line)"
              rows={5}
              value={f.outcomes}
              onChange={(e) => set({ outcomes: e.target.value })}
            />
            <Textarea
              label="Careers that use it (one per line)"
              rows={3}
              value={f.careers}
              onChange={(e) => set({ careers: e.target.value })}
            />
          </Card>

          <Card>
            <h2 className="text-lg">The journey: unit by unit</h2>
            <p className="mt-1 text-sm">
              Topics, progress and cross-unit links come from the concept map. Add a line on each
              unit and on why it leads to the next.
            </p>
            {units.length === 0 && (
              <p className="mt-3 text-sm">This subject has no units yet. Build the map first.</p>
            )}
            <ol className="mt-4 space-y-5">
              {units.map((u, i) => (
                <li key={u.id} className="rounded-2xl border border-line p-4">
                  <p className="font-semibold text-navy">
                    Unit {u.number}: {u.title}{' '}
                    <span className="text-xs font-normal text-body">({u.topicCount} topics)</span>
                  </p>
                  <div className="mt-3 grid gap-3">
                    <Input
                      label="What it covers"
                      value={f.units[u.id]?.summary ?? ''}
                      maxLength={300}
                      onChange={(e) => setUnit(u.id, { summary: e.target.value })}
                    />
                    <Input
                      label="After this unit, students can…"
                      value={f.units[u.id]?.youWillBeAbleTo ?? ''}
                      maxLength={240}
                      onChange={(e) => setUnit(u.id, { youWillBeAbleTo: e.target.value })}
                    />
                    {i < units.length - 1 && (
                      <Input
                        label={`Why it leads to Unit ${units[i + 1].number}`}
                        value={f.units[u.id]?.leadsTo ?? ''}
                        maxLength={240}
                        onChange={(e) => setUnit(u.id, { leadsTo: e.target.value })}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              Save
            </Button>
            {o && o.status !== 'published' && canApprove && (
              <Button
                variant="navy"
                icon={CheckCircle2}
                loading={publish.isPending}
                onClick={() => publish.mutate({ id: o.id, status: 'published' })}
              >
                Approve &amp; publish
              </Button>
            )}
            {o?.status === 'published' && (
              <Button variant="ghost" onClick={() => publish.mutate({ id: o.id, status: 'draft' })}>
                Unpublish
              </Button>
            )}
          </div>
          <p className="text-xs text-body">
            Save before publishing: publishing uses the last saved version.
          </p>
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-navy" aria-hidden /> Draft with AI
            </h2>
            <p className="mt-2 text-sm">
              The local AI writes a draft from this subject&apos;s <strong>syllabus PDF</strong> and
              its units only. You review and publish it. An overview you wrote or edited is never
              replaced.
            </p>
            <Button
              className="mt-3"
              variant="secondary"
              icon={Sparkles}
              disabled={offline || Boolean(jobId)}
              loading={draftAi.isPending}
              onClick={() =>
                draftAi.mutate({}, { onSuccess: (id) => setParams({ job: id }, { replace: true }) })
              }
            >
              {offline ? 'AI service offline' : 'Draft overview with AI'}
            </Button>
          </Card>
          {jobId && (
            <JobProgress
              jobId={jobId}
              title="Drafting the overview"
              onClose={() => {
                params.delete('job');
                setParams(params, { replace: true });
                refresh();
              }}
              renderResult={(job) =>
                job.status === 'succeeded' ? (
                  <p className="mt-3 text-sm">
                    {job.result === 'created'
                      ? 'Draft ready. Close this panel to load it, then review and publish.'
                      : job.result === 'needsMaterial'
                        ? 'Upload the syllabus PDF on the map builder first.'
                        : 'You already wrote or edited this overview, so the AI left it as is.'}
                  </p>
                ) : null
              }
            />
          )}
        </aside>
      </div>
    </Page>
  );
}

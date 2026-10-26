import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, FlaskConical, Pencil, Plus, Trash2 } from 'lucide-react';
import { del, patch, post } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import { QueryError } from '../../components/QueryError';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  EyebrowHeading,
  IconButton,
  Input,
  LoadingBlock,
  Select,
  Textarea,
  toast,
} from '../../components/ui';
import { useSession } from '../auth/session';
import { keys, useLab } from '../student/api';

/** Add or edit one experiment: where it sits on the theory roadmap, and which problems it links. */
function ExperimentForm({ initial, topics, available, nextNumber, saving, onSave }) {
  const [v, setV] = useState({
    topicId: initial?.topicId ?? topics[0]?.id ?? '',
    number: initial?.number ?? nextNumber,
    title: initial?.title ?? '',
    aim: initial?.aim ?? '',
    procedure: initial?.procedure ?? '',
    challengeIds: initial?.challenges.map((c) => c.id) ?? [],
  });
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const problems = available[v.topicId] ?? [];
  const toggle = (id) =>
    setV((x) => ({
      ...x,
      challengeIds: x.challengeIds.includes(id)
        ? x.challengeIds.filter((c) => c !== id)
        : [...x.challengeIds, id],
    }));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Select
          label="Topic on the roadmap"
          value={v.topicId}
          onChange={(e) => setV((x) => ({ ...x, topicId: e.target.value, challengeIds: [] }))}
          options={topics.map((t) => ({ value: t.id, label: t.label }))}
        />
        <Input
          label="Number"
          type="number"
          min={1}
          value={v.number}
          onChange={(e) => setV((x) => ({ ...x, number: Number(e.target.value) }))}
        />
      </div>
      <Input
        label="Title"
        value={v.title}
        onChange={set('title')}
        placeholder="e.g. Simple calculator"
      />
      <Textarea label="Aim" rows={2} value={v.aim} onChange={set('aim')} />
      <Textarea
        label="Procedure (markdown)"
        rows={6}
        value={v.procedure}
        onChange={set('procedure')}
        hint="Algorithm, steps or sample output for the lab record."
      />
      <fieldset>
        <legend className="text-sm font-semibold text-navy">Code-lab problems to solve</legend>
        {problems.length === 0 ? (
          <p className="mt-1 text-sm">
            This topic has no published code-lab problems. Students mark the experiment done
            themselves.
          </p>
        ) : (
          <div className="mt-2 space-y-1">
            {problems.map((p) => (
              <label key={p.id} className="flex min-h-[40px] items-center gap-3 text-sm text-navy">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-navy"
                  checked={v.challengeIds.includes(p.id)}
                  onChange={() => toggle(p.id)}
                />
                <span className="flex-1">{p.title}</span>
                <Badge>{p.difficulty}</Badge>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <Button
        variant="navy"
        loading={saving}
        disabled={!v.topicId || v.title.trim().length < 2 || !(v.number >= 1)}
        onClick={() => onSave(v)}
      >
        Save experiment
      </Button>
    </div>
  );
}

/** /studio/labs/:subjectId — experiments of a practical subject on its theory roadmap (ADR 0012). */
export function LabEditor() {
  const { subjectId } = useParams();
  const user = useSession((s) => s.user);
  const qc = useQueryClient();
  const lab = useLab(subjectId);
  // The theory roadmap comes with the lab (lab faculty may not teach the theory subject).
  const map = { data: lab.data?.roadmap, isPending: lab.isPending };
  const [dialog, setDialog] = useState(null); // null | {} (new) | experiment

  const topics = useMemo(() => {
    if (!map.data) return [];
    const unitNo = new Map(map.data.units.map((u) => [u.id, u.number]));
    return [...map.data.topics]
      .sort((a, b) => unitNo.get(a.unitId) - unitNo.get(b.unitId) || a.order - b.order)
      .map((t) => ({ id: t.id, label: `Unit ${unitNo.get(t.unitId)} · ${t.title}` }));
  }, [map.data]);
  const topicLabel = new Map(topics.map((t) => [t.id, t.label]));

  const refresh = () => qc.invalidateQueries({ queryKey: keys.lab(subjectId) });
  const save = useMutation({
    mutationFn: (body) =>
      dialog?.id
        ? patch(`/experiments/${dialog.id}`, body)
        : post(`/subjects/${subjectId}/experiments`, body),
    onSuccess: () => {
      toast.success('Experiment saved');
      setDialog(null);
      refresh();
    },
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }) => post(`/experiments/${id}/status`, { status }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id) => del(`/experiments/${id}`),
    onSuccess: refresh,
  });

  if (lab.isPending || (lab.data && map.isPending))
    return (
      <Page>
        <LoadingBlock label="Loading the lab" lines={6} />
      </Page>
    );
  if (lab.isError)
    return (
      <Page>
        <QueryError query={lab} what="this lab" />
      </Page>
    );

  const { subject, theorySubject, experiments, availableChallenges = {} } = lab.data;
  const nextNumber = Math.max(0, ...experiments.map((e) => e.number)) + 1;
  const canPublish = user.role === 'faculty';

  return (
    <Page>
      <Button
        as={Link}
        to="/studio"
        variant="ghost"
        size="sm"
        icon={ArrowLeft}
        className="hover:no-underline"
      >
        Studio
      </Button>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <EyebrowHeading eyebrow={`${subject.code} · Practical`} title={subject.name} level={1}>
          <p className="mt-1 text-sm">
            Experiments sit on the roadmap of{' '}
            <Link to={`/studio/subjects/${theorySubject.id}`}>
              {theorySubject.code} · {theorySubject.name}
            </Link>
            .
          </p>
        </EyebrowHeading>
        <div className="flex flex-wrap gap-2">
          <Button
            as={Link}
            to={`/labs/${subjectId}`}
            variant="secondary"
            icon={Eye}
            className="hover:no-underline"
          >
            Student view
          </Button>
          <Button icon={Plus} onClick={() => setDialog({})} disabled={topics.length === 0}>
            Add experiment
          </Button>
        </div>
      </div>

      {experiments.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={FlaskConical}
          title="No experiments yet"
          description={
            topics.length
              ? 'Add the first experiment and place it on a topic of the theory roadmap.'
              : 'The theory subject has no topics yet. Build its map first.'
          }
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {experiments.map((e) => (
            <li key={e.id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">
                    Experiment {e.number} · {topicLabel.get(e.topicId) ?? 'Topic'}
                  </p>
                  <p className="font-semibold text-navy">{e.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge tone={e.status === 'published' ? 'green' : 'orange'}>{e.status}</Badge>
                    <Badge>
                      {e.challenges.length} problem{e.challenges.length === 1 ? '' : 's'}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {canPublish && (
                    <Button
                      size="sm"
                      variant={e.status === 'published' ? 'ghost' : 'secondary'}
                      loading={setStatus.isPending && setStatus.variables?.id === e.id}
                      onClick={() =>
                        setStatus.mutate({
                          id: e.id,
                          status: e.status === 'published' ? 'draft' : 'published',
                        })
                      }
                    >
                      {e.status === 'published' ? 'Unpublish' : 'Publish'}
                    </Button>
                  )}
                  <IconButton
                    icon={Pencil}
                    label={`Edit experiment ${e.number}`}
                    onClick={() => setDialog(e)}
                  />
                  <IconButton
                    icon={Trash2}
                    label={`Delete experiment ${e.number}`}
                    onClick={() => {
                      if (window.confirm(`Delete experiment ${e.number}, “${e.title}”?`))
                        remove.mutate(e.id);
                    }}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        size="lg"
        title={dialog?.id ? `Edit experiment ${dialog.number}` : 'Add experiment'}
      >
        {dialog && (
          <ExperimentForm
            key={dialog.id ?? 'new'}
            initial={dialog.id ? dialog : null}
            topics={topics}
            available={availableChallenges}
            nextNumber={nextNumber}
            saving={save.isPending}
            onSave={(body) => save.mutate(body)}
          />
        )}
      </Dialog>
    </Page>
  );
}

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCheck,
  FileUp,
  LayoutGrid,
  Plus,
  Redo2,
  Save,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import { layoutMap } from '@acet/shared';
import { ApiError, del, patch, post } from '../../api/client';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  IconButton,
  Input,
  LoadingBlock,
  Select,
  Textarea,
  toast,
} from '../../components/ui';
import { useSubjectMap } from '../student/api';
import { aiOffline, useAiHealth, useMaterials, useStartJob, useUploadMaterial } from './api';
import { JobProgress } from './JobProgress';
import { diffForSave, fromServer, historyReducer, initHistory } from './map/editorState';
import { MapEditor } from './map/MapEditor';
import { AiStatus } from './StudioHome';

const EMPTY = { topics: [], links: [], deletedTopics: [], deletedLinks: [] };

function LinkDialog({ request, titleOf, onClose, onSave }) {
  const [type, setType] = useState('prerequisite');
  const [reason, setReason] = useState('');
  if (!request) return null;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Link topics"
      description={`${titleOf(request.fromTopicId)} → ${titleOf(request.toTopicId)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={reason.trim().length < 3}
            onClick={() => onSave({ ...request, type, reason: reason.trim() })}
          >
            Add link
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Link type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            {
              value: 'prerequisite',
              label: 'Prerequisite: learn the first topic before the second',
            },
            { value: 'related', label: 'Related: the topics connect' },
          ]}
        />
        <Textarea
          label="Why are they connected?"
          hint="One short sentence students will see. At least 3 characters."
          rows={2}
          maxLength={240}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          data-autofocus
        />
      </div>
    </Dialog>
  );
}

const NEW_UNIT = '__new';

function AddTopicDialog({ open, subjectId, units, onClose, onCreated }) {
  const qc = useQueryClient();
  const [unitId, setUnitId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [unitTitle, setUnitTitle] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const create = useMutation({
    mutationFn: async () => {
      let target = unitId;
      if (unitId === NEW_UNIT) {
        const u = await post(`/subjects/${subjectId}/units`, {
          number: Number(unitNumber),
          title: unitTitle.trim(),
        });
        target = u.id;
        await qc.invalidateQueries({ queryKey: ['subjects', subjectId, 'map'] });
      }
      return post(`/units/${target}/topics`, { title: title.trim(), summary: summary.trim() });
    },
    onSuccess: (t) => {
      onCreated(t);
      setTitle('');
      setSummary('');
      onClose();
    },
  });
  useEffect(() => {
    if (open && !unitId) setUnitId(units[0]?.id ?? NEW_UNIT);
  }, [open, unitId, units]);
  const newUnitOk =
    unitId !== NEW_UNIT || (Number(unitNumber) >= 1 && unitTitle.trim().length >= 2);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a topic"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={create.isPending}
            disabled={!unitId || !title.trim() || !newUnitOk}
            onClick={() => create.mutate()}
          >
            Add topic
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Unit"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          options={[
            ...units.map((u) => ({ value: u.id, label: `Unit ${u.number} · ${u.title}` })),
            { value: NEW_UNIT, label: 'New unit…' },
          ]}
        />
        {unitId === NEW_UNIT && (
          <div className="grid grid-cols-[90px_1fr] gap-3">
            <Input
              label="Number"
              type="number"
              min={1}
              max={20}
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
            />
            <Input
              label="Unit title"
              value={unitTitle}
              maxLength={160}
              onChange={(e) => setUnitTitle(e.target.value)}
            />
          </div>
        )}
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          data-autofocus
        />
        <Textarea
          label="One-line summary"
          rows={2}
          maxLength={600}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
    </Dialog>
  );
}

function Inspector({ selected, state, units, dispatch, onClose }) {
  if (!selected) {
    return (
      <p className="text-sm">
        Select a topic or a link to edit it. Drag from a node&apos;s right handle to another node to
        link them.
      </p>
    );
  }
  if (selected.kind === 'topic') {
    const t = state.topics.find((x) => x.id === selected.id);
    if (!t) return null;
    const unit = units.find((u) => u.id === t.unitId);
    return (
      <div className="space-y-4">
        <p className="eyebrow">Selected topic</p>
        <Input
          key={t.id}
          label="Title"
          defaultValue={t.title}
          maxLength={160}
          onBlur={(e) =>
            e.target.value.trim() &&
            e.target.value.trim() !== t.title &&
            dispatch({ type: 'rename', id: t.id, title: e.target.value.trim() })
          }
        />
        <p className="text-sm">
          Unit {unit?.number} · {t.status}
          {t.source === 'ai' && ' · drafted by AI'}
        </p>
        {t.summary && <p className="text-sm">{t.summary}</p>}
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to={`/studio/topics/${t.id}`} size="sm" className="hover:no-underline">
            Edit content
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={Trash2}
            onClick={() => {
              dispatch({ type: 'deleteTopic', id: t.id });
              onClose();
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  }
  const l = state.links.find((x) => x.id === selected.id);
  if (!l) return null;
  const title = (id) => state.topics.find((t) => t.id === id)?.title;
  return (
    <div className="space-y-4">
      <p className="eyebrow">Selected link</p>
      <p className="font-semibold text-navy">
        {title(l.fromTopicId)} → {title(l.toTopicId)}
      </p>
      <div role="group" aria-label="Link type" className="flex gap-2">
        {['prerequisite', 'related'].map((type) => (
          <Button
            key={type}
            size="sm"
            variant={l.type === type ? 'navy' : 'secondary'}
            aria-pressed={l.type === type}
            onClick={() => dispatch({ type: 'updateLink', id: l.id, patch: { type } })}
          >
            {type === 'prerequisite' ? 'Prerequisite' : 'Related'}
          </Button>
        ))}
      </div>
      <Textarea
        key={l.id}
        label="Reason"
        rows={3}
        maxLength={240}
        defaultValue={l.reason}
        onBlur={(e) =>
          e.target.value.trim().length >= 3 &&
          e.target.value.trim() !== l.reason &&
          dispatch({ type: 'updateLink', id: l.id, patch: { reason: e.target.value.trim() } })
        }
      />
      <Button
        size="sm"
        variant="ghost"
        icon={Trash2}
        onClick={() => {
          dispatch({ type: 'deleteLink', id: l.id });
          onClose();
        }}
      >
        Delete link
      </Button>
    </div>
  );
}

/** /studio/subjects/:subjectId — syllabus PDF → AI draft map → edit → approve (F6.2). */
export function SubjectBuilder() {
  const { subjectId } = useParams();
  const [params, setParams] = useSearchParams();
  const jobId = params.get('job');
  const qc = useQueryClient();
  const map = useSubjectMap(subjectId);
  const health = useAiHealth();
  const syllabi = useMaterials({ subjectId });
  const upload = useUploadMaterial();
  const draftMap = useStartJob(`/ai/subjects/${subjectId}/draft-map`);
  const fileRef = useRef(null);

  const [history, dispatch] = useReducer(historyReducer, initHistory(EMPTY));
  const [original, setOriginal] = useState(EMPTY);
  const [selected, setSelected] = useState(null);
  const [linkRequest, setLinkRequest] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const state = history.present;
  const diff = useMemo(() => diffForSave(original, state), [original, state]);

  // Load (or reload after an AI job) the server map, unless there are unsaved edits.
  useEffect(() => {
    if (!map.data) return;
    if (diff.changed && original !== EMPTY) return;
    const s = fromServer(map.data);
    setOriginal(s);
    dispatch({ type: 'reset', state: s });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.data]);

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      e.preventDefault();
      dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
    };
    const beforeUnload = (e) => {
      if (diff.changed) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [diff.changed]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      if (
        diff.body.nodes.length ||
        diff.body.edges.upsert.length ||
        diff.body.edges.delete.length
      ) {
        await patch(`/subjects/${subjectId}/map`, diff.body);
      }
      const failed = [];
      for (const id of diff.deleteTopics) {
        try {
          await del(`/topics/${id}`);
        } catch (err) {
          failed.push(err.message);
        }
      }
      if (failed.length) toast.error('Some topics were kept', failed.join(' '));
      else toast.success('Map saved');
      setOriginal(EMPTY); // let the refetch reset the editor
      await qc.invalidateQueries({ queryKey: ['subjects', subjectId, 'map'] });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not save the map';
      toast.error('Not saved', msg);
    } finally {
      setSaving(false);
    }
  }, [diff, subjectId, qc]);

  const approve = useMutation({
    mutationFn: () => patch(`/subjects/${subjectId}/map/approve`),
    onSuccess: () => {
      toast.success('Map approved', 'Students can now see these topics and links.');
      setOriginal(EMPTY);
      qc.invalidateQueries({ queryKey: ['subjects', subjectId, 'map'] });
    },
  });

  const autoLayout = () => {
    const positions = layoutMap(state.topics, state.links, {
      unitOrder: map.data.units.map((u) => u.id),
    });
    dispatch({ type: 'layout', positions });
  };

  if (map.isPending)
    return (
      <div className="p-6">
        <LoadingBlock lines={6} />
      </div>
    );
  if (map.isError) {
    return (
      <div className="p-6">
        <EmptyState
          tone="error"
          title="Could not open this subject"
          description={map.error.message}
          action={
            <Button as={Link} to="/studio">
              Back to studio
            </Button>
          }
        />
      </div>
    );
  }

  const m = map.data;
  const drafts =
    state.topics.filter((t) => t.status === 'draft').length +
    state.links.filter((l) => l.status === 'draft').length;
  const syllabusFiles = (syllabi.data ?? []).filter((x) => x.kind === 'syllabusPdf');
  const offline = aiOffline(health);
  const titleOf = (id) => state.topics.find((t) => t.id === id)?.title;

  return (
    <div className="flex min-h-[calc(100dvh-66px)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-card px-4 py-3">
        <div className="mr-auto min-w-0">
          <p className="text-xs font-semibold">
            {m.subject.code} · Semester {m.subject.semester}
          </p>
          <h1 className="truncate text-xl">{m.subject.name}</h1>
        </div>
        <AiStatus />
        <IconButton
          icon={Undo2}
          label="Undo (Ctrl+Z)"
          variant="outline"
          disabled={!history.past.length}
          onClick={() => dispatch({ type: 'undo' })}
        />
        <IconButton
          icon={Redo2}
          label="Redo (Ctrl+Shift+Z)"
          variant="outline"
          disabled={!history.future.length}
          onClick={() => dispatch({ type: 'redo' })}
        />
        <Button
          size="sm"
          variant="secondary"
          icon={LayoutGrid}
          onClick={autoLayout}
          disabled={!state.topics.length}
        >
          Auto-layout
        </Button>
        <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAdding(true)}>
          Add topic
        </Button>
        <Button
          size="sm"
          variant="navy"
          icon={Save}
          loading={saving}
          disabled={!diff.changed}
          onClick={save}
        >
          Save changes
        </Button>
        <Button
          size="sm"
          icon={CheckCheck}
          loading={approve.isPending}
          disabled={diff.changed || drafts === 0}
          title={diff.changed ? 'Save your changes first' : undefined}
          onClick={() => approve.mutate()}
        >
          Approve map
        </Button>
      </div>

      <div className="grid flex-1 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        <aside className="space-y-4 border-b border-line bg-surface p-4 lg:border-b-0 lg:border-r">
          <Card padded={false} className="p-4">
            <h2 className="text-base">1. Syllabus PDF</h2>
            {syllabusFiles.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {syllabusFiles.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{f.fileName}</span>
                    {f.scanned && <Badge tone="orange">Scanned: no text</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm">Upload the university syllabus PDF for this subject.</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              aria-label="Syllabus PDF"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  upload.mutate(
                    { file, kind: 'syllabusPdf', subjectId },
                    {
                      onSuccess: (mat) =>
                        mat.warning
                          ? toast.info('Uploaded with a warning', mat.warning)
                          : toast.success('Syllabus uploaded'),
                    },
                  );
                }
                e.target.value = '';
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              icon={FileUp}
              className="mt-3"
              loading={upload.isPending}
              onClick={() => fileRef.current?.click()}
            >
              Upload syllabus PDF
            </Button>
          </Card>

          <Card padded={false} className="p-4">
            <h2 className="text-base">2. Draft the map with AI</h2>
            <p className="mt-1 text-sm">
              Topics and links are created as drafts for you to edit and approve.
            </p>
            <Button
              size="sm"
              variant="navy"
              icon={Sparkles}
              className="mt-3"
              disabled={offline || !syllabusFiles.some((f) => !f.scanned) || Boolean(jobId)}
              loading={draftMap.isPending}
              onClick={() =>
                draftMap.mutate(
                  {},
                  { onSuccess: (id) => setParams({ job: id }, { replace: true }) },
                )
              }
            >
              {offline ? 'AI service offline' : 'Draft map with AI'}
            </Button>
          </Card>

          {jobId && (
            <JobProgress
              jobId={jobId}
              title="Drafting the map"
              onClose={() => {
                params.delete('job');
                setParams(params, { replace: true });
              }}
              renderResult={(job) =>
                job.status === 'succeeded' && job.result === 'created' ? (
                  <p className="mt-3 text-sm">
                    Created {job.output.topics?.length ?? 0} topics and {job.output.links ?? 0}{' '}
                    links as drafts.
                  </p>
                ) : null
              }
            />
          )}
          <p className="text-xs">
            {drafts} draft item{drafts === 1 ? '' : 's'} · {state.topics.length} topics ·{' '}
            {state.links.length} links
            {diff.changed && ' · unsaved changes'}
          </p>
        </aside>

        <section aria-label="Map editor" className="relative min-h-[60vh]">
          {state.topics.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Sparkles}
                title="No topics yet"
                description="Upload the syllabus PDF and draft the map with AI, or add topics by hand."
                action={<Button onClick={() => setAdding(true)}>Add a topic</Button>}
              />
            </div>
          ) : (
            <MapEditor
              state={state}
              units={m.units}
              selected={selected}
              onSelect={setSelected}
              dispatch={dispatch}
              onConnectRequest={setLinkRequest}
            />
          )}
        </section>

        <aside
          aria-label="Inspector"
          className="border-t border-line bg-card p-4 lg:border-l lg:border-t-0"
        >
          <Inspector
            selected={selected}
            state={state}
            units={m.units}
            dispatch={dispatch}
            onClose={() => setSelected(null)}
          />
        </aside>
      </div>

      <LinkDialog
        key={linkRequest ? `${linkRequest.fromTopicId}-${linkRequest.toTopicId}` : 'none'}
        request={linkRequest}
        titleOf={titleOf}
        onClose={() => setLinkRequest(null)}
        onSave={(link) => {
          dispatch({ ...link, type: 'addLink', linkType: link.type });
          setLinkRequest(null);
        }}
      />
      <AddTopicDialog
        open={adding}
        subjectId={subjectId}
        units={m.units}
        onClose={() => setAdding(false)}
        onCreated={(t) =>
          dispatch({
            type: 'addTopic',
            topic: {
              id: t.id,
              unitId: t.unitId,
              parentTopicId: null,
              title: t.title,
              summary: t.summary ?? '',
              order: t.order ?? 0,
              position: { x: 40, y: 40 },
              status: t.status ?? 'draft',
              source: 'faculty',
            },
          })
        }
      />
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Building2,
  FlaskConical,
  Map as MapIcon,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { del, get, patch, post } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
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
  toast,
} from '../../components/ui';
import { useDepartments, useUsersByRole, useVersions, versionLabel } from './lookups';
import { QueryError } from '../../components/QueryError';

function VersionForm({ initial, onSave, saving }) {
  const [v, setV] = useState({
    university: initial?.university ?? 'Pondicherry University',
    regulation: initial?.regulation ?? '',
    branch: initial?.branch ?? 'CSE',
    academicYear: initial?.academicYear ?? '',
    isActive: initial?.isActive ?? true,
  });
  const set = (k) => (e) =>
    setV((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="University" value={v.university} onChange={set('university')} />
        <Input
          label="Regulation"
          value={v.regulation}
          onChange={set('regulation')}
          placeholder="R2023"
        />
        <Input label="Branch" value={v.branch} onChange={set('branch')} />
        <Input
          label="Academic year"
          value={v.academicYear}
          onChange={set('academicYear')}
          placeholder="2025-26"
        />
      </div>
      <label className="flex min-h-[44px] items-center gap-3 font-semibold text-navy">
        <input
          type="checkbox"
          className="h-5 w-5 accent-navy"
          checked={v.isActive}
          onChange={set('isActive')}
        />
        Active
      </label>
      <Button variant="navy" loading={saving} onClick={() => onSave(v)}>
        Save
      </Button>
    </div>
  );
}

function SubjectForm({ initial, versionId, theorySubjects, onSave, saving }) {
  const faculty = useUsersByRole('faculty');
  const [s, setS] = useState({
    code: initial?.code ?? '',
    name: initial?.name ?? '',
    semester: initial?.semester ?? 5,
    facultyIds: initial?.facultyIds ?? [],
    kind: initial?.kind ?? 'theory',
    theorySubjectId: initial?.theorySubjectId ?? '',
  });
  const practical = s.kind === 'practical';
  // A lab links a theory subject of this version (never itself).
  const theories = theorySubjects.filter((t) => t.id !== initial?.id);
  const toggle = (id) =>
    setS((x) => ({
      ...x,
      facultyIds: x.facultyIds.includes(id)
        ? x.facultyIds.filter((f) => f !== id)
        : [...x.facultyIds, id],
    }));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[140px_1fr_120px]">
        <Input
          label="Code"
          value={s.code}
          onChange={(e) => setS({ ...s, code: e.target.value })}
          placeholder="CS T53"
        />
        <Input label="Name" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
        <Input
          label="Semester"
          type="number"
          min={1}
          max={10}
          value={s.semester}
          onChange={(e) => setS({ ...s, semester: Number(e.target.value) })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Type"
          value={s.kind}
          onChange={(e) => setS({ ...s, kind: e.target.value })}
          options={[
            { value: 'theory', label: 'Theory (has its own roadmap)' },
            { value: 'practical', label: 'Practical / lab' },
          ]}
        />
        {practical && (
          <Select
            label="Uses the roadmap of"
            value={s.theorySubjectId}
            onChange={(e) => setS({ ...s, theorySubjectId: e.target.value })}
            placeholder="Choose the theory subject"
            options={theories.map((t) => ({ value: t.id, label: `${t.code} · ${t.name}` }))}
          />
        )}
      </div>
      {practical && (
        <p className="text-sm">
          A lab has no units of its own. Its experiments are placed on the topics of this theory
          subject, so students follow the same roadmap.
        </p>
      )}
      <fieldset>
        <legend className="text-sm font-semibold text-navy">Faculty who teach it</legend>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {(faculty.data ?? []).map((f) => (
            <label key={f.id} className="flex min-h-[40px] items-center gap-3 text-sm text-navy">
              <input
                type="checkbox"
                className="h-4 w-4 accent-navy"
                checked={s.facultyIds.includes(f.id)}
                onChange={() => toggle(f.id)}
              />
              {f.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Button
        variant="navy"
        loading={saving}
        disabled={!s.code.trim() || !s.name.trim() || (practical && !s.theorySubjectId)}
        onClick={() =>
          onSave({
            ...s,
            theorySubjectId: practical ? s.theorySubjectId : null,
            ...(initial ? {} : { syllabusVersionId: versionId }),
          })
        }
      >
        Save subject
      </Button>
    </div>
  );
}

/** /admin/syllabus — syllabus versions and their subjects, with faculty assignment (F7.2). */
export function SyllabusPage() {
  const qc = useQueryClient();
  const versions = useVersions();
  const [versionId, setVersionId] = useState(null);
  const [versionDialog, setVersionDialog] = useState(null);
  const [subjectDialog, setSubjectDialog] = useState(null);
  const current = versionId ?? versions.data?.[0]?.id ?? null;
  const subjects = useQuery({
    queryKey: ['subjects', { syllabusVersionId: current }],
    queryFn: () => get('/subjects', { query: { syllabusVersionId: current } }),
    enabled: Boolean(current),
  });
  const faculty = useUsersByRole('faculty');
  const facultyName = new Map((faculty.data ?? []).map((f) => [f.id, f.name]));

  const saveVersion = useMutation({
    mutationFn: ({ id, body }) =>
      id ? patch(`/syllabus-versions/${id}`, body) : post('/syllabus-versions', body),
    onSuccess: (v) => {
      toast.success('Syllabus version saved');
      setVersionDialog(null);
      setVersionId(v.id);
      qc.invalidateQueries({ queryKey: ['syllabus-versions'] });
    },
  });
  const saveSubject = useMutation({
    mutationFn: ({ id, body }) => (id ? patch(`/subjects/${id}`, body) : post('/subjects', body)),
    onSuccess: () => {
      toast.success('Subject saved');
      setSubjectDialog(null);
      qc.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
  const removeSubject = useMutation({
    mutationFn: (id) => del(`/subjects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subjects'] }),
  });

  return (
    <Page wide>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <EyebrowHeading eyebrow="Admin" title="Syllabus versions and subjects" level={1} />
        <Button icon={Plus} onClick={() => setVersionDialog({})}>
          New syllabus version
        </Button>
      </div>
      {versions.isPending ? (
        <LoadingBlock className="mt-6" />
      ) : versions.isError ? (
        <QueryError className="mt-6" query={versions} what="syllabus versions" />
      ) : versions.data.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={BookOpen}
          title="No syllabus versions"
          description="Create one for each branch, regulation and academic year."
          action={<Button onClick={() => setVersionDialog({})}>New syllabus version</Button>}
        />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <ul className="space-y-2" aria-label="Syllabus versions">
            {versions.data.map((v) => (
              <li key={v.id}>
                <div
                  className={`flex items-center gap-2 rounded-2xl border p-3 ${v.id === current ? 'border-navy bg-card' : 'border-line bg-card'}`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    aria-pressed={v.id === current}
                    onClick={() => setVersionId(v.id)}
                  >
                    <span className="block font-semibold text-navy">{versionLabel(v)}</span>
                    <span className="block text-xs">{v.university}</span>
                  </button>
                  <IconButton
                    icon={Pencil}
                    label={`Edit ${versionLabel(v)}`}
                    onClick={() => setVersionDialog(v)}
                  />
                </div>
              </li>
            ))}
          </ul>
          <section aria-label="Subjects">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg">Subjects</h2>
              <Button
                size="sm"
                variant="secondary"
                icon={Plus}
                onClick={() => setSubjectDialog({})}
              >
                Add subject
              </Button>
            </div>
            {subjects.isPending ? (
              <LoadingBlock className="mt-4" />
            ) : subjects.isError ? (
              <QueryError className="mt-4" query={subjects} what="subjects" />
            ) : subjects.data.length === 0 ? (
              <p className="mt-3 text-sm">No subjects in this version yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {subjects.data.map((s) => (
                  <li key={s.id}>
                    <Card
                      padded={false}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">
                          {s.code} · Semester {s.semester}
                          {s.kind === 'practical' &&
                            ` · Practical, roadmap of ${subjects.data.find((t) => t.id === s.theorySubjectId)?.code ?? '—'}`}
                        </p>
                        <p className="font-semibold text-navy">{s.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.facultyIds.length ? (
                            s.facultyIds.map((f) => (
                              <Badge key={f}>{facultyName.get(f) ?? 'Faculty'}</Badge>
                            ))
                          ) : (
                            <Badge tone="orange">No faculty assigned</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {s.kind === 'practical' ? (
                          <Button
                            as={Link}
                            to={`/studio/labs/${s.id}`}
                            size="sm"
                            variant="ghost"
                            icon={FlaskConical}
                            className="hover:no-underline"
                          >
                            Experiments
                          </Button>
                        ) : (
                          <Button
                            as={Link}
                            to={`/studio/subjects/${s.id}`}
                            size="sm"
                            variant="ghost"
                            icon={MapIcon}
                            className="hover:no-underline"
                          >
                            Map
                          </Button>
                        )}
                        <IconButton
                          icon={Pencil}
                          label={`Edit ${s.name}`}
                          onClick={() => setSubjectDialog(s)}
                        />
                        <IconButton
                          icon={Trash2}
                          label={`Delete ${s.name}`}
                          onClick={() => removeSubject.mutate(s.id)}
                        />
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      <Dialog
        open={Boolean(versionDialog)}
        onClose={() => setVersionDialog(null)}
        title={versionDialog?.id ? 'Edit syllabus version' : 'New syllabus version'}
      >
        {versionDialog && (
          <VersionForm
            key={versionDialog.id ?? 'new'}
            initial={versionDialog.id ? versionDialog : null}
            saving={saveVersion.isPending}
            onSave={(body) => saveVersion.mutate({ id: versionDialog.id, body })}
          />
        )}
      </Dialog>
      <Dialog
        open={Boolean(subjectDialog)}
        onClose={() => setSubjectDialog(null)}
        title={subjectDialog?.id ? 'Edit subject' : 'Add subject'}
        size="lg"
      >
        {subjectDialog && (
          <SubjectForm
            key={subjectDialog.id ?? 'new'}
            initial={subjectDialog.id ? subjectDialog : null}
            versionId={current}
            theorySubjects={(subjects.data ?? []).filter((x) => x.kind !== 'practical')}
            saving={saveSubject.isPending}
            onSave={(body) => saveSubject.mutate({ id: subjectDialog.id, body })}
          />
        )}
      </Dialog>
    </Page>
  );
}

/** /admin/departments (F7.2). */
export function DepartmentsPage() {
  const qc = useQueryClient();
  const departments = useDepartments();
  const [form, setForm] = useState({ name: '', code: '' });
  const [editing, setEditing] = useState(null);
  const save = useMutation({
    mutationFn: ({ id, body }) =>
      id ? patch(`/departments/${id}`, body) : post('/departments', body),
    onSuccess: () => {
      toast.success('Department saved');
      setForm({ name: '', code: '' });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });
  const remove = useMutation({
    mutationFn: (id) => del(`/departments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
  return (
    <Page>
      <EyebrowHeading eyebrow="Admin" title="Departments" level={1} />
      <Card className="mt-6">
        <h2 className="text-lg">{editing ? `Edit ${editing.code}` : 'Add a department'}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="CSE"
          />
          <Button
            variant="navy"
            loading={save.isPending}
            disabled={form.name.trim().length < 2 || form.code.trim().length < 2}
            onClick={() => save.mutate({ id: editing?.id, body: form })}
          >
            Save
          </Button>
        </div>
      </Card>
      {departments.isPending ? (
        <LoadingBlock className="mt-6" />
      ) : departments.isError ? (
        <QueryError className="mt-6" query={departments} what="departments" />
      ) : departments.data.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Building2}
          title="No departments yet"
          description="Add one above."
        />
      ) : (
        <ul className="mt-6 space-y-2">
          {departments.data.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 glass rounded-2xl p-3"
            >
              <span>
                <span className="font-semibold text-navy">{d.code}</span> · {d.name}
              </span>
              <span className="flex gap-1">
                <IconButton
                  icon={Pencil}
                  label={`Edit ${d.name}`}
                  onClick={() => {
                    setEditing(d);
                    setForm({ name: d.name, code: d.code });
                  }}
                />
                <IconButton
                  icon={Trash2}
                  label={`Delete ${d.name}`}
                  onClick={() => remove.mutate(d.id)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm">A department that still has users cannot be deleted.</p>
    </Page>
  );
}

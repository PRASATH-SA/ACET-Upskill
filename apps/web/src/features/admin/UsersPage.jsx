import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileUp, Pencil, Plus, Search, Users } from 'lucide-react';
import { ROLES } from '@acet/shared';
import { get, patch, post } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import {
  Badge,
  Button,
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

const ROLE_LABEL = {
  student: 'Student',
  faculty: 'Faculty',
  mentor: 'Mentor',
  admin: 'HOD / Admin',
};
const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

function UserForm({ initial, onSubmit, saving, creating }) {
  const versions = useVersions();
  const departments = useDepartments();
  const mentors = useUsersByRole('mentor');
  const [f, setF] = useState(() => ({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    password: '',
    role: initial?.role ?? 'student',
    batch: initial?.batch ?? '',
    syllabusVersionId: initial?.syllabusVersionId ?? '',
    departmentId: initial?.departmentId ?? '',
    mentorId: initial?.mentorId ?? '',
    isActive: initial?.isActive ?? true,
  }));
  const set = (k) => (e) =>
    setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const submit = () => {
    const opt = (v) => (v === '' ? (creating ? undefined : null) : v);
    onSubmit({
      name: f.name.trim(),
      ...(creating ? { email: f.email.trim(), password: f.password } : { isActive: f.isActive }),
      role: f.role,
      batch: opt(f.batch.trim()),
      syllabusVersionId: opt(f.syllabusVersionId),
      departmentId: opt(f.departmentId),
      mentorId: opt(f.mentorId),
    });
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" value={f.name} onChange={set('name')} required />
        {creating ? (
          <Input label="Email" type="email" value={f.email} onChange={set('email')} required />
        ) : (
          <Input label="Email" value={f.email} disabled />
        )}
        {creating && (
          <Input
            label="Password"
            type="password"
            value={f.password}
            onChange={set('password')}
            hint="8+ characters with a letter and a number"
            required
          />
        )}
        <Select label="Role" value={f.role} onChange={set('role')} options={roleOptions} />
        <Input label="Batch" value={f.batch} onChange={set('batch')} placeholder="e.g. 2023-27" />
        <Select
          label="Syllabus version"
          value={f.syllabusVersionId}
          onChange={set('syllabusVersionId')}
          placeholder="None"
          options={(versions.data ?? []).map((v) => ({ value: v.id, label: versionLabel(v) }))}
        />
        <Select
          label="Department"
          value={f.departmentId}
          onChange={set('departmentId')}
          placeholder="None"
          options={(departments.data ?? []).map((d) => ({
            value: d.id,
            label: `${d.code} · ${d.name}`,
          }))}
        />
        {f.role === 'student' && (
          <Select
            label="Mentor"
            value={f.mentorId}
            onChange={set('mentorId')}
            placeholder="None"
            options={(mentors.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
          />
        )}
      </div>
      {!creating && (
        <label className="flex min-h-[44px] items-center gap-3 font-semibold text-navy">
          <input
            type="checkbox"
            className="h-5 w-5 accent-navy"
            checked={f.isActive}
            onChange={set('isActive')}
          />
          Account active
        </label>
      )}
      <Button
        variant="navy"
        loading={saving}
        disabled={!f.name.trim() || (creating && (!f.email || !f.password))}
        onClick={submit}
      >
        {creating ? 'Create user' : 'Save changes'}
      </Button>
    </div>
  );
}

function ImportDialog({ open, onClose }) {
  const qc = useQueryClient();
  const versions = useVersions();
  const mentors = useUsersByRole('mentor');
  const departments = useDepartments();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [defaults, setDefaults] = useState({
    syllabusVersionId: '',
    batch: '',
    mentorId: '',
    departmentId: '',
  });
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setDefaults((d) => ({ ...d, [k]: e.target.value }));
  const run = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.set('file', file);
      for (const [k, v] of Object.entries(defaults)) if (v) fd.set(k, v);
      return post('/auth/import-students', fd);
    },
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
  const passwordsCsv = useMemo(() => {
    if (!result) return '';
    const rows = result.created
      .filter((c) => c.temporaryPassword)
      .map((c) => `${c.user.name},${c.user.email},${c.temporaryPassword}`);
    return ['name,email,temporary_password', ...rows].join('\n');
  }, [result]);
  const close = () => {
    setResult(null);
    setFile(null);
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Import students from CSV"
      size="lg"
      description="Columns: name,email[,password][,batch]. One student per line; a header row is fine."
    >
      {result ? (
        <div className="space-y-4">
          <p role="status" className="font-semibold text-navy">
            {result.summary.created} created · {result.summary.failed} failed (of{' '}
            {result.summary.total})
          </p>
          {result.errors.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-red/5 p-3 text-sm text-red-dark">
              {result.errors.map((e) => (
                <li key={`${e.row}-${e.email}`}>
                  Row {e.row}
                  {e.email ? ` (${e.email})` : ''}: {e.message}
                </li>
              ))}
            </ul>
          )}
          {passwordsCsv.split('\n').length > 1 && (
            <div className="rounded-xl border border-gold-border bg-gold-tint p-3 text-sm">
              <p className="font-semibold text-navy">Temporary passwords are shown only once.</p>
              <p>
                Download them now and share each one privately. Students should change it after
                signing in.
              </p>
              <Button
                size="sm"
                variant="navy"
                icon={Download}
                className="mt-2"
                onClick={() => {
                  const href = URL.createObjectURL(new Blob([passwordsCsv], { type: 'text/csv' }));
                  const a = Object.assign(document.createElement('a'), {
                    href,
                    download: 'temporary-passwords.csv',
                  });
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(href), 1000);
                }}
              >
                Download passwords (CSV)
              </Button>
            </div>
          )}
          <Button onClick={close}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Students CSV"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="secondary" icon={FileUp} onClick={() => fileRef.current?.click()}>
              {file ? file.name : 'Choose CSV file'}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Syllabus version for this batch"
              value={defaults.syllabusVersionId}
              onChange={set('syllabusVersionId')}
              placeholder="None"
              options={(versions.data ?? []).map((v) => ({ value: v.id, label: versionLabel(v) }))}
            />
            <Input
              label="Batch"
              value={defaults.batch}
              onChange={set('batch')}
              placeholder="e.g. 2025-29"
              hint="Used when a row has no batch"
            />
            <Select
              label="Mentor"
              value={defaults.mentorId}
              onChange={set('mentorId')}
              placeholder="None"
              options={(mentors.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
            />
            <Select
              label="Department"
              value={defaults.departmentId}
              onChange={set('departmentId')}
              placeholder="None"
              options={(departments.data ?? []).map((d) => ({
                value: d.id,
                label: `${d.code} · ${d.name}`,
              }))}
            />
          </div>
          <Button disabled={!file} loading={run.isPending} onClick={() => run.mutate()}>
            Import students
          </Button>
        </div>
      )}
    </Dialog>
  );
}

/** /admin/users — users table, CSV import, role and batch changes (F7.2). */
export function UsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const versions = useVersions();
  const versionOf = new Map((versions.data ?? []).map((v) => [v.id, v]));
  const users = useQuery({
    queryKey: ['admin', 'users', { role, search, page }],
    queryFn: () => get('/users', { query: { role, q: search, page, limit: 25 }, withMeta: true }),
    placeholderData: (p) => p,
  });
  const save = useMutation({
    mutationFn: ({ id, body }) => (id ? patch(`/users/${id}`, body) : post('/auth/register', body)),
    onSuccess: () => {
      toast.success('Saved');
      setEditing(null);
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
  const total = users.data?.meta?.total ?? 0;

  return (
    <Page wide>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <EyebrowHeading eyebrow="Admin" title="Users" level={1} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={FileUp} onClick={() => setImporting(true)}>
            Import students (CSV)
          </Button>
          <Button icon={Plus} onClick={() => setCreating(true)}>
            Add user
          </Button>
        </div>
      </div>
      <form
        role="search"
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
          setPage(1);
        }}
      >
        <Input label="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select
          label="Role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          placeholder="All roles"
          options={roleOptions}
        />
        <Button type="submit" variant="secondary" icon={Search}>
          Search
        </Button>
      </form>

      {users.isPending ? (
        <LoadingBlock className="mt-6" lines={6} />
      ) : users.isError ? (
        <QueryError className="mt-6" query={users} what="users" />
      ) : (users.data?.data ?? []).length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Users}
          title="No users found"
          description="Change the filters or add a user."
          action={<Button onClick={() => setCreating(true)}>Add user</Button>}
        />
      ) : (
        <div className="mt-6 overflow-x-auto glass rounded-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Users</caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-navy">
                <th scope="col" className="px-4 py-3">
                  Name
                </th>
                <th scope="col" className="px-4 py-3">
                  Role
                </th>
                <th scope="col" className="px-4 py-3">
                  Batch
                </th>
                <th scope="col" className="px-4 py-3">
                  Syllabus version
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.data.data.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2">
                    <span className="block font-semibold text-navy">{u.name}</span>
                    <span className="block text-xs">{u.email}</span>
                  </td>
                  <td className="px-4 py-2">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-2">{u.batch ?? '–'}</td>
                  <td className="px-4 py-2">
                    {u.syllabusVersionId
                      ? versionOf.get(u.syllabusVersionId)
                        ? versionLabel(versionOf.get(u.syllabusVersionId))
                        : '…'
                      : '–'}
                  </td>
                  <td className="px-4 py-2">
                    {u.isActive ? <Badge tone="green">Active</Badge> : <Badge>Deactivated</Badge>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <IconButton
                      icon={Pencil}
                      label={`Edit ${u.name}`}
                      onClick={() => setEditing(u)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > 25 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {Math.ceil(total / 25)} · {total} users
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={page * 25 >= total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? ''}`}
        size="lg"
      >
        {editing && (
          <UserForm
            key={editing.id}
            initial={editing}
            saving={save.isPending}
            onSubmit={(body) => save.mutate({ id: editing.id, body })}
          />
        )}
      </Dialog>
      <Dialog open={creating} onClose={() => setCreating(false)} title="Add a user" size="lg">
        <UserForm creating saving={save.isPending} onSubmit={(body) => save.mutate({ body })} />
      </Dialog>
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
    </Page>
  );
}

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Download, FileUp, Pencil, Plus, Search, Users } from 'lucide-react';
import { ROLES, SUPER_ROLES, YEARS_OF_STUDY, semestersOfYear } from '@acet/shared';
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
import { useSession } from '../auth/session';
import { useDepartments, useUsersByRole, useVersions, versionLabel } from './lookups';
import { QueryError } from '../../components/QueryError';

const ROLE_LABEL = {
  student: 'Student',
  faculty: 'Faculty',
  mentor: 'Mentor',
  admin: 'HOD / Admin',
  coordinator: 'Academic Coordinator',
};
const ROMAN = ['I', 'II', 'III', 'IV'];

const yearOptions = YEARS_OF_STUDY.map((y) => ({
  value: String(y),
  label: `Year ${ROMAN[y - 1]}`,
}));
/** Semesters of the chosen year, or all eight when no year is chosen. */
const semesterOptions = (year) =>
  (year ? semestersOfYear(Number(year)) : [1, 2, 3, 4, 5, 6, 7, 8]).map((s) => ({
    value: String(s),
    label: `Semester ${s}`,
  }));

/** The coordinator may hand out every role; a HOD only student, faculty and mentor. */
function useRoleScope() {
  const user = useSession((s) => s.user);
  const coordinator = user?.role === 'coordinator';
  const roles = coordinator ? ROLES : ROLES.filter((r) => !SUPER_ROLES.includes(r));
  return {
    coordinator,
    roleOptions: roles.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
  };
}

const termText = (u) =>
  u.semester
    ? `Year ${ROMAN[(u.yearOfStudy ?? Math.ceil(u.semester / 2)) - 1]} · Sem ${u.semester}`
    : '–';

/** Year + semester pickers; picking a year resets a semester that no longer fits it. */
function TermFields({ year, semester, onChange, yearLabel = 'Year of study' }) {
  return (
    <>
      <Select
        label={yearLabel}
        value={year}
        onChange={(e) => {
          const y = e.target.value;
          const fits = y && semester && semestersOfYear(Number(y)).includes(Number(semester));
          onChange({ year: y, semester: fits ? semester : '' });
        }}
        placeholder="Not set"
        options={yearOptions}
      />
      <Select
        label="Semester"
        value={semester}
        onChange={(e) => onChange({ year, semester: e.target.value })}
        placeholder="Not set"
        options={semesterOptions(year)}
        hint={year ? undefined : 'Choose the year first'}
        disabled={!year}
      />
    </>
  );
}

function UserForm({ initial, onSubmit, saving, creating }) {
  const { coordinator, roleOptions } = useRoleScope();
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
    yearOfStudy: initial?.yearOfStudy ? String(initial.yearOfStudy) : '',
    semester: initial?.semester ? String(initial.semester) : '',
    isActive: initial?.isActive ?? true,
  }));
  const set = (k) => (e) =>
    setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const student = f.role === 'student';
  // A HOD editing another HOD's role is blocked by the API; show the current role anyway.
  const roles = roleOptions.some((o) => o.value === f.role)
    ? roleOptions
    : [...roleOptions, { value: f.role, label: ROLE_LABEL[f.role] }];
  const submit = () => {
    const opt = (v) => (v === '' ? (creating ? undefined : null) : v);
    const num = (v) => (v === '' ? (creating ? undefined : null) : Number(v));
    onSubmit({
      name: f.name.trim(),
      ...(creating ? { email: f.email.trim(), password: f.password } : { isActive: f.isActive }),
      role: f.role,
      batch: opt(f.batch.trim()),
      syllabusVersionId: opt(f.syllabusVersionId),
      // Only the coordinator chooses a department; a HOD's users join the HOD's department.
      ...(coordinator ? { departmentId: opt(f.departmentId) } : {}),
      mentorId: opt(f.mentorId),
      yearOfStudy: student ? num(f.yearOfStudy) : num(''),
      semester: student ? num(f.semester) : num(''),
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
        <Select label="Role" value={f.role} onChange={set('role')} options={roles} />
        {coordinator && (
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
        )}
        {student && (
          <TermFields
            year={f.yearOfStudy}
            semester={f.semester}
            onChange={({ year, semester }) => setF((x) => ({ ...x, yearOfStudy: year, semester }))}
          />
        )}
        <Input label="Batch" value={f.batch} onChange={set('batch')} placeholder="e.g. 2023-27" />
        <Select
          label="Syllabus version"
          value={f.syllabusVersionId}
          onChange={set('syllabusVersionId')}
          placeholder="None"
          options={(versions.data ?? []).map((v) => ({ value: v.id, label: versionLabel(v) }))}
        />
        {student && (
          <Select
            label="Mentor"
            value={f.mentorId}
            onChange={set('mentorId')}
            placeholder="None"
            options={(mentors.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
          />
        )}
      </div>
      {student && (
        <p className="text-sm">
          The student&apos;s learn page lists the subjects of this semester.
        </p>
      )}
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
        disabled={
          !f.name.trim() ||
          (creating && (!f.email || !f.password)) ||
          (student && Boolean(f.yearOfStudy) !== Boolean(f.semester))
        }
        onClick={submit}
      >
        {creating ? 'Create user' : 'Save changes'}
      </Button>
    </div>
  );
}

function ImportDialog({ open, onClose }) {
  const qc = useQueryClient();
  const { coordinator } = useRoleScope();
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
    yearOfStudy: '',
    semester: '',
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
            <TermFields
              year={defaults.yearOfStudy}
              semester={defaults.semester}
              onChange={({ year, semester }) =>
                setDefaults((d) => ({ ...d, yearOfStudy: year, semester }))
              }
            />
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
            {coordinator && (
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
            )}
          </div>
          <Button
            disabled={!file || Boolean(defaults.yearOfStudy) !== Boolean(defaults.semester)}
            loading={run.isPending}
            onClick={() => run.mutate()}
          >
            Import students
          </Button>
        </div>
      )}
    </Dialog>
  );
}

/** Sticky bar for the students ticked in the table: set their year and semester at once. */
function BulkTermBar({ ids, onDone }) {
  const qc = useQueryClient();
  const [term, setTerm] = useState({ year: '', semester: '' });
  const run = useMutation({
    mutationFn: () =>
      post('/users/term', {
        userIds: ids,
        yearOfStudy: Number(term.year),
        semester: Number(term.semester),
      }),
    onSuccess: (r) => {
      toast.success(
        `Updated ${r.updated} ${r.updated === 1 ? 'student' : 'students'}` +
          (r.skipped ? ` · ${r.skipped} skipped` : ''),
      );
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      onDone();
    },
  });
  return (
    <div className="glass sticky bottom-20 z-10 mt-4 grid gap-3 rounded-card p-4 sm:bottom-4 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
      <p className="font-semibold text-navy sm:self-center">
        {ids.length} {ids.length === 1 ? 'student' : 'students'} selected
      </p>
      <TermFields
        year={term.year}
        semester={term.semester}
        onChange={setTerm}
        yearLabel="Move to year"
      />
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onDone}>
          Clear
        </Button>
        <Button
          variant="navy"
          icon={CalendarRange}
          disabled={!term.year || !term.semester}
          loading={run.isPending}
          onClick={() => run.mutate()}
        >
          Set term
        </Button>
      </div>
    </div>
  );
}

/** /admin/users — users table, CSV import, role, batch and term changes (F7.2). */
export function UsersPage() {
  const qc = useQueryClient();
  const { coordinator, roleOptions } = useRoleScope();
  const [role, setRole] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const versions = useVersions();
  const departments = useDepartments();
  const versionOf = new Map((versions.data ?? []).map((v) => [v.id, v]));
  const deptOf = new Map((departments.data ?? []).map((d) => [d.id, d]));
  const filters = { role, yearOfStudy: year, semester, q: search, page, limit: 25 };
  const users = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => get('/users', { query: filters, withMeta: true }),
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
  const rows = users.data?.data ?? [];
  const studentsOnPage = rows.filter((u) => u.role === 'student');
  const allTicked = studentsOnPage.length > 0 && studentsOnPage.every((u) => selected.has(u.id));
  const toggle = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      for (const u of studentsOnPage) {
        if (allTicked) next.delete(u.id);
        else next.add(u.id);
      }
      return next;
    });
  const filter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <Page wide>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <EyebrowHeading
          eyebrow={coordinator ? 'Academic Coordinator' : 'Admin'}
          title={coordinator ? 'All users' : 'Department users'}
          level={1}
        />
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
        className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_150px_150px_auto] lg:items-end"
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
          onChange={filter(setRole)}
          placeholder="All roles"
          options={roleOptions}
        />
        <Select
          label="Year"
          value={year}
          onChange={(e) => {
            const y = e.target.value;
            setYear(y);
            if (y && semester && !semestersOfYear(Number(y)).includes(Number(semester)))
              setSemester('');
            setPage(1);
          }}
          placeholder="All years"
          options={yearOptions}
        />
        <Select
          label="Semester"
          value={semester}
          onChange={filter(setSemester)}
          placeholder="All semesters"
          options={semesterOptions(year)}
        />
        <Button type="submit" variant="secondary" icon={Search}>
          Search
        </Button>
      </form>

      {users.isPending ? (
        <LoadingBlock className="mt-6" lines={6} />
      ) : users.isError ? (
        <QueryError className="mt-6" query={users} what="users" />
      ) : rows.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Users}
          title="No users found"
          description="Change the filters or add a user."
          action={<Button onClick={() => setCreating(true)}>Add user</Button>}
        />
      ) : (
        <div className="mt-6 overflow-x-auto glass rounded-card">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">Users</caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-navy">
                <th scope="col" className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-navy"
                    aria-label="Select all students on this page"
                    checked={allTicked}
                    disabled={studentsOnPage.length === 0}
                    onChange={toggleAll}
                  />
                </th>
                <th scope="col" className="px-4 py-3">
                  Name
                </th>
                <th scope="col" className="px-4 py-3">
                  Role
                </th>
                {coordinator && (
                  <th scope="col" className="px-4 py-3">
                    Department
                  </th>
                )}
                <th scope="col" className="px-4 py-3">
                  Year · Sem
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
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2">
                    {u.role === 'student' && (
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-navy"
                        aria-label={`Select ${u.name}`}
                        checked={selected.has(u.id)}
                        onChange={() => toggle(u.id)}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="block font-semibold text-navy">{u.name}</span>
                    <span className="block text-xs">{u.email}</span>
                  </td>
                  <td className="px-4 py-2">{ROLE_LABEL[u.role]}</td>
                  {coordinator && (
                    <td className="px-4 py-2">{deptOf.get(u.departmentId)?.code ?? '–'}</td>
                  )}
                  <td className="px-4 py-2">{u.role === 'student' ? termText(u) : '–'}</td>
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
      {selected.size > 0 && (
        <BulkTermBar ids={[...selected]} onDone={() => setSelected(new Set())} />
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

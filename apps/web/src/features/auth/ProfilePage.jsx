import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ChangePasswordSchema, UpdateProfileSchema } from '@acet/shared';
import { ApiError, get, patch, post } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import { Avatar, Button, Card, EyebrowHeading, Input, toast } from '../../components/ui';
import { useUi } from '../../lib/uiStore';
import { useSession } from './session';

const PasswordFormSchema = ChangePasswordSchema.extend({ confirm: z.string() }).refine(
  (v) => v.confirm === v.newPassword,
  { message: 'Passwords do not match', path: ['confirm'] },
);

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
// Every ACET syllabus version is a Pondicherry University B.Tech programme; there is no degree field.
const DEGREE = 'B.Tech';

function Detail({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-t border-line py-3 first:border-t-0">
      <dt className="text-sm">{label}</dt>
      <dd className="text-right text-sm font-semibold text-navy">{value || '—'}</dd>
    </div>
  );
}

function NameForm({ user }) {
  const setUser = useSession((s) => s.setUser);
  const form = useForm({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: { name: user.name },
  });
  const save = useMutation({
    mutationFn: (values) => patch('/users/me', values),
    onSuccess: (u) => {
      setUser(u);
      form.reset({ name: u.name });
      toast.success('Name updated');
    },
  });
  return (
    <form
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <Input
        label="Display name"
        className="flex-1"
        error={form.formState.errors.name?.message}
        {...form.register('name')}
      />
      <Button
        type="submit"
        variant="secondary"
        loading={save.isPending}
        disabled={!form.formState.isDirty}
      >
        Save name
      </Button>
    </form>
  );
}

function PasswordForm() {
  const form = useForm({
    resolver: zodResolver(PasswordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  const change = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      post('/users/me/password', { currentPassword, newPassword }),
    meta: { silent: true },
    onSuccess: () => {
      form.reset();
      toast.success('Password changed', 'Other devices have been signed out.');
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        form.setError('currentPassword', { message: 'Current password is wrong' });
      } else toast.error('Could not change password', err.message);
    },
  });
  const e = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit((v) => change.mutate(v))} className="space-y-4" noValidate>
      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        error={e.currentPassword?.message}
        {...form.register('currentPassword')}
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with a letter and a number."
        error={e.newPassword?.message}
        {...form.register('newPassword')}
      />
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={e.confirm?.message}
        {...form.register('confirm')}
      />
      <Button type="submit" loading={change.isPending}>
        Change password
      </Button>
    </form>
  );
}

/** F2 profile: name, university/degree/branch/year/semester (students), batch, syllabus version, password; F7 adds the low-data toggle. */
export function ProfilePage() {
  const user = useSession((s) => s.user);
  const lowData = useUi((s) => s.lowData);
  const setLowData = useUi((s) => s.setLowData);
  const versions = useQuery({
    queryKey: ['syllabus-versions'],
    queryFn: () => get('/syllabus-versions'),
  });
  const version = versions.data?.find((v) => v.id === user.syllabusVersionId);
  const versionLabel = version
    ? `${version.branch} · ${version.regulation} · ${version.academicYear}`
    : user.syllabusVersionId
      ? 'Loading…'
      : null;

  return (
    <Page>
      <EyebrowHeading eyebrow="Account" title="My profile" level={1} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={user.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-heading text-lg font-bold text-navy">{user.name}</p>
              <p className="truncate text-sm">{user.email}</p>
            </div>
          </div>
          <dl className="mt-5">
            <Detail label="Role" value={user.role} />
            {user.role === 'student' && (
              <>
                <Detail label="University" value={version?.university} />
                <Detail label="Degree" value={DEGREE} />
                <Detail label="Branch" value={version?.branch} />
                <Detail
                  label="Year"
                  value={ROMAN[(user.yearOfStudy ?? Math.ceil(user.semester / 2)) - 1]}
                />
                <Detail label="Semester" value={ROMAN[user.semester - 1]} />
              </>
            )}
            <Detail label="Batch" value={user.batch} />
            <Detail label="Syllabus version" value={versionLabel} />
          </dl>
          <div className="mt-5 border-t border-line pt-5">
            <NameForm user={user} />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg">Change password</h2>
            <div className="mt-4">
              <PasswordForm />
            </div>
          </Card>
          <Card>
            <h2 className="text-lg">Low-data mode</h2>
            <p className="mt-1 text-sm">
              Videos show a thumbnail and load only when you tap them. Useful on mobile data.
            </p>
            <label className="mt-4 flex min-h-[44px] cursor-pointer items-center gap-3 font-semibold text-navy">
              <input
                type="checkbox"
                className="h-5 w-5 accent-navy"
                checked={lowData}
                onChange={(e) => setLowData(e.target.checked)}
              />
              Save data on this device
            </label>
          </Card>
        </div>
      </div>
    </Page>
  );
}

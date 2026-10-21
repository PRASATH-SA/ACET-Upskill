import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Brain, Map, Sparkles } from 'lucide-react';
import { LoginSchema } from '@acet/shared';
import { ApiError } from '../../api/client';
import { Button, Input } from '../../components/ui';
import { login, ROLE_HOME, useSession } from './session';
import { safeReturnPath } from '../../lib/safePath';

function loginErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'That email and password do not match an active account.';
    if (err.status === 429) return 'Too many attempts. Wait a minute, then try again.';
    return err.message;
  }
  return 'Could not reach SkillUp. Check your connection and try again.';
}

const POINTS = [
  { icon: Map, text: 'See how every topic in your syllabus connects' },
  { icon: Brain, text: 'Revise just before you would forget' },
  { icon: Sparkles, text: 'Content drafted by AI, approved by your faculty' },
];

/** F2: split layout, navy brand panel on the left, form on white. */
export function LoginPage() {
  const status = useSession((s) => s.status);
  const user = useSession((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(LoginSchema), defaultValues: { email: '', password: '' } });

  if (status === 'authenticated' && user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const u = await login(values);
      // Return to the page the user asked for; the role guard shows 403 if it isn't theirs.
      const from = safeReturnPath(location.state?.from);
      navigate(from && from !== '/' ? from : ROLE_HOME[u.role], { replace: true });
    } catch (err) {
      setFormError(loginErrorMessage(err));
    }
  };

  return (
    <div className="grid min-h-screen gap-3 p-3 lg:grid-cols-2">
      <section className="glass-navy flex flex-col justify-between overflow-hidden rounded-sheet px-6 py-10 sm:px-12 lg:py-14">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-blue/40 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-blue/20 blur-3xl"
        />
        <div className="relative flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white font-heading text-sm font-extrabold text-navy shadow-press-glass"
          >
            SU
          </span>
          <span className="font-heading text-xl font-extrabold">SkillUp</span>
        </div>
        <div className="relative my-10 lg:my-0">
          <p className="eyebrow text-gold">ACET · Puducherry</p>
          <p className="mt-3 font-heading text-3xl font-extrabold leading-tight sm:text-5xl">
            Learn the flow, not the list
          </p>
          <ul className="mt-8 hidden space-y-4 sm:block">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
                  <Icon className="h-5 w-5 text-gold" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative hidden text-sm text-white/70 lg:block">
          Achariya College of Engineering Technology · Affiliated to Pondicherry University
        </p>
      </section>

      <main className="flex items-center justify-center px-1 py-8 sm:px-12">
        <div className="glass w-full max-w-md animate-glass-pop rounded-sheet p-6 sm:p-9">
          <p className="eyebrow">Welcome back</p>
          <h1 className="mt-1">Sign in to SkillUp</h1>
          <p className="mt-2 text-sm">Use your college email and password.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              required
              error={errors.email && 'Enter a valid email address.'}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              error={errors.password && 'Enter your password.'}
              {...register('password')}
            />
            {formError && (
              <p
                role="alert"
                className="rounded-2xl border border-red/25 bg-red/[0.06] p-3 text-sm font-semibold text-red-dark"
              >
                {formError}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Sign in
            </Button>
          </form>
          <p className="mt-6 text-sm">
            Forgot your password? Ask your HOD or the department admin to reset it.
          </p>
        </div>
      </main>
    </div>
  );
}

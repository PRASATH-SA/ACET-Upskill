import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Brain, Map, Sparkles } from 'lucide-react';
import { LoginSchema } from '@acet/shared';
import { ApiError } from '../../api/client';
import { Button, Input } from '../../components/ui';
import { login, ROLE_HOME, useSession } from './session';

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
      const from = location.state?.from;
      navigate(from && from !== '/' ? from : ROLE_HOME[u.role], { replace: true });
    } catch (err) {
      setFormError(loginErrorMessage(err));
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-navy px-6 py-10 text-white sm:px-12 lg:py-14">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white font-heading text-sm font-extrabold text-navy"
          >
            SU
          </span>
          <span className="font-heading text-xl font-extrabold">SkillUp</span>
        </div>
        <div className="my-10 lg:my-0">
          <p className="eyebrow text-gold">ACET · Puducherry</p>
          <p className="mt-3 font-heading text-3xl font-extrabold leading-tight sm:text-5xl">
            Learn the flow, not the list
          </p>
          <ul className="mt-8 hidden space-y-4 sm:block">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <Icon className="h-5 w-5 text-gold" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-sm text-white/70 lg:block">
          Achariya College of Engineering Technology · Affiliated to Pondicherry University
        </p>
      </section>

      <main className="flex items-center justify-center bg-card px-4 py-12 sm:px-12">
        <div className="w-full max-w-sm">
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
                className="rounded-xl border border-red/30 bg-red/5 p-3 text-sm font-semibold text-red-dark"
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

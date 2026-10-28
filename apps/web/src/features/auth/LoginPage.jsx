import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Brain, Map, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { LoginSchema } from '@acet/shared';
import { ApiError } from '../../api/client';
import { Button, Input } from '../../components/ui';
import { ThemeToggle } from '../../components/layout/AppShell';
import { login, ROLE_HOME, useSession } from './session';
import { safeReturnPath } from '../../lib/safePath';
import { bouncy, soft } from '../../lib/motion';

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

/** F2: split layout, the Achariya sunburst brand panel on the left, form on white. */
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
      <section className="bg-sunburst relative flex flex-col justify-between overflow-hidden rounded-sheet px-6 py-10 text-navy sm:px-12 lg:py-14">
        <div className="relative flex items-center gap-2">
          <span className="font-heading text-xl font-bold">SkillUp</span>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold">ACET</span>
        </div>
        <div className="relative my-8 flex flex-col items-start gap-6 lg:my-0">
          <motion.img
            src="/brand/achariya-25-320.webp"
            alt="Achariya, 25 years of world class education"
            width={160}
            height={160}
            initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            whileHover={{ rotate: [0, -4, 4, 0], scale: 1.04 }}
            transition={bouncy}
            className="h-28 w-28 rounded-card border-4 border-white shadow-cta sm:h-40 sm:w-40"
          />
          <div>
            <p className="eyebrow text-brand-deep">ACET · Puducherry</p>
            <p className="mt-3 font-heading text-3xl font-bold leading-tight sm:text-5xl">
              Learn the flow, not the list
            </p>
          </div>
          <motion.ul
            className="hidden space-y-4 sm:block"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
          >
            {POINTS.map(({ icon: Icon, text }) => (
              <motion.li
                key={text}
                variants={{
                  hidden: { opacity: 0, x: -16 },
                  show: { opacity: 1, x: 0, transition: soft },
                }}
                className="flex items-center gap-3 font-medium"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand shadow-card">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                {text}
              </motion.li>
            ))}
          </motion.ul>
        </div>
        <p className="relative hidden text-sm font-medium lg:block">
          Achariya College of Engineering Technology · Affiliated to Pondicherry University
        </p>
      </section>

      <main className="relative flex items-center justify-center px-1 py-8 sm:px-12">
        <ThemeToggle className="absolute right-1 top-1" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={soft}
          className="glass w-full max-w-md rounded-sheet p-6 sm:p-9"
        >
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
        </motion.div>
      </main>
    </div>
  );
}

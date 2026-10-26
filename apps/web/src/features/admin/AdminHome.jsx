import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bot, BookOpen, CheckCircle2, Pencil, Users, XCircle } from 'lucide-react';
import { get } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import {
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  ProgressBar,
  StatTile,
} from '../../components/ui';
import { useSession } from '../auth/session';
import { CohortProgressPanel } from '../progress/CohortWidgets';

/** /admin — department usage overview (B5.6, A5.4, F7.2). */
export function AdminHome() {
  const role = useSession((s) => s.user.role);
  const usage = useQuery({ queryKey: ['admin', 'usage'], queryFn: () => get('/admin/usage') });
  if (usage.isPending) {
    return (
      <Page>
        <LoadingBlock lines={6} />
      </Page>
    );
  }
  if (usage.isError) {
    return (
      <Page>
        <EmptyState
          tone="error"
          title="Could not load the overview"
          description={usage.error.message}
          action={<Button onClick={() => usage.refetch()}>Try again</Button>}
        />
      </Page>
    );
  }
  const u = usage.data;
  const maxWeek = Math.max(1, ...u.weeklyActivity.map((w) => w.activeStudents));
  const ai = u.aiDrafts;
  return (
    <Page>
      <EyebrowHeading eyebrow="HOD" title="Department overview" level={1} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Students"
          value={u.users.student ?? 0}
          icon={Users}
          hint={`${u.users.faculty ?? 0} faculty · ${u.users.mentor ?? 0} mentors`}
        />
        <StatTile
          label="Active this week"
          value={u.weeklyActiveStudents}
          icon={Users}
          tone="navy"
          hint="Students who took a quiz or revised"
        />
        <StatTile
          label="Topics on maps"
          value={u.topics.approvedOrPublished}
          icon={BookOpen}
          hint={`${u.topics.withPublishedContent} with published content`}
        />
        <StatTile
          label="AI drafts"
          value={ai.total}
          icon={Bot}
          hint={`${ai.pending} waiting for review`}
        />
      </div>

      <CohortProgressPanel
        title="Department progress"
        role={role}
        to="/admin/progress"
        linkLabel="Full report"
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg">Weekly active students</h2>
          <p className="text-sm">Last 8 weeks</p>
          <ul className="mt-4 space-y-2">
            {u.weeklyActivity.map((w) => (
              <li key={w.weekStarting}>
                <ProgressBar
                  size="sm"
                  tone="navy"
                  value={(w.activeStudents / maxWeek) * 100}
                  label={`Week of ${new Date(w.weekStarting).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${w.activeStudents}`}
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg">Faculty review of AI drafts</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <CheckCircle2 className="mx-auto h-5 w-5 text-success" aria-hidden />
              <p className="font-heading text-2xl font-bold text-navy">{ai.approved}</p>
              <p className="text-xs">approved</p>
            </div>
            <div>
              <Pencil className="mx-auto h-5 w-5 text-navy" aria-hidden />
              <p className="font-heading text-2xl font-bold text-navy">{ai.edited}</p>
              <p className="text-xs">edited first</p>
            </div>
            <div>
              <XCircle className="mx-auto h-5 w-5 text-red-dark" aria-hidden />
              <p className="font-heading text-2xl font-bold text-navy">{ai.rejected}</p>
              <p className="text-xs">rejected</p>
            </div>
          </div>
          {ai.byPromptVersion.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">AI drafts by prompt version</caption>
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-navy">
                    <th scope="col" className="py-2 pr-3">
                      Prompt version
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right">
                      Total
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right">
                      Approved
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right">
                      Edited
                    </th>
                    <th scope="col" className="py-2 text-right">
                      Rejected
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ai.byPromptVersion.map((r) => (
                    <tr key={`${r.type}-${r.promptVersion}`} className="border-b border-line">
                      <td className="py-2 pr-3 font-mono text-xs text-navy">{r.promptVersion}</td>
                      <td className="py-2 pr-3 text-right">{r.total}</td>
                      <td className="py-2 pr-3 text-right">{r.approved}</td>
                      <td className="py-2 pr-3 text-right">{r.edited}</td>
                      <td className="py-2 text-right">{r.rejected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button as={Link} to="/admin/users" className="hover:no-underline">
          Manage users
        </Button>
        <Button as={Link} to="/admin/progress" variant="secondary" className="hover:no-underline">
          Department progress
        </Button>
        <Button as={Link} to="/admin/co-po" variant="secondary" className="hover:no-underline">
          CO–PO report
        </Button>
        <Button as={Link} to="/admin/ai" variant="ghost" className="hover:no-underline">
          AI settings
        </Button>
      </div>
    </Page>
  );
}

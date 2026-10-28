import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ClipboardList, Clock, Trophy } from 'lucide-react';
import { Page } from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  Tabs,
} from '../../components/ui';
import { QueryError } from '../../components/QueryError';
import { cn } from '../../lib/cn';
import { item, stagger } from '../../lib/motion';
import { useMyForms } from './api';
import { CLOSED_REASON, HEADER_BG, fmtDateTime } from './common';

/** Pending: open and not answered yet. These are what the nav badge counts. */
export const isPending = (f) => f.open.open && !f.responded;

const dueSoon = (f) => f.closesAt && new Date(f.closesAt).getTime() - Date.now() < 2 * 86_400_000;

function FormCard({ f }) {
  return (
    <motion.li {...item}>
      <Card padded={false} interactive className="flex h-full flex-col overflow-hidden">
        <div className={cn('h-2', HEADER_BG[f.headerColor])} aria-hidden />
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg">{f.title}</h2>
            {f.isQuiz && (
              <Badge tone="gold" icon={Trophy}>
                Quiz
              </Badge>
            )}
          </div>
          {f.description && <p className="line-clamp-2 text-sm">{f.description}</p>}
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {f.responded ? (
              <Badge tone="green" icon={CheckCircle2}>
                Submitted {fmtDateTime(f.submittedAt)}
              </Badge>
            ) : f.open.open ? (
              <Badge tone={dueSoon(f) ? 'red' : 'blue'} icon={Clock}>
                {f.closesAt ? `Due ${fmtDateTime(f.closesAt)}` : 'Open'}
              </Badge>
            ) : (
              <Badge tone="orange">{CLOSED_REASON[f.open.reason]}</Badge>
            )}
            {f.score != null && (
              <Badge tone="gold">
                Score {f.score} / {f.maxScore}
              </Badge>
            )}
          </div>
          <Button
            as={Link}
            to={`/forms/${f.id}`}
            size="sm"
            variant={isPending(f) ? 'primary' : 'secondary'}
            className="mt-2 self-start"
          >
            {isPending(f)
              ? 'Fill in'
              : f.canEdit
                ? 'View or edit'
                : f.open.reason === 'notYetOpen' && !f.responded
                  ? 'Details'
                  : 'View'}
          </Button>
        </div>
      </Card>
    </motion.li>
  );
}

function FormGrid({ forms, empty }) {
  if (!forms.length)
    return <EmptyState icon={ClipboardList} title={empty.title} description={empty.text} />;
  return (
    <motion.ul {...stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {forms.map((f) => (
        <FormCard key={f.id} f={f} />
      ))}
    </motion.ul>
  );
}

/** /forms — every form shared with the student: to do, submitted, closed. */
export function MyFormsPage() {
  const forms = useMyForms();
  const [tab, setTab] = useState('todo');
  if (forms.isPending) return <LoadingBlock />;
  const data = forms.data ?? [];
  const todo = data.filter(isPending);
  const done = data.filter((f) => f.responded);
  const closed = data.filter((f) => !f.responded && !f.open.open);
  return (
    <Page>
      <EyebrowHeading eyebrow="Forms" title="Forms from your faculty" level={1}>
        <p className="mt-2">Surveys, registrations and quizzes sent to your class.</p>
      </EyebrowHeading>
      <div className="mt-6">
        {forms.isError ? (
          <QueryError query={forms} what="your forms" />
        ) : (
          <Tabs
            label="Forms"
            value={tab}
            onChange={setTab}
            tabs={[
              {
                value: 'todo',
                label: 'To do',
                count: todo.length,
                content: (
                  <FormGrid
                    forms={todo}
                    empty={{
                      title: 'Nothing to fill in',
                      text: 'New forms appear here, and the bell tells you when one arrives.',
                    }}
                  />
                ),
              },
              {
                value: 'done',
                label: 'Submitted',
                count: done.length,
                content: (
                  <FormGrid
                    forms={done}
                    empty={{ title: 'No responses yet', text: 'Forms you submit are kept here.' }}
                  />
                ),
              },
              {
                value: 'closed',
                label: 'Closed',
                count: closed.length,
                content: (
                  <FormGrid
                    forms={closed}
                    empty={{ title: 'No closed forms', text: 'Forms you missed show up here.' }}
                  />
                ),
              },
            ]}
          />
        )}
      </div>
    </Page>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  KeyRound,
  Lightbulb,
  Play,
  RotateCcw,
  Send,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { Page } from '../../../components/layout/AppShell';
import { Markdown } from '../../../components/Markdown';
import { QueryError } from '../../../components/QueryError';
import { Badge, Button, Card, LoadingBlock, Tabs } from '../../../components/ui';
import { useTopicPage } from '../api';
import { useChallenge, useRunCode, useSubmitCode, useTopicCodeLab } from './api';
import { CodeEditor } from './CodeEditor';
import { ResultTable } from './ResultTable';

export const DIFFICULTY_TONE = { easy: 'green', medium: 'orange', hard: 'red' };

/** Drafts survive a refresh on this device only (a convenience, not storage). */
const draftKey = (id) => `acet:code:${id}`;
const loadDraft = (id) => {
  try {
    return localStorage.getItem(draftKey(id));
  } catch {
    return null;
  }
};
const saveDraft = (id, code) => {
  try {
    localStorage.setItem(draftKey(id), code);
  } catch {
    // storage blocked: drafts just aren't kept
  }
};

function TablesPanel({ tables }) {
  if (!tables?.length) return <p className="text-sm">No tables in this problem.</p>;
  return (
    <div className="space-y-5">
      {tables.map((t) => (
        <div key={t.name}>
          <h3 className="flex items-center gap-2 font-mono text-sm">
            <Database className="h-4 w-4 text-navy" aria-hidden /> {t.name}
            <span className="font-sans text-xs font-normal text-body">({t.rowCount} rows)</span>
          </h3>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {t.columns.map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 font-mono text-xs text-navy"
              >
                {c.pk && <KeyRound className="h-3 w-3 text-gold-border" aria-label="primary key" />}
                {c.name}
                <span className="text-body/70">{c.type.toLowerCase()}</span>
              </span>
            ))}
          </p>
          <ResultTable
            className="mt-2"
            caption={`First rows of ${t.name}`}
            result={{
              columns: t.columns.map((c) => c.name),
              rows: t.sampleRows,
              rowCount: t.rowCount,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function HintsPanel({ hints }) {
  const [shown, setShown] = useState(0);
  if (!hints?.length) return <p className="text-sm">This problem has no hints. You can do it!</p>;
  return (
    <div>
      <ol className="space-y-2">
        {hints.slice(0, shown).map((h, i) => (
          <li
            key={i}
            className="rounded-xl border border-gold-border bg-gold-tint p-3 text-sm text-navy"
          >
            <span className="font-semibold">Hint {i + 1}.</span> {h}
          </li>
        ))}
      </ol>
      {shown < hints.length && (
        <Button
          variant="secondary"
          size="sm"
          icon={Lightbulb}
          className="mt-3"
          onClick={() => setShown(shown + 1)}
        >
          Show hint {shown + 1} of {hints.length}
        </Button>
      )}
    </div>
  );
}

function RunOutput({ result }) {
  if (!result.ok)
    return (
      <div className="rounded-xl border border-red/30 bg-red/5 p-3">
        <p className="flex items-center gap-2 font-semibold text-red-dark">
          {result.stage === 'timeout' ? (
            <Clock className="h-4 w-4" aria-hidden />
          ) : (
            <TriangleAlert className="h-4 w-4" aria-hidden />
          )}
          {result.stage === 'timeout' ? 'Time limit' : 'SQL error'}
        </p>
        <p className="mt-1 font-mono text-xs text-navy">{result.error}</p>
      </div>
    );
  return (
    <div>
      <p className="mb-2 text-xs text-body">Ran on the sample data in {result.timeMs} ms.</p>
      <ResultTable result={result} caption="Your output" />
    </div>
  );
}

function SubmitOutput({ result, next }) {
  const failed = result.cases.find((c) => !c.passed);
  if (result.passed)
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-4">
        <p className="flex items-center gap-2 text-lg font-bold text-success">
          <CheckCircle2 className="h-5 w-5" aria-hidden /> Accepted
        </p>
        <p className="mt-1 text-sm text-navy">
          {result.firstSolve ? 'Solved! ' : ''}Passed the sample data and the hidden tests in{' '}
          {result.timeMs} ms.
          {result.preview ? ' (Faculty preview: not recorded.)' : ''}
        </p>
        {next && (
          <Button
            as={Link}
            to={`/code/${next.id}`}
            size="sm"
            icon={ArrowRight}
            className="mt-3 hover:no-underline"
          >
            Next problem: {next.title}
          </Button>
        )}
      </div>
    );
  const title = {
    wrongAnswer: 'Wrong answer',
    hiddenTests: 'Failed hidden tests',
    timeout: 'Time limit exceeded',
    error: 'SQL error',
  }[result.verdict];
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-red/30 bg-red/5 p-4">
        <p className="flex items-center gap-2 text-lg font-bold text-red-dark">
          <XCircle className="h-5 w-5" aria-hidden /> {title}
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {result.cases.map((c) => (
            <li key={c.name} className="flex items-center gap-2 text-navy">
              {c.passed ? (
                <CheckCircle2 className="h-4 w-4 text-success" aria-label="passed" />
              ) : (
                <XCircle className="h-4 w-4 text-red" aria-label="failed" />
              )}
              {c.name}
            </li>
          ))}
        </ul>
        {failed?.reason && <p className="mt-2 text-sm text-navy">{failed.reason}</p>}
        {failed?.error && <p className="mt-2 font-mono text-xs text-navy">{failed.error}</p>}
      </div>
      {failed?.expected && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm">Expected</h3>
            <ResultTable result={failed.expected} caption="Expected output" />
          </div>
          <div>
            <h3 className="mb-1 text-sm">Your output</h3>
            <ResultTable result={failed.got} caption="Your output" />
          </div>
        </div>
      )}
    </div>
  );
}

/** /code/:challengeId — LeetCode-style SQL problem: statement and tables on the left, editor on the right. */
export function CodeLabPage() {
  const { challengeId } = useParams();
  const challenge = useChallenge(challengeId);
  const c = challenge.data;
  const topic = useTopicPage(c?.topicId);
  const siblings = useTopicCodeLab(c?.topicId, Boolean(c));
  const run = useRunCode(challengeId);
  const submit = useSubmitCode(challengeId, c?.topicId);
  const [tab, setTab] = useState('problem');
  const [code, setCode] = useState(null);
  const [output, setOutput] = useState(null);

  // Load the draft, else my last submission, else the starter code.
  useEffect(() => {
    if (!c) return;
    setCode(loadDraft(c.id) ?? c.lastSubmission?.code ?? c.starterCode ?? '');
    setOutput(null);
    setTab('problem');
  }, [c?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (v) => {
    setCode(v);
    saveDraft(challengeId, v);
  };

  const { prev, next } = useMemo(() => {
    const list = siblings.data ?? [];
    const i = list.findIndex((x) => x.id === challengeId);
    return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 ? (list[i + 1] ?? null) : null };
  }, [siblings.data, challengeId]);

  if (challenge.isPending)
    return (
      <Page>
        <LoadingBlock label="Loading problem" />
      </Page>
    );
  if (challenge.isError)
    return (
      <Page>
        <QueryError query={challenge} what="this problem" />
      </Page>
    );

  const busy = run.isPending || submit.isPending;
  const doRun = () => {
    if (!code?.trim() || busy) return;
    run.mutate(code, { onSuccess: (r) => setOutput({ kind: 'run', result: r }) });
  };
  const doSubmit = () => {
    if (!code?.trim() || busy) return;
    submit.mutate(code, { onSuccess: (r) => setOutput({ kind: 'submit', result: r }) });
  };

  const t = topic.data?.topic;
  return (
    <Page wide>
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to={`/topics/${c.topicId}`} className="inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" aria-hidden /> {t ? t.title : 'Back to topic'}
        </Link>
      </nav>
      <header className="mt-2 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Code lab · SQL</p>
          <h1 className="mt-1 text-2xl sm:text-3xl">{c.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={DIFFICULTY_TONE[c.difficulty]}>{c.difficulty}</Badge>
          {c.solved && (
            <Badge tone="gold" icon={CheckCircle2}>
              Solved
            </Badge>
          )}
          {c.preview && <Badge tone="navy">Preview · {c.status}</Badge>}
        </div>
      </header>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card className="min-w-0 self-start">
          <Tabs
            label="Problem"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'problem', label: 'Problem', content: <Markdown>{c.prompt}</Markdown> },
              {
                value: 'tables',
                label: 'Tables',
                count: c.tables.length,
                content: <TablesPanel tables={c.tables} />,
              },
              {
                value: 'hints',
                label: 'Hints',
                count: c.hints.length,
                content: <HintsPanel hints={c.hints} />,
              },
            ]}
          />
          <p className="mt-5 text-xs text-body">
            {c.orderMatters ? 'Row order matters for this problem.' : 'Rows can be in any order.'}{' '}
            Column names do not matter, only values.
          </p>
        </Card>

        <div className="min-w-0 space-y-4">
          <CodeEditor
            id="code-editor"
            value={code ?? ''}
            onChange={edit}
            onRun={doRun}
            onSubmit={doSubmit}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={Play}
              onClick={doRun}
              disabled={busy || !code?.trim()}
            >
              {run.isPending ? 'Running…' : 'Run'}
            </Button>
            <Button icon={Send} onClick={doSubmit} disabled={busy || !code?.trim()}>
              {submit.isPending ? 'Checking…' : 'Submit'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              onClick={() => edit(c.starterCode ?? '')}
              disabled={busy}
            >
              Reset
            </Button>
            <span className="ml-auto hidden text-xs text-body sm:inline">
              Ctrl+Enter runs · Ctrl+Shift+Enter submits
            </span>
          </div>

          <section aria-live="polite" aria-label="Result">
            {output ? (
              <Card>
                {output.kind === 'run' ? (
                  <RunOutput result={output.result} />
                ) : (
                  <SubmitOutput result={output.result} next={next} />
                )}
              </Card>
            ) : (
              <p className="rounded-2xl border border-dashed border-line p-4 text-sm">
                Run your query to see its output on the sample data. Submit to check it against
                hidden tests too.
              </p>
            )}
          </section>

          {(prev || next) && (
            <div className="flex flex-wrap justify-between gap-2">
              {prev ? (
                <Button
                  as={Link}
                  to={`/code/${prev.id}`}
                  variant="ghost"
                  size="sm"
                  icon={ArrowLeft}
                  className="hover:no-underline"
                >
                  {prev.title}
                </Button>
              ) : (
                <span />
              )}
              {next && (
                <Button
                  as={Link}
                  to={`/code/${next.id}`}
                  variant="ghost"
                  size="sm"
                  className="hover:no-underline"
                >
                  {next.title} <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

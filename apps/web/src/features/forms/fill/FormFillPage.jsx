import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  Lock,
  Pencil,
  Send,
} from 'lucide-react';
import { FORM_NEXT, formPath, isInputItem, nextTarget, validateAnswer } from '@acet/shared';
import { ApiError, api, errorMessage } from '../../../api/client';
import { Page } from '../../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  ProgressBar,
  toast,
} from '../../../components/ui';
import { QueryError } from '../../../components/QueryError';
import { cn } from '../../../lib/cn';
import { celebrate } from '../../student/game/celebrate';
import { fkeys, useFormSummary, useFormView } from '../api';
import { CLOSED_REASON, HEADER_BG, QuestionSummary, fmtDateTime } from '../common';
import { QuestionInput, seededShuffle } from './QuestionInput';

function FormHeader({ form, children }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className={cn('h-2.5', HEADER_BG[form.headerColor])} aria-hidden />
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl">{form.title}</h1>
        {form.description && <p className="mt-2 whitespace-pre-line">{form.description}</p>}
        {children}
      </div>
    </Card>
  );
}

function Summary({ formId, form }) {
  const q = useFormSummary(formId);
  if (q.isPending) return <LoadingBlock />;
  if (q.isError) return <QueryError query={q} what="the results" />;
  return (
    <div className="space-y-4">
      {form.sections
        .flatMap((s) => s.questions)
        .filter(isInputItem)
        .map((question) => (
          <Card key={question.id}>
            <QuestionSummary
              question={question}
              summary={q.data.summary[question.id]}
              total={q.data.total}
            />
          </Card>
        ))}
    </div>
  );
}

/** After submitting: the confirmation, marks (when released) and what the student can do next. */
function Done({ view, response, message, onEdit, onAnother }) {
  const { form } = view;
  const [showSummary, setShowSummary] = useState(false);
  const [showAnswers, setShowAnswers] = useState(Boolean(response.scoreReleased));
  return (
    <div className="space-y-4">
      <FormHeader form={form}>
        <div className="mt-4 flex items-start gap-3 rounded-md bg-success-soft p-4">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-semibold text-navy">
              {message || 'Your response has been recorded.'}
            </p>
            <p className="text-xs">Submitted {fmtDateTime(response.submittedAt)}</p>
          </div>
        </div>
        {form.settings.isQuiz && (
          <div className="mt-4">
            {response.scoreReleased ? (
              <p className="font-heading text-3xl font-bold text-navy">
                {response.score}{' '}
                <span className="text-lg text-body">/ {response.maxScore} points</span>
              </p>
            ) : (
              <Badge tone="orange">Your score will be released after review</Badge>
            )}
            {response.feedback && (
              <p className="mt-2 text-sm">Faculty feedback: {response.feedback}</p>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {view.canEdit && (
            <Button variant="secondary" icon={Pencil} onClick={onEdit}>
              Edit your response
            </Button>
          )}
          {view.canRespond && !form.settings.limitOneResponse && (
            <Button variant="secondary" onClick={onAnother}>
              Submit another response
            </Button>
          )}
          {response.scoreReleased && (
            <Button variant="ghost" icon={Eye} onClick={() => setShowAnswers((v) => !v)}>
              {showAnswers ? 'Hide' : 'View'} your answers
            </Button>
          )}
          {form.settings.showSummaryToRespondents && (
            <Button variant="ghost" icon={BarChart3} onClick={() => setShowSummary((v) => !v)}>
              {showSummary ? 'Hide' : 'See'} results summary
            </Button>
          )}
          <Button as={Link} to="/forms" variant="ghost">
            My forms
          </Button>
        </div>
      </FormHeader>
      {showAnswers &&
        form.sections
          .flatMap((s) => s.questions)
          .filter((q) => isInputItem(q) && response.results?.[q.id])
          .map((q) => (
            <Card key={q.id}>
              <QuestionInput
                q={q}
                value={response.answers[q.id]}
                onChange={() => {}}
                existingFiles={response.files.filter((f) => f.questionId === q.id)}
                onFiles={() => {}}
                result={response.results[q.id]}
              />
            </Card>
          ))}
      {showSummary && <Summary formId={form.id} form={form} />}
    </div>
  );
}

/** Builds the request: JSON, or multipart when files are attached. */
function buildBody(answers, files) {
  const withFiles = Object.values(files).some((f) => f.length);
  if (!withFiles) return { answers };
  const fd = new FormData();
  fd.append('answers', JSON.stringify(answers));
  for (const [qid, list] of Object.entries(files))
    for (const f of list) fd.append(`file:${qid}`, f);
  return fd;
}

function Filler({ view, initial, onDone }) {
  const { form } = view;
  const qc = useQueryClient();
  const seed = useMemo(() => Math.floor(Math.random() * 100000) + 1, []);
  const [answers, setAnswers] = useState(initial?.answers ?? {});
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [history, setHistory] = useState([0]);
  const index = history[history.length - 1];
  const section = form.sections[index];
  const existingFiles = initial?.files ?? [];

  // Questions in display order (shuffled per student if the form says so).
  const questions = useMemo(
    () =>
      form.settings.shuffleQuestions
        ? seededShuffle(section.questions, seed + index)
        : section.questions,
    [form.settings.shuffleQuestions, section.questions, seed, index],
  );

  /** Answers including file questions (as names), the shape validateAnswer() expects. */
  const effective = (q) => {
    if (q.type !== 'fileUpload') return answers[q.id];
    const fresh = files[q.id] ?? [];
    if (fresh.length) return fresh.map((f) => f.name);
    return existingFiles.filter((f) => f.questionId === q.id).map((f) => f.name);
  };
  const target = nextTarget(section, answers);
  const isLast =
    target === FORM_NEXT.submit ||
    (target === FORM_NEXT.next && index === form.sections.length - 1);
  const pathLength = formPath(form, answers).length;
  const progress = Math.round(
    ((history.length - (isLast ? 0 : 1)) / Math.max(pathLength, history.length)) * 100,
  );

  const checkSection = () => {
    const errs = {};
    for (const q of section.questions) {
      const e = validateAnswer(q, effective(q));
      if (e) errs[q.id] = e;
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      document
        .getElementById(`q-${Object.keys(errs)[0]}`)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const submit = useMutation({
    mutationFn: () => {
      // Only answers on the path the student took are sent.
      const onPath = new Set(history.flatMap((i) => form.sections[i].questions.map((q) => q.id)));
      const sent = Object.fromEntries(
        Object.entries(answers).filter(([k, v]) => onPath.has(k) && v !== null && v !== undefined),
      );
      return api(`/forms/${form.id}/responses`, { method: 'POST', body: buildBody(sent, files) });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: fkeys.view(form.id) });
      qc.invalidateQueries({ queryKey: fkeys.mine });
      celebrate();
      onDone(data);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.details?.errors) {
        setErrors(e.details.errors);
        toast.error('Some answers need attention');
      } else toast.error('Could not submit', errorMessage(e));
    },
  });

  const next = () => {
    if (!checkSection()) return;
    if (isLast) return submit.mutate();
    const to =
      target === FORM_NEXT.next ? index + 1 : form.sections.findIndex((s) => s.id === target);
    setHistory([...history, to]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      {index === 0 ? (
        <FormHeader form={form}>
          <p className="mt-3 text-xs">
            <span className="text-red-dark">*</span> Indicates a required question
            {form.settings.closesAt && ` · Closes ${fmtDateTime(form.settings.closesAt)}`}
          </p>
          {view.preview && (
            <Badge tone="blue" className="mt-3">
              Preview — your answers are not recorded
            </Badge>
          )}
        </FormHeader>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className={cn('h-1.5', HEADER_BG[form.headerColor])} aria-hidden />
          <div className="p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              {form.title}
            </p>
            {section.title && <h2 className="mt-1 text-xl">{section.title}</h2>}
            {section.description && (
              <p className="mt-1 whitespace-pre-line">{section.description}</p>
            )}
          </div>
        </Card>
      )}
      {index === 0 && (section.title || section.description) && (
        <Card>
          {section.title && <h2 className="text-xl">{section.title}</h2>}
          {section.description && <p className="mt-1 whitespace-pre-line">{section.description}</p>}
        </Card>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          className="space-y-4"
        >
          {questions.map((q) => (
            <Card key={q.id} id={`q-${q.id}`} className={cn(errors[q.id] && 'border-red/50')}>
              <QuestionInput
                q={q}
                seed={seed}
                value={answers[q.id]}
                error={errors[q.id]}
                files={files[q.id] ?? []}
                existingFiles={existingFiles.filter((f) => f.questionId === q.id)}
                onFiles={(list) => setFiles({ ...files, [q.id]: list })}
                onChange={(v) => {
                  setAnswers({ ...answers, [q.id]: v });
                  if (errors[q.id]) setErrors({ ...errors, [q.id]: undefined });
                }}
              />
            </Card>
          ))}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-3">
        {history.length > 1 && (
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => setHistory(history.slice(0, -1))}
          >
            Back
          </Button>
        )}
        {view.preview && isLast ? (
          <Badge tone="blue">End of preview</Badge>
        ) : (
          <Button icon={isLast ? Send : ArrowRight} loading={submit.isPending} onClick={next}>
            {isLast ? (initial ? 'Update response' : 'Submit') : 'Next'}
          </Button>
        )}
        {form.settings.showProgressBar && form.sections.length > 1 && (
          <div className="ml-auto flex min-w-[10rem] flex-1 items-center gap-2 sm:max-w-xs">
            <ProgressBar value={progress} label="Form progress" />
            <span className="text-xs tabular-nums">
              Page {history.length} of {Math.max(pathLength, history.length)}
            </span>
          </div>
        )}
        <button
          type="button"
          className="text-sm font-semibold text-brand"
          onClick={() => {
            setAnswers({});
            setFiles({});
            setErrors({});
            setHistory([0]);
          }}
        >
          Clear form
        </button>
      </div>
    </div>
  );
}

/** /forms/:formId — the shareable form link. Students fill it; editors get a preview. */
export function FormFillPage() {
  const { formId } = useParams();
  const view = useFormView(formId);
  const [mode, setMode] = useState(null); // null (auto) | 'fill' | 'edit' | 'done'
  const [result, setResult] = useState(null);

  if (view.isPending) return <LoadingBlock />;
  if (view.isError) {
    const err = view.error;
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      return (
        <Page className="max-w-3xl">
          <EmptyState
            icon={Lock}
            title={err.status === 404 ? 'Form not found' : 'This form is not shared with you'}
            description={
              err.status === 404
                ? 'The link may be wrong, or the form was unpublished or deleted.'
                : 'It was sent to a different class. Ask your faculty if you think you should have it.'
            }
            action={
              <Button as={Link} to="/forms">
                Go to my forms
              </Button>
            }
          />
        </Page>
      );
    }
    return (
      <Page className="max-w-3xl">
        <QueryError query={view} what="this form" />
      </Page>
    );
  }

  const v = view.data;
  const latest = result?.response ?? v.myResponse;
  const showDone = mode === 'done' || (mode === null && latest && !v.preview);

  let content;
  if (showDone && latest) {
    content = (
      <Done
        view={v}
        response={latest}
        message={result?.confirmationMessage ?? v.confirmationMessage}
        onEdit={() => setMode('edit')}
        onAnother={() => {
          setResult(null);
          setMode('fill');
        }}
      />
    );
  } else if (!v.preview && !v.open.open && mode === null) {
    content = (
      <FormHeader form={v.form}>
        <div className="mt-4 rounded-md bg-surface p-4">
          <p className="font-semibold text-navy">
            {v.open.reason === 'notYetOpen'
              ? `This form opens ${fmtDateTime(v.form.settings.opensAt)}.`
              : `${v.form.title} is no longer accepting responses.`}
          </p>
          <p className="text-sm">
            {CLOSED_REASON[v.open.reason]}. Contact the form owner if you think this is a mistake.
          </p>
        </div>
      </FormHeader>
    );
  } else {
    content = (
      <Filler
        key={mode}
        view={v}
        initial={mode === 'edit' ? latest : null}
        onDone={(data) => {
          setResult(data);
          setMode('done');
        }}
      />
    );
  }

  return <Page className="max-w-3xl">{content}</Page>;
}

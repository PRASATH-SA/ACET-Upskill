import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, Inbox, Send, Trash2 } from 'lucide-react';
import { FORM_GRID_TYPES, allQuestions, isGraded, isInputItem } from '@acet/shared';
import { del, errorMessage, patch } from '../../../api/client';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  IconButton,
  Input,
  LoadingBlock,
  Select,
  StatTile,
  Tabs,
  Textarea,
  toast,
} from '../../../components/ui';
import { QueryError } from '../../../components/QueryError';
import { downloadAuthFile } from '../../../hooks/useAuthFile';
import { fkeys, useFormAction, useFormResponses } from '../api';
import { QuestionSummary, Toggle, fmtDateTime } from '../common';

function AnswerView({ q, value, files, formId, responseId }) {
  if (q.type === 'fileUpload') {
    const mine = files.filter((f) => f.questionId === q.id);
    if (!mine.length) return <p className="text-sm italic">No file</p>;
    return (
      <div className="flex flex-wrap gap-2">
        {mine.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant="secondary"
            icon={Download}
            onClick={() =>
              downloadAuthFile(`/forms/${formId}/responses/${responseId}/files/${f.id}`, f.name)
            }
          >
            {f.name}
          </Button>
        ))}
      </div>
    );
  }
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) {
    return <p className="text-sm italic">No answer</p>;
  }
  if (FORM_GRID_TYPES.includes(q.type)) {
    return (
      <ul className="text-sm text-navy">
        {q.rows.map((r) => (
          <li key={r}>
            {r}: <strong>{[value[r] ?? '—'].flat().join(', ')}</strong>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="whitespace-pre-line text-sm font-medium text-navy">
      {Array.isArray(value) ? value.join(', ') : String(value)}
    </p>
  );
}

function Individual({ form, data }) {
  const qc = useQueryClient();
  const [i, setI] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const r = data.responses[Math.min(i, data.responses.length - 1)];
  const [grades, setGrades] = useState({});
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    setGrades({});
    setFeedback(r?.feedback ?? '');
  }, [r?.id, r?.feedback]);
  const save = useMutation({
    mutationFn: () => patch(`/forms/${form.id}/responses/${r.id}/grade`, { grades, feedback }),
    onSuccess: () => {
      toast.success('Marks saved');
      qc.invalidateQueries({ queryKey: fkeys.responses(form.id) });
    },
    onError: (e) => toast.error('Could not save', errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => del(`/forms/${form.id}/responses/${r.id}`),
    onSuccess: () => {
      setConfirm(false);
      toast.success('Response deleted');
      qc.invalidateQueries({ queryKey: fkeys.responses(form.id) });
    },
  });
  if (!r) return null;
  const isQuiz = form.settings.isQuiz;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <IconButton
            icon={ChevronLeft}
            label="Previous response"
            disabled={i === 0}
            onClick={() => setI(i - 1)}
          />
          <Select
            label="Response"
            hideLabel
            compact
            className="w-56"
            options={data.responses.map((x, j) => ({
              value: j,
              label: x.student ? x.student.name : `Response ${j + 1}`,
            }))}
            value={i}
            onChange={(e) => setI(Number(e.target.value))}
          />
          <IconButton
            icon={ChevronRight}
            label="Next response"
            disabled={i >= data.responses.length - 1}
            onClick={() => setI(i + 1)}
          />
          <span className="ml-2 text-sm">
            {i + 1} of {data.responses.length}
          </span>
        </div>
        <IconButton icon={Trash2} label="Delete this response" onClick={() => setConfirm(true)} />
      </Card>
      <Card className="space-y-1">
        {r.student ? (
          <p className="font-semibold text-navy">
            {r.student.name} <span className="text-xs font-normal">{r.student.email}</span>
            {r.student.batch && <span className="text-xs font-normal"> · {r.student.batch}</span>}
          </p>
        ) : (
          <p className="font-semibold text-navy">Anonymous response</p>
        )}
        <p className="text-xs">Submitted {fmtDateTime(r.submittedAt)}</p>
        {isQuiz && (
          <p className="pt-1 text-sm text-navy">
            Score{' '}
            <strong>
              {r.score ?? 0} / {r.maxScore ?? 0}
            </strong>{' '}
            {r.scoreReleased ? <Badge tone="green">Released</Badge> : <Badge>Not released</Badge>}
          </p>
        )}
      </Card>
      {allQuestions(form)
        .filter(isInputItem)
        .map((q) => {
          const res = r.results?.[q.id];
          return (
            <Card key={q.id} className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-navy">{q.title}</p>
                {res && (
                  <Badge
                    tone={res.pending ? 'orange' : res.earned === res.points ? 'green' : 'red'}
                  >
                    {res.pending ? 'Needs marking' : `${res.earned} / ${res.points}`}
                  </Badge>
                )}
              </div>
              <AnswerView
                q={q}
                value={r.answers[q.id]}
                files={r.files}
                formId={form.id}
                responseId={r.id}
              />
              {isQuiz && isGraded(q) && (
                <Input
                  label={`Points (max ${q.points})`}
                  type="number"
                  min={0}
                  max={q.points}
                  className="w-40"
                  value={grades[q.id] ?? r.manualGrades[q.id] ?? ''}
                  placeholder={String(res?.earned ?? 0)}
                  onChange={(e) =>
                    setGrades({
                      ...grades,
                      [q.id]: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              )}
            </Card>
          );
        })}
      {isQuiz && (
        <Card className="space-y-3">
          <Textarea
            label="Feedback to the student"
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <Button variant="navy" loading={save.isPending} onClick={() => save.mutate()}>
            Save marks
          </Button>
        </Card>
      )}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this response?"
        description="The answers and any uploaded files are removed for good."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button loading={remove.isPending} onClick={() => remove.mutate()}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}

/** Responses tab: summary charts, one question at a time, or one student at a time. */
export function ResponsesPanel({ form, draft, onChange }) {
  const responses = useFormResponses(form.id);
  const action = useFormAction();
  const qc = useQueryClient();
  const [view, setView] = useState('summary');
  const [questionId, setQuestionId] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const clearAll = useMutation({
    mutationFn: () => del(`/forms/${form.id}/responses`),
    onSuccess: () => {
      setConfirmAll(false);
      toast.success('All responses deleted');
      qc.invalidateQueries({ queryKey: fkeys.responses(form.id) });
    },
  });

  if (responses.isPending) return <LoadingBlock />;
  if (responses.isError) return <QueryError query={responses} what="responses" />;
  const data = responses.data;
  const questions = allQuestions(form).filter(isInputItem);
  const current = questions.find((q) => q.id === questionId) ?? questions[0];

  const header = (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl">
          {data.total} response{data.total === 1 ? '' : 's'}
          {data.anonymous && <Badge className="ml-2">Anonymous</Badge>}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={Download}
            disabled={!data.total}
            onClick={() =>
              downloadAuthFile(`/forms/${form.id}/export`, `${form.title} (Responses).csv`)
            }
          >
            Download CSV
          </Button>
          {form.settings.isQuiz && (
            <Button
              size="sm"
              variant="navy"
              icon={Send}
              disabled={!data.total}
              loading={action.isPending}
              onClick={() =>
                action.mutate(
                  { id: form.id, action: 'release-scores' },
                  {
                    onSuccess: (d) =>
                      toast.success('Scores released', `${d.released} student(s) notified`),
                  },
                )
              }
            >
              Release scores
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={Trash2}
            disabled={!data.total}
            onClick={() => setConfirmAll(true)}
          >
            Delete all
          </Button>
        </div>
      </div>
      <Toggle
        label="Accepting responses"
        checked={draft.settings.acceptingResponses}
        onChange={(acceptingResponses) =>
          onChange({ ...draft, settings: { ...draft.settings, acceptingResponses } })
        }
      />
      {data.quiz && data.total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Average" value={`${data.quiz.average} / ${data.quiz.maxScore}`} />
          <StatTile label="Median" value={`${data.quiz.median} / ${data.quiz.maxScore}`} />
          <StatTile label="Total points" value={data.quiz.maxScore} />
        </div>
      )}
    </Card>
  );

  const summary = (
    <div className="space-y-4">
      {questions.map((q) => (
        <Card key={q.id}>
          <QuestionSummary question={q} summary={data.summary[q.id]} total={data.total} />
          {data.quiz?.correctByQuestion[q.id] != null && (
            <p className="mt-2 text-xs">
              {data.quiz.correctByQuestion[q.id]} of {data.total} got full marks
            </p>
          )}
        </Card>
      ))}
    </div>
  );

  const byQuestion = current && (
    <div className="space-y-4">
      <Select
        label="Question"
        options={questions.map((q) => ({ value: q.id, label: q.title || 'Untitled question' }))}
        value={current.id}
        onChange={(e) => setQuestionId(e.target.value)}
      />
      {data.responses.map((r, j) => (
        <Card key={r.id} className="space-y-1">
          <p className="text-xs">{r.student ? r.student.name : `Response ${j + 1}`}</p>
          <AnswerView
            q={current}
            value={r.answers[current.id]}
            files={r.files}
            formId={form.id}
            responseId={r.id}
          />
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {header}
      {data.total === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Waiting for responses"
          description={
            form.status === 'published'
              ? 'Share the link. Students in the audience were notified when you published.'
              : 'Publish the form so students can respond.'
          }
        />
      ) : (
        <Tabs
          label="Response views"
          value={view}
          onChange={setView}
          tabs={[
            { value: 'summary', label: 'Summary', content: summary },
            { value: 'question', label: 'Question', content: byQuestion },
            {
              value: 'individual',
              label: 'Individual',
              content: <Individual form={form} data={data} />,
            },
          ]}
        />
      )}
      <Dialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Delete all responses?"
        description="Every answer and uploaded file is removed for good. Download the CSV first if you need it."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAll(false)}>
              Cancel
            </Button>
            <Button loading={clearAll.isPending} onClick={() => clearAll.mutate()}>
              Delete all
            </Button>
          </>
        }
      />
    </div>
  );
}

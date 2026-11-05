import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Cloud,
  CloudOff,
  Copy,
  ExternalLink,
  Eye,
  Link2,
  ListPlus,
  Loader2,
  Plus,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  FORM_HEADER_COLORS,
  FORM_ITEM_TYPES,
  FORM_NEXT,
  blankQuestion,
  blankSection,
  newFormId,
} from '@acet/shared';
import { errorMessage } from '../../../api/client';
import { Page } from '../../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  Dialog,
  IconButton,
  Input,
  LoadingBlock,
  Menu,
  Select,
  Tabs,
  Textarea,
  toast,
} from '../../../components/ui';
import { QueryError } from '../../../components/QueryError';
import { cn } from '../../../lib/cn';
import { fkeys, formUrl, saveForm, useForm, useFormAction } from '../api';
import { CLOSED_REASON, HEADER_BG, HEADER_LABEL, TYPE_META } from '../common';
import { QuestionEditor } from './QuestionEditor';
import { ResponsesPanel } from './ResponsesPanel';
import { SettingsPanel } from './SettingsPanel';

const EDITABLE = ['title', 'description', 'headerColor', 'sections', 'settings', 'audience'];
const pick = (form) => Object.fromEntries(EDITABLE.map((k) => [k, form[k]]));
const move = (list, i, d) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};
const copyQuestion = (q) => ({
  ...q,
  id: newFormId('q'),
  options: q.options.map((o) => ({ ...o, id: newFormId('o') })),
});

/** "sections.0.questions.2.options.1.label" → "Section 1 › question 3 › option 2 › label". */
const readablePath = (path = '') =>
  String(path)
    .replace(/sections\.(\d+)/, (_m, n) => `Section ${Number(n) + 1}`)
    .replace(/questions\.(\d+)/, (_m, n) => `question ${Number(n) + 1}`)
    .replace(/options\.(\d+)/, (_m, n) => `option ${Number(n) + 1}`)
    .replace(/\./g, ' › ');

/** Saves the draft 800 ms after the last change, like Google Forms. */
function useAutosave(id, draft) {
  const qc = useQueryClient();
  const [state, setState] = useState({ status: 'saved', error: null });
  const first = useRef(true);
  const latest = useRef(draft);
  latest.current = draft;
  const timer = useRef(null);

  const flush = async () => {
    clearTimeout(timer.current);
    setState({ status: 'saving', error: null });
    try {
      const saved = await saveForm(id, latest.current);
      qc.setQueryData(fkeys.form(id), (old) => ({ ...old, ...saved }));
      qc.invalidateQueries({ queryKey: fkeys.list });
      if (saved.notified) toast.success(`${saved.notified} more student(s) notified`);
      setState({ status: 'saved', error: null });
      return true;
    } catch (e) {
      const issue = Array.isArray(e.details) ? e.details[0] : null;
      setState({
        status: 'error',
        error: issue ? `${readablePath(issue.path)}: ${issue.message}` : errorMessage(e),
      });
      return false;
    }
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    setState((s) => ({ ...s, status: 'dirty' }));
    timer.current = setTimeout(flush, 800);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return { ...state, flush };
}

function SaveState({ status, error }) {
  if (status === 'saving' || status === 'dirty') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-dark"
        role="alert"
      >
        <CloudOff className="h-4 w-4" aria-hidden /> Not saved: {error}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <Cloud className="h-4 w-4" aria-hidden /> All changes saved
    </span>
  );
}

export function ShareDialog({ open, onClose, formId, status }) {
  const url = formUrl(formId);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Copy failed', 'Select the link and copy it by hand.');
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Send form"
      description="Share this link in your class group, email or LMS announcement. Students sign in, then the form opens."
      footer={
        <Button icon={Copy} onClick={copy}>
          Copy link
        </Button>
      }
    >
      <Input label="Link" readOnly value={url} onFocus={(e) => e.target.select()} />
      <p className="mt-3 text-sm">
        {status === 'published'
          ? 'Students in the audience also see it on their Forms page and got a notification.'
          : 'The form is a draft: publish it before sharing, or students will not be able to open it.'}
      </p>
    </Dialog>
  );
}

function HeaderCard({ draft, set }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className={cn('h-2.5', HEADER_BG[draft.headerColor])} aria-hidden />
      <div className="space-y-3 p-4 sm:p-5">
        <Input
          label="Form title"
          hideLabel
          inputClassName="font-heading text-2xl font-bold"
          value={draft.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        <Textarea
          label="Form description"
          hideLabel
          rows={2}
          placeholder="Form description"
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Theme colour">
          <span className="text-sm font-semibold text-navy">Theme</span>
          {FORM_HEADER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={draft.headerColor === c}
              title={HEADER_LABEL[c]}
              aria-label={`${HEADER_LABEL[c]} theme`}
              onClick={() => set({ headerColor: c })}
              className={cn(
                'h-8 w-8 rounded-full ring-offset-2 ring-offset-card transition-shadow',
                HEADER_BG[c],
                draft.headerColor === c ? 'ring-2 ring-navy' : 'hover:ring-2 hover:ring-line',
              )}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function AddItemMenu({ onAdd, label = 'Add question' }) {
  return (
    <Menu
      label={label}
      align="left"
      trigger={
        <span className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-semibold text-brand">
          <Plus className="h-4 w-4" aria-hidden /> {label}
        </span>
      }
      items={FORM_ITEM_TYPES.map((t) => ({
        label: TYPE_META[t].label,
        icon: TYPE_META[t].icon,
        onSelect: () => onAdd(t),
      }))}
    />
  );
}

function QuestionsTab({ draft, set }) {
  const { sections } = draft;
  const isQuiz = draft.settings.isQuiz;
  const setSections = (next) => set({ sections: next });
  const setSection = (si, patch) =>
    setSections(sections.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const setQuestions = (si, questions) => setSection(si, { questions });

  const addQuestion = (si, type, at) => {
    const q = { ...blankQuestion(type), title: '' };
    const qs = [...sections[si].questions];
    qs.splice(at ?? qs.length, 0, q);
    setQuestions(si, qs);
  };
  const removeSection = (si) => {
    // Its questions join the section above (or below, for the first one), like Google Forms.
    const target = si === 0 ? 1 : si - 1;
    const gone = sections[si];
    setSections(
      sections
        .map((s, i) =>
          i === target
            ? {
                ...s,
                questions:
                  si === 0
                    ? [...gone.questions, ...s.questions]
                    : [...s.questions, ...gone.questions],
              }
            : s,
        )
        .filter((_s, i) => i !== si)
        // Anything that pointed at the removed section now continues to the next one.
        .map((s) => ({
          ...s,
          next: s.next === gone.id ? FORM_NEXT.next : s.next,
          questions: s.questions.map((q) => ({
            ...q,
            options: q.options.map((o) =>
              o.goTo === gone.id ? { ...o, goTo: FORM_NEXT.next } : o,
            ),
          })),
        })),
    );
  };
  const afterOptions = (si) => [
    {
      value: FORM_NEXT.next,
      label: si === sections.length - 1 ? 'Submit form' : 'Continue to next section',
    },
    ...sections
      .map((s, i) => ({
        value: s.id,
        label: `Go to section ${i + 1}${s.title ? ` (${s.title})` : ''}`,
      }))
      .filter((_o, i) => i !== si),
    { value: FORM_NEXT.submit, label: 'Submit form' },
  ];

  return (
    <div className="space-y-6">
      <HeaderCard draft={draft} set={set} />
      {sections.map((section, si) => (
        <section key={section.id} className="space-y-3" aria-label={`Section ${si + 1}`}>
          {sections.length > 1 && (
            <Card tone="surface" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone="navy">
                  Section {si + 1} of {sections.length}
                </Badge>
                <div className="flex">
                  <IconButton
                    icon={ArrowUp}
                    label="Move section up"
                    disabled={si === 0}
                    onClick={() => setSections(move(sections, si, -1))}
                  />
                  <IconButton
                    icon={ArrowDown}
                    label="Move section down"
                    disabled={si === sections.length - 1}
                    onClick={() => setSections(move(sections, si, 1))}
                  />
                  <IconButton
                    icon={Trash2}
                    label="Delete section"
                    onClick={() => removeSection(si)}
                  />
                </div>
              </div>
              <Input
                label="Section title"
                hideLabel
                placeholder="Section title"
                inputClassName="font-semibold"
                value={section.title}
                onChange={(e) => setSection(si, { title: e.target.value })}
              />
              <Textarea
                label="Section description"
                hideLabel
                rows={2}
                placeholder="Description (optional)"
                value={section.description}
                onChange={(e) => setSection(si, { description: e.target.value })}
              />
            </Card>
          )}
          {section.questions.map((q, qi) => (
            <QuestionEditor
              key={q.id}
              question={q}
              sections={sections}
              sectionIndex={si}
              isQuiz={isQuiz}
              first={qi === 0}
              last={qi === section.questions.length - 1}
              onChange={(nq) =>
                setQuestions(
                  si,
                  section.questions.map((x) => (x.id === q.id ? nq : x)),
                )
              }
              onMove={(d) => setQuestions(si, move(section.questions, qi, d))}
              onDuplicate={() => {
                const qs = [...section.questions];
                qs.splice(qi + 1, 0, copyQuestion(q));
                setQuestions(si, qs);
              }}
              onDelete={() =>
                setQuestions(
                  si,
                  section.questions.filter((x) => x.id !== q.id),
                )
              }
            />
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <AddItemMenu onAdd={(t) => addQuestion(si, t)} />
            <Button
              size="sm"
              variant="ghost"
              icon={ListPlus}
              onClick={() => {
                const next = [...sections];
                next.splice(si + 1, 0, blankSection());
                setSections(next);
              }}
            >
              Add section
            </Button>
          </div>
          {sections.length > 1 && (
            <Select
              label={`After section ${si + 1}`}
              compact
              className="sm:w-80"
              options={afterOptions(si)}
              value={section.next}
              onChange={(e) => setSection(si, { next: e.target.value })}
            />
          )}
        </section>
      ))}
    </div>
  );
}

/** /studio/forms/:formId — build, configure, share and read responses. */
export function FormEditor() {
  const { formId } = useParams();
  const query = useForm(formId);
  if (query.isPending) return <LoadingBlock />;
  if (query.isError) {
    return (
      <Page>
        <QueryError query={query} what="this form" />
      </Page>
    );
  }
  return <Editor key={formId} form={query.data} />;
}

function Editor({ form }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => pick(form));
  const [tab, setTab] = useState('questions');
  const [share, setShare] = useState(false);
  const save = useAutosave(form.id, draft);
  const action = useFormAction();
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const publish = async () => {
    if (!(await save.flush())) return;
    action.mutate(
      { id: form.id, action: 'publish' },
      {
        onSuccess: (d) => {
          toast.success('Form published', `${d.notified} student(s) notified`);
          setShare(true);
        },
        onError: (e) => toast.error('Could not publish', errorMessage(e)),
      },
    );
  };

  return (
    <Page className="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <IconButton
          icon={ArrowLeft}
          label="Back to Form studio"
          onClick={() => navigate('/studio/forms')}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-lg font-bold text-navy">
            {draft.title || 'Untitled form'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {form.status === 'published' ? (
              <Badge
                tone={form.open.open ? 'green' : 'orange'}
                icon={form.open.open ? CheckCircle2 : undefined}
              >
                {form.open.open
                  ? 'Published · accepting'
                  : `Published · ${CLOSED_REASON[form.open.reason]}`}
              </Badge>
            ) : (
              <Badge>Draft</Badge>
            )}
            <SaveState {...save} />
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          icon={Eye}
          onClick={() => window.open(`/forms/${form.id}`, '_blank', 'noopener')}
        >
          Preview
        </Button>
        <Button size="sm" variant="secondary" icon={Link2} onClick={() => setShare(true)}>
          Get link
        </Button>
        {form.status === 'published' ? (
          <Button
            size="sm"
            variant="ghost"
            icon={Undo2}
            loading={action.isPending}
            onClick={() => action.mutate({ id: form.id, action: 'unpublish' })}
          >
            Unpublish
          </Button>
        ) : (
          <Button size="sm" icon={Send} loading={action.isPending} onClick={publish}>
            Publish
          </Button>
        )}
      </div>
      <Tabs
        label="Form editor"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            value: 'questions',
            label: 'Questions',
            content: <QuestionsTab draft={draft} set={set} />,
          },
          {
            value: 'responses',
            label: 'Responses',
            count: form.responseCount,
            content: (
              <ResponsesPanel form={{ ...form, ...draft }} draft={draft} onChange={setDraft} />
            ),
          },
          {
            value: 'settings',
            label: 'Settings',
            content: <SettingsPanel form={form} draft={draft} onChange={setDraft} />,
          },
        ]}
      />
      <ShareDialog
        open={share}
        onClose={() => setShare(false)}
        formId={form.id}
        status={form.status}
      />
      <p className="mt-6 text-center text-xs">
        <a
          href={`/forms/${form.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1"
        >
          Open the student view <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </p>
    </Page>
  );
}

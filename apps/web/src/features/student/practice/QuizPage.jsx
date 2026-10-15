import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  FileQuestion,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { get, post } from '../../../api/client';
import { Page } from '../../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  ProgressBar,
  StatTile,
  focusRing,
} from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { useSession } from '../../auth/session';
import { keys, useTopicPage } from '../api';
import { MASTERY_LABEL } from '../map/graph';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function Options({ question, selected, onSelect, result }) {
  return (
    <fieldset>
      <legend className="sr-only">Options</legend>
      <div className="grid gap-2">
        {question.options.map((opt, i) => {
          const isCorrect = result && i === result.correctIndex;
          const isWrongPick = result && i === result.selectedIndex && !result.correct;
          return (
            <label
              key={i}
              className={cn(
                'flex min-h-[52px] items-start gap-3 rounded-2xl border-2 px-4 py-3 transition-colors',
                result ? 'cursor-default' : 'cursor-pointer hover:border-blue',
                selected === i && !result ? 'border-blue bg-blue/5' : 'border-line',
                isCorrect && 'border-success bg-success/10',
                isWrongPick && 'border-red bg-red/5',
                'focus-within:ring-2 focus-within:ring-blue focus-within:ring-offset-2',
              )}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                className="sr-only"
                checked={selected === i}
                disabled={Boolean(result)}
                onChange={() => onSelect(i)}
              />
              <span
                aria-hidden
                className={cn(
                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                  selected === i ? 'border-blue bg-blue text-white' : 'border-line text-navy',
                )}
              >
                {i + 1}
              </span>
              <span className="flex-1 text-navy">
                <span className="sr-only">Option {LETTERS[i]}: </span>
                {opt}
                {result && result.optionExplanations?.[i] && (isCorrect || isWrongPick) && (
                  <span className="mt-1 block text-sm text-body">
                    {result.optionExplanations[i]}
                  </span>
                )}
              </span>
              {isCorrect && (
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-success"
                  aria-label="Correct answer"
                />
              )}
              {isWrongPick && (
                <XCircle className="h-5 w-5 shrink-0 text-red-dark" aria-label="Your answer" />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * /topics/:topicId/quiz (F5). Answers are collected one question per screen and graded only on
 * submit; the API never sends correct answers before that (B4). Then each result is reviewed
 * one per screen, followed by a summary.
 */
export function QuizPage() {
  const { topicId } = useParams();
  const isStudent = useSession((s) => s.user.role === 'student');
  const qc = useQueryClient();
  const topic = useTopicPage(topicId);
  const quiz = useQuery({
    queryKey: keys.quiz(topicId),
    queryFn: () => get(`/topics/${topicId}/quiz`, { query: { limit: 10 } }),
    staleTime: Infinity,
    gcTime: 0,
  });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState('answer'); // answer → review → summary

  const submit = useMutation({
    mutationFn: () =>
      post('/quiz/submit', {
        topicId,
        answers: quiz.data.questions.map((q) => ({
          questionId: q.id,
          selectedIndex: answers[q.id],
        })),
      }),
    onSuccess: () => {
      setPhase('review');
      setIndex(0);
      qc.invalidateQueries({ queryKey: ['subjects'] });
      qc.invalidateQueries({ queryKey: keys.progress });
      qc.invalidateQueries({ queryKey: keys.revision });
    },
  });

  const questions = quiz.data?.questions ?? [];
  const q = questions[index];
  const resultOf = new Map((submit.data?.results ?? []).map((r) => [r.questionId, r]));
  const result = phase === 'review' && q ? resultOf.get(q.id) : null;
  const last = index === questions.length - 1;
  const allAnswered = questions.every((x) => answers[x.id] !== undefined);

  const goNext = () => {
    if (phase === 'answer') {
      if (!last) setIndex(index + 1);
      else if (allAnswered && isStudent) submit.mutate();
    } else if (phase === 'review') {
      if (!last) setIndex(index + 1);
      else setPhase('summary');
    }
  };

  // Keyboard: 1–4 choose an option, Enter moves on (F5).
  useEffect(() => {
    const onKey = (e) => {
      if (!q || phase === 'summary' || e.altKey || e.ctrlKey || e.metaKey) return;
      if (
        e.target instanceof HTMLElement &&
        /^(TEXTAREA|INPUT)$/.test(e.target.tagName) &&
        e.target.type !== 'radio'
      )
        return;
      const n = Number(e.key);
      if (phase === 'answer' && n >= 1 && n <= q.options.length) {
        setAnswers((a) => ({ ...a, [q.id]: n - 1 }));
        e.preventDefault();
      } else if (e.key === 'Enter' && (phase === 'review' || answers[q.id] !== undefined)) {
        if (!(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          goNext();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const title = topic.data?.topic.title ?? 'Quiz';
  const backHref = `/topics/${topicId}`;

  if (quiz.isPending) {
    return (
      <Page>
        <LoadingBlock label="Loading the quiz" lines={5} />
      </Page>
    );
  }
  if (quiz.isError || questions.length === 0) {
    return (
      <Page>
        <EmptyState
          icon={FileQuestion}
          title={quiz.isError ? 'Could not load the quiz' : 'No quiz for this topic yet'}
          description={
            quiz.isError ? quiz.error.message : 'Your faculty has not published questions for it.'
          }
          action={
            <Button as={Link} to={backHref}>
              Back to the topic
            </Button>
          }
        />
      </Page>
    );
  }

  if (phase === 'summary') {
    const s = submit.data;
    const missed = s.results.filter((r) => !r.correct);
    const stem = new Map(questions.map((x) => [x.id, x.stem]));
    const m = s.mastery;
    return (
      <Page>
        <EyebrowHeading eyebrow="Quiz complete" title={title} level={1} />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Score"
            value={`${s.score}%`}
            hint={`${s.correct} of ${s.total} correct`}
            tone={s.score >= 80 ? 'gold' : 'default'}
          />
          <StatTile
            label="Mastery"
            value={m ? MASTERY_LABEL[m.after.state] : '–'}
            hint={
              m && m.before.state !== m.after.state
                ? `Was ${MASTERY_LABEL[m.before.state]}`
                : 'No change'
            }
          />
          <StatTile
            label="Added to revision"
            value={(s.enrolled?.flashcards ?? 0) + (s.enrolled?.questions ?? 0)}
            icon={Brain}
            hint="Flashcards and missed questions"
          />
        </div>
        {missed.length > 0 && (
          <Card className="mt-6">
            <h2 className="text-lg">Revise these</h2>
            <ul className="mt-3 space-y-2">
              {missed.map((r) => (
                <li key={r.questionId} className="rounded-xl border border-line p-3 text-sm">
                  <p className="font-semibold text-navy">{stem.get(r.questionId)}</p>
                  {r.explanation && <p className="mt-1">{r.explanation}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {missed.length > 0 ? (
            <Button as={Link} to="/revision" icon={Brain} className="hover:no-underline">
              Start revision
            </Button>
          ) : (
            <Button
              as={Link}
              to={`/learn/${topic.data?.topic.subject.id ?? ''}`}
              icon={ArrowRight}
              className="hover:no-underline"
            >
              Back to the map
            </Button>
          )}
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={() => {
              setAnswers({});
              setIndex(0);
              setPhase('answer');
              submit.reset();
              quiz.refetch();
            }}
          >
            Try another quiz
          </Button>
          <Button as={Link} to={backHref} variant="ghost" className="hover:no-underline">
            Back to the topic
          </Button>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mx-auto max-w-2xl">
        <Link
          to={backHref}
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> {title}
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="eyebrow">{phase === 'review' ? 'Review' : 'Practice quiz'}</p>
          {q.difficulty && <Badge>{q.difficulty}</Badge>}
        </div>
        <ProgressBar
          className="mt-3"
          value={((index + (phase === 'review' ? 1 : 0)) / questions.length) * 100}
          label={`Question ${index + 1} of ${questions.length}`}
        />
        <Card className="mt-5">
          <h1 className="text-lg sm:text-xl" aria-live="polite">
            {q.stem}
          </h1>
          <div className="mt-5">
            <Options
              question={q}
              selected={answers[q.id]}
              onSelect={(i) => setAnswers((a) => ({ ...a, [q.id]: i }))}
              result={result}
            />
          </div>
          {result && (
            <div
              role="status"
              className={cn(
                'mt-5 rounded-2xl p-4 text-sm',
                result.correct ? 'bg-success/10' : 'bg-red/5',
              )}
            >
              <p className={cn('font-bold', result.correct ? 'text-success' : 'text-red-dark')}>
                {result.correct ? 'Correct' : 'Not quite'}
              </p>
              {!result.correct && result.whyWrong && (
                <p className="mt-1">
                  <strong className="text-navy">Why your choice is wrong: </strong>
                  {result.whyWrong}
                </p>
              )}
              {result.explanation && <p className="mt-1">{result.explanation}</p>}
            </div>
          )}
          {!isStudent && phase === 'answer' && (
            <p className="mt-4 text-sm">Preview mode: only students can submit quizzes.</p>
          )}
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <Button
              variant="ghost"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
              icon={ArrowLeft}
            >
              Previous
            </Button>
            {phase === 'answer' && last ? (
              <Button
                onClick={goNext}
                disabled={!allAnswered || !isStudent}
                loading={submit.isPending}
                className={focusRing}
              >
                Submit quiz
              </Button>
            ) : (
              <Button
                variant={phase === 'review' && last ? 'primary' : 'navy'}
                onClick={goNext}
                disabled={phase === 'answer' && answers[q.id] === undefined}
                icon={ArrowRight}
              >
                {phase === 'review' && last ? 'See summary' : 'Next'}
              </Button>
            )}
          </div>
          {phase === 'answer' && (
            <p className="mt-3 text-xs">
              Tip: press 1–{q.options.length} to choose and Enter to continue.
            </p>
          )}
        </Card>
      </div>
    </Page>
  );
}

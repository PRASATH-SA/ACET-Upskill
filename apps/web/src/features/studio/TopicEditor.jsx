import { useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, FileUp, Sparkles, TriangleAlert } from 'lucide-react';
import { AI_DRAFT_KINDS } from '@acet/shared';
import { get } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EyebrowHeading,
  LoadingBlock,
  Select,
  Tabs,
  toast,
} from '../../components/ui';
import { aiOffline, skeys, useAiHealth, useMaterials, useStartJob, useUploadMaterial } from './api';
import { FlashcardsTab, QuestionsTab, ResourceTab } from './content/editors';
import { CodeChallengesTab } from './content/CodeChallengesTab';
import { JobProgress } from './JobProgress';
import { AiStatus } from './StudioHome';

const KIND_LABEL = {
  easy: 'Easy explanation',
  tenMark: 'Exam study material',
  flashcards: 'Flashcards (up to 15)',
  mcq: 'Quiz MCQs (10, self-checked)',
  curiosity: 'Curiosity question',
  realWorld: 'Real-world uses + workshop brief',
};
const INGEST_TONE = {
  queued: 'neutral',
  running: 'blue',
  done: 'green',
  failed: 'red',
  skipped: 'orange',
  notStarted: 'neutral',
};
const INGEST_LABEL = {
  queued: 'Queued',
  running: 'Reading…',
  done: 'Ready for AI',
  failed: 'Failed',
  skipped: 'Not readable',
  notStarted: 'Waiting',
};

function Materials({ topicId }) {
  const materials = useMaterials({ topicId });
  const upload = useUploadMaterial();
  const [kind, setKind] = useState('notes');
  const ref = useRef(null);
  return (
    <Card>
      <h2 className="text-lg">Notes and slides</h2>
      <p className="mt-1 text-sm">
        The AI drafts only from what you upload here (PDFs with selectable text).
      </p>
      {materials.isPending ? (
        <LoadingBlock className="mt-3" lines={2} />
      ) : (
        <ul className="mt-3 space-y-2">
          {(materials.data ?? []).map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate font-semibold text-navy">{m.fileName}</span>
              <span className="flex items-center gap-2">
                {m.chunkCount > 0 && <span className="text-xs">{m.chunkCount} chunks</span>}
                <Badge tone={INGEST_TONE[m.ingestStatus]} title={m.ingestError ?? m.warning}>
                  {INGEST_LABEL[m.ingestStatus] ?? m.ingestStatus}
                </Badge>
              </span>
              {m.warning && <p className="w-full text-xs text-warning-dark">{m.warning}</p>}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Select
          label="Type"
          className="w-36"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          options={[
            { value: 'notes', label: 'Notes' },
            { value: 'slides', label: 'Slides' },
          ]}
        />
        <input
          ref={ref}
          type="file"
          accept=".pdf,.pptx,image/*"
          className="sr-only"
          aria-label="Notes file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file)
              upload.mutate(
                { file, kind, topicId },
                {
                  onSuccess: (m) =>
                    m.warning
                      ? toast.info('Uploaded with a warning', m.warning)
                      : toast.success('Uploaded', 'Reading the file for the AI…'),
                },
              );
            e.target.value = '';
          }}
        />
        <Button
          variant="secondary"
          icon={FileUp}
          loading={upload.isPending}
          onClick={() => ref.current?.click()}
        >
          Upload
        </Button>
      </div>
    </Card>
  );
}

function DraftWithAi({ topicId }) {
  const [params, setParams] = useSearchParams();
  const jobId = params.get('job');
  const health = useAiHealth();
  const coverage = useQuery({
    queryKey: skeys.coverage(topicId),
    queryFn: () => get(`/ai/topics/${topicId}/coverage`),
    meta: { silent: true },
  });
  const start = useStartJob(`/ai/topics/${topicId}/draft-content`);
  const [kinds, setKinds] = useState([...AI_DRAFT_KINDS]);
  const offline = aiOffline(health);
  const toggle = (k) => setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));

  return (
    <Card>
      <h2 className="text-lg">Draft with AI</h2>
      <p className="mt-1 text-sm">Drafts are grounded in your notes and wait for your approval.</p>
      {coverage.data && !coverage.data.enough && (
        <p
          role="status"
          className="mt-3 flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-dark"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>Needs material.</strong> {coverage.data.reason}
          </span>
        </p>
      )}
      <fieldset className="mt-3 space-y-1">
        <legend className="sr-only">What to draft</legend>
        {AI_DRAFT_KINDS.map((k) => (
          <label key={k} className="flex min-h-[40px] items-center gap-3 text-sm text-navy">
            <input
              type="checkbox"
              className="h-4 w-4 accent-navy"
              checked={kinds.includes(k)}
              onChange={() => toggle(k)}
            />
            {KIND_LABEL[k]}
          </label>
        ))}
      </fieldset>
      <Button
        className="mt-3"
        variant="navy"
        icon={Sparkles}
        disabled={
          offline || !kinds.length || Boolean(jobId) || (coverage.data && !coverage.data.enough)
        }
        loading={start.isPending}
        onClick={() =>
          start.mutate({ kinds }, { onSuccess: (id) => setParams({ job: id }, { replace: true }) })
        }
      >
        {offline ? 'AI service offline' : 'Draft with AI'}
      </Button>
      {jobId && (
        <div className="mt-4">
          <JobProgress
            jobId={jobId}
            title="Drafting content"
            onClose={() => setParams({}, { replace: true })}
            renderResult={(job) =>
              job.output && (job.output.resources || job.output.flashcards) ? (
                <p className="mt-3 text-sm">
                  {job.output.resources?.length ?? 0} resources,{' '}
                  {job.output.flashcards?.length ?? 0} flashcards and{' '}
                  {job.output.questions?.length ?? 0} questions are waiting for review in the tabs
                  below.
                </p>
              ) : null
            }
          />
        </div>
      )}
    </Card>
  );
}

/** /studio/topics/:topicId — content per kind, uploads, and AI drafting (F6.3). */
export function TopicEditor() {
  const { topicId } = useParams();
  const [tab, setTab] = useState('easy');
  // The page endpoint returns the topic, subject and unit (staff may read draft topics too).
  const header = useQuery({
    queryKey: ['topics', topicId, 'page'],
    queryFn: () => get(`/topics/${topicId}/page`),
  });
  const t = header.data
    ? { topic: header.data.topic, subject: header.data.topic.subject, unit: header.data.topic.unit }
    : null;
  return (
    <Page wide>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {t && (
            <Link
              to={`/studio/subjects/${t.subject.id}`}
              className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> {t.subject.name}
            </Link>
          )}
          <EyebrowHeading
            eyebrow={t?.unit ? `Unit ${t.unit.number} · ${t.unit.title}` : 'Topic content'}
            title={t?.topic.title ?? 'Topic'}
            level={1}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AiStatus />
          <Button
            as={Link}
            to={`/topics/${topicId}`}
            variant="secondary"
            icon={Eye}
            className="hover:no-underline"
          >
            Preview as student
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Tabs
          label="Content kinds"
          value={tab}
          onChange={setTab}
          tabs={[
            {
              value: 'curiosity',
              label: 'Curiosity',
              content: (
                <ResourceTab topicId={topicId} kind="curiosity" label="Curiosity scenario" />
              ),
            },
            {
              value: 'video',
              label: 'Video',
              content: <ResourceTab topicId={topicId} kind="video" label="Video" />,
            },
            {
              value: 'easy',
              label: 'Easy',
              content: <ResourceTab topicId={topicId} kind="easy" label="Easy explanation" />,
            },
            {
              value: 'tenMark',
              label: 'Exam material',
              content: <ResourceTab topicId={topicId} kind="tenMark" label="Exam study material" />,
            },
            {
              value: 'flashcards',
              label: 'Flashcards',
              content: <FlashcardsTab topicId={topicId} />,
            },
            { value: 'questions', label: 'Quiz', content: <QuestionsTab topicId={topicId} /> },
            {
              value: 'code',
              label: 'Code lab',
              content: <CodeChallengesTab topicId={topicId} />,
            },
            {
              value: 'realWorld',
              label: 'Real world',
              content: <ResourceTab topicId={topicId} kind="realWorld" label="Real-world uses" />,
            },
            {
              value: 'workshop',
              label: 'Workshop',
              content: <ResourceTab topicId={topicId} kind="workshop" label="Workshop brief" />,
            },
          ]}
        />
        <div className="space-y-6">
          <Materials topicId={topicId} />
          <DraftWithAi topicId={topicId} />
        </div>
      </div>
    </Page>
  );
}

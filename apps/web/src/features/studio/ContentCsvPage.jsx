import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, FileSpreadsheet, FileUp, Layers } from 'lucide-react';
import { CONTENT_CSV_COLUMNS } from '@acet/shared';
import { ApiError, post } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import { QueryError } from '../../components/QueryError';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EyebrowHeading,
  LoadingBlock,
  toast,
} from '../../components/ui';
import { downloadAuthFile } from '../../hooks/useAuthFile';
import { useSession } from '../auth/session';
import { useSubjectMap } from '../student/api';

/** What each row type needs, shown as help next to the downloads. */
const ROW_TYPES = [
  ['curiosity', 'Lesson', 'body — the curiosity hook'],
  ['video', 'Lesson', 'url (YouTube or any link), title'],
  ['easy', 'Lesson', 'body — easy explanation (markdown)'],
  ['tenMark', 'Lesson', 'body — exam study material: notes for short and long answers (markdown)'],
  ['realWorld', 'Lesson', 'body — real-world uses'],
  ['workshop', 'Lesson', 'body — workshop brief'],
  ['curiosity_question', 'Quiz', 'question, option_a…, correct, explanation'],
  ['flashcard', 'Quiz', 'front, back'],
  ['mcq', 'Quiz', 'question, option_a…option_f, correct (A–F), explanation, why_a…, difficulty'],
];

const SUMMARY_LABEL = {
  created: 'added',
  updated: 'updated',
  unchanged: 'unchanged',
  skipped: 'blank rows skipped',
  published: 'published',
};

/** Upload one unit's CSV (or the whole subject's); shows every bad row if it is rejected. */
function UploadDialog({ open, subjectId, unit, onClose, onDownloadFormat }) {
  const user = useSession((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [publish, setPublish] = useState(false);
  const [result, setResult] = useState(null);
  const [rowErrors, setRowErrors] = useState(null);
  const canPublish = user.role === 'faculty';

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.set('file', file);
      const qs = new URLSearchParams();
      if (unit) qs.set('unitId', unit.id);
      if (publish) qs.set('publish', 'true');
      return post(`/subjects/${subjectId}/content-import?${qs}`, fd);
    },
    meta: { silent: true },
    onSuccess: (r) => {
      setResult(r);
      setRowErrors(null);
      qc.invalidateQueries({ queryKey: ['topics'] });
      qc.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.details?.errors) setRowErrors(err.details.errors);
      else toast.error('Upload failed', err.message);
    },
  });

  const close = () => {
    setFile(null);
    setResult(null);
    setRowErrors(null);
    setPublish(false);
    onClose();
  };
  const scope = unit ? `Unit ${unit.number} · ${unit.title}` : 'the whole subject';

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title={`Upload content & quiz CSV — ${scope}`}
      description="Rows are matched to topics by title. Existing items are updated, new ones are added; nothing is deleted."
    >
      {result ? (
        <div className="space-y-4">
          <p role="status" className="font-semibold text-navy">
            Imported into {scope}.
          </p>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(result.summary)
              .filter(([, n]) => n > 0)
              .map(([k, n]) => (
                <li key={k}>
                  <Badge tone={k === 'published' ? 'green' : k === 'created' ? 'blue' : 'neutral'}>
                    {n} {SUMMARY_LABEL[k] ?? k}
                  </Badge>
                </li>
              ))}
          </ul>
          {!publish && result.summary.created + result.summary.updated > 0 && (
            <p className="text-sm">
              New items are drafts. Publish them from the{' '}
              <Link to={`/studio/review?subjectId=${subjectId}`}>review queue</Link>.
            </p>
          )}
          <Button onClick={close}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Content CSV"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setRowErrors(null);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={FileUp} onClick={() => fileRef.current?.click()}>
                {file ? file.name : 'Choose CSV file'}
              </Button>
              <Button variant="ghost" icon={FileSpreadsheet} onClick={() => onDownloadFormat(unit)}>
                Download format
              </Button>
            </div>
            <p className="mt-2 text-xs">
              The format file has every topic of {scope} with a blank row for each lesson and quiz
              type, plus any content already there. Fill it in and upload it here.
            </p>
          </div>
          {canPublish && (
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm font-semibold text-navy">
              <input
                type="checkbox"
                className="h-5 w-5 accent-navy"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
              />
              Publish to students straight away (every quiz answer needs its why_ explanation)
            </label>
          )}
          {rowErrors && (
            <div role="alert" className="rounded-xl bg-red/5 p-3 text-sm text-red-dark">
              <p className="font-semibold">
                {rowErrors.length} row{rowErrors.length === 1 ? '' : 's'} need fixing. Nothing was
                imported.
              </p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                {rowErrors.map((e) => (
                  <li key={`${e.row}-${e.message}`}>
                    Row {e.row}
                    {e.topic ? ` (${e.topic})` : ''}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              icon={FileUp}
              disabled={!file}
              loading={upload.isPending}
              onClick={() => upload.mutate()}
            >
              Import
            </Button>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** /studio/subjects/:subjectId/content — content & quiz CSV per unit, whole subject in one file. */
export function ContentCsvPage() {
  const { subjectId } = useParams();
  const map = useSubjectMap(subjectId);
  const [uploadFor, setUploadFor] = useState(undefined); // undefined: closed; null: whole subject

  const download = async (query, label) => {
    try {
      const code = map.data?.subject.code?.replace(/[^\w-]+/g, '') ?? 'subject';
      await downloadAuthFile(
        `/subjects/${subjectId}/content.csv?${new URLSearchParams(query)}`,
        label(code),
      );
    } catch (err) {
      toast.error('Download failed', err.message);
    }
  };

  if (map.isPending)
    return (
      <Page>
        <LoadingBlock label="Loading the subject" lines={6} />
      </Page>
    );
  if (map.isError)
    return (
      <Page>
        <QueryError query={map} what="this subject" />
      </Page>
    );

  const { subject, units, topics } = map.data;
  const topicsOf = (unitId) => topics.filter((t) => t.unitId === unitId);

  return (
    <Page>
      <Button
        as={Link}
        to="/studio"
        variant="ghost"
        size="sm"
        icon={ArrowLeft}
        className="hover:no-underline"
      >
        Studio
      </Button>
      <EyebrowHeading
        className="mt-2"
        eyebrow={`${subject.code} · Content & quiz CSV`}
        title={subject.name}
        level={1}
      />
      <p className="mt-2 max-w-2xl">
        Write lesson content and quizzes in a spreadsheet, one row per item, separated by topic.
        Download a unit, fill it in or edit it, and upload it back.
      </p>

      <Card className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5" aria-hidden /> Whole subject
            </h2>
            <p className="mt-1 text-sm">
              All {units.length} units and {topics.length} topics in a single file, with quiz
              answers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={Download} onClick={() => download({}, (c) => `${c}-content.csv`)}>
              Download all content
            </Button>
            <Button
              variant="secondary"
              icon={FileSpreadsheet}
              onClick={() => download({ template: 'true' }, (c) => `${c}-content-template.csv`)}
            >
              Template
            </Button>
            <Button variant="secondary" icon={FileUp} onClick={() => setUploadFor(null)}>
              Upload
            </Button>
          </div>
        </div>
      </Card>

      <section className="mt-8" aria-labelledby="units-h">
        <h2 id="units-h">By unit</h2>
        {units.length === 0 ? (
          <p className="mt-3 text-sm">
            This subject has no units yet.{' '}
            <Link to={`/studio/subjects/${subjectId}`}>Build the map</Link> first; rows are matched
            to its topics.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {units.map((u) => {
              const list = topicsOf(u.id);
              return (
                <li key={u.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="eyebrow">Unit {u.number}</p>
                        <h3 className="mt-1 text-lg">{u.title}</h3>
                        <p className="mt-1 text-sm">
                          {list.length} topic{list.length === 1 ? '' : 's'}
                          {list.length > 0 && `: ${list.map((t) => t.title).join(', ')}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Download}
                          onClick={() =>
                            download({ unitId: u.id }, (c) => `${c}-unit-${u.number}-content.csv`)
                          }
                        >
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={FileSpreadsheet}
                          onClick={() =>
                            download(
                              { unitId: u.id, template: 'true' },
                              (c) => `${c}-unit-${u.number}-content-template.csv`,
                            )
                          }
                        >
                          Template
                        </Button>
                        <Button
                          size="sm"
                          icon={FileUp}
                          disabled={list.length === 0}
                          onClick={() => setUploadFor(u)}
                        >
                          Upload CSV
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Card className="mt-8">
        <h2 className="text-lg">How the file works</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>
            One row per item. <strong>unit</strong> and <strong>topic</strong> say where it goes;
            the topic must already be on the map.
          </li>
          <li>
            Rows with an <strong>id</strong> (from a download) update that item. Rows without one
            add a new item, or update the matching one (same type, flashcard front or question
            text).
          </li>
          <li>Blank template rows are skipped. Nothing is ever deleted by an upload.</li>
          <li>
            If any row is wrong, nothing is saved and every problem is listed with its row number.
          </li>
        </ul>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-navy">
                <th className="py-2 pr-3">type</th>
                <th className="py-2 pr-3">Step</th>
                <th className="py-2">Fill in</th>
              </tr>
            </thead>
            <tbody>
              {ROW_TYPES.map(([type, step, fill]) => (
                <tr key={type} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 font-mono text-xs text-navy">{type}</td>
                  <td className="py-2 pr-3">{step}</td>
                  <td className="py-2">{fill}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs">Columns: {CONTENT_CSV_COLUMNS.join(', ')}</p>
      </Card>

      <UploadDialog
        open={uploadFor !== undefined}
        subjectId={subjectId}
        unit={uploadFor ?? null}
        onClose={() => setUploadFor(undefined)}
        onDownloadFormat={(u) =>
          u
            ? download(
                { unitId: u.id, template: 'true' },
                (c) => `${c}-unit-${u.number}-content-template.csv`,
              )
            : download({ template: 'true' }, (c) => `${c}-content-template.csv`)
        }
      />
    </Page>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileDown, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { del, get, patch, post, put } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  EyebrowHeading,
  IconButton,
  Input,
  LoadingBlock,
  Select,
  Textarea,
  toast,
} from '../../components/ui';
import { downloadAuthFile } from '../../hooks/useAuthFile';
import { useSubjectMap, useSubjects } from '../student/api';
import { QueryError } from '../../components/QueryError';

const POS = [...Array.from({ length: 12 }, (_, i) => `PO${i + 1}`), 'PSO1', 'PSO2', 'PSO3'];

function CoForm({ initial, onSave, saving }) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [text, setText] = useState(initial?.text ?? '');
  const [levels, setLevels] = useState(() =>
    Object.fromEntries((initial?.poMappings ?? []).map((m) => [m.po, m.level])),
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <Input
          label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CO1"
        />
        <Textarea
          label="Statement"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-navy">
          PO / PSO correlation (1 low, 2 medium, 3 high)
        </legend>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {POS.map((po) => (
            <Select
              key={po}
              label={po}
              value={levels[po] ?? ''}
              onChange={(e) =>
                setLevels((l) => ({
                  ...l,
                  [po]: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              placeholder="–"
              options={[1, 2, 3].map((n) => ({ value: String(n), label: String(n) }))}
            />
          ))}
        </div>
      </fieldset>
      <Button
        variant="navy"
        loading={saving}
        disabled={!/^co\d{1,2}$/i.test(code.trim()) || text.trim().length < 5}
        onClick={() =>
          onSave({
            code: code.trim(),
            text: text.trim(),
            poMappings: Object.entries(levels)
              .filter(([, v]) => v)
              .map(([po, level]) => ({ po, level })),
          })
        }
      >
        Save outcome
      </Button>
    </div>
  );
}

function TopicMapping({ co, topics, onSave, saving }) {
  const [ids, setIds] = useState(co.topicIds ?? []);
  return (
    <div className="space-y-3">
      <div className="grid max-h-80 gap-1 overflow-y-auto sm:grid-cols-2">
        {topics.map((t) => (
          <label key={t.id} className="flex min-h-[40px] items-center gap-3 text-sm text-navy">
            <input
              type="checkbox"
              className="h-4 w-4 accent-navy"
              checked={ids.includes(t.id)}
              onChange={() =>
                setIds((x) => (x.includes(t.id) ? x.filter((y) => y !== t.id) : [...x, t.id]))
              }
            />
            {t.title}
          </label>
        ))}
      </div>
      <Button variant="navy" loading={saving} onClick={() => onSave(ids)}>
        Save mapping
      </Button>
    </div>
  );
}

/** /admin/co-po — CO mapping editor and the CO–PO attainment report with exports (F7.2, B5.5). */
export function CoPoPage() {
  const qc = useQueryClient();
  const subjects = useSubjects();
  const [subjectId, setSubjectId] = useState(null);
  const sid = subjectId ?? subjects.data?.[0]?.id ?? null;
  const map = useSubjectMap(sid);
  const [threshold, setThreshold] = useState('');
  const [coDialog, setCoDialog] = useState(null);
  const [mapDialog, setMapDialog] = useState(null);
  const cos = useQuery({
    queryKey: ['subjects', sid, 'cos'],
    queryFn: () => get(`/subjects/${sid}/course-outcomes`),
    enabled: Boolean(sid),
  });
  const report = useQuery({
    queryKey: ['subjects', sid, 'co-attainment', threshold],
    queryFn: () =>
      get(`/subjects/${sid}/co-attainment`, { query: { threshold: threshold || undefined } }),
    enabled: Boolean(sid),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['subjects', sid, 'cos'] });
    qc.invalidateQueries({ queryKey: ['subjects', sid, 'co-attainment'] });
  };
  const saveCo = useMutation({
    mutationFn: ({ id, body }) =>
      id ? patch(`/course-outcomes/${id}`, body) : post(`/subjects/${sid}/course-outcomes`, body),
    onSuccess: () => {
      toast.success('Course outcome saved');
      setCoDialog(null);
      refresh();
    },
  });
  const removeCo = useMutation({
    mutationFn: (id) => del(`/course-outcomes/${id}`),
    onSuccess: refresh,
  });
  const saveTopics = useMutation({
    mutationFn: ({ id, topicIds }) => put(`/course-outcomes/${id}/topics`, { topicIds }),
    onSuccess: () => {
      toast.success('Topics mapped');
      setMapDialog(null);
      refresh();
    },
  });
  const exportAs = async (format) => {
    try {
      const subject = subjects.data.find((s) => s.id === sid);
      await downloadAuthFile(
        `/subjects/${sid}/co-attainment/export?format=${format}${threshold ? `&threshold=${threshold}` : ''}`,
        `co-attainment-${subject?.code?.replace(/\s+/g, '') ?? 'subject'}.${format}`,
      );
    } catch (err) {
      toast.error('Export failed', err.message);
    }
  };

  return (
    <Page wide>
      <EyebrowHeading eyebrow="Accreditation" title="CO–PO attainment" level={1} />
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_200px] sm:items-end">
        <Select
          label="Subject"
          value={sid ?? ''}
          onChange={(e) => setSubjectId(e.target.value)}
          options={(subjects.data ?? []).map((s) => ({
            value: s.id,
            label: `${s.code} · ${s.name}`,
          }))}
        />
        <Input
          label="Attainment threshold %"
          type="number"
          min={1}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="Default"
        />
      </div>

      {!sid ? (
        <EmptyState
          className="mt-6"
          icon={Target}
          title="No subjects"
          description="Create subjects first."
        />
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg">Course outcomes</h2>
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setCoDialog({})}>
                Add CO
              </Button>
            </div>
            {cos.isPending ? (
              <LoadingBlock className="mt-3" />
            ) : cos.isError ? (
              <QueryError className="mt-3" query={cos} what="course outcomes" />
            ) : cos.data.length === 0 ? (
              <p className="mt-3 text-sm">No course outcomes yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {cos.data.map((co) => (
                  <li key={co.id} className="rounded-2xl border border-line p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm">
                        <strong className="text-navy">{co.code}</strong> {co.text}
                      </p>
                      <span className="flex shrink-0 gap-1">
                        <IconButton
                          icon={Pencil}
                          label={`Edit ${co.code}`}
                          onClick={() => setCoDialog(co)}
                        />
                        <IconButton
                          icon={Trash2}
                          label={`Delete ${co.code}`}
                          onClick={() => removeCo.mutate(co.id)}
                        />
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {(co.poMappings ?? []).map((m) => (
                        <Badge key={m.po} tone="navy">
                          {m.po}:{m.level}
                        </Badge>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => setMapDialog(co)}>
                        {co.topicIds.length} topic{co.topicIds.length === 1 ? '' : 's'} mapped ·
                        edit
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg">Attainment</h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={FileDown}
                  onClick={() => exportAs('csv')}
                >
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={FileDown}
                  onClick={() => exportAs('pdf')}
                >
                  PDF
                </Button>
              </div>
            </div>
            {report.isPending ? (
              <LoadingBlock className="mt-3" />
            ) : report.isError ? (
              <QueryError className="mt-3" query={report} what="the attainment report" />
            ) : (
              <>
                <p className="mt-1 text-sm">
                  Students scoring at least {report.data.threshold}% on a CO&apos;s topic quizzes
                  attain it.
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">CO attainment</caption>
                    <thead>
                      <tr className="border-b border-line text-xs uppercase tracking-wider text-navy">
                        <th scope="col" className="py-2 pr-3">
                          CO
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right">
                          Assessed
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right">
                          Attained
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right">
                          %
                        </th>
                        <th scope="col" className="py-2 text-right">
                          Level
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.data.cos.map((c) => (
                        <tr key={c.coId} className="border-b border-line">
                          <td className="py-2 pr-3 font-semibold text-navy">{c.code}</td>
                          <td className="py-2 pr-3 text-right">{c.studentsAssessed}</td>
                          <td className="py-2 pr-3 text-right">{c.studentsAttained}</td>
                          <td className="py-2 pr-3 text-right">{c.attainmentPercent ?? '–'}</td>
                          <td className="py-2 text-right">{c.level ?? '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {report.data.pos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {report.data.pos.map((p) => (
                      <Badge key={p.po} tone="gold">
                        {p.po}: {p.level}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      <Dialog
        open={Boolean(coDialog)}
        onClose={() => setCoDialog(null)}
        title={coDialog?.id ? `Edit ${coDialog.code}` : 'Add a course outcome'}
        size="lg"
      >
        {coDialog && (
          <CoForm
            key={coDialog.id ?? 'new'}
            initial={coDialog.id ? coDialog : null}
            saving={saveCo.isPending}
            onSave={(body) => saveCo.mutate({ id: coDialog.id, body })}
          />
        )}
      </Dialog>
      <Dialog
        open={Boolean(mapDialog)}
        onClose={() => setMapDialog(null)}
        title={`Topics for ${mapDialog?.code ?? ''}`}
        size="lg"
      >
        {mapDialog && (
          <TopicMapping
            key={mapDialog.id}
            co={mapDialog}
            topics={map.data?.topics ?? []}
            saving={saveTopics.isPending}
            onSave={(topicIds) => saveTopics.mutate({ id: mapDialog.id, topicIds })}
          />
        )}
      </Dialog>
    </Page>
  );
}

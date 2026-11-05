import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, CircleX, Cpu, RefreshCw } from 'lucide-react';
import { get, put } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  Select,
  StatTile,
  toast,
} from '../../components/ui';

function ModelPicker({ label, value, defaultModel, models, onSave, saving }) {
  const [choice, setChoice] = useState(value ?? '');
  return (
    <div className="space-y-2">
      <Select
        label={label}
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        placeholder={`Default from env (${defaultModel})`}
        options={models.map((m) => ({ value: m, label: m }))}
      />
      <Button
        size="sm"
        variant="navy"
        loading={saving}
        disabled={(choice || null) === (value || null)}
        onClick={() => onSave(choice || null)}
      >
        Use this model
      </Button>
    </div>
  );
}

/** /admin/ai — AI health, models, queue and failures, plus the runtime model picker (A5, F7). */
export function AiSettingsPage() {
  const qc = useQueryClient();
  const ai = useQuery({
    queryKey: ['admin', 'ai'],
    queryFn: () => get('/admin/ai'),
    refetchInterval: 15_000,
  });
  const save = useMutation({
    mutationFn: (body) => put('/admin/ai/settings', body),
    onSuccess: (r) => {
      toast.success(
        'Model changed',
        r.reembedJobId
          ? 'Existing notes are being re-embedded for the new embedding model.'
          : 'New AI jobs will use it.',
      );
      qc.invalidateQueries({ queryKey: ['admin', 'ai'] });
      qc.invalidateQueries({ queryKey: ['ai', 'health'] });
    },
  });

  if (ai.isPending) {
    return (
      <Page>
        <LoadingBlock lines={6} />
      </Page>
    );
  }
  if (ai.isError) {
    return (
      <Page>
        <EmptyState
          tone="error"
          title="Could not load AI settings"
          description={ai.error.message}
          action={<Button onClick={() => ai.refetch()}>Try again</Button>}
        />
      </Page>
    );
  }
  const { health, settings, queue, recentFailures } = ai.data;
  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <EyebrowHeading eyebrow="Admin" title="AI settings" level={1} />
        <Button variant="ghost" icon={RefreshCw} onClick={() => ai.refetch()}>
          Refresh
        </Button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Model server"
          value={health.reachable ? 'Online' : 'Offline'}
          icon={Bot}
          tone={health.reachable ? 'default' : 'navy'}
          hint={`${health.provider}${health.circuit?.open ? ' · circuit open' : ''}`}
        />
        <StatTile
          label="Jobs queued"
          value={queue.queued}
          icon={Cpu}
          hint={`${queue.running} running`}
        />
        <StatTile label="Recent failures" value={recentFailures.length} icon={CircleX} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg">Models</h2>
          {!health.reachable ? (
            <p className="mt-2 text-sm">
              The model server is offline, so the list of pulled models is unavailable. Start Ollama
              (or your OpenAI-compatible server) and refresh.
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              <ModelPicker
                key={`chat-${settings.overrides.chatModel}`}
                label="Chat / generation model"
                value={settings.overrides.chatModel}
                defaultModel={settings.defaults.chatModel}
                models={health.models}
                saving={save.isPending}
                onSave={(chatModel) => save.mutate({ chatModel })}
              />
              <ModelPicker
                key={`embed-${settings.overrides.embedModel}`}
                label="Embedding model"
                value={settings.overrides.embedModel}
                defaultModel={settings.defaults.embedModel}
                models={health.models}
                saving={save.isPending}
                onSave={(embedModel) => save.mutate({ embedModel })}
              />
              <p className="text-xs">
                Changes apply to new AI jobs without a restart. Changing the embedding model
                re-embeds all notes in the background; until then AI drafting waits for it.
              </p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4 text-sm">
            In use: <Badge tone="navy">{settings.chatModel}</Badge>
            <Badge tone="navy">{settings.embedModel}</Badge>
            {!health.modelsPulled && health.reachable && (
              <Badge tone="orange">A configured model is not pulled</Badge>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg">Recent failures</h2>
          {recentFailures.length === 0 ? (
            <p className="mt-2 text-sm">No failed AI jobs.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentFailures.map((f) => (
                <li key={f.id} className="rounded-2xl border border-line p-3 text-sm">
                  <p className="font-semibold text-navy">
                    {f.type}{' '}
                    <span className="font-normal text-xs">
                      {f.finishedAt ? new Date(f.finishedAt).toLocaleString('en-IN') : ''}
                    </span>
                  </p>
                  <p className="text-red-dark">{f.error?.message}</p>
                  {f.model && <p className="text-xs">Model: {f.model}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}

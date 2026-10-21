import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Code2, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingBlock,
  Select,
  Textarea,
} from '../../../components/ui';
import { useSession } from '../../auth/session';
import { useDeleteItem, useSaveItem, useTopicItems } from '../api';
import { ItemBadges, ItemStatusActions } from './ItemStatus';
import { MarkdownField } from './editors';

const TYPE = 'code-challenges';
const DIFFICULTY_TONE = { easy: 'green', medium: 'orange', hard: 'red' };

const blank = () => ({
  title: '',
  difficulty: 'easy',
  prompt: '',
  setupSql: '',
  hiddenSql: '',
  starterCode: '',
  solution: '',
  checkSql: '',
  orderMatters: false,
  hints: [],
});

function SqlField({ label, hint, value, onChange, rows = 6 }) {
  return (
    <Textarea
      label={label}
      hint={hint}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-mono"
      spellCheck={false}
    />
  );
}

/**
 * Authoring form for one code-lab problem. The API runs the solution against the sample and
 * hidden data before saving, so a broken problem never reaches students.
 */
function ChallengeForm({ initial, onSubmit, saving, onCancel }) {
  const [c, setC] = useState(() => ({ ...blank(), ...initial }));
  const set = (patch) => setC((x) => ({ ...x, ...patch }));
  const valid =
    c.title.trim().length >= 3 &&
    c.prompt.trim().length >= 10 &&
    c.setupSql.trim() &&
    c.solution.trim();
  return (
    <Card tone="surface" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <Input
          label="Title"
          value={c.title}
          onChange={(e) => set({ title: e.target.value })}
          maxLength={120}
        />
        <Select
          label="Difficulty"
          value={c.difficulty}
          onChange={(e) => set({ difficulty: e.target.value })}
          options={['easy', 'medium', 'hard'].map((d) => ({ value: d, label: d }))}
        />
      </div>
      <MarkdownField
        label="Problem statement (students see this)"
        value={c.prompt}
        onChange={(prompt) => set({ prompt })}
        rows={6}
      />
      <SqlField
        label="Tables and sample rows"
        hint="CREATE TABLE … and INSERT …. Students see these tables and every Run uses them."
        value={c.setupSql}
        onChange={(setupSql) => set({ setupSql })}
        rows={10}
      />
      <SqlField
        label="Hidden test rows (optional)"
        hint="Extra INSERTs used only when grading, so hard-coded answers fail. Never shown to students."
        value={c.hiddenSql}
        onChange={(hiddenSql) => set({ hiddenSql })}
        rows={4}
      />
      <SqlField
        label="Starter code"
        value={c.starterCode}
        onChange={(starterCode) => set({ starterCode })}
        rows={4}
      />
      <SqlField
        label="Reference solution (hidden)"
        hint="Students' output is compared with this query's output by value; column names don't matter."
        value={c.solution}
        onChange={(solution) => set({ solution })}
        rows={4}
      />
      <SqlField
        label="Check query (optional)"
        hint="For tasks that change data or schema (UPDATE, CREATE INDEX…): this query's output is compared instead."
        value={c.checkSql}
        onChange={(checkSql) => set({ checkSql })}
        rows={3}
      />
      <Textarea
        label="Hints (one per line, up to 5)"
        rows={3}
        value={c.hints.join('\n')}
        onChange={(e) => set({ hints: e.target.value.split('\n').slice(0, 5) })}
      />
      <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-navy">
        <input
          type="checkbox"
          className="h-5 w-5 accent-navy"
          checked={c.orderMatters}
          onChange={(e) => set({ orderMatters: e.target.checked })}
        />
        Row order matters (the task asks for ORDER BY)
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!valid}
          loading={saving}
          onClick={() => onSubmit({ ...c, hints: c.hints.map((h) => h.trim()).filter(Boolean) })}
        >
          Save draft
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}

const editable = (c) => ({
  title: c.title,
  difficulty: c.difficulty,
  prompt: c.prompt,
  setupSql: c.setupSql,
  hiddenSql: c.hiddenSql ?? '',
  starterCode: c.starterCode ?? '',
  solution: c.solution,
  checkSql: c.checkSql ?? '',
  orderMatters: Boolean(c.orderMatters),
  hints: c.hints ?? [],
});

/** Studio tab: the topic's code-lab problems with the usual draft → publish review. */
export function CodeChallengesTab({ topicId }) {
  const items = useTopicItems(topicId, TYPE);
  const save = useSaveItem();
  const remove = useDeleteItem();
  const canApprove = useSession((s) => s.user.role === 'faculty');
  const [editing, setEditing] = useState(null); // item id | 'new' | null

  if (items.isPending) return <LoadingBlock />;
  const list = items.data ?? [];
  return (
    <div className="space-y-3">
      <p className="text-sm">
        LeetCode-style SQL problems. Students run queries on the sample rows and submit for grading
        against your solution and the hidden rows.
      </p>
      {list.length === 0 && editing !== 'new' && (
        <EmptyState
          icon={Code2}
          title="No code problems yet"
          description="Add a problem with a small table, a question and your reference query."
        />
      )}
      {list.map((c) =>
        editing === c.id ? (
          <ChallengeForm
            key={c.id}
            initial={editable(c)}
            saving={save.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={(body) =>
              save.mutate({ type: TYPE, id: c.id, body }, { onSuccess: () => setEditing(null) })
            }
          />
        ) : (
          <Card key={c.id} padded={false} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-navy">
                  {c.title}
                  <Badge tone={DIFFICULTY_TONE[c.difficulty]}>{c.difficulty}</Badge>
                </p>
                <p className="mt-1 line-clamp-2 text-sm">{c.prompt}</p>
              </div>
              <ItemBadges item={c} />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2">
              <ItemStatusActions type={TYPE} item={c} canApprove={canApprove} />
              <div className="flex flex-wrap gap-1">
                <Button
                  as={Link}
                  to={`/code/${c.id}`}
                  size="sm"
                  variant="ghost"
                  icon={Eye}
                  className="hover:no-underline"
                >
                  Try it
                </Button>
                <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(c.id)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => remove.mutate({ type: TYPE, id: c.id })}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ),
      )}
      {editing === 'new' ? (
        <ChallengeForm
          saving={save.isPending}
          onCancel={() => setEditing(null)}
          onSubmit={(body) =>
            save.mutate({ type: TYPE, topicId, body }, { onSuccess: () => setEditing(null) })
          }
        />
      ) : (
        <Button variant="secondary" icon={Plus} onClick={() => setEditing('new')}>
          Add a code problem
        </Button>
      )}
    </div>
  );
}

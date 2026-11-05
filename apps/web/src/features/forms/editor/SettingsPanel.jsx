import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X } from 'lucide-react';
import { SEMESTERS, YEARS_OF_STUDY } from '@acet/shared';
import { del, errorMessage, post } from '../../../api/client';
import {
  Badge,
  Button,
  Card,
  Chip,
  EyebrowHeading,
  IconButton,
  Input,
  Textarea,
  toast,
} from '../../../components/ui';
import { useSession } from '../../auth/session';
import { useDepartments } from '../../admin/lookups';
import { fkeys } from '../api';
import { Toggle, fromLocalInput, toLocalInput } from '../common';

const ROMAN = ['I', 'II', 'III', 'IV'];
const toggleIn = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Section({ eyebrow, title, children }) {
  return (
    <Card className="space-y-1">
      <EyebrowHeading eyebrow={eyebrow} title={title} level={3} />
      <div className="divide-y divide-line">{children}</div>
    </Card>
  );
}

function ChipGroup({ label, options, values, onChange, disabled }) {
  return (
    <div className="py-3">
      <p className="mb-1.5 text-sm font-semibold text-navy">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        <Chip selected={!values.length} onClick={() => !disabled && onChange([])}>
          Any
        </Chip>
        {options.map((o) => (
          <Chip
            key={o.value}
            selected={values.includes(o.value)}
            onClick={() => !disabled && onChange(toggleIn(values, o.value))}
          >
            {o.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Audience({ audience, onChange }) {
  const user = useSession((s) => s.user);
  const depts = useDepartments();
  const [batch, setBatch] = useState('');
  const hod = user.role === 'admin';
  const set = (patch) => onChange({ ...audience, ...patch });
  return (
    <Section eyebrow="Who gets it" title="Audience">
      <p className="pb-2 text-sm">
        Students who match every choice below see the form on their Forms page and get a
        notification when you publish. “Any” means no limit.
      </p>
      {hod ? (
        <div className="py-3">
          <p className="text-sm font-semibold text-navy">Department</p>
          <p className="text-sm">
            {depts.data?.find((d) => d.id === user.departmentId)?.name ?? 'Your department'} (HOD
            forms stay in your department)
          </p>
        </div>
      ) : (
        <ChipGroup
          label="Departments"
          options={(depts.data ?? []).map((d) => ({ value: d.id, label: d.code ?? d.name }))}
          values={audience.departmentIds}
          onChange={(departmentIds) => set({ departmentIds })}
        />
      )}
      <ChipGroup
        label="Year of study"
        options={YEARS_OF_STUDY.map((y) => ({ value: y, label: `Year ${ROMAN[y - 1]}` }))}
        values={audience.yearsOfStudy}
        onChange={(yearsOfStudy) => set({ yearsOfStudy })}
      />
      <ChipGroup
        label="Semester"
        options={SEMESTERS.map((s) => ({ value: s, label: `Sem ${s}` }))}
        values={audience.semesters}
        onChange={(semesters) => set({ semesters })}
      />
      <div className="py-3">
        <p className="mb-1.5 text-sm font-semibold text-navy">Batches</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {audience.batches.length === 0 && <Badge>Any batch</Badge>}
          {audience.batches.map((b) => (
            <Chip
              key={b}
              selected
              onClick={() => set({ batches: audience.batches.filter((x) => x !== b) })}
              icon={X}
            >
              {b}
            </Chip>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const b = batch.trim();
            if (b && !audience.batches.includes(b)) set({ batches: [...audience.batches, b] });
            setBatch('');
          }}
        >
          <Input
            label="Add batch"
            hideLabel
            placeholder="e.g. 2023-27"
            className="flex-1"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="md">
            Add
          </Button>
        </form>
      </div>
    </Section>
  );
}

function Collaborators({ form }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const refresh = (data) =>
    qc.setQueryData(fkeys.form(form.id), (old) => ({ ...old, collaborators: data.collaborators }));
  const add = useMutation({
    mutationFn: () => post(`/forms/${form.id}/collaborators`, { email }),
    onSuccess: (data) => {
      refresh(data);
      setEmail('');
      toast.success('Collaborator added');
    },
    onError: (e) => toast.error('Could not add', errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id) => del(`/forms/${form.id}/collaborators/${id}`),
    onSuccess: refresh,
  });
  return (
    <Section eyebrow="Team" title="Collaborators">
      <p className="pb-2 text-sm">
        Faculty and HODs you add can edit the form and see its responses.
        {form.owner && ` Owner: ${form.owner.name}.`}
      </p>
      <ul className="py-2">
        {form.collaborators.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-1">
            <span className="text-sm text-navy">
              {c.name} <span className="text-xs text-body">{c.email}</span>
            </span>
            <IconButton icon={X} label={`Remove ${c.name}`} onClick={() => remove.mutate(c.id)} />
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) add.mutate();
        }}
      >
        <Input
          label="Colleague's email"
          hideLabel
          type="email"
          placeholder="colleague@acet.edu.in"
          className="flex-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" variant="secondary" icon={UserPlus} loading={add.isPending}>
          Add
        </Button>
      </form>
    </Section>
  );
}

/** Settings tab: responses, quiz, presentation, audience and collaborators. */
export function SettingsPanel({ form, draft, onChange }) {
  const s = draft.settings;
  const set = (patch) => onChange({ ...draft, settings: { ...s, ...patch } });
  return (
    <div className="space-y-4">
      <Section eyebrow="Responses" title="Collecting answers">
        <Toggle
          label="Accepting responses"
          hint="Turn off to close the form now."
          checked={s.acceptingResponses}
          onChange={(acceptingResponses) => set({ acceptingResponses })}
        />
        <div className="grid gap-3 py-3 sm:grid-cols-2">
          <Input
            label="Opens at (optional)"
            type="datetime-local"
            value={toLocalInput(s.opensAt)}
            onChange={(e) => set({ opensAt: fromLocalInput(e.target.value) })}
          />
          <Input
            label="Closes at (optional)"
            type="datetime-local"
            value={toLocalInput(s.closesAt)}
            onChange={(e) => set({ closesAt: fromLocalInput(e.target.value) })}
          />
          <Input
            label="Maximum responses (optional)"
            type="number"
            min={1}
            value={s.maxResponses ?? ''}
            onChange={(e) => set({ maxResponses: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <Toggle
          label="Limit to 1 response"
          hint="Each student can respond once."
          checked={s.limitOneResponse}
          onChange={(limitOneResponse) => set({ limitOneResponse })}
        />
        <Toggle
          label="Allow response editing"
          hint="Students can change their answers until the form closes."
          checked={s.allowEdit}
          onChange={(allowEdit) => set({ allowEdit })}
        />
        <Toggle
          label="Anonymous responses"
          hint="You see answers without names or emails (e.g. course feedback)."
          checked={s.anonymous}
          onChange={(anonymous) => set({ anonymous })}
        />
        <Toggle
          label="Show results summary to respondents"
          hint="After submitting, students can see the summary charts."
          checked={s.showSummaryToRespondents}
          onChange={(showSummaryToRespondents) => set({ showSummaryToRespondents })}
        />
      </Section>

      <Section eyebrow="Quiz" title="Make this a quiz">
        <Toggle
          label="Make this a quiz"
          hint="Give questions points and an answer key; scores are worked out automatically."
          checked={s.isQuiz}
          onChange={(isQuiz) => set({ isQuiz })}
        />
        {s.isQuiz && (
          <>
            <div className="py-3">
              <p className="mb-1.5 text-sm font-semibold text-navy">Release marks</p>
              <div className="flex flex-wrap gap-2">
                <Chip
                  selected={s.releaseScore === 'immediately'}
                  onClick={() => set({ releaseScore: 'immediately' })}
                >
                  Immediately after each submission
                </Chip>
                <Chip
                  selected={s.releaseScore === 'later'}
                  onClick={() => set({ releaseScore: 'later' })}
                >
                  Later, after manual review
                </Chip>
              </div>
            </div>
            <Toggle
              label="Missed questions"
              hint="Students see which questions they got wrong."
              checked={s.showMissedQuestions}
              onChange={(showMissedQuestions) => set({ showMissedQuestions })}
            />
            <Toggle
              label="Correct answers"
              hint="Students see the correct answers once marks are released."
              checked={s.showCorrectAnswers}
              onChange={(showCorrectAnswers) => set({ showCorrectAnswers })}
            />
            <Toggle
              label="Point values"
              hint="Students see how many points each question is worth."
              checked={s.showPointValues}
              onChange={(showPointValues) => set({ showPointValues })}
            />
          </>
        )}
      </Section>

      <Section eyebrow="Presentation" title="How it looks">
        <Toggle
          label="Show progress bar"
          checked={s.showProgressBar}
          onChange={(showProgressBar) => set({ showProgressBar })}
        />
        <Toggle
          label="Shuffle question order"
          hint="Each student sees the questions of a section in a different order."
          checked={s.shuffleQuestions}
          onChange={(shuffleQuestions) => set({ shuffleQuestions })}
        />
        <div className="pt-3">
          <Textarea
            label="Confirmation message"
            rows={2}
            value={s.confirmationMessage}
            onChange={(e) => set({ confirmationMessage: e.target.value })}
          />
        </div>
      </Section>

      <Audience
        audience={draft.audience}
        onChange={(audience) => onChange({ ...draft, audience })}
      />
      <Collaborators form={form} />
    </div>
  );
}

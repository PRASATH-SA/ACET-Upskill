import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Paperclip } from 'lucide-react';
import { get, post } from '../../../api/client';
import { Markdown } from '../../../components/Markdown';
import { Badge, Button, Textarea, toast } from '../../../components/ui';
import { useSession } from '../../auth/session';

const fmtDate = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const ACCEPT = '.pdf,.docx,.pptx,.png,.jpg,.jpeg';

function SubmissionForm({ workshop, existing }) {
  const qc = useQueryClient();
  const [text, setText] = useState(existing?.text ?? '');
  const [file, setFile] = useState(null);
  const submit = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      if (text.trim()) fd.set('text', text.trim());
      if (file) fd.set('file', file);
      return post(`/workshops/${workshop.id}/submissions`, fd);
    },
    onSuccess: () => {
      toast.success('Workshop submitted', 'Your faculty will review it.');
      setFile(null);
      qc.invalidateQueries({ queryKey: ['me', 'submissions'] });
    },
  });

  if (existing?.gradedAt) {
    return (
      <div className="rounded-2xl border border-gold-border bg-gold-tint p-4" role="status">
        <p className="flex items-center gap-2 font-semibold text-navy">
          <CheckCircle2 className="h-5 w-5" aria-hidden /> Graded: {existing.score}/100
        </p>
        {existing.feedback && <p className="mt-1 text-sm">{existing.feedback}</p>}
      </div>
    );
  }
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      {existing && (
        <p className="text-sm" role="status">
          Submitted {fmtDate(existing.submittedAt)}
          {existing.late && ' (late)'}. You can replace it until it is graded.
        </p>
      )}
      <Textarea
        label="Your answer"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div>
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-navy hover:border-navy focus-within:ring-2 focus-within:ring-blue">
          <Paperclip className="h-4 w-4" aria-hidden />
          {file ? file.name : 'Attach a file (PDF, DOCX, PPTX, image)'}
          <input
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <Button
        type="submit"
        variant="navy"
        loading={submit.isPending}
        disabled={!text.trim() && !file}
      >
        {existing ? 'Replace submission' : 'Submit workshop'}
      </Button>
    </form>
  );
}

/** Apply step: the workshop brief and, for students, the submission form (B5). */
export function Workshops({ brief, workshops }) {
  const isStudent = useSession((s) => s.user.role === 'student');
  const mine = useQuery({
    queryKey: ['me', 'submissions'],
    queryFn: () => get('/me/submissions'),
    enabled: isStudent,
  });
  const byWorkshop = new Map((mine.data ?? []).map((s) => [String(s.workshopId), s]));

  return (
    <div className="space-y-5">
      {brief?.body && (
        <div>
          <h3>Workshop brief</h3>
          <Markdown className="mt-2">{brief.body}</Markdown>
        </div>
      )}
      {(workshops ?? []).map((w) => (
        <div key={w.id} className="rounded-2xl border border-line p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3>Workshop task</h3>
            <Badge tone={new Date(w.dueAt) < new Date() ? 'red' : 'blue'} icon={CalendarClock}>
              Due {fmtDate(w.dueAt)}
            </Badge>
          </div>
          <Markdown className="mt-2">{w.brief}</Markdown>
          {isStudent && (
            <div className="mt-4 border-t border-line pt-4">
              <SubmissionForm workshop={w} existing={byWorkshop.get(w.id)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

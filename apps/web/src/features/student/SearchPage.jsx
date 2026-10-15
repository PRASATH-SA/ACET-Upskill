import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Search } from 'lucide-react';
import { Page } from '../../components/layout/AppShell';
import { Button, EmptyState, EyebrowHeading, Input, LoadingBlock } from '../../components/ui';
import { useSession } from '../auth/session';
import { useSearch } from './api';

/** Where a topic result opens for each role. */
function topicHref(role, t) {
  if (role === 'student') return `/learn/${t.subjectId}?topic=${t.id}`;
  if (role === 'faculty' || role === 'admin') return `/studio/topics/${t.id}`;
  return `/learn/${t.subjectId}?topic=${t.id}`;
}

function subjectHref(role, s) {
  if (role === 'faculty' || role === 'admin') return `/studio/subjects/${s.id}`;
  return `/learn/${s.id}`;
}

/** /search?q= — subjects and topics the signed-in user can open. */
export function SearchPage() {
  const role = useSession((s) => s.user.role);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [draft, setDraft] = useState(q);
  const results = useSearch(q);

  return (
    <Page>
      <EyebrowHeading
        eyebrow="Search"
        title={q ? `Results for “${q}”` : 'Search topics'}
        level={1}
      />
      <form
        role="search"
        className="mt-5 flex max-w-xl gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setParams(draft.trim() ? { q: draft.trim() } : {});
        }}
      >
        <Input
          label="Search"
          hideLabel
          type="search"
          className="flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. normalization"
          autoFocus
        />
        <Button type="submit" icon={Search}>
          Search
        </Button>
      </form>

      <div className="mt-6" aria-live="polite">
        {!q ? null : results.isPending ? (
          <LoadingBlock label="Searching" />
        ) : results.data.topics.length + results.data.subjects.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nothing found"
            description="Try a shorter word, or browse the subject maps."
            action={
              <Button as={Link} to="/">
                Go to my home
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {results.data.subjects.length > 0 && (
              <section aria-labelledby="sr-subjects">
                <h2 id="sr-subjects" className="text-lg">
                  Subjects
                </h2>
                <ul className="mt-3 space-y-2">
                  {results.data.subjects.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={subjectHref(role, s)}
                        className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-line bg-card p-4 hover:border-blue hover:no-underline"
                      >
                        <BookOpen className="h-5 w-5 text-navy" aria-hidden />
                        <span>
                          <span className="block font-semibold text-navy">{s.name}</span>
                          <span className="block text-xs">
                            {s.code} · Semester {s.semester}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="sr-topics">
              <h2 id="sr-topics" className="text-lg">
                Topics
              </h2>
              <ul className="mt-3 space-y-2">
                {results.data.topics.map((t) => (
                  <li key={t.id}>
                    <Link
                      to={topicHref(role, t)}
                      className="block min-h-[44px] rounded-2xl border border-line bg-card p-4 hover:border-blue hover:no-underline"
                    >
                      <span className="block font-semibold text-navy">{t.title}</span>
                      <span className="block text-xs">
                        {t.subjectCode} · {t.subjectName}
                      </span>
                      {t.summary && (
                        <span className="mt-1 block text-sm text-body">{t.summary}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </Page>
  );
}

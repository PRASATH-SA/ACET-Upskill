import { useCallback, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { List, ListTree, Map as MapIcon, Route, Search, Trophy } from 'lucide-react';
import { ApiError } from '../../api/client';
import {
  Button,
  Card,
  Drawer,
  EmptyState,
  IconButton,
  LoadingBlock,
  Select,
} from '../../components/ui';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../lib/cn';
import { useSession } from '../auth/session';
import { useExamPrep, useMyMap, useProgress, useSubjectMap, useSubjects } from './api';
import { ConceptMap, Legend } from './map/ConceptMap';
import { learningOrderIds } from './map/graph';
import { MapListView } from './map/MapListView';
import { RoadmapView } from './map/RoadmapView';
import { SubjectTree } from './map/SubjectTree';
import { TopicPanel } from './map/TopicPanel';

const EXAM_YEARS = 5;

const VIEWS = [
  ['path', 'Path', Route],
  ['map', 'Map', MapIcon],
  ['list', 'List', List],
];

function MapSearch({ topics, onFound }) {
  const [q, setQ] = useState('');
  const [miss, setMiss] = useState(false);
  return (
    <form
      role="search"
      className="relative min-w-0 flex-1 sm:max-w-xs"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim().toLowerCase();
        if (!term) return;
        const hit =
          topics.find((t) => t.title.toLowerCase() === term) ??
          topics.find((t) => t.title.toLowerCase().includes(term));
        setMiss(!hit);
        if (hit) onFound(hit.id);
      }}
    >
      <label htmlFor="map-search" className="sr-only">
        Find a topic on this map
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy"
        aria-hidden
      />
      <input
        id="map-search"
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setMiss(false);
        }}
        placeholder="Find a topic"
        aria-invalid={miss || undefined}
        aria-describedby={miss ? 'map-search-miss' : undefined}
        className="min-h-[44px] w-full rounded-full border border-line bg-card pl-10 pr-4 text-sm text-navy focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30"
      />
      {miss && (
        <p
          id="map-search-miss"
          role="status"
          className="absolute left-4 top-full mt-1 text-xs font-semibold text-red-dark"
        >
          No topic matches “{q}”.
        </p>
      )}
    </form>
  );
}

/** /learn/:subjectId — tree, concept map and selected-topic panel (F3). */
export function SubjectMapPage() {
  const { subjectId } = useParams();
  const user = useSession((s) => s.user);
  const isStudent = user.role === 'student';
  // Below lg the tree and panel move into a drawer and a bottom sheet.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [params, setParams] = useSearchParams();
  // Students start on the learning path; staff start on the concept map they build.
  const defaultView = isStudent ? 'path' : 'map';
  const view = VIEWS.some(([v]) => v === params.get('view')) ? params.get('view') : defaultView;

  const subjects = useSubjects();
  const map = useSubjectMap(subjectId);
  const me = useMyMap(subjectId, isStudent);
  const progress = useProgress(isStudent);
  const exam = useExamPrep(subjectId, { years: EXAM_YEARS });

  const [selected, setSelected] = useState(params.get('topic'));
  const [unitId, setUnitId] = useState(params.get('unit'));
  const [highlightId, setHighlightId] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const order = useMemo(
    () => (map.data ? learningOrderIds(map.data, me.data) : []),
    [map.data, me.data],
  );
  const currentId = me.data?.currentTopicId ?? null;
  const selectedId = selected ?? currentId ?? order[0] ?? null;
  const nodeOf = useMemo(
    () => new Map((me.data?.nodes ?? []).map((n) => [n.topicId, n])),
    [me.data],
  );
  const freqOf = useMemo(
    () => new Map((exam.data?.topics ?? []).map((t) => [t.topicId, t.frequency])),
    [exam.data],
  );

  const select = useCallback(
    (id) => {
      setSelected(id);
      setFocusRequest({ id, at: Date.now() });
      if (!isDesktop) setSheetOpen(true);
    },
    [isDesktop],
  );
  const setView = (v) => {
    const next = new URLSearchParams(params);
    if (v === defaultView) next.delete('view');
    else next.set('view', v);
    setParams(next, { replace: true });
  };

  if (map.isError) {
    const forbidden = map.error instanceof ApiError && [403, 404].includes(map.error.status);
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={MapIcon}
          tone={forbidden ? 'default' : 'error'}
          title={forbidden ? 'This subject is not available to you' : 'Could not load the map'}
          description={forbidden ? 'It may belong to another syllabus version.' : map.error.message}
          action={
            forbidden ? (
              <Button as={Link} to="/learn">
                Back to my subjects
              </Button>
            ) : (
              <Button onClick={() => map.refetch()}>Try again</Button>
            )
          }
        />
      </div>
    );
  }
  if (map.isPending || (isStudent && me.isPending)) {
    return (
      <div className="p-6">
        <LoadingBlock label="Loading the concept map" lines={6} />
      </div>
    );
  }

  const m = map.data;
  if (m.topics.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={MapIcon}
          title="This map isn't ready yet"
          description="Your faculty is still building it. Explore another subject meanwhile."
          action={
            <Button as={Link} to="/learn">
              Back to my subjects
            </Button>
          }
        />
      </div>
    );
  }

  const tree = (
    <SubjectTree
      subjects={subjects.data ?? []}
      progress={progress.data}
      currentSubjectId={subjectId}
      units={m.units}
      unitId={unitId}
      onUnit={(id) => {
        setUnitId(id);
        setTreeOpen(false);
      }}
    />
  );
  const panel = (
    <TopicPanel
      map={m}
      node={nodeOf.get(selectedId)}
      topicId={selectedId}
      examFrequency={exam.data ? (freqOf.get(selectedId) ?? 0) : undefined}
      years={EXAM_YEARS}
      onSelect={select}
    />
  );

  return (
    // Negative margins cancel the shell's bottom padding so the map fills the screen exactly.
    <div className="-mb-28 flex h-[calc(100dvh-66px-80px)] flex-col md:-mb-10 md:h-[calc(100dvh-66px)] lg:grid lg:grid-cols-[260px_minmax(0,1fr)_360px]">
      <aside className="hidden overflow-y-auto border-r border-line bg-card p-4 lg:block">
        {tree}
      </aside>

      <section aria-labelledby="map-title" className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Gamified progress bar */}
        {isStudent && me.data && (
          <div className="border-b border-line bg-white/50 px-3 py-3 backdrop-blur-md sm:px-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="eyebrow tracking-[0.2em]">Progress</p>
              <p className="inline-flex items-center gap-1 text-xs font-bold text-navy">
                <Trophy className="h-3.5 w-3.5 text-gold-border" aria-hidden />
                {me.data.nodes.filter((n) => n.state === 'mastered').length} / {m.topics.length}{' '}
                mastered
              </p>
            </div>
            {/* One segment per topic, in the A.8 map-node colours. */}
            <div className="flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden>
              {m.topics.map((t) => {
                const node = me.data.nodes.find((n) => n.topicId === t.id);
                const state = node?.state ?? 'locked';
                const colorClass =
                  state === 'mastered' || state === 'needsRevision'
                    ? 'bg-gold'
                    : state === 'current'
                      ? 'bg-blue shine'
                      : state === 'locked'
                        ? 'bg-navy/10'
                        : 'bg-blue/30';
                return (
                  <div
                    key={t.id}
                    className={`flex-1 rounded-full transition-colors duration-300 ${colorClass}`}
                    title={t.title}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-line bg-card px-3 py-2 sm:px-4 sm:py-3">
          <IconButton
            icon={ListTree}
            label="Subjects and units"
            className="lg:hidden"
            onClick={() => setTreeOpen(true)}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">
              {m.subject.code} · Semester {m.subject.semester}
            </p>
            <h1 id="map-title" className="truncate text-lg sm:text-xl">
              <Link to={`/subjects/${subjectId}`} className="text-navy hover:underline">
                {m.subject.name}
              </Link>
            </h1>
          </div>
          <div role="group" aria-label="View" className="glass flex rounded-full p-1">
            {VIEWS.map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'inline-flex min-h-[40px] min-w-[44px] items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold',
                  view === v
                    ? 'bg-navy text-white shadow-press-navy-sm'
                    : 'text-navy hover:bg-white/60',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-line bg-white/40 px-3 py-2 backdrop-blur-md sm:px-4">
          <MapSearch
            topics={m.topics}
            onFound={(id) => {
              setUnitId(null);
              setHighlightId(id);
              select(id);
              setTimeout(() => setHighlightId(null), 2500);
            }}
          />
          <Select
            label="Unit"
            hideLabel
            className="w-36 shrink-0 sm:w-48"
            value={unitId ?? ''}
            onChange={(e) => setUnitId(e.target.value || null)}
            placeholder="All units"
            options={m.units.map((u) => ({ value: u.id, label: `Unit ${u.number} · ${u.title}` }))}
          />
        </div>

        {view === 'path' ? (
          <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {/* The path shows its own card under a tapped node, so phones skip the sheet. */}
            <RoadmapView
              map={m}
              me={me.data}
              order={order}
              unitId={unitId}
              highlightId={highlightId}
              onSelect={setSelected}
              onDetails={select}
              onOpenMap={(id) => {
                setUnitId(id);
                setView('map');
              }}
            />
          </div>
        ) : view === 'map' ? (
          <div className="relative min-h-0 flex-1">
            <ConceptMap
              map={m}
              me={me.data}
              order={order}
              selectedId={selectedId}
              onSelect={select}
              highlightId={highlightId}
              unitId={unitId}
              currentId={currentId}
              focusRequest={focusRequest}
            />
            <Card
              padded={false}
              className="absolute left-3 top-3 hidden max-w-[220px] p-3 sm:block"
            >
              <Legend />
            </Card>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <MapListView
              map={m}
              me={me.data}
              order={
                unitId
                  ? order.filter((id) => m.topics.find((t) => t.id === id)?.unitId === unitId)
                  : order
              }
              onSelect={select}
              selectedId={selectedId}
            />
            <Card className="mt-4 sm:hidden">
              <Legend />
            </Card>
          </div>
        )}
      </section>

      <aside
        aria-label="Selected topic"
        className="hidden overflow-y-auto border-l border-line bg-card p-5 lg:block"
      >
        {panel}
      </aside>

      {/* Mobile and tablet: the tree is a drawer and the panel is a bottom sheet. */}
      <Drawer open={treeOpen} onClose={() => setTreeOpen(false)} side="left" title="Subjects">
        {tree}
      </Drawer>
      <Drawer
        open={sheetOpen && !isDesktop}
        onClose={() => setSheetOpen(false)}
        side="bottom"
        title="Topic"
      >
        {panel}
      </Drawer>
      <div
        className={cn('border-t border-line bg-card p-3 lg:hidden', view === 'path' && 'hidden')}
      >
        <Button className="w-full" variant="secondary" onClick={() => setSheetOpen(true)}>
          {selectedId
            ? `View ${m.topics.find((t) => t.id === selectedId)?.title ?? 'topic'}`
            : 'View topic'}
        </Button>
      </div>
    </div>
  );
}

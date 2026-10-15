import { NavLink } from 'react-router-dom';
import { ProgressBar } from '../../../components/ui';
import { cn } from '../../../lib/cn';

/**
 * Semester → subjects → units tree with subject progress (F3 left column).
 * The current subject expands to its units; choosing a unit filters the map.
 */
export function SubjectTree({ subjects, progress, currentSubjectId, units, unitId, onUnit }) {
  const bySemester = new Map();
  for (const s of subjects) {
    if (!bySemester.has(s.semester)) bySemester.set(s.semester, []);
    bySemester.get(s.semester).push(s);
  }
  const progressOf = new Map((progress?.subjects ?? []).map((p) => [p.subjectId, p]));

  return (
    <nav aria-label="Subjects" className="space-y-5">
      {[...bySemester.entries()].map(([sem, list]) => (
        <div key={sem}>
          <p className="eyebrow">Semester {sem}</p>
          <ul className="mt-2 space-y-1">
            {list.map((s) => {
              const p = progressOf.get(s.id);
              const pct = p?.totalTopics ? (p.counts.confident / p.totalTopics) * 100 : 0;
              const active = s.id === currentSubjectId;
              return (
                <li key={s.id}>
                  <NavLink
                    to={`/learn/${s.id}`}
                    className={cn(
                      'block rounded-xl px-3 py-2 hover:bg-surface hover:no-underline',
                      active && 'bg-surface',
                    )}
                  >
                    <span className="block text-xs font-semibold text-body">{s.code}</span>
                    <span className="block text-sm font-semibold text-navy">{s.name}</span>
                    {p && (
                      <ProgressBar
                        className="mt-2"
                        size="sm"
                        tone="gold"
                        value={pct}
                        label={`${s.name}: ${p.counts.confident} of ${p.totalTopics} mastered`}
                      />
                    )}
                  </NavLink>
                  {active && units?.length > 0 && (
                    <ul
                      className="ml-3 mt-1 space-y-0.5 border-l border-line pl-3"
                      aria-label="Units"
                    >
                      <li>
                        <button
                          type="button"
                          aria-pressed={!unitId}
                          onClick={() => onUnit(null)}
                          className={cn(
                            'min-h-[40px] w-full rounded-lg px-2 text-left text-sm hover:bg-surface',
                            !unitId ? 'font-semibold text-navy' : 'text-body',
                          )}
                        >
                          All units
                        </button>
                      </li>
                      {units.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            aria-pressed={unitId === u.id}
                            onClick={() => onUnit(u.id)}
                            className={cn(
                              'min-h-[40px] w-full rounded-lg px-2 text-left text-sm hover:bg-surface',
                              unitId === u.id ? 'font-semibold text-navy' : 'text-body',
                            )}
                          >
                            Unit {u.number} · {u.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

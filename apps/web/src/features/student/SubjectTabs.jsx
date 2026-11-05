import { Tabs } from '../../components/ui';

/**
 * One tab per subject, each tab rendering `children(subject)`. Used wherever a page mixes
 * subjects (exam prep, revision, code lab) so each subject is its own component.
 * @param {{ subjects: { id: string, name: string, code: string }[], value: string, onChange: (id: string) => void, label: string, counts?: Record<string, number>, children: (subject: object) => import('react').ReactNode }} props
 */
export function SubjectTabs({ subjects, value, onChange, label, counts, children }) {
  return (
    <Tabs
      label={label}
      value={value}
      onChange={onChange}
      tabs={subjects.map((s) => ({
        value: s.id,
        // Full names: abbreviations can't be derived reliably ("Database" → DB).
        label: s.name,
        ...(counts ? { count: counts[s.id] ?? 0 } : {}),
        // Only the open subject renders (and fetches).
        content: s.id === value ? children(s) : null,
      }))}
    />
  );
}

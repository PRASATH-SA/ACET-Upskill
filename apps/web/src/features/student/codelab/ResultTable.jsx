import { cn } from '../../../lib/cn';

/** A query result as a scrollable table. NULL is shown as a muted "NULL". */
export function ResultTable({ result, caption, className, highlight }) {
  if (!result) return null;
  const { columns = [], rows = [], rowCount = rows.length, truncated } = result;
  if (!columns.length)
    return (
      <p className={cn('text-sm', className)}>
        {caption ? `${caption}: ` : ''}The statement ran and returned no rows.
      </p>
    );
  return (
    <div className={cn('min-w-0', className)}>
      <div className="max-h-80 overflow-auto rounded-xl border border-line bg-white">
        <table className="w-full border-collapse font-mono text-xs">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 bg-surface">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  scope="col"
                  className="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold text-navy"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={cn('odd:bg-surface/50', highlight && 'bg-red/5')}>
                {r.map((v, j) => (
                  <td
                    key={j}
                    className="whitespace-nowrap border-b border-line/60 px-3 py-1.5 text-navy"
                  >
                    {v === null ? <span className="text-body/60">NULL</span> : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-body">
        {rowCount} row{rowCount === 1 ? '' : 's'}
        {truncated || rowCount > rows.length ? ` (showing ${rows.length})` : ''}
      </p>
    </div>
  );
}

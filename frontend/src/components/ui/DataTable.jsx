import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records available in this view.',
  emptyTitle = 'No Records Found',
  keyField = '_id',
  className = ''
}) {
  if (loading) {
    return <LoadingSkeleton rows={5} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyMessage} />;
  }

  return (
    <div
      className={`overflow-hidden border border-[#E4E7EC] rounded-xl sm:rounded-2xl bg-white shadow-[0_1px_3px_0_rgba(16,24,40,0.05)] ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#E4E7EC] text-left text-sm">
          <thead className="bg-[#F8F9FA]">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  scope="col"
                  className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#475467] ${
                    col.className || ''
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F7] bg-white">
            {data.map((row, rowIdx) => (
              <tr
                key={row[keyField] || rowIdx}
                className="hover:bg-[#F9FAFB] transition-colors"
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key || colIdx}
                    className={`px-5 py-4 whitespace-nowrap text-[#344054] ${
                      col.className || ''
                    }`}
                  >
                    {col.render ? col.render(row, rowIdx) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

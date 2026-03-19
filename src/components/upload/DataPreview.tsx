'use client';

interface DataPreviewProps {
  headers: string[];
  data: Record<string, string | undefined>[];
  totalRows: number;
}

export default function DataPreview({ headers, data, totalRows }: DataPreviewProps) {
  const previewRows = data.slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Data Preview</h3>
        <span className="text-sm text-gray-500">
          Showing {previewRows.length} of {totalRows} rows | {headers.length} columns
        </span>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-auto max-h-64">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200">#</th>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-1.5 text-gray-400 border-b border-gray-100">{i + 1}</td>
                {headers.map((h) => (
                  <td key={h} className="px-3 py-1.5 text-gray-700 border-b border-gray-100 whitespace-nowrap max-w-48 truncate">
                    {row[h] || ''}
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

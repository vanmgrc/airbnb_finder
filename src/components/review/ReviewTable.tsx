'use client';

import { Lead, SortField, SortDirection } from '@/lib/types';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfidenceBadge from '@/components/shared/ConfidenceBadge';
import ExternalLink from '@/components/shared/ExternalLink';

interface ReviewTableProps {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onLeadClick: (leadId: string) => void;
}

const columns: { key: SortField | 'actions' | 'lead_id' | 'competitor' | 'airbnb'; label: string; sortable: boolean }[] = [
  { key: 'lead_id', label: 'Lead', sortable: false },
  { key: 'full_address', label: 'Address', sortable: true },
  { key: 'processing_status', label: 'Status', sortable: true },
  { key: 'confidence_score', label: 'Confidence', sortable: true },
  { key: 'method_used', label: 'Method', sortable: true },
  { key: 'competitor', label: 'Competitor URL', sortable: false },
  { key: 'airbnb', label: 'Airbnb URL', sortable: false },
  { key: 'actions', label: '', sortable: false },
];

export default function ReviewTable({
  leads,
  total,
  page,
  pageSize,
  sortField,
  sortDirection,
  onSort,
  onPageChange,
  onLeadClick,
}: ReviewTableProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSort(col.key as SortField)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 ${
                    col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortField === col.key && (
                      <span className="text-blue-600">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                  No leads found. Upload a file to get started.
                </td>
              </tr>
            ) : (
              leads.map((lead, i) => (
                <tr
                  key={lead.id}
                  onClick={() => onLeadClick(lead.id)}
                  className={`cursor-pointer hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                    {lead.lead_id || lead.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 font-medium text-sm max-w-xs truncate">{lead.full_address || '--'}</div>
                    <div className="text-xs text-gray-500">{lead.rental_city}{lead.rental_state ? `, ${lead.rental_state}` : ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.processing_status} />
                  </td>
                  <td className="px-4 py-3">
                    <ConfidenceBadge score={lead.confidence_score} label={lead.confidence_label} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {lead.method_used !== 'none' ? lead.method_used : '--'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <ExternalLink url={lead.competitor_listing_url} maxLength={25} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <ExternalLink url={lead.final_airbnb_url} maxLength={25} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); onLeadClick(lead.id); }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`px-3 py-1 text-sm rounded border ${
                    page === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-white'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

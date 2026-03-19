'use client';

import { useState } from 'react';
import { LeadFilters, ProcessingStatus, ConfidenceLabel, MethodUsed } from '@/lib/types';

interface FilterBarProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
}

const allStatuses: ProcessingStatus[] = ['pending', 'processing', 'matched', 'probable_match', 'no_match', 'needs_review', 'failed'];
const allConfidences: ConfidenceLabel[] = ['High', 'Medium', 'Low', 'None'];
const allMethods: MethodUsed[] = ['competitor-based', 'competitor-fallback', 'address-based', 'image-based', 'manual', 'none'];

export default function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  function toggleArrayFilter<T>(arr: T[] | undefined, value: T): T[] {
    const current = arr || [];
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  }

  function clearAll() {
    onFiltersChange({});
  }

  const hasFilters = Object.values(filters).some((v) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v)
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search leads..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value || undefined })}
            className="w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">Queue:</label>
            {(['A', 'B'] as const).map((q) => (
              <button
                key={q}
                onClick={() => onFiltersChange({ ...filters, queue: toggleArrayFilter(filters.queue, q) as ('A' | 'B')[] })}
                className={`px-2.5 py-1 text-xs rounded-md font-medium border ${
                  filters.queue?.includes(q)
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAdvanced ? 'Hide filters' : 'More filters'}
          </button>
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-red-600 hover:text-red-800 font-medium">
            Clear all
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
            <div className="flex flex-wrap gap-1">
              {allStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => onFiltersChange({ ...filters, status: toggleArrayFilter(filters.status, s) })}
                  className={`px-2 py-0.5 text-xs rounded-md border ${
                    filters.status?.includes(s)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Confidence</label>
            <div className="flex flex-wrap gap-1">
              {allConfidences.map((c) => (
                <button
                  key={c}
                  onClick={() => onFiltersChange({ ...filters, confidence: toggleArrayFilter(filters.confidence, c) })}
                  className={`px-2 py-0.5 text-xs rounded-md border ${
                    filters.confidence?.includes(c)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Method</label>
            <div className="flex flex-wrap gap-1">
              {allMethods.map((m) => (
                <button
                  key={m}
                  onClick={() => onFiltersChange({ ...filters, method: toggleArrayFilter(filters.method, m) })}
                  className={`px-2 py-0.5 text-xs rounded-md border ${
                    filters.method?.includes(m)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

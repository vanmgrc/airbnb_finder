'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { ProcessingStatus, ConfidenceLabel, QueueStats } from '@/lib/types';

const allStatuses: ProcessingStatus[] = ['matched', 'probable_match', 'no_match', 'needs_review', 'failed', 'pending'];
const allConfidences: ConfidenceLabel[] = ['High', 'Medium', 'Low', 'None'];

export default function ExportPage() {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [includeOriginal, setIncludeOriginal] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ProcessingStatus[]>([]);
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLabel[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState<QueueStats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, []);

  function toggleStatus(s: ProcessingStatus) {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleConfidence(c: ConfidenceLabel) {
    setConfidenceFilter((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          includeOriginalColumns: includeOriginal,
          statusFilter,
          confidenceFilter,
        }),
      });

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `airbnb-leads-export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Header title="Export Results" />
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-6">
        {stats && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <span className="font-semibold">{stats.total}</span> total leads available for export.{' '}
            <span className="font-semibold">{stats.matched + stats.probable_match}</span> matched,{' '}
            <span className="font-semibold">{stats.needs_review}</span> needs review.
          </div>
        )}

        {/* Format */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Export Format</h3>
          <div className="flex gap-4">
            {(['csv', 'xlsx'] as const).map((f) => (
              <label key={f} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={format === f}
                  onChange={() => setFormat(f)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700 uppercase">{f}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={includeOriginal}
              onChange={(e) => setIncludeOriginal(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Include original uploaded columns</span>
          </label>
        </div>

        {/* Status Filter */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Filter by Status <span className="text-gray-400 font-normal">(leave empty for all)</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {allStatuses.map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${
                  statusFilter.includes(s)
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Confidence Filter */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Filter by Confidence <span className="text-gray-400 font-normal">(leave empty for all)</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {allConfidences.map((c) => (
              <button
                key={c}
                onClick={() => toggleConfidence(c)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${
                  confidenceFilter.includes(c)
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting || (stats?.total ?? 0) === 0}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export {format.toUpperCase()}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

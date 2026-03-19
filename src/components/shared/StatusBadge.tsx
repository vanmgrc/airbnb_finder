'use client';

import { ProcessingStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: ProcessingStatus;
}

const statusConfig: Record<ProcessingStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-gray-100 text-gray-700 border-gray-200' },
  processing: { label: 'Processing', classes: 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse' },
  matched: { label: 'Matched', classes: 'bg-green-100 text-green-800 border-green-200' },
  probable_match: { label: 'Probable', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  no_match: { label: 'No Match', classes: 'bg-red-100 text-red-700 border-red-200' },
  needs_review: { label: 'Review', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  failed: { label: 'Failed', classes: 'bg-red-200 text-red-900 border-red-300' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}>
      {config.label}
    </span>
  );
}

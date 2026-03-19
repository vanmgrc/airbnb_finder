import type { ProcessingStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: ProcessingStatus;
}

const statusConfig: Record<ProcessingStatus, { label: string; classes: string }> = {
  matched: {
    label: 'Matched',
    classes: 'bg-green-100 text-green-800 border-green-200',
  },
  probable_match: {
    label: 'Probable Match',
    classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  no_match: {
    label: 'No Match',
    classes: 'bg-red-100 text-red-800 border-red-200',
  },
  needs_review: {
    label: 'Needs Review',
    classes: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  failed: {
    label: 'Failed',
    classes: 'bg-red-100 text-red-700 border-red-200',
  },
  pending: {
    label: 'Pending',
    classes: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  processing: {
    label: 'Processing',
    classes: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}
    >
      {status === 'processing' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}
      {config.label}
    </span>
  );
}

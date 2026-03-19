'use client';

import { ConfidenceLabel } from '@/lib/types';

interface ConfidenceBadgeProps {
  score: number;
  label: ConfidenceLabel;
}

const colorMap: Record<ConfidenceLabel, string> = {
  High: 'bg-green-100 text-green-800 border-green-200',
  Medium: 'bg-amber-100 text-amber-800 border-amber-200',
  Low: 'bg-orange-100 text-orange-800 border-orange-200',
  None: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function ConfidenceBadge({ score, label }: ConfidenceBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colorMap[label]}`}>
      {label} {score > 0 && <span className="opacity-75">({score})</span>}
    </span>
  );
}

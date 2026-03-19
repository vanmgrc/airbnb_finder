import type { ConfidenceLabel } from '@/lib/types';

interface ConfidenceBadgeProps {
  score: number;
  label: ConfidenceLabel;
}

const colorMap: Record<ConfidenceLabel, string> = {
  High: 'bg-green-100 text-green-800 border-green-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Low: 'bg-orange-100 text-orange-800 border-orange-200',
  None: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function ConfidenceBadge({ score, label }: ConfidenceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorMap[label]}`}
    >
      {label}
      <span className="opacity-70">{score}%</span>
    </span>
  );
}

'use client';

import { QueueStats as QueueStatsType } from '@/lib/types';

interface QueueStatsProps {
  stats: QueueStatsType;
}

const statCards = [
  { key: 'total', label: 'Total Leads', color: 'bg-slate-600' },
  { key: 'queueA', label: 'Queue A (Competitor)', color: 'bg-blue-600' },
  { key: 'queueB', label: 'Queue B (No Competitor)', color: 'bg-indigo-600' },
  { key: 'processing', label: 'Processing', color: 'bg-cyan-600' },
  { key: 'matched', label: 'Matched', color: 'bg-green-600' },
  { key: 'probable_match', label: 'Probable Match', color: 'bg-emerald-600' },
  { key: 'needs_review', label: 'Needs Review', color: 'bg-amber-500' },
  { key: 'no_match', label: 'No Match', color: 'bg-red-500' },
  { key: 'failed', label: 'Failed', color: 'bg-red-700' },
  { key: 'pending', label: 'Pending', color: 'bg-gray-500' },
] as const;

export default function QueueStats({ stats }: QueueStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statCards.map(({ key, label, color }) => (
        <div key={key} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats[key]}</p>
        </div>
      ))}
    </div>
  );
}

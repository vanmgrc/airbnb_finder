'use client';

interface HeaderProps {
  title: string;
  stats?: { total: number; matched: number; pending: number };
}

export default function Header({ title, stats }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      {stats && (
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Total:</span>
            <span className="font-semibold text-gray-900">{stats.total}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="text-gray-500">Matched:</span>
            <span className="font-semibold text-green-700">{stats.matched}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
            <span className="text-gray-500">Pending:</span>
            <span className="font-semibold text-gray-700">{stats.pending}</span>
          </div>
        </div>
      )}
    </header>
  );
}

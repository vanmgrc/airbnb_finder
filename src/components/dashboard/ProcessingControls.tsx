'use client';

interface ProcessingControlsProps {
  isProcessing: boolean;
  isPaused: boolean;
  progress: { processed: number; total: number; currentLead: string | null };
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export default function ProcessingControls({
  isProcessing,
  isPaused,
  progress,
  onStart,
  onPause,
  onResume,
  onStop,
}: ProcessingControlsProps) {
  const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Processing Controls</h3>

      {progress.total > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">
              {progress.processed} / {progress.total} ({pct}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          {progress.currentLead && (
            <p className="text-xs text-gray-500">
              Currently processing: <span className="font-medium">{progress.currentLead}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {!isProcessing ? (
          <button
            onClick={onStart}
            disabled={progress.total === 0}
            className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Start Processing
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={onResume}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Resume
              </button>
            ) : (
              <button
                onClick={onPause}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                </svg>
                Pause
              </button>
            )}
            <button
              onClick={onStop}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}

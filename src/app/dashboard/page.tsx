'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import QueueStats from '@/components/dashboard/QueueStats';
import ProcessingControls from '@/components/dashboard/ProcessingControls';
import { QueueStats as QueueStatsType } from '@/lib/types';

const emptyStats: QueueStatsType = {
  total: 0, queueA: 0, queueB: 0, pending: 0, processing: 0,
  matched: 0, probable_match: 0, no_match: 0, needs_review: 0, failed: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<QueueStatsType>(emptyStats);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0, currentLead: null as string | null });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/process');
      const data = await res.json();
      setStats(data.stats);
      setIsProcessing(data.isProcessing);
      setProgress(data.progress);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function handleStart() {
    // If leads are already loaded, just resume or re-trigger
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'resume' }),
      });
      if (res.ok) {
        setIsProcessing(true);
      }
    } catch {
      // ignore
    }
  }

  async function handlePause() {
    await fetch('/api/process', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    });
    setIsPaused(true);
  }

  async function handleResume() {
    await fetch('/api/process', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    });
    setIsPaused(false);
  }

  async function handleStop() {
    await fetch('/api/process', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    setIsProcessing(false);
    setIsPaused(false);
  }

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Dashboard"
        stats={{ total: stats.total, matched: stats.matched + stats.probable_match, pending: stats.pending }}
      />
      <div className="flex-1 p-6 space-y-6">
        <QueueStats stats={stats} />
        <ProcessingControls
          isProcessing={isProcessing}
          isPaused={isPaused}
          progress={progress}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />

        {/* Quick links */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Quick Links</h3>
          <div className="flex gap-3">
            <a href="/review?status=needs_review" className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-100">
              Needs Review ({stats.needs_review})
            </a>
            <a href="/review?status=matched" className="px-4 py-2 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm font-medium hover:bg-green-100">
              Matched ({stats.matched})
            </a>
            <a href="/review?status=failed" className="px-4 py-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm font-medium hover:bg-red-100">
              Failed ({stats.failed})
            </a>
            <a href="/review" className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100">
              All Leads ({stats.total})
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

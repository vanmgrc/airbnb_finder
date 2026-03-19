'use client';

import { useState } from 'react';
import { Lead } from '@/lib/types';

interface ManualOverrideProps {
  lead: Lead;
  onApprove: (airbnbUrl?: string) => void;
  onReject: (reason: string) => void;
  onManualUrl: (url: string, notes: string) => void;
  onNoMatch: (reason: string) => void;
}

export default function ManualOverride({ lead, onApprove, onReject, onManualUrl, onNoMatch }: ManualOverrideProps) {
  const [manualUrl, setManualUrl] = useState('');
  const [notes, setNotes] = useState(lead.reviewer_notes || '');
  const [rejectReason, setRejectReason] = useState('');
  const [noMatchReason, setNoMatchReason] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const bestUrl = lead.final_airbnb_url || lead.candidate_airbnb_urls[0]?.url || '';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Review Actions</h3>

      {lead.review_decision !== 'pending' && (
        <div className={`p-3 rounded-lg text-sm ${
          lead.review_decision === 'approved' ? 'bg-green-50 text-green-800 border border-green-200' :
          lead.review_decision === 'rejected' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-gray-50 text-gray-800 border border-gray-200'
        }`}>
          Decision: <span className="font-semibold capitalize">{lead.review_decision.replace('_', ' ')}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onApprove(bestUrl)}
          disabled={!bestUrl}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Approve Match
        </button>
        <button
          onClick={() => setActiveAction(activeAction === 'reject' ? null : 'reject')}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          Reject
        </button>
        <button
          onClick={() => setActiveAction(activeAction === 'manual' ? null : 'manual')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Manual URL
        </button>
        <button
          onClick={() => setActiveAction(activeAction === 'nomatch' ? null : 'nomatch')}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
        >
          No Match
        </button>
      </div>

      {/* Reject Panel */}
      {activeAction === 'reject' && (
        <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
          <input
            type="text"
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={() => { onReject(rejectReason); setActiveAction(null); }}
            disabled={!rejectReason}
            className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            Confirm Reject
          </button>
        </div>
      )}

      {/* Manual URL Panel */}
      {activeAction === 'manual' && (
        <div className="space-y-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <input
            type="url"
            placeholder="Enter Airbnb URL..."
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => { onManualUrl(manualUrl, notes); setActiveAction(null); }}
            disabled={!manualUrl}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Set Manual URL
          </button>
        </div>
      )}

      {/* No Match Panel */}
      {activeAction === 'nomatch' && (
        <div className="space-y-2 p-3 bg-gray-100 rounded-lg border border-gray-300">
          <input
            type="text"
            placeholder="Reason (optional)..."
            value={noMatchReason}
            onChange={(e) => setNoMatchReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
          <button
            onClick={() => { onNoMatch(noMatchReason || 'Manually marked as no match'); setActiveAction(null); }}
            className="px-4 py-1.5 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
          >
            Confirm No Match
          </button>
        </div>
      )}

      {/* Reviewer Notes */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Reviewer Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add your notes here..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  );
}

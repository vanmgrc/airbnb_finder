'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import LeadDetail from '@/components/lead/LeadDetail';
import CandidateList from '@/components/lead/CandidateList';
import ManualOverride from '@/components/lead/ManualOverride';
import { Lead } from '@/lib/types';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLead(data.lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  async function handleAction(action: string, body: Record<string, string | undefined>) {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (res.ok) {
        setLead(data.lead);
      }
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <Header title="Lead Detail" />
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="h-full flex flex-col">
        <Header title="Lead Detail" />
        <div className="flex-1 flex items-center justify-center text-red-500">{error || 'Lead not found'}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Header title={`Lead: ${lead.lead_id || lead.id.slice(0, 8)}`} />
      <div className="flex-1 p-6 overflow-auto">
        <button
          onClick={() => router.push('/review')}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Review
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <LeadDetail lead={lead} />
          </div>
          <div className="space-y-6">
            <CandidateList
              candidates={lead.candidate_airbnb_urls}
              selectedUrl={lead.final_airbnb_url}
              onSelect={(url) => handleAction('approve', { airbnb_url: url })}
            />
            <ManualOverride
              lead={lead}
              onApprove={(url) => handleAction('approve', { airbnb_url: url })}
              onReject={(reason) => handleAction('reject', { reason })}
              onManualUrl={(url, notes) => handleAction('manual_override', { airbnb_url: url, notes })}
              onNoMatch={(reason) => handleAction('no_match', { reason })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

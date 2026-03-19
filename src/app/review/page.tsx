'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import FilterBar from '@/components/review/FilterBar';
import ReviewTable from '@/components/review/ReviewTable';
import { Lead, LeadFilters, SortField, SortDirection, QueueStats, ProcessingStatus } from '@/lib/types';

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<LeadFilters>(() => {
    const status = searchParams.get('status');
    if (status) {
      return { status: status.split(',') as ProcessingStatus[] };
    }
    return {};
  });

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      params.set('sort', sortField);
      params.set('direction', sortDirection);

      if (filters.status?.length) params.set('status', filters.status.join(','));
      if (filters.confidence?.length) params.set('confidence', filters.confidence.join(','));
      if (filters.queue?.length) params.set('queue', filters.queue.join(','));
      if (filters.method?.length) params.set('method', filters.method.join(','));
      if (filters.searchQuery) params.set('search', filters.searchQuery);

      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
      setStats(data.stats);
    } catch {
      // ignore
    }
  }, [page, pageSize, sortField, sortDirection, filters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  function handleLeadClick(leadId: string) {
    router.push(`/lead/${leadId}`);
  }

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Review Leads"
        stats={stats ? { total: stats.total, matched: stats.matched + stats.probable_match, pending: stats.pending } : undefined}
      />
      <div className="flex-1 p-6 space-y-4">
        <FilterBar filters={filters} onFiltersChange={(f) => { setFilters(f); setPage(1); }} />
        <ReviewTable
          leads={leads}
          total={total}
          page={page}
          pageSize={pageSize}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onPageChange={setPage}
          onLeadClick={handleLeadClick}
        />
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex flex-col">
        <Header title="Review Leads" />
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
      </div>
    }>
      <ReviewContent />
    </Suspense>
  );
}

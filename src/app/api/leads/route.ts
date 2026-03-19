import { NextRequest, NextResponse } from 'next/server';
import { leadStore } from '@/lib/store/leadStore';
import { LeadFilters, SortField, SortDirection, ProcessingStatus, ConfidenceLabel, MethodUsed } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const filters: LeadFilters = {};

    const statusParam = params.get('status');
    if (statusParam) {
      filters.status = statusParam.split(',') as ProcessingStatus[];
    }

    const confidenceParam = params.get('confidence');
    if (confidenceParam) {
      filters.confidence = confidenceParam.split(',') as ConfidenceLabel[];
    }

    const queueParam = params.get('queue');
    if (queueParam) {
      filters.queue = queueParam.split(',') as ('A' | 'B')[];
    }

    const methodParam = params.get('method');
    if (methodParam) {
      filters.method = methodParam.split(',') as MethodUsed[];
    }

    const city = params.get('city');
    if (city) filters.city = city;

    const state = params.get('state');
    if (state) filters.state = state;

    const search = params.get('search');
    if (search) filters.searchQuery = search;

    const sortField = (params.get('sort') || 'updated_at') as SortField;
    const sortDirection = (params.get('direction') || 'desc') as SortDirection;
    const page = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('pageSize') || '25', 10);

    const { leads, total } = leadStore.getLeads(
      filters,
      { field: sortField, direction: sortDirection },
      page,
      pageSize
    );

    const stats = leadStore.getQueueStats();

    return NextResponse.json({
      leads,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

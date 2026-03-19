import { NextRequest, NextResponse } from 'next/server';
import { leadStore } from '@/lib/store/leadStore';
import { mapLeads } from '@/lib/services/columnMapper';
import {
  LeadFilters,
  SortField,
  SortDirection,
  ProcessingStatus,
  ConfidenceLabel,
  MethodUsed,
  ColumnMapping,
} from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filter parameters
    const filters: LeadFilters = {};

    const status = searchParams.get('status');
    if (status) {
      filters.status = status.split(',') as ProcessingStatus[];
    }

    const confidence = searchParams.get('confidence');
    if (confidence) {
      filters.confidence = confidence.split(',') as ConfidenceLabel[];
    }

    const queue = searchParams.get('queue');
    if (queue) {
      filters.queue = queue.split(',') as ('A' | 'B')[];
    }

    const method = searchParams.get('method');
    if (method) {
      filters.method = method.split(',') as MethodUsed[];
    }

    const city = searchParams.get('city');
    if (city) {
      filters.city = city;
    }

    const state = searchParams.get('state');
    if (state) {
      filters.state = state;
    }

    const search = searchParams.get('search');
    if (search) {
      filters.searchQuery = search;
    }

    // Parse sort parameters
    const sortField = searchParams.get('sort') as SortField | null;
    const sortDirection = (searchParams.get('direction') || 'desc') as SortDirection;
    const sort = sortField ? { field: sortField, direction: sortDirection } : undefined;

    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);

    const { leads, total } = leadStore.getLeads(filters, sort, page, pageSize);

    return NextResponse.json({
      leads,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, mapping } = body as { sessionId: string; mapping: ColumnMapping };

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required.' },
        { status: 400 }
      );
    }

    if (!mapping) {
      return NextResponse.json(
        { error: 'mapping is required.' },
        { status: 400 }
      );
    }

    const session = leadStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: `Session not found: ${sessionId}` },
        { status: 404 }
      );
    }

    // Map raw data to Lead objects using the confirmed column mapping
    const leads = mapLeads(session.rawData, mapping);

    // Add leads to the store
    leadStore.addLeads(sessionId, leads);

    // Count leads per queue
    const queueA = leads.filter((l) => l.queue === 'A').length;
    const queueB = leads.filter((l) => l.queue === 'B').length;

    return NextResponse.json({
      leadsCreated: leads.length,
      queueA,
      queueB,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

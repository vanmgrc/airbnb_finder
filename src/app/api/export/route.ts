import { NextRequest, NextResponse } from 'next/server';
import { leadStore } from '@/lib/store/leadStore';
import { exportLeads } from '@/lib/services/exportService';
import {
  ExportOptions,
  ProcessingStatus,
  ConfidenceLabel,
} from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      format,
      includeOriginalColumns = false,
      statusFilter,
      confidenceFilter,
    } = body as {
      format: 'csv' | 'xlsx';
      includeOriginalColumns?: boolean;
      statusFilter?: string[];
      confidenceFilter?: string[];
    };

    if (!format || !['csv', 'xlsx'].includes(format)) {
      return NextResponse.json(
        { error: 'format is required and must be "csv" or "xlsx".' },
        { status: 400 }
      );
    }

    const options: ExportOptions = {
      format,
      includeOriginalColumns,
      statusFilter: (statusFilter || []) as ProcessingStatus[],
      confidenceFilter: (confidenceFilter || []) as ConfidenceLabel[],
    };

    // Get all leads matching the export filters
    const leads = leadStore.getAllLeadsForExport(options);

    // Generate the export
    const result = exportLeads(leads, options);

    // Build the response with appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', result.contentType);
    headers.set('Content-Disposition', `attachment; filename="${result.filename}"`);

    if (format === 'csv') {
      return new NextResponse(result.data as string, { headers });
    }

    // For XLSX, return the buffer as binary
    const buffer = result.data as Buffer;
    return new NextResponse(buffer, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

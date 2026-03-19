import { NextRequest, NextResponse } from 'next/server';
import { exportLeads } from '@/lib/services/exportService';
import { leadStore } from '@/lib/store/leadStore';
import { ExportOptions, ProcessingStatus, ConfidenceLabel } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const options: ExportOptions = {
      format: body.format || 'csv',
      includeOriginalColumns: body.includeOriginalColumns ?? true,
      statusFilter: (body.statusFilter || []) as ProcessingStatus[],
      confidenceFilter: (body.confidenceFilter || []) as ConfidenceLabel[],
    };

    const { leads } = leadStore.getLeads();
    const result = exportLeads(leads, options);

    let responseBody: BodyInit;
    if (typeof result.data === 'string') {
      responseBody = result.data;
    } else {
      // Convert Buffer to ArrayBuffer for Response compatibility
      const buf = result.data;
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      responseBody = ab as ArrayBuffer;
    }

    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

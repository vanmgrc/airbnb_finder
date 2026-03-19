import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/lib/services/fileParser';
import { autoDetectMapping } from '@/lib/services/columnMapper';
import { leadStore } from '@/lib/store/leadStore';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a CSV or XLSX file.' },
        { status: 400 }
      );
    }

    // Validate file type
    const filename = (file as File).name || 'upload.csv';
    const ext = filename.toLowerCase().split('.').pop();
    if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file format: ${ext}. Please upload a CSV or XLSX file.` },
        { status: 400 }
      );
    }

    // Read file into a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the file
    const { headers, data } = await parseFile(buffer, filename);

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'The uploaded file contains no data rows.' },
        { status: 400 }
      );
    }

    // Auto-detect column mapping
    const suggestedMapping = autoDetectMapping(headers);

    // Create upload session in the store
    const session = leadStore.createSession(filename, data, headers);

    // Build preview (first 10 rows)
    const preview = data.slice(0, 10);

    return NextResponse.json({
      sessionId: session.id,
      headers,
      suggestedMapping,
      preview,
      totalRows: data.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

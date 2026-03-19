import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/lib/services/fileParser';
import { autoDetectMapping } from '@/lib/services/columnMapper';
import { leadStore } from '@/lib/store/leadStore';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const filename = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { headers, data } = await parseFile(buffer, filename);

    if (data.length === 0) {
      return NextResponse.json({ error: 'File contains no data rows' }, { status: 400 });
    }

    const suggestedMapping = autoDetectMapping(headers);
    const session = leadStore.createSession(filename, data, headers);

    return NextResponse.json({
      sessionId: session.id,
      filename,
      headers,
      preview: data.slice(0, 5),
      totalRows: data.length,
      suggestedMapping,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

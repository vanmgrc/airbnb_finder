import { NextRequest, NextResponse } from 'next/server';
import { mapLeads } from '@/lib/services/columnMapper';
import { processQueue, getProcessingProgress, pauseProcessing, resumeProcessing, stopProcessing } from '@/lib/services/queueManager';
import { leadStore } from '@/lib/store/leadStore';
import { ColumnMapping } from '@/lib/types';

let isRunning = false;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, columnMapping } = body as { sessionId: string; columnMapping: ColumnMapping };

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = leadStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Map raw data to leads
    const leads = mapLeads(session.rawData, columnMapping);
    leadStore.addLeads(sessionId, leads);

    const stats = leadStore.getQueueStats();

    // Start processing asynchronously
    if (!isRunning) {
      isRunning = true;
      processQueue().finally(() => {
        isRunning = false;
      });
    }

    return NextResponse.json({
      leadsCreated: leads.length,
      queueA: stats.queueA,
      queueB: stats.queueB,
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start processing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const progress = getProcessingProgress();
    const stats = leadStore.getQueueStats();

    return NextResponse.json({
      isProcessing: isRunning,
      progress,
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case 'pause':
        pauseProcessing();
        break;
      case 'resume':
        resumeProcessing();
        break;
      case 'stop':
        stopProcessing();
        isRunning = false;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ status: action });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to control processing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

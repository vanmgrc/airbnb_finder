import { NextRequest, NextResponse } from 'next/server';
import { leadStore } from '@/lib/store/leadStore';
import {
  processQueue,
  getProcessingProgress,
  pauseProcessing,
  resumeProcessing,
  stopProcessing,
} from '@/lib/services/queueManager';

export async function POST() {
  try {
    const progress = getProcessingProgress();

    if (progress.state === 'running') {
      return NextResponse.json(
        { status: 'already_running', progress },
        { status: 409 }
      );
    }

    // Start processing asynchronously -- do not await
    processQueue().catch((error) => {
      console.error('Queue processing error:', error);
    });

    return NextResponse.json({ status: 'started' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const progress = getProcessingProgress();
    const stats = leadStore.getQueueStats();

    return NextResponse.json({
      isProcessing: progress.state === 'running',
      state: progress.state,
      progress: {
        processed: progress.processed,
        total: progress.total,
        currentLead: progress.currentLead,
      },
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    if (!action) {
      return NextResponse.json(
        { error: 'action is required. Must be one of: pause, resume, stop' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'pause':
        pauseProcessing();
        return NextResponse.json({ status: 'paused' });

      case 'resume':
        resumeProcessing();
        return NextResponse.json({ status: 'resumed' });

      case 'stop':
        stopProcessing();
        return NextResponse.json({ status: 'stopped' });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Must be one of: pause, resume, stop` },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

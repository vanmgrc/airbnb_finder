import { NextResponse } from 'next/server';
import { leadStore } from '@/lib/store/leadStore';

export async function GET() {
  try {
    const stats = leadStore.getQueueStats();
    return NextResponse.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

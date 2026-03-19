import { NextRequest, NextResponse } from 'next/server';
import { leadStore } from '@/lib/store/leadStore';
import { approveLead, rejectLead, manualOverride, markNoMatch, addReviewerNotes } from '@/lib/services/reviewWorkflow';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = leadStore.getLead(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, airbnb_url, reason, notes } = body as {
      action: string;
      airbnb_url?: string;
      reason?: string;
      notes?: string;
    };

    let lead = null;

    switch (action) {
      case 'approve':
        lead = approveLead(id, airbnb_url);
        break;
      case 'reject':
        lead = rejectLead(id, reason || 'Rejected by reviewer');
        break;
      case 'manual_override':
        lead = manualOverride(id, airbnb_url || '', notes || '');
        break;
      case 'no_match':
        lead = markNoMatch(id, reason || 'No match found');
        break;
      case 'add_notes':
        lead = addReviewerNotes(id, notes || '');
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

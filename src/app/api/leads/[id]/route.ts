import { NextRequest, NextResponse } from 'next/server';
import { leadStore } from '@/lib/store/leadStore';
import {
  approveLead,
  rejectLead,
  manualOverride,
  markNoMatch,
  addReviewerNotes,
} from '@/lib/services/reviewWorkflow';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const lead = leadStore.getLead(id);

    if (!lead) {
      return NextResponse.json(
        { error: `Lead not found: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json(lead);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, airbnb_url, reason, notes } = body as {
      action: string;
      airbnb_url?: string;
      reason?: string;
      notes?: string;
    };

    if (!action) {
      return NextResponse.json(
        { error: 'action is required. Must be one of: approve, reject, manual_override, mark_no_match, add_notes' },
        { status: 400 }
      );
    }

    // Verify the lead exists before performing any action
    const existingLead = leadStore.getLead(id);
    if (!existingLead) {
      return NextResponse.json(
        { error: `Lead not found: ${id}` },
        { status: 404 }
      );
    }

    let updatedLead = null;

    switch (action) {
      case 'approve':
        updatedLead = approveLead(id, airbnb_url);
        break;

      case 'reject':
        if (!reason) {
          return NextResponse.json(
            { error: 'reason is required for reject action.' },
            { status: 400 }
          );
        }
        updatedLead = rejectLead(id, reason);
        break;

      case 'manual_override':
        if (!airbnb_url) {
          return NextResponse.json(
            { error: 'airbnb_url is required for manual_override action.' },
            { status: 400 }
          );
        }
        updatedLead = manualOverride(id, airbnb_url, notes || '');
        break;

      case 'mark_no_match':
        if (!reason) {
          return NextResponse.json(
            { error: 'reason is required for mark_no_match action.' },
            { status: 400 }
          );
        }
        updatedLead = markNoMatch(id, reason);
        break;

      case 'add_notes':
        if (!notes) {
          return NextResponse.json(
            { error: 'notes is required for add_notes action.' },
            { status: 400 }
          );
        }
        updatedLead = addReviewerNotes(id, notes);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Must be one of: approve, reject, manual_override, mark_no_match, add_notes` },
          { status: 400 }
        );
    }

    if (!updatedLead) {
      return NextResponse.json(
        { error: 'Failed to update lead. The action could not be completed (e.g., invalid URL for manual override).' },
        { status: 422 }
      );
    }

    return NextResponse.json(updatedLead);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

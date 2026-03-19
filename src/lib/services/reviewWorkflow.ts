import { Lead, ReviewDecision, ProcessingStatus } from '../types';
import { leadStore } from '../store/leadStore';
import { isValidUrl, isAirbnbUrl } from '../utils/urlValidator';

/**
 * Approve a lead, optionally setting a custom Airbnb URL.
 * If an airbnbUrl is provided, it replaces the auto-matched URL.
 */
export function approveLead(leadId: string, airbnbUrl?: string): Lead | null {
  const lead = leadStore.getLead(leadId);
  if (!lead) return null;

  const updates: Partial<Lead> = {
    review_decision: 'approved',
  };

  if (airbnbUrl && isValidUrl(airbnbUrl)) {
    updates.final_airbnb_url = airbnbUrl;
  }

  // If the lead was previously pending/needs_review, update processing status
  if (
    lead.processing_status === 'needs_review' ||
    lead.processing_status === 'probable_match'
  ) {
    updates.processing_status = 'matched';
  }

  return leadStore.updateLead(leadId, updates);
}

/**
 * Reject a lead with a reason.
 */
export function rejectLead(leadId: string, reason: string): Lead | null {
  const lead = leadStore.getLead(leadId);
  if (!lead) return null;

  return leadStore.updateLead(leadId, {
    review_decision: 'rejected',
    reviewer_notes: reason,
    final_airbnb_url: '', // Clear any matched URL
  });
}

/**
 * Manually override a lead with a specific Airbnb URL and notes.
 */
export function manualOverride(
  leadId: string,
  airbnbUrl: string,
  notes: string
): Lead | null {
  const lead = leadStore.getLead(leadId);
  if (!lead) return null;

  if (!isValidUrl(airbnbUrl)) {
    return null; // Invalid URL, refuse the override
  }

  return leadStore.updateLead(leadId, {
    review_decision: 'manual_override',
    final_airbnb_url: airbnbUrl,
    reviewer_notes: notes,
    method_used: 'manual',
    processing_status: 'matched',
    confidence_label: 'High',
    confidence_score: 100,
    reason: 'Manually overridden by reviewer',
  });
}

/**
 * Mark a lead as having no Airbnb match.
 */
export function markNoMatch(leadId: string, reason: string): Lead | null {
  const lead = leadStore.getLead(leadId);
  if (!lead) return null;

  return leadStore.updateLead(leadId, {
    review_decision: 'no_match',
    processing_status: 'no_match',
    reviewer_notes: reason,
    final_airbnb_url: '',
  });
}

/**
 * Add or update reviewer notes on a lead without changing its status.
 */
export function addReviewerNotes(leadId: string, notes: string): Lead | null {
  const lead = leadStore.getLead(leadId);
  if (!lead) return null;

  // Append to existing notes if there are any
  const existingNotes = lead.reviewer_notes;
  const updatedNotes = existingNotes
    ? `${existingNotes}\n---\n${notes}`
    : notes;

  return leadStore.updateLead(leadId, {
    reviewer_notes: updatedNotes,
  });
}

/**
 * Bulk approve all provided lead IDs.
 * Only approves leads that have a matched Airbnb URL.
 * Returns the count of leads that were actually approved.
 */
export function bulkApprove(leadIds: string[]): number {
  let approvedCount = 0;

  for (const leadId of leadIds) {
    const lead = leadStore.getLead(leadId);
    if (!lead) continue;

    // Only approve if the lead has a final URL
    if (!lead.final_airbnb_url) continue;

    // Only approve if the lead hasn't already been approved or rejected
    if (lead.review_decision === 'approved' || lead.review_decision === 'rejected') {
      continue;
    }

    const result = leadStore.updateLead(leadId, {
      review_decision: 'approved',
      processing_status:
        lead.processing_status === 'needs_review' ||
        lead.processing_status === 'probable_match'
          ? 'matched'
          : lead.processing_status,
    });

    if (result) {
      approvedCount++;
    }
  }

  return approvedCount;
}

/**
 * Bulk approve all high-confidence leads.
 * Finds all leads with confidence_label 'High' and review_decision 'pending',
 * then approves them.
 * Returns the count of leads approved.
 */
export function bulkApproveHighConfidence(): number {
  const { leads } = leadStore.getLeads({
    confidence: ['High'],
  });

  const pendingIds = leads
    .filter((l) => l.review_decision === 'pending' && l.final_airbnb_url)
    .map((l) => l.id);

  return bulkApprove(pendingIds);
}

/**
 * Get leads that need review -- those with status 'needs_review' or 'probable_match'
 * and review_decision still 'pending'.
 */
export function getLeadsForReview(): Lead[] {
  const { leads } = leadStore.getLeads({
    status: ['needs_review', 'probable_match'],
  });

  return leads.filter((l) => l.review_decision === 'pending');
}

/**
 * Get a summary of review progress.
 */
export function getReviewSummary(): {
  totalNeedingReview: number;
  approved: number;
  rejected: number;
  manualOverride: number;
  noMatch: number;
  pending: number;
} {
  const { leads: allLeads } = leadStore.getLeads();

  return {
    totalNeedingReview: allLeads.filter(
      (l) =>
        l.processing_status === 'needs_review' ||
        l.processing_status === 'probable_match'
    ).length,
    approved: allLeads.filter((l) => l.review_decision === 'approved').length,
    rejected: allLeads.filter((l) => l.review_decision === 'rejected').length,
    manualOverride: allLeads.filter((l) => l.review_decision === 'manual_override').length,
    noMatch: allLeads.filter((l) => l.review_decision === 'no_match').length,
    pending: allLeads.filter((l) => l.review_decision === 'pending').length,
  };
}

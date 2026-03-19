import { Lead, ConfidenceLabel, MethodUsed, ProcessingStatus } from '../types';
import { leadStore } from '../store/leadStore';
import { scrapeCompetitorUrl } from './competitorScraper';
import {
  buildSearchQueryFromCompetitor,
  buildSearchQueryFromAddress,
  searchForAirbnbListings,
  broadSearchForAirbnb,
} from './searchService';
import { findCandidates } from './airbnbCandidateFinder';
import { evaluateCandidates } from './matchingEngine';
import { calculateConfidence } from './confidenceScorer';

// --- Processing state ---

type QueueState = 'idle' | 'running' | 'paused' | 'stopping';

let queueState: QueueState = 'idle';
let processedCount = 0;
let totalCount = 0;
let currentLeadId: string | null = null;

/**
 * Read the current queue state. Using a function avoids TypeScript
 * narrowing the module-level variable after an assignment.
 */
function getState(): QueueState {
  return queueState;
}

/**
 * Get the next pending lead to process.
 * Queue A leads (with competitor URL) are prioritized over Queue B.
 */
export function getNextLeadToProcess(): Lead | null {
  const pending = leadStore.getPendingLeads();
  return pending.length > 0 ? pending[0] : null;
}

/**
 * Get current processing progress.
 */
export function getProcessingProgress(): {
  processed: number;
  total: number;
  currentLead: string | null;
  state: QueueState;
} {
  return {
    processed: processedCount,
    total: totalCount,
    currentLead: currentLeadId,
    state: queueState,
  };
}

/**
 * Pause the processing queue.
 */
export function pauseProcessing(): void {
  if (queueState === 'running') {
    queueState = 'paused';
  }
}

/**
 * Resume the processing queue.
 */
export function resumeProcessing(): void {
  if (queueState === 'paused') {
    queueState = 'running';
  }
}

/**
 * Stop the processing queue entirely.
 */
export function stopProcessing(): void {
  if (queueState === 'running' || queueState === 'paused') {
    queueState = 'stopping';
  }
}

/**
 * Process all pending leads in queue order (Queue A first, then Queue B).
 * Calls onProgress with each lead after it's processed.
 */
export async function processQueue(
  onProgress?: (lead: Lead) => void
): Promise<void> {
  if (queueState === 'running') {
    return; // Already running
  }

  queueState = 'running';
  const pending = leadStore.getPendingLeads();
  totalCount = pending.length;
  processedCount = 0;
  currentLeadId = null;

  for (const lead of pending) {
    // Check for pause/stop
    if (getState() === 'stopping') {
      break;
    }

    // Wait while paused
    while (getState() === 'paused') {
      await sleep(500);
      if (getState() === 'stopping') break;
    }

    if (getState() === 'stopping') {
      break;
    }

    currentLeadId = lead.id;

    // Mark as processing
    leadStore.updateLead(lead.id, { processing_status: 'processing' });

    try {
      const processedLead = await processLead(lead);

      if (onProgress) {
        onProgress(processedLead);
      }
    } catch (error) {
      // processLead handles its own errors, but catch any unexpected ones
      const message = error instanceof Error ? error.message : String(error);
      leadStore.updateLead(lead.id, {
        processing_status: 'failed',
        error_message: `Unexpected error: ${message}`,
      });
    }

    processedCount++;
  }

  currentLeadId = null;
  queueState = 'idle';
}

/**
 * Process a single lead through the full pipeline.
 *
 * Queue A (has competitor URL):
 *   1. Scrape competitor URL for property data
 *   2. Search for matching Airbnb listings
 *   3. Evaluate candidates with matching engine
 *   4. Calculate confidence score
 *
 * Queue B (no competitor URL):
 *   1. Search for Airbnb listings by address
 *   2. Evaluate candidates with matching engine
 *   3. Calculate confidence score
 */
export async function processLead(lead: Lead): Promise<Lead> {
  try {
    if (lead.queue === 'A') {
      return await processQueueALead(lead);
    } else {
      return await processQueueBLead(lead);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedLead = leadStore.updateLead(lead.id, {
      processing_status: 'failed',
      error_message: message,
    });
    return failedLead || lead;
  }
}

/**
 * Process a Queue A lead (has competitor URL).
 */
async function processQueueALead(lead: Lead): Promise<Lead> {
  let method: MethodUsed = 'competitor-based';

  // Step 1: Scrape competitor URL
  const scrapeResult = await scrapeCompetitorUrl(lead.competitor_listing_url);

  if (scrapeResult.success && scrapeResult.data) {
    // Update lead with competitor data
    leadStore.updateLead(lead.id, {
      competitor_status: 'valid',
      extracted_competitor_title: scrapeResult.data.title,
      extracted_competitor_description: scrapeResult.data.description,
      extracted_competitor_data: scrapeResult.data,
    });

    // Step 2: Search using competitor data
    const query = buildSearchQueryFromCompetitor(scrapeResult.data, lead);
    let searchResults = await searchForAirbnbListings(query);

    // If no results with site restriction, try broader search
    if (searchResults.length === 0) {
      searchResults = await broadSearchForAirbnb(query);
    }

    // Step 3: Find and evaluate candidates
    const candidates = await findCandidates(searchResults, lead);
    const scoredCandidates = evaluateCandidates(lead, candidates);

    // Step 4: Calculate confidence
    const topCandidate = scoredCandidates.length > 0 ? scoredCandidates[0] : null;
    const confidence = calculateConfidence(topCandidate, scoredCandidates);

    // Determine processing status from confidence
    const status = determineProcessingStatus(confidence.label);

    const updatedLead = leadStore.updateLead(lead.id, {
      candidate_airbnb_urls: scoredCandidates,
      final_airbnb_url: topCandidate?.url || '',
      confidence_score: confidence.score,
      confidence_label: confidence.label,
      reason: confidence.reason,
      analysis_notes: confidence.analysisNotes,
      method_used: method,
      processing_status: status,
    });

    return updatedLead || lead;
  } else {
    // Competitor scraping failed -- fall back to address-based search
    const competitorStatus = scrapeResult.error?.includes('blocked')
      ? 'blocked' as const
      : scrapeResult.error?.includes('unreachable')
        ? 'unreachable' as const
        : 'invalid' as const;

    leadStore.updateLead(lead.id, {
      competitor_status: competitorStatus,
      error_message: scrapeResult.error || 'Competitor scraping failed',
    });

    method = 'competitor-fallback';

    // Fall back to address-based search
    return await processAddressSearch(lead, method);
  }
}

/**
 * Process a Queue B lead (no competitor URL -- address-based search only).
 */
async function processQueueBLead(lead: Lead): Promise<Lead> {
  return await processAddressSearch(lead, 'address-based');
}

/**
 * Shared logic for searching by address.
 */
async function processAddressSearch(
  lead: Lead,
  method: MethodUsed
): Promise<Lead> {
  // Build address-based query
  const query = buildSearchQueryFromAddress(lead);
  let searchResults = await searchForAirbnbListings(query);

  // If no results with site restriction, try broader search
  if (searchResults.length === 0) {
    searchResults = await broadSearchForAirbnb(query);
  }

  // Find and evaluate candidates
  const candidates = await findCandidates(searchResults, lead);

  // Get the latest lead state (may have been updated with competitor data)
  const currentLead = leadStore.getLead(lead.id) || lead;
  const scoredCandidates = evaluateCandidates(currentLead, candidates);

  // Calculate confidence
  const topCandidate = scoredCandidates.length > 0 ? scoredCandidates[0] : null;
  const confidence = calculateConfidence(topCandidate, scoredCandidates);

  // Determine processing status from confidence
  const status = determineProcessingStatus(confidence.label);

  const updatedLead = leadStore.updateLead(lead.id, {
    candidate_airbnb_urls: scoredCandidates,
    final_airbnb_url: topCandidate?.url || '',
    confidence_score: confidence.score,
    confidence_label: confidence.label,
    reason: confidence.reason,
    analysis_notes: confidence.analysisNotes,
    method_used: method,
    processing_status: status,
  });

  return updatedLead || lead;
}

/**
 * Map a confidence label to a processing status.
 */
function determineProcessingStatus(label: ConfidenceLabel): ProcessingStatus {
  switch (label) {
    case 'High':
      return 'matched';
    case 'Medium':
      return 'probable_match';
    case 'Low':
      return 'needs_review';
    case 'None':
      return 'no_match';
    default:
      return 'needs_review';
  }
}

/**
 * Simple async sleep utility.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

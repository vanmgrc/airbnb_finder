import { Lead, ConfidenceLabel, MethodUsed, ProcessingStatus } from '../types';
import { leadStore } from '../store/leadStore';
import { scrapeCompetitorUrl } from './competitorScraper';
import { findAirbnbByImages } from './imageMatcher';
import {
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
 * Queue A (has competitor URL) — IMAGE-BASED MATCHING:
 *   1. Scrape competitor URL to extract property images
 *   2. Reverse image search each image via Google Lens
 *   3. Filter results for Airbnb URLs
 *   4. Exact image match = high confidence, visual match = medium
 *
 * Queue B (no competitor URL) — ADDRESS-BASED SEARCH:
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
 * Process a Queue A lead using IMAGE-BASED matching.
 *
 * This replicates the manual workflow:
 *   1. Open competitor URL → scrape property images
 *   2. For each image → reverse image search (Google Lens)
 *   3. Look at exact matches for airbnb.com URLs
 *   4. If found → copy URL. If not → no match.
 */
async function processQueueALead(lead: Lead): Promise<Lead> {
  // Step 1: Scrape competitor URL to get images
  const scrapeResult = await scrapeCompetitorUrl(lead.competitor_listing_url);

  if (scrapeResult.success && scrapeResult.data) {
    // Update lead with scraped data
    leadStore.updateLead(lead.id, {
      competitor_status: 'valid',
      extracted_competitor_title: scrapeResult.data.title,
      extracted_competitor_description: scrapeResult.data.description,
      extracted_competitor_data: scrapeResult.data,
    });

    const imageUrls = scrapeResult.data.imageUrls;

    if (imageUrls.length > 0) {
      // Step 2: Image-based matching (primary method)
      const imageResult = await findAirbnbByImages(imageUrls, lead);

      if (imageResult.found) {
        const topCandidate = imageResult.candidates[0];
        const isExact = topCandidate.score >= 90;

        const updatedLead = leadStore.updateLead(lead.id, {
          candidate_airbnb_urls: imageResult.candidates,
          final_airbnb_url: imageResult.airbnbUrl,
          confidence_score: topCandidate.score,
          confidence_label: isExact ? 'High' : 'Medium',
          reason: isExact
            ? 'Exact image match found on Airbnb via reverse image search'
            : 'Visual image match found on Airbnb — manual verification recommended',
          analysis_notes: imageResult.notes,
          method_used: 'image-based',
          processing_status: isExact ? 'matched' : 'probable_match',
        });

        return updatedLead || lead;
      }

      // No Airbnb found via images
      const updatedLead = leadStore.updateLead(lead.id, {
        candidate_airbnb_urls: [],
        final_airbnb_url: '',
        confidence_score: 0,
        confidence_label: 'None',
        reason: `No Airbnb listing found via reverse image search (${imageResult.imagesSearched} images searched)`,
        analysis_notes: imageResult.notes,
        method_used: 'image-based',
        processing_status: 'no_match',
      });

      return updatedLead || lead;
    }

    // No images extracted — fall back to address-based search
    leadStore.updateLead(lead.id, {
      analysis_notes: 'No images found on competitor page, falling back to address search',
    });
    return await processAddressSearch(lead, 'competitor-fallback');
  }

  // Competitor scraping failed — fall back to address-based search
  const competitorStatus = scrapeResult.error?.includes('blocked')
    ? ('blocked' as const)
    : scrapeResult.error?.includes('unreachable')
      ? ('unreachable' as const)
      : ('invalid' as const);

  leadStore.updateLead(lead.id, {
    competitor_status: competitorStatus,
    error_message: scrapeResult.error || 'Competitor scraping failed',
  });

  return await processAddressSearch(lead, 'competitor-fallback');
}

/**
 * Process a Queue B lead (no competitor URL — address-based search only).
 */
async function processQueueBLead(lead: Lead): Promise<Lead> {
  return await processAddressSearch(lead, 'address-based');
}

/**
 * Shared logic for searching by address (fallback for Queue A, primary for Queue B).
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

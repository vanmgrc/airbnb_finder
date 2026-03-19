import { Lead, AirbnbCandidate, MatchDetail } from '../types';
import { calculateSimilarity } from '../utils/textSimilarity';
import { addressSimilarity } from '../utils/addressNormalizer';

/**
 * Evaluate all candidates against a lead and return them sorted by score (highest first).
 * Each candidate's score and matchDetails are populated.
 */
export function evaluateCandidates(
  lead: Lead,
  candidates: AirbnbCandidate[]
): AirbnbCandidate[] {
  const scored = candidates.map((candidate) => {
    const { score, details } = scoreCandidate(lead, candidate);

    return {
      ...candidate,
      score,
      matchDetails: details,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

/**
 * Score a single candidate against a lead.
 *
 * Scoring weights (total = 100):
 *  - Address similarity:     30
 *  - Title similarity:       20
 *  - Description similarity: 15
 *  - Bedroom count match:    15
 *  - Bathroom count match:   10
 *  - Amenity overlap:        10
 *
 * Returns weighted score 0-100 and detail breakdown.
 */
export function scoreCandidate(
  lead: Lead,
  candidate: AirbnbCandidate
): { score: number; details: MatchDetail[] } {
  const details: MatchDetail[] = [];

  // --- 1. Address similarity (weight: 30) ---
  const addrResult = scoreAddress(lead, candidate);
  details.push({
    factor: 'Address',
    weight: 30,
    score: addrResult.rawScore,
    notes: addrResult.notes,
  });

  // --- 2. Title similarity (weight: 20) ---
  const titleResult = scoreTitle(lead, candidate);
  details.push({
    factor: 'Title',
    weight: 20,
    score: titleResult.rawScore,
    notes: titleResult.notes,
  });

  // --- 3. Description similarity (weight: 15) ---
  const descResult = scoreDescription(lead, candidate);
  details.push({
    factor: 'Description',
    weight: 15,
    score: descResult.rawScore,
    notes: descResult.notes,
  });

  // --- 4. Bedroom count match (weight: 15) ---
  const bedroomResult = scoreBedroomCount(lead, candidate);
  details.push({
    factor: 'Bedrooms',
    weight: 15,
    score: bedroomResult.rawScore,
    notes: bedroomResult.notes,
  });

  // --- 5. Bathroom count match (weight: 10) ---
  const bathroomResult = scoreBathroomCount(lead, candidate);
  details.push({
    factor: 'Bathrooms',
    weight: 10,
    score: bathroomResult.rawScore,
    notes: bathroomResult.notes,
  });

  // --- 6. Amenity overlap (weight: 10) ---
  const amenityResult = scoreAmenityOverlap(lead, candidate);
  details.push({
    factor: 'Amenities',
    weight: 10,
    score: amenityResult.rawScore,
    notes: amenityResult.notes,
  });

  // Calculate total weighted score (each detail.score is 0-1, weight sums to 100)
  const totalScore = details.reduce((sum, d) => sum + d.score * d.weight, 0);

  return {
    score: Math.round(totalScore * 100) / 100,
    details,
  };
}

// --- Individual scoring functions ---
// Each returns a rawScore 0-1 and a notes string.

function scoreAddress(
  lead: Lead,
  candidate: AirbnbCandidate
): { rawScore: number; notes: string } {
  const leadAddress = lead.full_address || lead.rental_address || '';
  const candidateAddress = candidate.location || '';

  if (!leadAddress && !candidateAddress) {
    return { rawScore: 0.5, notes: 'No address data available for either side' };
  }

  if (!leadAddress) {
    return { rawScore: 0.3, notes: 'No lead address to compare' };
  }

  if (!candidateAddress) {
    // Check if candidate title contains city/state hints
    const titleLower = candidate.title.toLowerCase();
    const cityInTitle =
      lead.rental_city && titleLower.includes(lead.rental_city.toLowerCase());
    const stateInTitle =
      lead.rental_state && titleLower.includes(lead.rental_state.toLowerCase());

    if (cityInTitle && stateInTitle) {
      return { rawScore: 0.5, notes: 'No candidate location field, but title mentions city and state' };
    }
    if (cityInTitle) {
      return { rawScore: 0.4, notes: 'No candidate location field, but title mentions city' };
    }
    return { rawScore: 0.3, notes: 'No candidate location to compare' };
  }

  const similarity = addressSimilarity(leadAddress, candidateAddress);

  // Also check if candidate title contains city/state for a boost
  const titleLower = candidate.title.toLowerCase();
  const cityInTitle =
    lead.rental_city && titleLower.includes(lead.rental_city.toLowerCase());
  const stateInTitle =
    lead.rental_state && titleLower.includes(lead.rental_state.toLowerCase());

  let adjustedScore = similarity;
  if (cityInTitle && similarity < 0.7) {
    adjustedScore = Math.max(adjustedScore, 0.5);
  }
  if (stateInTitle && cityInTitle) {
    adjustedScore = Math.max(adjustedScore, 0.6);
  }

  const pct = (adjustedScore * 100).toFixed(0);
  if (adjustedScore >= 0.8) {
    return { rawScore: adjustedScore, notes: `Strong address match (${pct}%)` };
  }
  if (adjustedScore >= 0.5) {
    return { rawScore: adjustedScore, notes: `Partial address match (${pct}%)` };
  }
  return { rawScore: adjustedScore, notes: `Weak address match (${pct}%)` };
}

function scoreTitle(
  lead: Lead,
  candidate: AirbnbCandidate
): { rawScore: number; notes: string } {
  const competitorTitle = lead.extracted_competitor_title || '';
  const candidateTitle = candidate.title || '';

  if (!competitorTitle && !candidateTitle) {
    return { rawScore: 0.5, notes: 'No title data available' };
  }

  if (!competitorTitle) {
    // No competitor data to compare; check if candidate title references the lead's city
    if (
      lead.rental_city &&
      candidateTitle.toLowerCase().includes(lead.rental_city.toLowerCase())
    ) {
      return { rawScore: 0.5, notes: 'Candidate title mentions lead city' };
    }
    return { rawScore: 0.3, notes: 'No competitor title to compare' };
  }

  if (!candidateTitle) {
    return { rawScore: 0.3, notes: 'No candidate title available' };
  }

  const similarity = calculateSimilarity(competitorTitle, candidateTitle);

  const pct = (similarity * 100).toFixed(0);
  if (similarity >= 0.8) {
    return { rawScore: similarity, notes: `Titles very similar (${pct}%)` };
  }
  if (similarity >= 0.5) {
    return { rawScore: similarity, notes: `Titles partially similar (${pct}%)` };
  }
  return { rawScore: similarity, notes: `Titles differ (${pct}%)` };
}

function scoreDescription(
  lead: Lead,
  candidate: AirbnbCandidate
): { rawScore: number; notes: string } {
  const competitorDesc = lead.extracted_competitor_description || '';
  const candidateDesc = candidate.description || '';

  if (!competitorDesc && !candidateDesc) {
    return { rawScore: 0.5, notes: 'No description data available' };
  }

  if (!competitorDesc) {
    return { rawScore: 0.3, notes: 'No competitor description to compare' };
  }

  if (!candidateDesc) {
    return { rawScore: 0.3, notes: 'No candidate description available' };
  }

  const similarity = calculateSimilarity(competitorDesc, candidateDesc);

  const pct = (similarity * 100).toFixed(0);
  if (similarity >= 0.7) {
    return { rawScore: similarity, notes: `Descriptions very similar (${pct}%)` };
  }
  if (similarity >= 0.4) {
    return { rawScore: similarity, notes: `Descriptions partially similar (${pct}%)` };
  }
  return { rawScore: similarity, notes: `Descriptions differ (${pct}%)` };
}

function scoreBedroomCount(
  lead: Lead,
  candidate: AirbnbCandidate
): { rawScore: number; notes: string } {
  const competitorBedrooms = lead.extracted_competitor_data?.bedrooms ?? null;
  const candidateBedrooms = candidate.bedrooms;

  if (competitorBedrooms === null && candidateBedrooms === null) {
    return { rawScore: 0.5, notes: 'No bedroom data available' };
  }

  if (competitorBedrooms === null) {
    return { rawScore: 0.4, notes: 'No competitor bedroom count' };
  }

  if (candidateBedrooms === null) {
    return { rawScore: 0.4, notes: 'No candidate bedroom count' };
  }

  if (competitorBedrooms === candidateBedrooms) {
    return { rawScore: 1.0, notes: `Both have ${competitorBedrooms} bedroom(s)` };
  }

  const diff = Math.abs(competitorBedrooms - candidateBedrooms);
  if (diff === 1) {
    return {
      rawScore: 0.5,
      notes: `Close: competitor has ${competitorBedrooms}, candidate has ${candidateBedrooms}`,
    };
  }

  return {
    rawScore: Math.max(0, 1 - diff * 0.3),
    notes: `Mismatch: competitor has ${competitorBedrooms}, candidate has ${candidateBedrooms}`,
  };
}

function scoreBathroomCount(
  lead: Lead,
  candidate: AirbnbCandidate
): { rawScore: number; notes: string } {
  const competitorBathrooms = lead.extracted_competitor_data?.bathrooms ?? null;
  const candidateBathrooms = candidate.bathrooms;

  if (competitorBathrooms === null && candidateBathrooms === null) {
    return { rawScore: 0.5, notes: 'No bathroom data available' };
  }

  if (competitorBathrooms === null) {
    return { rawScore: 0.4, notes: 'No competitor bathroom count' };
  }

  if (candidateBathrooms === null) {
    return { rawScore: 0.4, notes: 'No candidate bathroom count' };
  }

  if (competitorBathrooms === candidateBathrooms) {
    return { rawScore: 1.0, notes: `Both have ${competitorBathrooms} bathroom(s)` };
  }

  const diff = Math.abs(competitorBathrooms - candidateBathrooms);
  if (diff <= 0.5) {
    return {
      rawScore: 0.7,
      notes: `Close: competitor has ${competitorBathrooms}, candidate has ${candidateBathrooms}`,
    };
  }

  if (diff === 1) {
    return {
      rawScore: 0.5,
      notes: `Slight difference: competitor has ${competitorBathrooms}, candidate has ${candidateBathrooms}`,
    };
  }

  return {
    rawScore: Math.max(0, 1 - diff * 0.3),
    notes: `Mismatch: competitor has ${competitorBathrooms}, candidate has ${candidateBathrooms}`,
  };
}

function scoreAmenityOverlap(
  lead: Lead,
  candidate: AirbnbCandidate
): { rawScore: number; notes: string } {
  const competitorAmenities = lead.extracted_competitor_data?.amenities || [];
  const candidateAmenities = candidate.amenities || [];

  if (competitorAmenities.length === 0 && candidateAmenities.length === 0) {
    return { rawScore: 0.5, notes: 'No amenity data available' };
  }

  if (competitorAmenities.length === 0) {
    return { rawScore: 0.4, notes: 'No competitor amenities to compare' };
  }

  if (candidateAmenities.length === 0) {
    return { rawScore: 0.4, notes: 'No candidate amenities available' };
  }

  // Normalize amenity strings for comparison
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  const compSet = new Set(competitorAmenities.map(normalize));
  const candSet = new Set(candidateAmenities.map(normalize));

  let overlap = 0;
  for (const amenity of compSet) {
    if (candSet.has(amenity)) {
      overlap++;
    } else {
      // Check for partial matches (e.g., "wifi" vs "free wifi")
      for (const candAmenity of candSet) {
        if (candAmenity.includes(amenity) || amenity.includes(candAmenity)) {
          overlap += 0.5;
          break;
        }
      }
    }
  }

  const totalUnique = new Set([
    ...competitorAmenities.map(normalize),
    ...candidateAmenities.map(normalize),
  ]).size;

  const rawScore = totalUnique > 0 ? Math.min(1, overlap / totalUnique) : 0;

  const overlapPct = (rawScore * 100).toFixed(0);
  if (rawScore >= 0.6) {
    return { rawScore, notes: `Good amenity overlap (${overlapPct}%, ${Math.round(overlap)} shared)` };
  }
  if (rawScore >= 0.3) {
    return { rawScore, notes: `Some amenity overlap (${overlapPct}%, ${Math.round(overlap)} shared)` };
  }
  return { rawScore, notes: `Low amenity overlap (${overlapPct}%)` };
}

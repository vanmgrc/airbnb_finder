import { AirbnbCandidate, ConfidenceLabel } from '../types';

/**
 * Calculate a confidence assessment based on the top candidate's score
 * and the gap to the next-best candidate.
 *
 * Thresholds:
 *  - High:   top score >= 75 AND gap to next candidate >= 15
 *  - Medium: top score >= 50
 *  - Low:    top score >= 25
 *  - None:   top score < 25 OR no candidates
 */
export function calculateConfidence(
  topCandidate: AirbnbCandidate | null,
  allCandidates: AirbnbCandidate[]
): {
  score: number;
  label: ConfidenceLabel;
  reason: string;
  analysisNotes: string;
} {
  // No candidates at all
  if (!topCandidate || allCandidates.length === 0) {
    return {
      score: 0,
      label: 'None',
      reason: 'No Airbnb listing candidates were found',
      analysisNotes: 'Search returned no matching Airbnb listings.',
    };
  }

  const topScore = topCandidate.score;

  // Calculate the gap to the next candidate
  const sortedCandidates = [...allCandidates].sort((a, b) => b.score - a.score);
  const nextCandidate = sortedCandidates.length > 1 ? sortedCandidates[1] : null;
  const gap = nextCandidate
    ? topScore - nextCandidate.score
    : topScore; // If only one candidate, gap equals the score itself

  // Build analysis notes
  const notesParts: string[] = [];
  notesParts.push(`Top candidate score: ${topScore.toFixed(1)}/100`);
  notesParts.push(`Total candidates evaluated: ${allCandidates.length}`);

  if (nextCandidate) {
    notesParts.push(
      `Gap to next candidate: ${gap.toFixed(1)} points (next score: ${nextCandidate.score.toFixed(1)})`
    );
  } else {
    notesParts.push('Only one candidate found');
  }

  // Include match/mismatch summaries from match details
  const matchFactors = topCandidate.matchDetails
    .filter((d) => d.score >= 0.6)
    .map((d) => `${d.factor}: ${d.notes}`);
  const mismatchFactors = topCandidate.matchDetails
    .filter((d) => d.score < 0.3 && d.weight > 0)
    .map((d) => `${d.factor}: ${d.notes}`);

  if (matchFactors.length > 0) {
    notesParts.push(`Match factors: ${matchFactors.join('; ')}`);
  }

  if (mismatchFactors.length > 0) {
    notesParts.push(`Mismatch factors: ${mismatchFactors.join('; ')}`);
  }

  const analysisNotes = notesParts.join('\n');

  // Determine confidence level
  if (topScore >= 75 && gap >= 15) {
    return {
      score: topScore,
      label: 'High',
      reason: buildHighConfidenceReason(topCandidate, gap, allCandidates.length, matchFactors),
      analysisNotes,
    };
  }

  if (topScore >= 50) {
    if (topScore >= 75 && gap < 15) {
      return {
        score: topScore,
        label: 'Medium',
        reason: `High score (${topScore.toFixed(1)}) but close second candidate (gap: ${gap.toFixed(1)}). Manual review recommended.`,
        analysisNotes,
      };
    }

    return {
      score: topScore,
      label: 'Medium',
      reason: buildMediumConfidenceReason(topCandidate, gap, allCandidates.length, mismatchFactors),
      analysisNotes,
    };
  }

  if (topScore >= 25) {
    return {
      score: topScore,
      label: 'Low',
      reason: buildLowConfidenceReason(topCandidate, allCandidates.length, mismatchFactors),
      analysisNotes,
    };
  }

  return {
    score: topScore,
    label: 'None',
    reason: `Top candidate scored only ${topScore.toFixed(1)}/100, below the minimum threshold.`,
    analysisNotes,
  };
}

function buildHighConfidenceReason(
  candidate: AirbnbCandidate,
  gap: number,
  totalCandidates: number,
  matchFactors: string[]
): string {
  const parts: string[] = [];
  parts.push(`Strong match found with score ${candidate.score.toFixed(1)}/100`);

  if (gap > 30) {
    parts.push(`clearly the best match (${gap.toFixed(1)} point lead)`);
  } else {
    parts.push(`leading next candidate by ${gap.toFixed(1)} points`);
  }

  if (matchFactors.length > 0) {
    parts.push(`Key matches: ${matchFactors.slice(0, 3).join(', ')}`);
  }

  if (totalCandidates === 1) {
    parts.push('Only candidate found');
  }

  return parts.join('. ') + '.';
}

function buildMediumConfidenceReason(
  candidate: AirbnbCandidate,
  gap: number,
  totalCandidates: number,
  mismatchFactors: string[]
): string {
  const parts: string[] = [];
  parts.push(`Probable match with score ${candidate.score.toFixed(1)}/100`);

  if (gap < 10 && totalCandidates > 1) {
    parts.push('Multiple similar candidates found - manual review recommended');
  }

  if (mismatchFactors.length > 0) {
    parts.push(`Some mismatches: ${mismatchFactors.slice(0, 2).join(', ')}`);
  }

  return parts.join('. ') + '.';
}

function buildLowConfidenceReason(
  candidate: AirbnbCandidate,
  totalCandidates: number,
  mismatchFactors: string[]
): string {
  const parts: string[] = [];
  parts.push(`Weak match with score ${candidate.score.toFixed(1)}/100`);

  if (mismatchFactors.length > 0) {
    parts.push(`Significant mismatches: ${mismatchFactors.slice(0, 3).join(', ')}`);
  }

  if (totalCandidates > 3) {
    parts.push(`${totalCandidates} candidates evaluated, none scored well`);
  }

  parts.push('Manual investigation recommended');

  return parts.join('. ') + '.';
}

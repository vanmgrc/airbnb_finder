import { calculateSimilarity } from './textSimilarity';

/**
 * Map of common address abbreviations to their full forms.
 */
const ABBREVIATIONS: Record<string, string> = {
  'st': 'street',
  'str': 'street',
  'ave': 'avenue',
  'av': 'avenue',
  'blvd': 'boulevard',
  'bvd': 'boulevard',
  'dr': 'drive',
  'drv': 'drive',
  'ct': 'court',
  'crt': 'court',
  'cir': 'circle',
  'ln': 'lane',
  'rd': 'road',
  'pl': 'place',
  'plz': 'plaza',
  'pkwy': 'parkway',
  'pky': 'parkway',
  'hwy': 'highway',
  'hw': 'highway',
  'trl': 'trail',
  'tr': 'trail',
  'ter': 'terrace',
  'terr': 'terrace',
  'way': 'way',
  'pt': 'point',
  'crk': 'creek',
  'xing': 'crossing',
  'apt': 'apartment',
  'ste': 'suite',
  'fl': 'floor',
  'flr': 'floor',
  'bldg': 'building',
  'rm': 'room',
  'dept': 'department',
  'ofc': 'office',
  'n': 'north',
  's': 'south',
  'e': 'east',
  'w': 'west',
  'ne': 'northeast',
  'nw': 'northwest',
  'se': 'southeast',
  'sw': 'southwest',
  'mt': 'mount',
  'ft': 'fort',
};

/**
 * US state abbreviation to full name mapping.
 */
const STATE_ABBREVIATIONS: Record<string, string> = {
  'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas',
  'ca': 'california', 'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware',
  'fl': 'florida', 'ga': 'georgia', 'hi': 'hawaii', 'id': 'idaho',
  'il': 'illinois', 'in': 'indiana', 'ia': 'iowa', 'ks': 'kansas',
  'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
  'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi',
  'mo': 'missouri', 'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada',
  'nh': 'new hampshire', 'nj': 'new jersey', 'nm': 'new mexico', 'ny': 'new york',
  'nc': 'north carolina', 'nd': 'north dakota', 'oh': 'ohio', 'ok': 'oklahoma',
  'or': 'oregon', 'pa': 'pennsylvania', 'ri': 'rhode island', 'sc': 'south carolina',
  'sd': 'south dakota', 'tn': 'tennessee', 'tx': 'texas', 'ut': 'utah',
  'vt': 'vermont', 'va': 'virginia', 'wa': 'washington', 'wv': 'west virginia',
  'wi': 'wisconsin', 'wy': 'wyoming', 'dc': 'district of columbia',
};

/**
 * Normalize an address string by expanding abbreviations, standardizing
 * punctuation, whitespace, and capitalization.
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';

  let normalized = address
    .toLowerCase()
    .trim()
    // Remove periods after abbreviations (e.g., "St." -> "St")
    .replace(/\./g, '')
    // Remove commas
    .replace(/,/g, ' ')
    // Remove hash/pound signs before unit numbers (e.g., "#12" -> "12")
    .replace(/#\s*/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  // Expand abbreviations word by word
  const words = normalized.split(/\s+/);
  const expandedWords = words.map((word) => {
    const lower = word.toLowerCase();
    if (ABBREVIATIONS[lower]) {
      return ABBREVIATIONS[lower];
    }
    return lower;
  });

  normalized = expandedWords.join(' ').trim();

  return normalized;
}

/**
 * Build a full address string from component parts.
 * Joins non-empty parts with appropriate separators.
 */
export function buildFullAddress(parts: {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}): string {
  const components: string[] = [];

  if (parts.address && parts.address.trim()) {
    components.push(parts.address.trim());
  }
  if (parts.city && parts.city.trim()) {
    components.push(parts.city.trim());
  }

  // State and zip are combined
  const stateZip: string[] = [];
  if (parts.state && parts.state.trim()) {
    stateZip.push(parts.state.trim());
  }
  if (parts.zip && parts.zip.trim()) {
    stateZip.push(parts.zip.trim());
  }

  if (stateZip.length > 0) {
    components.push(stateZip.join(' '));
  }

  return components.join(', ');
}

/**
 * Attempt to extract address parts from a full address string.
 * Uses common patterns like "123 Main St, City, State ZIP".
 *
 * This is a best-effort parser and may not handle all formats.
 */
export function extractAddressParts(fullAddress: string): {
  street: string;
  city: string;
  state: string;
  zip: string;
} {
  const result = { street: '', city: '', state: '', zip: '' };

  if (!fullAddress) return result;

  const trimmed = fullAddress.trim();

  // Try to extract zip code (5-digit or 5+4 format)
  const zipMatch = trimmed.match(/\b(\d{5}(?:-\d{4})?)\s*$/);
  let remaining = trimmed;
  if (zipMatch) {
    result.zip = zipMatch[1];
    remaining = remaining.slice(0, zipMatch.index).trim();
    // Remove trailing comma if present
    remaining = remaining.replace(/,\s*$/, '').trim();
  }

  // Try to extract state (2-letter abbreviation or full name at the end)
  const stateAbbrMatch = remaining.match(/,?\s+([A-Za-z]{2})\s*$/);
  if (stateAbbrMatch) {
    const candidate = stateAbbrMatch[1].toLowerCase();
    if (STATE_ABBREVIATIONS[candidate]) {
      result.state = stateAbbrMatch[1].toUpperCase();
      remaining = remaining.slice(0, stateAbbrMatch.index).trim();
      remaining = remaining.replace(/,\s*$/, '').trim();
    }
  }

  // If no state abbreviation found, check for full state names
  if (!result.state) {
    const lowerRemaining = remaining.toLowerCase();
    for (const [abbr, fullName] of Object.entries(STATE_ABBREVIATIONS)) {
      if (lowerRemaining.endsWith(fullName)) {
        result.state = abbr.toUpperCase();
        remaining = remaining.slice(0, remaining.length - fullName.length).trim();
        remaining = remaining.replace(/,\s*$/, '').trim();
        break;
      }
    }
  }

  // Split remaining into street and city by last comma
  const lastComma = remaining.lastIndexOf(',');
  if (lastComma !== -1) {
    result.street = remaining.slice(0, lastComma).trim();
    result.city = remaining.slice(lastComma + 1).trim();
  } else {
    // If no comma, treat the whole thing as the street address
    result.street = remaining.trim();
  }

  return result;
}

/**
 * Compare two addresses for similarity after normalization.
 * Returns a score between 0 and 1.
 *
 * Uses a weighted approach:
 * - Pure string similarity on normalized addresses: 0.5
 * - Numeric token matching (street numbers, zip): 0.3
 * - Word overlap (ignoring order): 0.2
 */
export function addressSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const normA = normalizeAddress(a);
  const normB = normalizeAddress(b);

  if (normA === normB) return 1;
  if (normA.length === 0 || normB.length === 0) return 0;

  // 1. String similarity on normalized addresses
  const stringSim = calculateSimilarity(normA, normB);

  // 2. Numeric token matching (street numbers, zip codes, unit numbers)
  const numsA = normA.match(/\d+/g) || [];
  const numsB = normB.match(/\d+/g) || [];
  let numericScore = 0;
  if (numsA.length > 0 && numsB.length > 0) {
    const setA = new Set(numsA);
    const setB = new Set(numsB);
    let intersection = 0;
    for (const num of setA) {
      if (setB.has(num)) intersection++;
    }
    const union = new Set([...numsA, ...numsB]).size;
    numericScore = union > 0 ? intersection / union : 0;
  } else if (numsA.length === 0 && numsB.length === 0) {
    // Both have no numbers -- neutral, don't penalize
    numericScore = 0.5;
  }

  // 3. Word overlap (Jaccard similarity ignoring order)
  const wordsA = new Set(normA.split(/\s+/).filter((w) => w.length > 0));
  const wordsB = new Set(normB.split(/\s+/).filter((w) => w.length > 0));
  let wordIntersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) wordIntersection++;
  }
  const wordUnion = new Set([...wordsA, ...wordsB]).size;
  const wordOverlap = wordUnion > 0 ? wordIntersection / wordUnion : 0;

  // Weighted combination
  return stringSim * 0.5 + numericScore * 0.3 + wordOverlap * 0.2;
}

import stringSimilarity from 'string-similarity';
import Fuse from 'fuse.js';

/**
 * Normalize text for comparison: lowercase, remove extra whitespace, trim.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two strings using the string-similarity library
 * (Dice coefficient). Returns a score between 0 and 1.
 */
export function calculateSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const normalA = normalizeText(a);
  const normalB = normalizeText(b);

  if (normalA === normalB) return 1;
  if (normalA.length === 0 || normalB.length === 0) return 0;

  return stringSimilarity.compareTwoStrings(normalA, normalB);
}

/**
 * Fuzzy match a query against a list of candidate strings using Fuse.js.
 * Returns candidates sorted by match quality (best first) with scores from 0 to 1,
 * where 1 means perfect match.
 */
export function fuzzyMatch(
  query: string,
  candidates: string[]
): { match: string; score: number }[] {
  if (!query || candidates.length === 0) return [];

  const fuse = new Fuse(
    candidates.map((c) => ({ text: c })),
    {
      keys: ['text'],
      includeScore: true,
      threshold: 0.6,
      ignoreLocation: true,
      minMatchCharLength: 2,
    }
  );

  const results = fuse.search(query);

  return results.map((result) => ({
    match: result.item.text,
    // Fuse.js score: 0 = perfect match, 1 = no match. Invert it for our 0-1 scale.
    score: result.score !== undefined ? 1 - result.score : 0,
  }));
}

// Common English stop words to filter out when extracting key phrases
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'were',
  'are', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we',
  'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'its', 'our', 'their', 'not', 'no', 'so', 'if', 'up', 'out',
  'about', 'into', 'over', 'after', 'just', 'also', 'than', 'very',
]);

/**
 * Extract notable key phrases from text.
 * Returns significant single words (length >= 4, non-stop-word),
 * meaningful bigrams, and trigrams.
 */
export function extractKeyPhrases(text: string): string[] {
  if (!text) return [];

  const normalized = normalizeText(text);
  // Remove punctuation for phrase extraction but keep alphanumeric and spaces
  const cleaned = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return [];

  const phrases: string[] = [];
  const seen = new Set<string>();

  // Extract significant single words (non-stop, length >= 4)
  for (const word of words) {
    if (!STOP_WORDS.has(word) && word.length >= 4 && !seen.has(word)) {
      seen.add(word);
      phrases.push(word);
    }
  }

  // Extract bigrams (2-word phrases) where at least one word is not a stop word
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];

    if (STOP_WORDS.has(w1) && STOP_WORDS.has(w2)) continue;
    if (w1.length < 2 || w2.length < 2) continue;

    const phrase = `${w1} ${w2}`;
    if (!seen.has(phrase)) {
      seen.add(phrase);
      phrases.push(phrase);
    }
  }

  // Extract trigrams (3-word phrases) where at least two words are not stop words
  for (let i = 0; i < words.length - 2; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    const w3 = words[i + 2];

    const nonStop = [w1, w2, w3].filter((w) => !STOP_WORDS.has(w));
    if (nonStop.length < 2) continue;
    if (w1.length < 2 || w2.length < 2 || w3.length < 2) continue;

    const phrase = `${w1} ${w2} ${w3}`;
    if (!seen.has(phrase)) {
      seen.add(phrase);
      phrases.push(phrase);
    }
  }

  return phrases;
}

import { SearchResult, AirbnbCandidate, Lead } from '../types';
import { isAirbnbUrl, extractAirbnbListingId } from '../utils/urlValidator';
import { getScraperProvider } from '../providers/scraperProvider';

/**
 * Find Airbnb listing candidates from search results.
 * Filters for valid Airbnb URLs, deduplicates, and extracts listing data.
 */
export async function findCandidates(
  searchResults: SearchResult[],
  lead: Lead
): Promise<AirbnbCandidate[]> {
  // Filter for Airbnb URLs only
  const airbnbResults = searchResults.filter((result) => isAirbnbUrl(result.url));

  // Deduplicate by listing ID
  const seenListingIds = new Set<string>();
  const uniqueResults: SearchResult[] = [];

  for (const result of airbnbResults) {
    const listingId = extractAirbnbListingId(result.url);
    if (listingId && !seenListingIds.has(listingId)) {
      seenListingIds.add(listingId);
      uniqueResults.push(result);
    } else if (!listingId) {
      // If we cannot extract an ID, deduplicate by URL path
      const normalizedUrl = result.url.split('?')[0].toLowerCase();
      if (!seenListingIds.has(normalizedUrl)) {
        seenListingIds.add(normalizedUrl);
        uniqueResults.push(result);
      }
    }
  }

  // Skip the existing Airbnb URL if the lead already has one
  const existingId = lead.existing_airbnb_url
    ? extractAirbnbListingId(lead.existing_airbnb_url)
    : null;

  // Extract data from each candidate
  const candidates: AirbnbCandidate[] = [];

  for (const result of uniqueResults) {
    const listingId = extractAirbnbListingId(result.url);
    if (existingId && listingId === existingId) {
      continue; // Skip the already-known listing
    }

    const extracted = await extractAirbnbListingData(result.url);

    const candidate: AirbnbCandidate = {
      url: result.url,
      title: extracted?.title || result.title || '',
      description: extracted?.description || result.snippet || '',
      bedrooms: extracted?.bedrooms ?? null,
      bathrooms: extracted?.bathrooms ?? null,
      sleeps: extracted?.sleeps ?? null,
      amenities: extracted?.amenities || [],
      imageUrls: extracted?.imageUrls || [],
      location: extracted?.location || '',
      score: 0,
      matchDetails: [],
    };

    candidates.push(candidate);
  }

  return candidates;
}

/**
 * Extract listing data from an Airbnb URL using the scraper provider.
 */
export async function extractAirbnbListingData(
  url: string
): Promise<(Partial<AirbnbCandidate> & { location?: string }) | null> {
  try {
    const provider = getScraperProvider();
    const available = await provider.isAvailable();
    if (!available) return null;

    const scrapedData = await provider.scrape(url);

    return {
      title: scrapedData.title || '',
      description: scrapedData.description || '',
      bedrooms: scrapedData.bedrooms,
      bathrooms: scrapedData.bathrooms,
      sleeps: scrapedData.sleeps,
      amenities: scrapedData.amenities || [],
      imageUrls: scrapedData.imageUrls || [],
      location: scrapedData.addressHints || '',
    };
  } catch (error) {
    console.error(`Failed to extract Airbnb listing data from ${url}:`, error);
    return null;
  }
}

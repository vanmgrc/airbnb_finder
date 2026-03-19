import { ExtractedPropertyData, SearchResult, Lead } from '../types';
import { getSearchProvider } from '../providers/searchProvider';

/**
 * Build a search query from extracted competitor data and lead info.
 * Prioritizes unique phrases and property-specific details.
 */
export function buildSearchQueryFromCompetitor(
  data: ExtractedPropertyData,
  lead: Lead
): string {
  const queryParts: string[] = [];

  // Prioritize unique phrases from the competitor listing
  if (data.uniquePhrases.length > 0) {
    // Use the first unique phrase (usually the property name)
    const phrase = data.uniquePhrases[0];
    if (phrase.length <= 60) {
      queryParts.push(`"${phrase}"`);
    }
  }

  // Add the property title if available and not too generic
  if (data.title) {
    const cleanTitle = data.title
      .replace(/\s*[-|]\s*.+$/, '') // Remove site name suffixes
      .trim();
    if (cleanTitle.length > 5 && cleanTitle.length <= 80) {
      // Avoid duplication if a unique phrase was already used and is similar
      if (queryParts.length === 0 || !queryParts[0].includes(cleanTitle)) {
        queryParts.push(cleanTitle);
      }
    }
  }

  // Add address information
  if (lead.full_address) {
    queryParts.push(lead.full_address);
  } else {
    const addressParts: string[] = [];
    if (lead.rental_address) addressParts.push(lead.rental_address);
    if (lead.rental_city) addressParts.push(lead.rental_city);
    if (lead.rental_state) addressParts.push(lead.rental_state);
    if (addressParts.length > 0) {
      queryParts.push(addressParts.join(', '));
    }
  }

  // Add address hints from scraping if no address from lead
  if (!lead.full_address && !lead.rental_address && data.addressHints) {
    queryParts.push(data.addressHints);
  }

  // Always include "airbnb" to target results
  queryParts.push('airbnb');

  return queryParts.join(' ');
}

/**
 * Build a search query from address only (for Queue B leads without competitor URLs).
 */
export function buildSearchQueryFromAddress(lead: Lead): string {
  const queryParts: string[] = [];

  if (lead.full_address) {
    queryParts.push(lead.full_address);
  } else {
    if (lead.rental_address) queryParts.push(lead.rental_address);
    if (lead.rental_city) queryParts.push(lead.rental_city);
    if (lead.rental_state) queryParts.push(lead.rental_state);
    if (lead.rental_zip) queryParts.push(lead.rental_zip);
  }

  // Add owner name if available (may help identify the listing)
  if (lead.owner_name) {
    queryParts.push(lead.owner_name);
  }

  // Add Airbnb targeting terms
  queryParts.push('airbnb listing');

  return queryParts.join(' ');
}

/**
 * Execute a search and filter results for Airbnb listings.
 */
export async function searchForAirbnbListings(
  query: string
): Promise<SearchResult[]> {
  const provider = getSearchProvider();

  const results = await provider.search(query, {
    maxResults: 10,
    siteRestrict: 'airbnb.com',
  });

  // Filter for results that reference Airbnb
  const airbnbResults = results.filter((r) => {
    const url = r.url.toLowerCase();
    return url.includes('airbnb.com') || url.includes('airbnb');
  });

  return airbnbResults;
}

/**
 * Execute a broader search without site restriction, then filter.
 * Useful as a fallback when site-restricted search yields no results.
 */
export async function broadSearchForAirbnb(
  query: string
): Promise<SearchResult[]> {
  const provider = getSearchProvider();

  const results = await provider.search(query, {
    maxResults: 20,
  });

  // Filter for results that are on airbnb.com
  return results.filter((r) => {
    const url = r.url.toLowerCase();
    return url.includes('airbnb.com');
  });
}

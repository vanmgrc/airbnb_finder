import { Lead, AirbnbCandidate } from '../types';
import { getImageSearchProvider } from '../providers/imageSearchProvider';
import { isAirbnbUrl, extractAirbnbListingId, normalizeAirbnbUrl } from '../utils/urlValidator';

export interface ImageMatchResult {
  found: boolean;
  airbnbUrl: string;
  candidates: AirbnbCandidate[];
  imagesSearched: number;
  notes: string;
}

/**
 * Find Airbnb listings by reverse image searching competitor property photos.
 *
 * Mimics the manual workflow:
 *   1. Open competitor URL
 *   2. Right-click image → Search with Google Lens
 *   3. Click "Exact matches" tab
 *   4. Look for airbnb.com results
 *   5. Copy URL if found, mark "no match" if not
 */
export async function findAirbnbByImages(
  imageUrls: string[],
  lead: Lead
): Promise<ImageMatchResult> {
  const provider = getImageSearchProvider();
  const candidates: AirbnbCandidate[] = [];
  const seenListingIds = new Set<string>();
  let imagesSearched = 0;
  const notesParts: string[] = [];

  // Skip existing airbnb URL
  const existingId = lead.existing_airbnb_url
    ? extractAirbnbListingId(lead.existing_airbnb_url)
    : null;

  // Search up to 5 images (main photos are usually first)
  const imagesToSearch = imageUrls.slice(0, 5);

  for (const imageUrl of imagesToSearch) {
    imagesSearched++;

    try {
      const results = await provider.reverseImageSearch(imageUrl);
      const airbnbResults = results.filter((r) => isAirbnbUrl(r.url));

      notesParts.push(
        `Image ${imagesSearched}: ${results.length} total results, ${airbnbResults.length} Airbnb`
      );

      for (const result of airbnbResults) {
        const listingId = extractAirbnbListingId(result.url);

        // Skip duplicates
        if (listingId && seenListingIds.has(listingId)) continue;
        if (listingId) seenListingIds.add(listingId);

        // Skip the lead's existing Airbnb URL
        if (existingId && listingId === existingId) continue;

        const isExact = result.source === 'exact_match';
        const score = isExact ? 95 : 65;

        candidates.push({
          url: normalizeAirbnbUrl(result.url) || result.url,
          title: result.title || '',
          description: result.snippet || '',
          bedrooms: null,
          bathrooms: null,
          sleeps: null,
          amenities: [],
          imageUrls: [imageUrl],
          location: '',
          score,
          matchDetails: [
            {
              factor: 'Image Match',
              weight: 100,
              score: score / 100,
              notes: isExact
                ? `Exact image match found on Airbnb (competitor image #${imagesSearched})`
                : `Visual image match found on Airbnb (competitor image #${imagesSearched})`,
            },
          ],
        });
      }

      // If we found an exact match, stop searching more images
      if (candidates.some((c) => c.score >= 90)) {
        notesParts.push('Exact match found — stopped searching');
        break;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      notesParts.push(`Image ${imagesSearched} failed: ${msg}`);
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  const topCandidate = candidates[0] || null;

  return {
    found: !!topCandidate,
    airbnbUrl: topCandidate?.url || '',
    candidates,
    imagesSearched,
    notes: notesParts.join('. '),
  };
}

import { ImageSearchProvider, SearchResult } from '../types';

/**
 * SerpApiImageSearchProvider uses SerpAPI's Google Lens endpoint for reverse image search.
 * This is the real provider that mimics the manual workflow:
 *   Right-click image → Search with Google Lens → find matching pages
 *
 * Requires SERPAPI_KEY environment variable.
 */
export class SerpApiImageSearchProvider implements ImageSearchProvider {
  name = 'serpapi';

  async reverseImageSearch(imageUrl: string): Promise<SearchResult[]> {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      throw new Error(
        'SERPAPI_KEY not configured. Get an API key from https://serpapi.com'
      );
    }

    const results: SearchResult[] = [];

    // Use Google Lens for visual matches (the same tool the user uses manually)
    const lensResults = await this.googleLensSearch(imageUrl, apiKey);
    results.push(...lensResults);

    // Deduplicate by normalized URL
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = r.url.split('?')[0].toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async googleLensSearch(
    imageUrl: string,
    apiKey: string
  ): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      api_key: apiKey,
      engine: 'google_lens',
      url: imageUrl,
    });

    const response = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`,
      { signal: AbortSignal.timeout(30000) }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `SerpAPI Google Lens error: ${response.status} ${response.statusText} - ${text}`
      );
    }

    const data = await response.json();

    const results: SearchResult[] = [];

    // Parse visual_matches - these are visually similar images found across the web
    const visualMatches = data.visual_matches || [];
    for (const match of visualMatches) {
      if (!match.link) continue;
      results.push({
        url: match.link,
        title: match.title || '',
        snippet: match.snippet || match.source || '',
        source: 'visual_match',
      });
    }

    // Parse exact_matches if available (pages with the exact same image)
    const exactMatches = data.exact_matches || [];
    for (const match of exactMatches) {
      if (!match.link) continue;
      results.push({
        url: match.link,
        title: match.title || '',
        snippet: match.snippet || match.source || '',
        source: 'exact_match',
      });
    }

    return results;
  }
}

/**
 * MockImageSearchProvider returns fake reverse image search results for testing.
 * Simulates the real flow: some images find Airbnb matches, some don't.
 */
export class MockImageSearchProvider implements ImageSearchProvider {
  name = 'mock';

  async reverseImageSearch(imageUrl: string): Promise<SearchResult[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const hash = this.simpleHash(imageUrl);

    // ~60% of images produce an Airbnb match (realistic for properties cross-listed)
    const hasAirbnbMatch = hash % 10 < 6;

    const results: SearchResult[] = [];

    if (hasAirbnbMatch) {
      const listingId = 10000000 + (hash % 90000000);
      const cities = ['Austin', 'Denver', 'Nashville', 'Portland', 'Savannah'];
      const types = ['Cozy Cottage', 'Modern Loft', 'Beach House', 'Mountain Cabin', 'Urban Studio'];
      const cityIdx = hash % cities.length;
      const typeIdx = (hash + 2) % types.length;

      results.push({
        url: `https://www.airbnb.com/rooms/${listingId}`,
        title: `${types[typeIdx]} in ${cities[cityIdx]} - Airbnb`,
        snippet: `Entire rental unit in ${cities[cityIdx]}. ${types[typeIdx]} with great amenities.`,
        source: hash % 3 === 0 ? 'exact_match' : 'visual_match',
      });
    }

    // Always add some non-Airbnb results (like Google Lens would)
    results.push(
      {
        url: `https://www.vrbo.com/property/${1000000 + (hash % 999999)}`,
        title: 'Vacation Rental - VRBO',
        snippet: 'Similar property found on VRBO',
        source: 'visual_match',
      },
      {
        url: `https://www.booking.com/hotel/us/property-${hash % 99999}.html`,
        title: 'Property - Booking.com',
        snippet: 'Similar property on Booking.com',
        source: 'visual_match',
      }
    );

    return results;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

/**
 * Factory function to get the configured image search provider.
 * Set IMAGE_SEARCH_PROVIDER=serpapi and SERPAPI_KEY=your_key for real searches.
 */
export function getImageSearchProvider(): ImageSearchProvider {
  const provider = process.env.IMAGE_SEARCH_PROVIDER || 'mock';
  switch (provider) {
    case 'serpapi':
    case 'google-lens':
      return new SerpApiImageSearchProvider();
    case 'mock':
    default:
      return new MockImageSearchProvider();
  }
}

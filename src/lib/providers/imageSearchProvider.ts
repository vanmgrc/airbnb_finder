import { ImageSearchProvider, SearchResult } from '../types';

/**
 * MockImageSearchProvider returns fake reverse image search results for testing.
 * Generates Airbnb-like results based on the input image URL.
 */
export class MockImageSearchProvider implements ImageSearchProvider {
  name = 'mock';

  async reverseImageSearch(imageUrl: string): Promise<SearchResult[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Generate deterministic but varied results based on the image URL
    const hash = this.simpleHash(imageUrl);
    const listingId1 = 10000000 + (hash % 90000000);
    const listingId2 = 10000000 + ((hash * 7 + 31) % 90000000);
    const listingId3 = 10000000 + ((hash * 13 + 97) % 90000000);

    const propertyTypes = ['Cozy Cottage', 'Modern Loft', 'Beach House', 'Mountain Retreat', 'Urban Studio'];
    const cities = ['Austin', 'Denver', 'Nashville', 'Portland', 'Savannah'];

    const typeIdx = hash % propertyTypes.length;
    const cityIdx = (hash + 2) % cities.length;

    return [
      {
        url: `https://www.airbnb.com/rooms/${listingId1}`,
        title: `${propertyTypes[typeIdx]} in ${cities[cityIdx]} - Airbnb`,
        snippet: `Visually similar property found on Airbnb. ${propertyTypes[typeIdx]} with matching interior style and layout in ${cities[cityIdx]}.`,
        source: 'reverse-image-search',
      },
      {
        url: `https://www.airbnb.com/rooms/${listingId2}`,
        title: `${propertyTypes[(typeIdx + 1) % propertyTypes.length]} near ${cities[(cityIdx + 1) % cities.length]}`,
        snippet: `Property with similar photos. Features comparable decor and amenities in the ${cities[(cityIdx + 1) % cities.length]} area.`,
        source: 'reverse-image-search',
      },
      {
        url: `https://www.airbnb.com/rooms/${listingId3}`,
        title: `Charming Rental in ${cities[(cityIdx + 2) % cities.length]}`,
        snippet: `Image match found. This listing shares visual characteristics with the searched property image.`,
        source: 'reverse-image-search',
      },
    ];
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
 * GoogleLensProvider stub for reverse image search via Google Lens API.
 * Requires appropriate API credentials and integration.
 */
export class GoogleLensProvider implements ImageSearchProvider {
  name = 'google-lens';

  async reverseImageSearch(imageUrl: string): Promise<SearchResult[]> {
    const apiKey = process.env.GOOGLE_LENS_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Google Lens API key not configured. Set GOOGLE_LENS_API_KEY or GOOGLE_API_KEY environment variable.'
      );
    }

    // TODO: Implement real Google Lens / Vision API reverse image search
    // Steps would be:
    // 1. Submit the image URL to Google Vision API with WEB_DETECTION feature
    // 2. Parse the webDetection results for matching pages
    // 3. Filter results for Airbnb URLs
    // 4. Return formatted SearchResult array

    // Placeholder: Use SerpAPI's Google Lens endpoint as an alternative
    const serpApiKey = process.env.SERPAPI_KEY;
    if (serpApiKey) {
      return this.serpApiLensSearch(imageUrl, serpApiKey);
    }

    throw new Error(
      `Google Lens reverse image search not fully implemented for: ${imageUrl}. ` +
      'Configure SERPAPI_KEY for an alternative implementation.'
    );
  }

  private async serpApiLensSearch(imageUrl: string, apiKey: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      api_key: apiKey,
      engine: 'google_lens',
      url: imageUrl,
    });

    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`SerpAPI Google Lens error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const visualMatches = data.visual_matches || [];

    return visualMatches
      .filter((match: { link?: string }) => match.link)
      .slice(0, 10)
      .map((match: { link: string; title?: string; snippet?: string; source?: string }) => ({
        url: match.link,
        title: match.title || '',
        snippet: match.snippet || '',
        source: match.source || 'google-lens',
      }));
  }
}

/**
 * Factory function to get the configured image search provider.
 * Uses the IMAGE_SEARCH_PROVIDER environment variable.
 * Defaults to 'mock' if not set.
 */
export function getImageSearchProvider(): ImageSearchProvider {
  const provider = process.env.IMAGE_SEARCH_PROVIDER || 'mock';
  switch (provider) {
    case 'google-lens':
      return new GoogleLensProvider();
    case 'mock':
    default:
      return new MockImageSearchProvider();
  }
}

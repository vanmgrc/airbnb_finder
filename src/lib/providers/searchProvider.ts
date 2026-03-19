import { SearchProvider, SearchResult, SearchOptions } from '../types';

/**
 * MockSearchProvider returns realistic fake Airbnb search results for testing.
 * It generates results based on keywords found in the query string.
 */
export class MockSearchProvider implements SearchProvider {
  name = 'mock';

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const maxResults = options?.maxResults ?? 3;

    // Simulate a small delay like a real API call
    await new Promise((resolve) => setTimeout(resolve, 100));

    const lowerQuery = query.toLowerCase();

    // Extract location hints from the query
    const locationHints = this.extractLocationHints(lowerQuery);
    const bedroomMatch = lowerQuery.match(/(\d+)\s*bed/);
    const bedrooms = bedroomMatch ? bedroomMatch[1] : '2';

    const mockResults: SearchResult[] = [
      {
        url: `https://www.airbnb.com/rooms/${this.generateId()}`,
        title: `Charming ${bedrooms}-Bedroom ${this.randomPropertyType()} in ${locationHints.city || 'Downtown'}`,
        snippet: `Enjoy this beautiful ${bedrooms}-bedroom ${this.randomPropertyType().toLowerCase()} located in the heart of ${locationHints.city || 'the city'}. Perfect for families and groups. Fully equipped kitchen, free parking, and close to attractions.`,
        source: 'airbnb.com',
      },
      {
        url: `https://www.airbnb.com/rooms/${this.generateId()}`,
        title: `Cozy ${locationHints.city || 'City'} Retreat - ${bedrooms} BR with Pool`,
        snippet: `Welcome to our lovely home in ${locationHints.city || 'a great neighborhood'}${locationHints.state ? ', ' + locationHints.state : ''}. This spacious property sleeps ${parseInt(bedrooms) * 2 + 2} guests and features modern amenities, a private pool, and beautiful views.`,
        source: 'airbnb.com',
      },
      {
        url: `https://www.airbnb.com/rooms/${this.generateId()}`,
        title: `Modern ${this.randomPropertyType()} near ${locationHints.city || 'Main Street'} - ${bedrooms} Beds`,
        snippet: `Newly renovated ${this.randomPropertyType().toLowerCase()} with ${bedrooms} bedrooms, ${parseInt(bedrooms) + 1} bathrooms. Walking distance to restaurants, shops, and entertainment. Free WiFi and self check-in available.`,
        source: 'airbnb.com',
      },
      {
        url: `https://www.airbnb.com/rooms/${this.generateId()}`,
        title: `Spacious Family Home in ${locationHints.city || 'Quiet Neighborhood'}`,
        snippet: `Perfect family getaway! This ${bedrooms}-bedroom home offers plenty of space, a large backyard, game room, and is just minutes from popular attractions${locationHints.state ? ' in ' + locationHints.state : ''}.`,
        source: 'airbnb.com',
      },
    ];

    return mockResults.slice(0, maxResults);
  }

  private generateId(): string {
    return String(Math.floor(10000000 + Math.random() * 90000000));
  }

  private randomPropertyType(): string {
    const types = ['Home', 'Condo', 'Cottage', 'Cabin', 'Villa', 'Apartment', 'Townhouse'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private extractLocationHints(query: string): { city: string; state: string } {
    // Try to find city/state patterns in the query
    const cityStateMatch = query.match(/(?:in\s+)?([a-z\s]+),\s*([a-z]{2})\b/);
    if (cityStateMatch) {
      return {
        city: cityStateMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase()),
        state: cityStateMatch[2].toUpperCase(),
      };
    }

    const inCityMatch = query.match(/in\s+([a-z\s]+?)(?:\s+(?:near|close|by|with|airbnb)|\s*$)/);
    if (inCityMatch) {
      return {
        city: inCityMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase()),
        state: '',
      };
    }

    return { city: '', state: '' };
  }
}

/**
 * GoogleSearchProvider uses the Google Custom Search JSON API.
 * Requires GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables.
 */
export class GoogleSearchProvider implements SearchProvider {
  name = 'google';
  private apiKey: string;
  private searchEngineId: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.apiKey || !this.searchEngineId) {
      throw new Error(
        'Google Search API credentials not configured. Set GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables.'
      );
    }

    const maxResults = options?.maxResults ?? 10;
    const params = new URLSearchParams({
      key: this.apiKey,
      cx: this.searchEngineId,
      q: query,
      num: String(Math.min(maxResults, 10)),
    });

    if (options?.siteRestrict) {
      params.set('siteSearch', options.siteRestrict);
      params.set('siteSearchFilter', 'i');
    }

    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params.toString()}`
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google Search API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map(
      (item: { link: string; title: string; snippet: string; displayLink: string }) => ({
        url: item.link,
        title: item.title || '',
        snippet: item.snippet || '',
        source: item.displayLink || 'google.com',
      })
    );
  }
}

/**
 * Factory function to get the configured search provider.
 * Uses the SEARCH_PROVIDER environment variable to determine which provider to use.
 * Defaults to 'mock' if not set.
 */
export function getSearchProvider(): SearchProvider {
  const provider = process.env.SEARCH_PROVIDER || 'mock';
  switch (provider) {
    case 'google':
      return new GoogleSearchProvider();
    case 'mock':
    default:
      return new MockSearchProvider();
  }
}

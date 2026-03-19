import { ScraperProvider, ExtractedPropertyData } from '../types';

/**
 * MockScraperProvider returns realistic fake extracted property data for testing.
 * Generates data based on the URL being scraped.
 */
export class MockScraperProvider implements ScraperProvider {
  name = 'mock';

  async scrape(url: string): Promise<ExtractedPropertyData> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const urlLower = url.toLowerCase();

    // Generate different mock data based on the URL domain
    const isVrbo = urlLower.includes('vrbo');
    const isBooking = urlLower.includes('booking');

    const propertyTypes = ['Beach House', 'Mountain Cabin', 'Downtown Condo', 'Lake Cottage', 'Country Villa'];
    const typeIndex = Math.abs(this.hashCode(url)) % propertyTypes.length;
    const propertyType = propertyTypes[typeIndex];

    const bedrooms = (Math.abs(this.hashCode(url + 'bed')) % 5) + 1;
    const bathrooms = Math.max(1, bedrooms - 1);
    const sleeps = bedrooms * 2 + 2;

    return {
      title: `${isVrbo ? 'VRBO' : isBooking ? 'Booking.com' : 'Rental'} - Beautiful ${propertyType} | ${bedrooms} BR`,
      description: `Welcome to this stunning ${propertyType.toLowerCase()}! Featuring ${bedrooms} bedrooms and ${bathrooms} bathrooms, this property comfortably sleeps ${sleeps} guests. Enjoy modern amenities including a fully equipped kitchen, high-speed WiFi, and gorgeous views. Perfect for family vacations and group getaways.`,
      bedrooms,
      bathrooms,
      sleeps,
      amenities: [
        'wifi',
        'kitchen',
        'parking',
        'air conditioning',
        'washer',
        'dryer',
        ...(typeIndex % 2 === 0 ? ['pool', 'hot tub'] : ['fireplace', 'game room']),
        ...(typeIndex % 3 === 0 ? ['ocean view', 'balcony'] : ['patio', 'grill']),
      ],
      imageUrls: [
        `https://example.com/photos/${this.hashCode(url)}_1.jpg`,
        `https://example.com/photos/${this.hashCode(url)}_2.jpg`,
        `https://example.com/photos/${this.hashCode(url)}_3.jpg`,
        `https://example.com/photos/${this.hashCode(url)}_4.jpg`,
        `https://example.com/photos/${this.hashCode(url)}_5.jpg`,
      ],
      addressHints: `Near ${propertyType.split(' ')[0]} area`,
      uniquePhrases: [
        `Beautiful ${propertyType}`,
        `${bedrooms}-bedroom retreat`,
        `sleeps ${sleeps} guests`,
        'modern amenities',
        'fully equipped kitchen',
      ],
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * BasicScraperProvider uses fetch and basic HTML parsing to extract property data.
 * Works for pages that serve HTML content without heavy JavaScript rendering.
 */
export class BasicScraperProvider implements ScraperProvider {
  name = 'basic';

  async scrape(url: string): Promise<ExtractedPropertyData> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return this.parseHtml(html);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private parseHtml(html: string): ExtractedPropertyData {
    // Extract title
    const titleMatch =
      html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/) ||
      html.match(/<title>([^<]*)<\/title>/);
    const title = titleMatch ? this.decodeEntities(titleMatch[1]) : '';

    // Extract description
    const descMatch =
      html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/) ||
      html.match(/<meta\s+name="description"\s+content="([^"]*)"/) ||
      html.match(/<meta\s+content="([^"]*)"\s+name="description"/);
    const description = descMatch ? this.decodeEntities(descMatch[1]) : '';

    // Extract counts
    const bedroomMatch = html.match(/(\d+)\s*(?:bedroom|bed room|BR)/i);
    const bathroomMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:bathroom|bath room|BA|bath)/i);
    const sleepsMatch = html.match(/(?:sleeps|accommodates|guests?:?)\s*(\d+)/i);

    // Extract images
    const imageUrls: string[] = [];
    const ogImages = html.matchAll(/<meta\s+property="og:image"\s+content="([^"]*)"/g);
    for (const m of ogImages) {
      imageUrls.push(m[1]);
    }

    // Extract amenities
    const amenities: string[] = [];
    const amenityPatterns: [RegExp, string][] = [
      [/wifi|wi-fi|internet/i, 'wifi'],
      [/pool|swimming/i, 'pool'],
      [/hot\s*tub|jacuzzi/i, 'hot tub'],
      [/parking/i, 'parking'],
      [/kitchen/i, 'kitchen'],
      [/washer|laundry/i, 'washer'],
      [/dryer/i, 'dryer'],
      [/air\s*conditioning|a\/c/i, 'air conditioning'],
      [/heating/i, 'heating'],
      [/fireplace/i, 'fireplace'],
      [/pet[- ]?friendly|pets?\s*allowed/i, 'pet friendly'],
      [/gym|fitness/i, 'gym'],
      [/balcony|patio|deck/i, 'outdoor space'],
      [/grill|bbq|barbecue/i, 'grill'],
    ];
    for (const [pattern, label] of amenityPatterns) {
      if (pattern.test(html)) amenities.push(label);
    }

    // Extract address hints
    const addressHints: string[] = [];
    const addrMatches = html.matchAll(
      /(?:located\s+(?:in|at|near))\s+([^.<]+)/gi
    );
    for (const m of addrMatches) {
      const hint = this.decodeEntities(m[1]).trim();
      if (hint.length > 5 && hint.length < 200) addressHints.push(hint);
    }

    // Extract unique phrases
    const uniquePhrases: string[] = [];
    const combinedText = `${title} ${description}`;
    const quotedMatches = combinedText.matchAll(/"([^"]+)"/g);
    for (const m of quotedMatches) {
      if (m[1].length > 3) uniquePhrases.push(m[1]);
    }
    const nameMatches = combinedText.matchAll(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g);
    for (const m of nameMatches) {
      if (m[1].length > 5) uniquePhrases.push(m[1]);
    }

    return {
      title,
      description,
      bedrooms: bedroomMatch ? parseInt(bedroomMatch[1], 10) : null,
      bathrooms: bathroomMatch ? parseFloat(bathroomMatch[1]) : null,
      sleeps: sleepsMatch ? parseInt(sleepsMatch[1], 10) : null,
      amenities: [...new Set(amenities)],
      imageUrls: imageUrls.slice(0, 20),
      addressHints: [...new Set(addressHints)].join('; '),
      uniquePhrases: [...new Set(uniquePhrases)].slice(0, 20),
    };
  }

  private decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&nbsp;/g, ' ');
  }
}

/**
 * BrowserScraperProvider stub for future browser automation (e.g., Puppeteer/Playwright).
 * This would handle JavaScript-rendered pages that basic fetch cannot parse.
 */
export class BrowserScraperProvider implements ScraperProvider {
  name = 'browser';

  async scrape(url: string): Promise<ExtractedPropertyData> {
    // TODO: Implement using Puppeteer or Playwright
    // This would launch a headless browser, navigate to the URL,
    // wait for JavaScript to render, then extract property data from the DOM.
    throw new Error(
      `BrowserScraperProvider is not yet implemented. Cannot scrape: ${url}. ` +
      'Install puppeteer or playwright and implement browser-based scraping.'
    );
  }

  async isAvailable(): Promise<boolean> {
    // TODO: Check if puppeteer/playwright is installed and a browser is available
    return false;
  }
}

/**
 * Factory function to get the configured scraper provider.
 * Uses the SCRAPER_PROVIDER environment variable to determine which provider to use.
 * Defaults to 'mock' if not set.
 */
export function getScraperProvider(): ScraperProvider {
  const provider = process.env.SCRAPER_PROVIDER || 'mock';
  switch (provider) {
    case 'basic':
      return new BasicScraperProvider();
    case 'browser':
      return new BrowserScraperProvider();
    case 'mock':
    default:
      return new MockScraperProvider();
  }
}

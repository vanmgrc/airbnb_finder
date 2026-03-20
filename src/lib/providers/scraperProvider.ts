import { ScraperProvider, ExtractedPropertyData } from '../types';

/**
 * MockScraperProvider returns realistic fake extracted property data for testing.
 */
export class MockScraperProvider implements ScraperProvider {
  name = 'mock';

  async scrape(url: string): Promise<ExtractedPropertyData> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const urlLower = url.toLowerCase();
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
      description: `Welcome to this stunning ${propertyType.toLowerCase()}! Featuring ${bedrooms} bedrooms and ${bathrooms} bathrooms.`,
      bedrooms,
      bathrooms,
      sleeps,
      amenities: ['wifi', 'kitchen', 'parking', 'air conditioning', 'washer', 'dryer'],
      imageUrls: [
        `https://example.com/photos/${this.hashCode(url)}_1.jpg`,
        `https://example.com/photos/${this.hashCode(url)}_2.jpg`,
        `https://example.com/photos/${this.hashCode(url)}_3.jpg`,
      ],
      addressHints: `Near ${propertyType.split(' ')[0]} area`,
      uniquePhrases: [`Beautiful ${propertyType}`, `${bedrooms}-bedroom retreat`],
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
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

/**
 * BasicScraperProvider uses fetch + HTML parsing to extract property data.
 * Optimized for extracting IMAGES from competitor listings (VRBO, Booking, etc.)
 * since image-based matching is the primary method for finding Airbnb listings.
 */
export class BasicScraperProvider implements ScraperProvider {
  name = 'basic';

  async scrape(url: string): Promise<ExtractedPropertyData> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        Referer: 'https://www.google.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return this.parseHtml(html, url);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private parseHtml(html: string, sourceUrl: string): ExtractedPropertyData {
    // --- IMAGES (most important for image-based matching) ---
    const imageUrls = this.extractImages(html, sourceUrl);

    // --- Title ---
    const titleMatch =
      html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/) ||
      html.match(/<meta\s+content="([^"]*)"\s+property="og:title"/) ||
      html.match(/<title>([^<]*)<\/title>/);
    const title = titleMatch ? this.decodeEntities(titleMatch[1]) : '';

    // --- Description ---
    const descMatch =
      html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/) ||
      html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/) ||
      html.match(/<meta\s+name="description"\s+content="([^"]*)"/) ||
      html.match(/<meta\s+content="([^"]*)"\s+name="description"/);
    const description = descMatch ? this.decodeEntities(descMatch[1]) : '';

    // --- Counts ---
    const bedroomMatch = html.match(/(\d+)\s*(?:bedroom|bed room|BR)/i);
    const bathroomMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:bathroom|bath room|BA|bath)/i);
    const sleepsMatch = html.match(/(?:sleeps|accommodates|guests?:?)\s*(\d+)/i);

    // --- Amenities ---
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

    // --- Address hints ---
    const addressHints: string[] = [];
    const addrMatches = html.matchAll(/(?:located\s+(?:in|at|near))\s+([^.<]+)/gi);
    for (const m of addrMatches) {
      const hint = this.decodeEntities(m[1]).trim();
      if (hint.length > 5 && hint.length < 200) addressHints.push(hint);
    }

    // --- Unique phrases ---
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
      imageUrls,
      addressHints: [...new Set(addressHints)].join('; '),
      uniquePhrases: [...new Set(uniquePhrases)].slice(0, 20),
    };
  }

  /**
   * Extract property images from HTML using multiple strategies.
   * These images will be used for reverse image search to find Airbnb matches.
   */
  private extractImages(html: string, sourceUrl: string): string[] {
    const images: string[] = [];
    const baseUrl = new URL(sourceUrl).origin;

    // 1. og:image meta tags (most reliable — always server-rendered for social sharing)
    const ogImageMatches = html.matchAll(
      /<meta\s+(?:[^>]*?)property="og:image"(?:[^>]*?)content="([^"]*)"(?:[^>]*?)\/?>/gi
    );
    for (const m of ogImageMatches) {
      images.push(this.resolveUrl(m[1], baseUrl));
    }
    const ogImageMatches2 = html.matchAll(
      /<meta\s+(?:[^>]*?)content="([^"]*)"(?:[^>]*?)property="og:image"(?:[^>]*?)\/?>/gi
    );
    for (const m of ogImageMatches2) {
      images.push(this.resolveUrl(m[1], baseUrl));
    }

    // 2. twitter:image meta tag
    const twitterMatches = html.matchAll(
      /<meta\s+(?:[^>]*?)(?:name|property)="twitter:image(?::src)?"(?:[^>]*?)content="([^"]*)"(?:[^>]*?)\/?>/gi
    );
    for (const m of twitterMatches) {
      images.push(this.resolveUrl(m[1], baseUrl));
    }
    const twitterMatches2 = html.matchAll(
      /<meta\s+(?:[^>]*?)content="([^"]*)"(?:[^>]*?)(?:name|property)="twitter:image(?::src)?"(?:[^>]*?)\/?>/gi
    );
    for (const m of twitterMatches2) {
      images.push(this.resolveUrl(m[1], baseUrl));
    }

    // 3. JSON-LD structured data (common on rental sites)
    const jsonLdMatches = html.matchAll(
      /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    );
    for (const m of jsonLdMatches) {
      try {
        const json = JSON.parse(m[1]);
        this.extractJsonLdImages(json, images, baseUrl);
      } catch {
        // Invalid JSON — skip
      }
    }

    // 4. <img> tags — filter for property photos, skip icons/logos/UI elements
    const skipPatterns =
      /logo|icon|avatar|sprite|pixel|tracking|badge|flag|arrow|button|banner|ad[_-]|1x1|spacer|loading|spinner|placeholder|\.svg|\.gif/i;
    const imgMatches = html.matchAll(
      /<img[^>]+(?:src|data-src|data-lazy-src|data-original)="([^"]+)"[^>]*>/gi
    );
    for (const m of imgMatches) {
      const src = m[1];
      if (!skipPatterns.test(src) && !src.startsWith('data:')) {
        images.push(this.resolveUrl(src, baseUrl));
      }
    }

    // 5. srcset attributes (high-res images for responsive design)
    const srcsetMatches = html.matchAll(/srcset="([^"]*)"/gi);
    for (const m of srcsetMatches) {
      const srcset = m[1];
      // Take the largest image from srcset
      const entries = srcset
        .split(',')
        .map((s) => s.trim().split(/\s+/))
        .filter((parts) => parts.length >= 1 && parts[0]);

      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        const src = lastEntry[0];
        if (src && !skipPatterns.test(src) && !src.startsWith('data:')) {
          images.push(this.resolveUrl(src, baseUrl));
        }
      }
    }

    // Deduplicate and limit to 20
    const unique = [...new Set(images)].filter(
      (url) => url.startsWith('http://') || url.startsWith('https://')
    );

    return unique.slice(0, 20);
  }

  /**
   * Extract images from JSON-LD structured data (recursive).
   */
  private extractJsonLdImages(
    obj: unknown,
    images: string[],
    baseUrl: string
  ): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.extractJsonLdImages(item, images, baseUrl);
      }
      return;
    }

    const record = obj as Record<string, unknown>;

    // Look for image/photo properties
    for (const key of ['image', 'photo', 'photos', 'images', 'thumbnail', 'thumbnailUrl']) {
      if (record[key]) {
        if (typeof record[key] === 'string') {
          images.push(this.resolveUrl(record[key] as string, baseUrl));
        } else if (Array.isArray(record[key])) {
          for (const img of record[key] as unknown[]) {
            if (typeof img === 'string') {
              images.push(this.resolveUrl(img, baseUrl));
            } else if (img && typeof img === 'object' && (img as Record<string, unknown>).url) {
              images.push(
                this.resolveUrl((img as Record<string, unknown>).url as string, baseUrl)
              );
            } else if (
              img &&
              typeof img === 'object' &&
              (img as Record<string, unknown>).contentUrl
            ) {
              images.push(
                this.resolveUrl(
                  (img as Record<string, unknown>).contentUrl as string,
                  baseUrl
                )
              );
            }
          }
        } else if (typeof record[key] === 'object') {
          const imgObj = record[key] as Record<string, unknown>;
          if (typeof imgObj.url === 'string') {
            images.push(this.resolveUrl(imgObj.url, baseUrl));
          } else if (typeof imgObj.contentUrl === 'string') {
            images.push(this.resolveUrl(imgObj.contentUrl, baseUrl));
          }
        }
      }
    }
  }

  /**
   * Resolve a potentially relative URL to an absolute URL.
   */
  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    if (url.startsWith('/')) {
      return baseUrl + url;
    }
    return baseUrl + '/' + url;
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
 */
export class BrowserScraperProvider implements ScraperProvider {
  name = 'browser';

  async scrape(url: string): Promise<ExtractedPropertyData> {
    throw new Error(
      `BrowserScraperProvider is not yet implemented. Cannot scrape: ${url}. ` +
      'Install puppeteer or playwright and implement browser-based scraping.'
    );
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}

/**
 * Factory function to get the configured scraper provider.
 * Uses the SCRAPER_PROVIDER environment variable.
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

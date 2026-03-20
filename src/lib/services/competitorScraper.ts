import { ExtractedPropertyData } from '../types';
import { isValidUrl } from '../utils/urlValidator';
import { getScraperProvider } from '../providers/scraperProvider';

/**
 * Validate that a competitor URL is reachable and returns a valid page.
 */
export async function validateCompetitorUrl(
  url: string
): Promise<{ valid: boolean; status: string; error?: string }> {
  if (!url || !isValidUrl(url)) {
    return { valid: false, status: 'invalid', error: 'Not a valid URL' };
  }

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      return { valid: true, status: 'valid' };
    }

    if (response.status === 403 || response.status === 429) {
      return {
        valid: false,
        status: 'blocked',
        error: `Access blocked with status ${response.status}`,
      };
    }

    if (response.status === 404) {
      return {
        valid: false,
        status: 'invalid',
        error: 'Page not found (404)',
      };
    }

    if (response.status >= 500) {
      return {
        valid: false,
        status: 'unreachable',
        error: `Server error: ${response.status}`,
      };
    }

    return {
      valid: false,
      status: 'invalid',
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('timeout') || message.includes('abort')) {
      return {
        valid: false,
        status: 'unreachable',
        error: 'Request timed out',
      };
    }

    return {
      valid: false,
      status: 'unreachable',
      error: `Network error: ${message}`,
    };
  }
}

/**
 * Scrape a competitor listing URL and extract property data.
 */
export async function scrapeCompetitorUrl(
  url: string
): Promise<{
  success: boolean;
  data: ExtractedPropertyData | null;
  error?: string;
}> {
  // 1. Validate the URL format
  if (!url || !isValidUrl(url)) {
    return {
      success: false,
      data: null,
      error: 'Invalid URL provided',
    };
  }

  // 2. Use the scraper provider to extract data
  try {
    const provider = getScraperProvider();

    // Check if the provider is available
    const available = await provider.isAvailable();
    if (!available) {
      return {
        success: false,
        data: null,
        error: `Scraper provider "${provider.name}" is not available`,
      };
    }

    const data = await provider.scrape(url);

    // 3. Validate we got at least some useful data
    // Images are critical for image-based matching (reverse image search)
    const hasUsefulData =
      data.imageUrls.length > 0 ||
      data.title.length > 0 ||
      data.description.length > 0 ||
      data.addressHints.length > 0 ||
      data.bedrooms !== null;

    if (!hasUsefulData) {
      return {
        success: false,
        data,
        error: 'Page was scraped but no useful property data was extracted',
      };
    }

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      data: null,
      error: `Scraping failed: ${message}`,
    };
  }
}

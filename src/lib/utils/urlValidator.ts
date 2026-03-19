/**
 * Known competitor/rental listing domains.
 */
const COMPETITOR_DOMAINS = [
  'vrbo.com',
  'booking.com',
  'expedia.com',
  'tripadvisor.com',
  'homeaway.com',
  'vacasa.com',
  'evolve.com',
  'turnkey.com',
  'misterb-b.com',
  'furnished-finder.com',
  'houfy.com',
  'guesty.com',
  'lodgify.com',
  'hospitable.com',
  'hostaway.com',
  'rentbyowner.com',
  'flipkey.com',
  'hometogo.com',
  'kayak.com',
  'hotels.com',
  'agoda.com',
  'marriott.com',
  'hilton.com',
];

/**
 * Check if a string is a valid URL.
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if a URL is an Airbnb listing URL.
 * Matches patterns like:
 *   https://www.airbnb.com/rooms/12345
 *   https://airbnb.com/rooms/12345678
 *   https://www.airbnb.co.uk/rooms/12345?param=value
 *   https://airbnb.com/h/some-listing-name
 */
export function isAirbnbUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;

  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase();

    // Match airbnb.com and international variants (airbnb.co.uk, airbnb.ca, etc.)
    const isAirbnbDomain =
      hostname === 'airbnb.com' ||
      hostname === 'www.airbnb.com' ||
      /^(www\.)?airbnb\.[a-z]{2,3}(\.[a-z]{2})?$/.test(hostname);

    if (!isAirbnbDomain) return false;

    // Must have a listing path: /rooms/ID or /h/name
    const path = parsed.pathname.toLowerCase();
    return /^\/rooms\/\d+/.test(path) || /^\/h\/[\w-]+/.test(path);
  } catch {
    return false;
  }
}

/**
 * Extract the Airbnb listing ID from a URL.
 * Returns null if the URL is not a valid Airbnb listing URL.
 *
 * For /rooms/12345 style URLs, returns the numeric ID.
 * For /h/listing-name style URLs, returns the listing name.
 */
export function extractAirbnbListingId(url: string): string | null {
  if (!isAirbnbUrl(url)) return null;

  try {
    const parsed = new URL(url.trim());
    const path = parsed.pathname;

    // Match /rooms/<id>
    const roomsMatch = path.match(/\/rooms\/(\d+)/);
    if (roomsMatch) {
      return roomsMatch[1];
    }

    // Match /h/<name>
    const hMatch = path.match(/\/h\/([\w-]+)/);
    if (hMatch) {
      return hMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Normalize an Airbnb URL to a canonical form.
 * Strips query parameters and fragments, standardizes to www.airbnb.com.
 *
 * Returns the original URL if it's not a valid Airbnb URL.
 */
export function normalizeAirbnbUrl(url: string): string {
  if (!isAirbnbUrl(url)) return url;

  try {
    const parsed = new URL(url.trim());
    const path = parsed.pathname;

    // Extract the listing path
    const roomsMatch = path.match(/\/rooms\/(\d+)/);
    if (roomsMatch) {
      return `https://www.airbnb.com/rooms/${roomsMatch[1]}`;
    }

    const hMatch = path.match(/\/h\/([\w-]+)/);
    if (hMatch) {
      return `https://www.airbnb.com/h/${hMatch[1]}`;
    }

    return url;
  } catch {
    return url;
  }
}

/**
 * Check if a URL looks like a competitor rental listing URL.
 * Matches known rental platforms like VRBO, Booking.com, etc.
 */
export function isCompetitorUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;

  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    return COMPETITOR_DOMAINS.some((domain) => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });
  } catch {
    return false;
  }
}

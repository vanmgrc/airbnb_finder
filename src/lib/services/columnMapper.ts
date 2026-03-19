import { v4 as uuidv4 } from 'uuid';
import { RawLead, ColumnMapping, Lead } from '../types';
import { buildFullAddress } from '../utils/addressNormalizer';
import { isValidUrl } from '../utils/urlValidator';

/**
 * Known synonyms for each field in the ColumnMapping.
 * Each entry maps a target field to an array of patterns (lowercase)
 * that should match against column headers.
 */
const FIELD_SYNONYMS: Record<keyof ColumnMapping, string[]> = {
  lead_id: [
    'lead_id', 'lead id', 'leadid', 'id', 'record_id', 'record id',
    'recordid', 'ref', 'reference', 'ref_id', 'reference_id', 'row_id',
    'row id', 'entry_id', 'entry id', 'number', 'no', '#',
  ],
  owner_name: [
    'owner_name', 'owner name', 'ownername', 'owner', 'name', 'host_name',
    'host name', 'hostname', 'host', 'property_owner', 'property owner',
    'contact_name', 'contact name', 'contactname', 'full_name', 'full name',
    'fullname', 'landlord', 'manager', 'manager_name', 'manager name',
    'client_name', 'client name', 'client',
  ],
  rental_address: [
    'rental_address', 'rental address', 'rentaladdress', 'address',
    'street_address', 'street address', 'streetaddress', 'street',
    'property_address', 'property address', 'propertyaddress', 'addr',
    'street_addr', 'street addr', 'address_line_1', 'address line 1',
    'address1', 'address_1', 'mailing_address', 'mailing address',
    'location_address', 'location address', 'physical_address',
    'physical address', 'rental_street', 'rental street', 'property_street',
    'property street', 'house_address', 'house address', 'listing_address',
    'listing address', 'unit_address', 'unit address',
  ],
  rental_city: [
    'rental_city', 'rental city', 'rentalcity', 'city', 'town',
    'municipality', 'property_city', 'property city', 'propertycity',
    'listing_city', 'listing city', 'location_city', 'location city',
    'rental_town', 'rental town',
  ],
  rental_state: [
    'rental_state', 'rental state', 'rentalstate', 'state', 'province',
    'region', 'property_state', 'property state', 'propertystate',
    'listing_state', 'listing state', 'st', 'state_code', 'state code',
    'state_abbr', 'state abbr', 'state_abbreviation',
  ],
  rental_zip: [
    'rental_zip', 'rental zip', 'rentalzip', 'zip', 'zipcode', 'zip_code',
    'zip code', 'postal', 'postal_code', 'postal code', 'postalcode',
    'property_zip', 'property zip', 'propertyzip', 'listing_zip',
    'listing zip', 'zip_postal', 'zip postal',
  ],
  competitor_listing_url: [
    'competitor_listing_url', 'competitor listing url', 'competitor_url',
    'competitor url', 'competitorurl', 'competitor', 'listing_url',
    'listing url', 'listingurl', 'competitor_link', 'competitor link',
    'competitorlink', 'vrbo_url', 'vrbo url', 'vrbo_link', 'vrbo link',
    'vrbo', 'booking_url', 'booking url', 'other_listing_url',
    'other listing url', 'other_listing', 'other listing', 'source_url',
    'source url', 'original_url', 'original url', 'original_listing',
    'original listing', 'property_url', 'property url', 'rental_url',
    'rental url', 'external_url', 'external url',
  ],
  existing_airbnb_url: [
    'existing_airbnb_url', 'existing airbnb url', 'airbnb_url', 'airbnb url',
    'airbnburl', 'airbnb', 'airbnb_link', 'airbnb link', 'airbnblink',
    'airbnb_listing', 'airbnb listing', 'airbnblisting', 'known_airbnb',
    'known airbnb', 'current_airbnb', 'current airbnb', 'existing_url',
    'existing url', 'existing_listing', 'existing listing',
  ],
  notes: [
    'notes', 'note', 'comments', 'comment', 'remarks', 'remark',
    'description', 'desc', 'memo', 'info', 'additional_info',
    'additional info', 'additional_notes', 'additional notes', 'details',
    'detail', 'observation', 'observations',
  ],
};

/**
 * Normalize a header string for comparison.
 * Lowercases, trims, replaces common separators with spaces.
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\-./\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate a fuzzy match score between a normalized header and a pattern.
 * Returns a score from 0 to 1.
 */
function fuzzyMatchScore(normalizedHeader: string, pattern: string): number {
  const normalizedPattern = normalizeHeader(pattern);

  // Exact match
  if (normalizedHeader === normalizedPattern) return 1.0;

  // Header contains the pattern or vice versa
  if (normalizedHeader.includes(normalizedPattern)) return 0.9;
  if (normalizedPattern.includes(normalizedHeader)) return 0.85;

  // Check if header starts or ends with the pattern
  if (normalizedHeader.startsWith(normalizedPattern)) return 0.8;
  if (normalizedHeader.endsWith(normalizedPattern)) return 0.75;

  // Token-based overlap
  const headerTokens = new Set(normalizedHeader.split(' '));
  const patternTokens = normalizedPattern.split(' ');
  const matchingTokens = patternTokens.filter((t) => headerTokens.has(t));
  if (patternTokens.length > 0 && matchingTokens.length === patternTokens.length) {
    return 0.7;
  }
  if (patternTokens.length > 1 && matchingTokens.length > 0) {
    return 0.5 * (matchingTokens.length / patternTokens.length);
  }

  return 0;
}

/**
 * Auto-detect column mappings from headers using fuzzy matching.
 * For each field in ColumnMapping, finds the best matching header.
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  // Track which headers have been used to avoid double-mapping
  const usedHeaders = new Set<string>();

  // Sort fields by specificity (more specific fields first to give them priority)
  const fieldPriority: (keyof ColumnMapping)[] = [
    'competitor_listing_url',
    'existing_airbnb_url',
    'rental_address',
    'rental_city',
    'rental_state',
    'rental_zip',
    'owner_name',
    'lead_id',
    'notes',
  ];

  for (const field of fieldPriority) {
    const synonyms = FIELD_SYNONYMS[field];
    let bestScore = 0;
    let bestHeader: string | null = null;

    for (const header of headers) {
      if (usedHeaders.has(header)) continue;

      const normalizedHeader = normalizeHeader(header);

      for (const synonym of synonyms) {
        const score = fuzzyMatchScore(normalizedHeader, synonym);
        if (score > bestScore) {
          bestScore = score;
          bestHeader = header;
        }
      }
    }

    // Only assign if we have a reasonable confidence match
    if (bestHeader && bestScore >= 0.5) {
      mapping[field] = bestHeader;
      usedHeaders.add(bestHeader);
    }
  }

  return mapping;
}

/**
 * Convert raw data to Lead objects using the provided column mapping.
 */
export function mapLeads(rawData: RawLead[], mapping: ColumnMapping): Lead[] {
  return rawData.map((raw) => {
    const address = raw[mapping.rental_address || ''] || '';
    const city = raw[mapping.rental_city || ''] || '';
    const state = raw[mapping.rental_state || ''] || '';
    const zip = raw[mapping.rental_zip || ''] || '';
    const competitorUrl = raw[mapping.competitor_listing_url || ''] || '';
    const fullAddress = buildFullAddress({ address, city, state, zip });
    const hasCompetitor = !!competitorUrl && isValidUrl(competitorUrl);

    return {
      id: uuidv4(),
      lead_id: raw[mapping.lead_id || ''] || '',
      owner_name: raw[mapping.owner_name || ''] || '',
      full_address: fullAddress,
      rental_address: address,
      rental_city: city,
      rental_state: state,
      rental_zip: zip,
      competitor_listing_url: competitorUrl,
      existing_airbnb_url: raw[mapping.existing_airbnb_url || ''] || '',
      notes: raw[mapping.notes || ''] || '',
      original_data: raw,
      queue: hasCompetitor ? 'A' : 'B',
      processing_status: 'pending',
      competitor_status: hasCompetitor ? 'pending' : 'not_provided',
      extracted_competitor_title: '',
      extracted_competitor_description: '',
      extracted_competitor_data: null,
      candidate_airbnb_urls: [],
      final_airbnb_url: '',
      confidence_score: 0,
      confidence_label: 'None',
      reason: '',
      analysis_notes: '',
      method_used: 'none',
      error_message: '',
      reviewer_notes: '',
      review_decision: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Lead;
  });
}

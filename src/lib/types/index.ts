// Lead types
export interface RawLead {
  [key: string]: string | undefined;
}

export interface ColumnMapping {
  lead_id?: string;
  owner_name?: string;
  rental_address?: string;
  rental_city?: string;
  rental_state?: string;
  rental_zip?: string;
  competitor_listing_url?: string;
  existing_airbnb_url?: string;
  notes?: string;
}

export interface Lead {
  id: string;
  lead_id: string;
  owner_name: string;
  full_address: string;
  rental_address: string;
  rental_city: string;
  rental_state: string;
  rental_zip: string;
  competitor_listing_url: string;
  existing_airbnb_url: string;
  notes: string;
  original_data: RawLead;
  queue: 'A' | 'B'; // A = has competitor URL, B = no competitor URL
  processing_status: ProcessingStatus;
  competitor_status: CompetitorStatus;
  extracted_competitor_title: string;
  extracted_competitor_description: string;
  extracted_competitor_data: ExtractedPropertyData | null;
  candidate_airbnb_urls: AirbnbCandidate[];
  final_airbnb_url: string;
  confidence_score: number;
  confidence_label: ConfidenceLabel;
  reason: string;
  analysis_notes: string;
  method_used: MethodUsed;
  error_message: string;
  reviewer_notes: string;
  review_decision: ReviewDecision;
  created_at: string;
  updated_at: string;
}

export type ProcessingStatus = 'pending' | 'processing' | 'matched' | 'probable_match' | 'no_match' | 'needs_review' | 'failed';
export type CompetitorStatus = 'valid' | 'invalid' | 'unreachable' | 'blocked' | 'not_provided' | 'pending';
export type ConfidenceLabel = 'High' | 'Medium' | 'Low' | 'None';
export type MethodUsed = 'competitor-based' | 'competitor-fallback' | 'address-based' | 'image-based' | 'manual' | 'none';
export type ReviewDecision = 'pending' | 'approved' | 'rejected' | 'manual_override' | 'no_match';

export interface ExtractedPropertyData {
  title: string;
  description: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sleeps: number | null;
  amenities: string[];
  imageUrls: string[];
  addressHints: string;
  uniquePhrases: string[];
  rawHtml?: string;
}

export interface AirbnbCandidate {
  url: string;
  title: string;
  description: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sleeps: number | null;
  amenities: string[];
  imageUrls: string[];
  location: string;
  score: number;
  matchDetails: MatchDetail[];
}

export interface MatchDetail {
  factor: string;
  weight: number;
  score: number;
  notes: string;
}

export interface QueueStats {
  total: number;
  queueA: number;
  queueB: number;
  pending: number;
  processing: number;
  matched: number;
  probable_match: number;
  no_match: number;
  needs_review: number;
  failed: number;
}

export interface ProcessingJob {
  id: string;
  lead_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeOriginalColumns: boolean;
  statusFilter: ProcessingStatus[];
  confidenceFilter: ConfidenceLabel[];
}

// Provider interfaces
export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  source: string;
}

export interface SearchProvider {
  name: string;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

export interface SearchOptions {
  maxResults?: number;
  siteRestrict?: string;
}

export interface ScraperProvider {
  name: string;
  scrape(url: string): Promise<ExtractedPropertyData>;
  isAvailable(): Promise<boolean>;
}

export interface ImageSearchProvider {
  name: string;
  reverseImageSearch(imageUrl: string): Promise<SearchResult[]>;
}

export interface VisionProvider {
  name: string;
  compareImages(imageA: string, imageB: string): Promise<number>;
  extractFeatures(imageUrl: string): Promise<string[]>;
}

export interface UploadSession {
  id: string;
  filename: string;
  rawData: RawLead[];
  headers: string[];
  columnMapping: ColumnMapping | null;
  leads: Lead[];
  createdAt: string;
}

// Filter / sort types for review table
export interface LeadFilters {
  status?: ProcessingStatus[];
  confidence?: ConfidenceLabel[];
  queue?: ('A' | 'B')[];
  method?: MethodUsed[];
  city?: string;
  state?: string;
  searchQuery?: string;
}

export type SortField = 'confidence_score' | 'processing_status' | 'full_address' | 'method_used' | 'updated_at';
export type SortDirection = 'asc' | 'desc';

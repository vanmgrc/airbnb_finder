# Airbnb Link Finder

A desktop-first web application for finding Airbnb listing URLs for property leads. Upload a CSV/XLSX of leads, and the system processes them through a modular pipeline to find matching Airbnb listings with confidence scoring and manual review support.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. **Upload** a CSV or XLSX file with property leads
2. **Map columns** to required fields (address, competitor URL, etc.)
3. **Process** leads through the matching pipeline:
   - **Queue A** (leads with competitor URL): scrape property images → reverse image search via Google Lens → find Airbnb match
   - **Queue B** (address-only leads): search by address as fallback
4. **Review** results in the review table with confidence scores
5. **Export** approved results to CSV or XLSX

### Matching Workflow (Queue A — Image-Based)

This replicates the manual process:
1. Open competitor URL → scrape property images
2. For each image → reverse image search (Google Lens via SerpAPI)
3. Filter results for airbnb.com URLs
4. Exact image match = **High confidence** / Visual match = **Medium confidence**
5. No Airbnb found = **No match**

## API Costs

The app uses external APIs for real matching. Here's what each costs:

| Service | Provider | Free Tier | Paid Pricing | Used For |
|---|---|---|---|---|
| Reverse Image Search | [SerpAPI](https://serpapi.com) (Google Lens) | 100 searches/month | $50/mo for 5,000 searches | Finding Airbnb listings by matching competitor property photos |
| Web Search (fallback) | [Google Custom Search](https://developers.google.com/custom-search) | 100 queries/day | $5 per 1,000 queries (up to 10k/day) | Address-based search for Queue B leads (no competitor URL) |
| Vision AI (optional) | [Claude API](https://docs.anthropic.com/en/docs/about-claude/pricing) / [OpenAI GPT-4V](https://openai.com/pricing) | Varies | ~$0.01–0.04 per image | Optional image comparison (not required for core workflow) |

### Cost Estimates Per Lead

| Scenario | API Calls | Estimated Cost |
|---|---|---|
| Queue A lead (with competitor URL) | 1–5 image searches | ~$0.01–0.05 per lead (SerpAPI) |
| Queue B lead (address only, fallback) | 1–2 text searches | Free (within 100/day) or ~$0.005 per lead (Google CSE) |

### Cost Example: 100 Leads

| Lead Mix | Estimated Total Cost |
|---|---|
| 100 Queue A leads (avg 3 images each) | ~300 SerpAPI searches = **free tier covers it** |
| 500 Queue A leads (avg 3 images each) | ~1,500 SerpAPI searches = **~$15/mo** on $50 plan |
| 100 Queue B leads (address only) | ~100 Google searches = **free** (within daily limit) |

### Setup

```bash
# In .env.local — for real matching:
IMAGE_SEARCH_PROVIDER=serpapi
SERPAPI_KEY=your_serpapi_key_here
SCRAPER_PROVIDER=basic

# Optional — for address-based fallback:
SEARCH_PROVIDER=google
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_cse_id
```

> **Mock mode (default):** All providers default to `mock` — no API keys needed for UI testing, but results will be fake.

## Sample Data

A sample CSV is included at `public/sample-leads.csv` for testing.

## Architecture

### Services (`src/lib/services/`)

| Service | Purpose |
|---|---|
| `fileParser` | Parses CSV/XLSX files |
| `columnMapper` | Auto-detects and maps file columns to lead fields |
| `queueManager` | Orchestrates lead processing (Queue A image-based, Queue B address-based) |
| `competitorScraper` | Scrapes competitor URLs to extract property images |
| `imageMatcher` | Reverse image searches competitor photos to find Airbnb matches |
| `searchService` | Builds search queries and executes searches (Queue B fallback) |
| `airbnbCandidateFinder` | Finds and extracts Airbnb listing candidates |
| `matchingEngine` | Scores candidates against lead data (weighted matching) |
| `confidenceScorer` | Calculates confidence scores and labels |
| `exportService` | Exports results to CSV/XLSX |
| `reviewWorkflow` | Handles approve/reject/override review actions |

### Providers (`src/lib/providers/`)

Pluggable provider interfaces for external services:

| Provider | Mock (testing) | Real (production) |
|---|---|---|
| Image Search | `MockImageSearchProvider` | `SerpApiImageSearchProvider` — Google Lens via SerpAPI |
| Scraper | `MockScraperProvider` | `BasicScraperProvider` — fetch + HTML image extraction |
| Search | `MockSearchProvider` | `GoogleSearchProvider` — Google Custom Search API |
| Vision | `MockVisionProvider` | Claude Vision API, GPT-4V (optional) |

### Where to Plug In

- **Reverse image search**: `src/lib/providers/imageSearchProvider.ts` — implement `ImageSearchProvider` interface
- **Scraper provider**: `src/lib/providers/scraperProvider.ts` — implement `ScraperProvider` interface
- **Search provider**: `src/lib/providers/searchProvider.ts` — implement `SearchProvider` interface
- **Vision/image similarity**: `src/lib/providers/visionProvider.ts` — implement `VisionProvider` interface
- **Database**: Replace `src/lib/store/leadStore.ts` with a database-backed store

### Confidence Scoring (Image-Based)

| Match Type | Score | Confidence | Status |
|---|---|---|---|
| Exact image match on Airbnb | 95 | High | `matched` |
| Visual image match on Airbnb | 65 | Medium | `probable_match` |
| No Airbnb URL found in results | 0 | None | `no_match` |

### Matching Engine Weights (Address-Based Fallback)

| Factor | Weight |
|---|---|
| Address similarity | 30 |
| Title similarity | 20 |
| Description similarity | 15 |
| Bedroom count match | 15 |
| Bathroom count match | 10 |
| Amenity overlap | 10 |

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- PapaParse (CSV parsing)
- SheetJS/xlsx (Excel parsing)
- Fuse.js (fuzzy search)
- string-similarity (text comparison)

## Project Structure

```
src/
  app/                    # Pages and API routes
    api/                  # REST API endpoints
      upload/             # File upload
      process/            # Processing control
      leads/              # Lead CRUD + review actions
      export/             # Export to CSV/XLSX
      stats/              # Queue statistics
    dashboard/            # Processing dashboard
    review/               # Lead review table
    lead/[id]/            # Lead detail view
    export/               # Export page
  components/             # React components
    layout/               # Sidebar, Header
    upload/               # FileUploader, DataPreview, ColumnMapper
    dashboard/            # QueueStats, ProcessingControls
    review/               # ReviewTable, FilterBar, ComparisonPanel
    lead/                 # LeadDetail, CandidateList, ManualOverride
    shared/               # ConfidenceBadge, StatusBadge, ExternalLink
  lib/
    types/                # TypeScript type definitions
    services/             # Business logic services
    providers/            # Pluggable external service providers
    utils/                # Text similarity, address normalization, URL validation
    store/                # In-memory lead store
```

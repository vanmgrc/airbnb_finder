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
   - **Queue A** (leads with competitor URL) processed first
   - **Queue B** (address-only leads) processed second
4. **Review** results in the review table with confidence scores
5. **Export** approved results to CSV or XLSX

## Sample Data

A sample CSV is included at `public/sample-leads.csv` for testing.

## Architecture

### Services (`src/lib/services/`)

| Service | Purpose |
|---|---|
| `fileParser` | Parses CSV/XLSX files |
| `columnMapper` | Auto-detects and maps file columns to lead fields |
| `queueManager` | Orchestrates lead processing (Queue A first, then B) |
| `competitorScraper` | Validates and scrapes competitor listing URLs |
| `searchService` | Builds search queries and executes searches |
| `airbnbCandidateFinder` | Finds and extracts Airbnb listing candidates |
| `matchingEngine` | Scores candidates against lead data (weighted matching) |
| `confidenceScorer` | Calculates confidence scores and labels |
| `exportService` | Exports results to CSV/XLSX |
| `reviewWorkflow` | Handles approve/reject/override review actions |

### Providers (`src/lib/providers/`)

Pluggable provider interfaces for external services:

| Provider | Current | Future Options |
|---|---|---|
| Search | `MockSearchProvider` | Google Custom Search API |
| Scraper | `MockScraperProvider` | Basic fetch+HTML, Browser automation (Puppeteer) |
| Image Search | `MockImageSearchProvider` | Google Lens via SerpAPI |
| Vision | `MockVisionProvider` | Claude Vision API, GPT-4V |

### Where to Plug In

- **Search provider**: `src/lib/providers/searchProvider.ts` — implement `SearchProvider` interface
- **Scraper provider**: `src/lib/providers/scraperProvider.ts` — implement `ScraperProvider` interface
- **Reverse image search**: `src/lib/providers/imageSearchProvider.ts` — implement `ImageSearchProvider` interface
- **Vision/image similarity**: `src/lib/providers/visionProvider.ts` — implement `VisionProvider` interface
- **Database**: Replace `src/lib/store/leadStore.ts` with a database-backed store

### Matching Engine Weights

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

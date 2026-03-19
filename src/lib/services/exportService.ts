import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Lead, ExportOptions } from '../types';

/**
 * The standard output columns for exported leads.
 */
const OUTPUT_COLUMNS: { key: string; label: string }[] = [
  { key: 'lead_id', label: 'Lead ID' },
  { key: 'owner_name', label: 'Owner Name' },
  { key: 'full_address', label: 'Full Address' },
  { key: 'rental_address', label: 'Rental Address' },
  { key: 'rental_city', label: 'City' },
  { key: 'rental_state', label: 'State' },
  { key: 'rental_zip', label: 'Zip' },
  { key: 'queue', label: 'Queue' },
  { key: 'competitor_listing_url', label: 'Competitor URL' },
  { key: 'competitor_status', label: 'Competitor Status' },
  { key: 'existing_airbnb_url', label: 'Existing Airbnb URL' },
  { key: 'final_airbnb_url', label: 'Matched Airbnb URL' },
  { key: 'confidence_score', label: 'Confidence Score' },
  { key: 'confidence_label', label: 'Confidence Level' },
  { key: 'processing_status', label: 'Processing Status' },
  { key: 'method_used', label: 'Method Used' },
  { key: 'reason', label: 'Reason' },
  { key: 'analysis_notes', label: 'Analysis Notes' },
  { key: 'review_decision', label: 'Review Decision' },
  { key: 'reviewer_notes', label: 'Reviewer Notes' },
  { key: 'error_message', label: 'Error Message' },
  { key: 'notes', label: 'Notes' },
  { key: 'created_at', label: 'Created At' },
  { key: 'updated_at', label: 'Updated At' },
];

/**
 * Build a single export row from a Lead.
 * If includeOriginal is true, merges in the original_data columns.
 */
function buildExportRow(
  lead: Lead,
  includeOriginal: boolean
): Record<string, string | number> {
  const row: Record<string, string | number> = {};

  // Add standard output columns
  for (const col of OUTPUT_COLUMNS) {
    const value = lead[col.key as keyof Lead];
    if (value === null || value === undefined) {
      row[col.label] = '';
    } else if (typeof value === 'object') {
      // For arrays/objects, serialize as JSON
      row[col.label] = JSON.stringify(value);
    } else {
      row[col.label] = value as string | number;
    }
  }

  // Add candidate count
  row['Candidate Count'] = lead.candidate_airbnb_urls?.length || 0;

  // If including original data, merge those columns with a prefix
  if (includeOriginal && lead.original_data) {
    for (const [key, value] of Object.entries(lead.original_data)) {
      const prefixedKey = `Original: ${key}`;
      row[prefixedKey] = value || '';
    }
  }

  return row;
}

/**
 * Build export rows for an array of leads.
 */
function buildExportRows(
  leads: Lead[],
  includeOriginal: boolean
): Record<string, string | number>[] {
  return leads.map((lead) => buildExportRow(lead, includeOriginal));
}

/**
 * Export leads to a CSV string.
 */
export function exportToCsv(leads: Lead[], includeOriginal: boolean): string {
  if (leads.length === 0) {
    return '';
  }

  const rows = buildExportRows(leads, includeOriginal);

  return Papa.unparse(rows, {
    quotes: true,
    header: true,
  });
}

/**
 * Export leads to an XLSX buffer.
 */
export function exportToXlsx(leads: Lead[], includeOriginal: boolean): Buffer {
  const rows = buildExportRows(leads, includeOriginal);

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();

  if (rows.length === 0) {
    // Create an empty sheet with just the headers
    const headers = OUTPUT_COLUMNS.map((c) => c.label);
    if (includeOriginal) {
      headers.push('Candidate Count');
    }
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(workbook, ws, 'Leads');
  } else {
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set column widths for readability
    const colWidths = Object.keys(rows[0]).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
  }

  // Write to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buffer);
}

/**
 * Export leads using the provided export options.
 * Applies filters and returns either CSV string or XLSX buffer.
 */
export function exportLeads(
  leads: Lead[],
  options: ExportOptions
): { data: string | Buffer; filename: string; contentType: string } {
  // Apply status filter
  let filtered = leads;
  if (options.statusFilter && options.statusFilter.length > 0) {
    filtered = filtered.filter((l) =>
      options.statusFilter.includes(l.processing_status)
    );
  }

  // Apply confidence filter
  if (options.confidenceFilter && options.confidenceFilter.length > 0) {
    filtered = filtered.filter((l) =>
      options.confidenceFilter.includes(l.confidence_label)
    );
  }

  // Sort by confidence score descending
  filtered.sort((a, b) => b.confidence_score - a.confidence_score);

  const includeOriginal = options.includeOriginalColumns;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  if (options.format === 'xlsx') {
    return {
      data: exportToXlsx(filtered, includeOriginal),
      filename: `airbnb_leads_export_${timestamp}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  return {
    data: exportToCsv(filtered, includeOriginal),
    filename: `airbnb_leads_export_${timestamp}.csv`,
    contentType: 'text/csv',
  };
}

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { RawLead } from '../types';

/**
 * Parse a CSV or XLSX file buffer into headers and an array of RawLead objects.
 */
export async function parseFile(
  file: Buffer,
  filename: string
): Promise<{ headers: string[]; data: RawLead[] }> {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'csv') {
    return parseCsv(file);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    return parseXlsx(file);
  }

  throw new Error(`Unsupported file format: ${ext}`);
}

/**
 * Parse a CSV buffer using PapaParse.
 */
function parseCsv(buffer: Buffer): { headers: string[]; data: RawLead[] } {
  const csvString = buffer.toString('utf-8');

  const result = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
  });

  if (result.errors.length > 0) {
    // Filter out only fatal errors; informational errors are common in CSVs
    const fatalErrors = result.errors.filter(
      (e) => e.type === 'Quotes' || e.type === 'FieldMismatch'
    );
    if (fatalErrors.length > 0 && result.data.length === 0) {
      throw new Error(
        `CSV parsing errors: ${fatalErrors.map((e) => e.message).join('; ')}`
      );
    }
  }

  const headers = result.meta.fields || [];

  // Convert parsed rows to RawLead objects, filtering out empty rows
  const data: RawLead[] = result.data
    .filter((row) => {
      return Object.values(row).some((val) => val !== undefined && val !== '');
    })
    .map((row) => {
      const rawLead: RawLead = {};
      for (const header of headers) {
        rawLead[header] = row[header] || '';
      }
      return rawLead;
    });

  return { headers, data };
}

/**
 * Parse an XLSX/XLS buffer using the xlsx library.
 */
function parseXlsx(buffer: Buffer): { headers: string[]; data: RawLead[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Use the first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('XLSX file contains no sheets');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error('Could not read the first worksheet');
  }

  // Convert sheet to JSON with headers
  const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false, // Return all values as strings
  });

  if (jsonData.length === 0) {
    return { headers: [], data: [] };
  }

  // Extract headers from the first row's keys
  const headers = Object.keys(jsonData[0]).map((h) => h.trim());

  // Convert to RawLead objects, filtering out empty rows
  const data: RawLead[] = jsonData
    .filter((row) => {
      return Object.values(row).some(
        (val) => val !== undefined && val !== null && String(val).trim() !== ''
      );
    })
    .map((row) => {
      const rawLead: RawLead = {};
      for (const header of headers) {
        const value = row[header];
        rawLead[header] = value !== undefined && value !== null ? String(value).trim() : '';
      }
      return rawLead;
    });

  return { headers, data };
}

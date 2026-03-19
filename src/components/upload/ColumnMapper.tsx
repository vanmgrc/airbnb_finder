'use client';

import { useState } from 'react';
import { ColumnMapping } from '@/lib/types';

interface ColumnMapperProps {
  headers: string[];
  initialMapping: ColumnMapping | null;
  onMappingComplete: (mapping: ColumnMapping) => void;
  onAutoDetect: () => void;
}

const fieldConfig = [
  { key: 'rental_address', label: 'Rental Address', required: true },
  { key: 'rental_city', label: 'City', required: true },
  { key: 'rental_state', label: 'State', required: true },
  { key: 'rental_zip', label: 'ZIP Code', required: false },
  { key: 'competitor_listing_url', label: 'Competitor Listing URL', required: false },
  { key: 'owner_name', label: 'Owner Name', required: false },
  { key: 'existing_airbnb_url', label: 'Existing Airbnb URL', required: false },
  { key: 'lead_id', label: 'Lead ID', required: false },
  { key: 'notes', label: 'Notes', required: false },
] as const;

export default function ColumnMapper({ headers, initialMapping, onMappingComplete, onAutoDetect }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping || {});

  function handleChange(fieldKey: string, value: string) {
    setMapping((prev) => ({
      ...prev,
      [fieldKey]: value || undefined,
    }));
  }

  function handleConfirm() {
    onMappingComplete(mapping);
  }

  const requiredMapped = fieldConfig
    .filter((f) => f.required)
    .every((f) => mapping[f.key as keyof ColumnMapping]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Map Columns</h3>
        <button
          onClick={onAutoDetect}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Auto-detect
        </button>
      </div>
      <p className="text-sm text-gray-500">Match your file columns to the required fields. Fields marked with * are required.</p>
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {fieldConfig.map(({ key, label, required }) => (
          <div key={key} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </span>
              {mapping[key as keyof ColumnMapping] && (
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <select
              value={mapping[key as keyof ColumnMapping] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Not mapped --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-gray-500">
          {requiredMapped
            ? 'All required fields are mapped.'
            : 'Please map all required fields to continue.'}
        </p>
        <button
          onClick={handleConfirm}
          disabled={!requiredMapped}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Mapping & Process
        </button>
      </div>
    </div>
  );
}

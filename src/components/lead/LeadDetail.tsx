'use client';

import { Lead } from '@/lib/types';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfidenceBadge from '@/components/shared/ConfidenceBadge';
import ExternalLink from '@/components/shared/ExternalLink';

interface LeadDetailProps {
  lead: Lead;
}

export default function LeadDetail({ lead }: LeadDetailProps) {
  return (
    <div className="space-y-6">
      {/* Property Info */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Property Information</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Full Address" value={lead.full_address} />
          <Field label="City" value={lead.rental_city} />
          <Field label="State" value={lead.rental_state} />
          <Field label="ZIP" value={lead.rental_zip} />
          <Field label="Owner" value={lead.owner_name} />
          <Field label="Lead ID" value={lead.lead_id || lead.id.slice(0, 8)} />
          <Field label="Queue" value={lead.queue === 'A' ? 'A (Competitor URL)' : 'B (No Competitor)'} />
          <div>
            <span className="text-xs text-gray-500 block mb-1">Status</span>
            <StatusBadge status={lead.processing_status} />
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-1">Method</span>
            <span className="text-sm text-gray-900">{lead.method_used !== 'none' ? lead.method_used : '--'}</span>
          </div>
        </div>
        {lead.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500 block mb-1">Notes</span>
            <p className="text-sm text-gray-700">{lead.notes}</p>
          </div>
        )}
      </section>

      {/* Competitor Data */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Competitor Data</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-gray-500 block mb-1">Competitor URL</span>
            <ExternalLink url={lead.competitor_listing_url} maxLength={60} />
          </div>
          <Field label="Competitor Status" value={lead.competitor_status} />
          <Field label="Extracted Title" value={lead.extracted_competitor_title} />
          <Field label="Extracted Description" value={lead.extracted_competitor_description} wide />
        </div>
        {lead.extracted_competitor_data && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
            <Field label="Bedrooms" value={lead.extracted_competitor_data.bedrooms?.toString()} />
            <Field label="Bathrooms" value={lead.extracted_competitor_data.bathrooms?.toString()} />
            <Field label="Sleeps" value={lead.extracted_competitor_data.sleeps?.toString()} />
            {lead.extracted_competitor_data.amenities.length > 0 && (
              <div className="col-span-3">
                <span className="text-xs text-gray-500 block mb-1">Amenities</span>
                <div className="flex flex-wrap gap-1">
                  {lead.extracted_competitor_data.amenities.map((a, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Result */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Result</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-gray-500 block mb-1">Final Airbnb URL</span>
            <ExternalLink url={lead.final_airbnb_url} maxLength={60} />
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-1">Confidence</span>
            <ConfidenceBadge score={lead.confidence_score} label={lead.confidence_label} />
          </div>
          <Field label="Reason" value={lead.reason} wide />
          <Field label="Analysis Notes" value={lead.analysis_notes} wide />
        </div>
        {lead.error_message && (
          <div className="mt-4 pt-4 border-t border-red-100">
            <span className="text-xs text-red-500 block mb-1">Error</span>
            <p className="text-sm text-red-700 bg-red-50 p-2 rounded">{lead.error_message}</p>
          </div>
        )}
      </section>

      {/* Review Status */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Review</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Review Decision" value={lead.review_decision} />
          <Field label="Reviewer Notes" value={lead.reviewer_notes} />
          <div>
            <span className="text-xs text-gray-500 block mb-1">Existing Airbnb URL</span>
            <ExternalLink url={lead.existing_airbnb_url} maxLength={60} />
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <span className="text-xs text-gray-500 block mb-1">{label}</span>
      <p className="text-sm text-gray-900">{value || '--'}</p>
    </div>
  );
}

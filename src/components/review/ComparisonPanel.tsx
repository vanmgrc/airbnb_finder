'use client';

import { Lead } from '@/lib/types';
import ConfidenceBadge from '@/components/shared/ConfidenceBadge';
import ExternalLink from '@/components/shared/ExternalLink';

interface ComparisonPanelProps {
  lead: Lead;
}

export default function ComparisonPanel({ lead }: ComparisonPanelProps) {
  const bestCandidate = lead.candidate_airbnb_urls[0] || null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Lead / Competitor Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Lead / Competitor Info</h4>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">Address</dt>
            <dd className="text-gray-900 font-medium">{lead.full_address || '--'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">Owner</dt>
            <dd className="text-gray-900">{lead.owner_name || '--'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">Competitor URL</dt>
            <dd><ExternalLink url={lead.competitor_listing_url} /></dd>
          </div>
          {lead.extracted_competitor_title && (
            <div>
              <dt className="text-gray-500 text-xs">Extracted Title</dt>
              <dd className="text-gray-900">{lead.extracted_competitor_title}</dd>
            </div>
          )}
          {lead.extracted_competitor_description && (
            <div>
              <dt className="text-gray-500 text-xs">Extracted Description</dt>
              <dd className="text-gray-700 text-xs leading-relaxed">{lead.extracted_competitor_description}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Airbnb Candidate Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Best Airbnb Match</h4>
        {bestCandidate ? (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">Airbnb URL</dt>
              <dd><ExternalLink url={bestCandidate.url} /></dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Title</dt>
              <dd className="text-gray-900 font-medium">{bestCandidate.title}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Location</dt>
              <dd className="text-gray-900">{bestCandidate.location || '--'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Details</dt>
              <dd className="text-gray-700">
                {bestCandidate.bedrooms != null ? `${bestCandidate.bedrooms} bed` : ''}
                {bestCandidate.bathrooms != null ? ` / ${bestCandidate.bathrooms} bath` : ''}
                {bestCandidate.sleeps != null ? ` / Sleeps ${bestCandidate.sleeps}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Match Score</dt>
              <dd><ConfidenceBadge score={bestCandidate.score} label={lead.confidence_label} /></dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-gray-500">No candidates found.</p>
        )}
      </div>

      {/* Confidence / Reason */}
      {lead.reason && (
        <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Analysis</h4>
          <p className="text-sm text-gray-700 mb-2">{lead.reason}</p>
          {lead.analysis_notes && (
            <p className="text-xs text-gray-500 leading-relaxed">{lead.analysis_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

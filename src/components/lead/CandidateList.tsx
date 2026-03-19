'use client';

import { useState } from 'react';
import { AirbnbCandidate } from '@/lib/types';
import ExternalLink from '@/components/shared/ExternalLink';

interface CandidateListProps {
  candidates: AirbnbCandidate[];
  selectedUrl: string;
  onSelect: (url: string) => void;
}

export default function CandidateList({ candidates, selectedUrl, onSelect }: CandidateListProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (candidates.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500 text-sm">
        No Airbnb candidates found for this lead.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Airbnb Candidates ({candidates.length})
      </h3>
      {candidates.map((candidate, idx) => {
        const isSelected = selectedUrl === candidate.url;
        const isExpanded = expandedIdx === idx;
        return (
          <div
            key={candidate.url}
            className={`bg-white border rounded-lg p-4 transition-colors ${
              isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    candidate.score >= 75 ? 'bg-green-100 text-green-800' :
                    candidate.score >= 50 ? 'bg-amber-100 text-amber-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    Score: {Math.round(candidate.score)}
                  </span>
                  {isSelected && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Selected</span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">{candidate.title || 'Untitled Listing'}</p>
                <ExternalLink url={candidate.url} maxLength={50} />
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {candidate.bedrooms != null && <span>{candidate.bedrooms} bed</span>}
                  {candidate.bathrooms != null && <span>{candidate.bathrooms} bath</span>}
                  {candidate.sleeps != null && <span>Sleeps {candidate.sleeps}</span>}
                  {candidate.location && <span>{candidate.location}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? 'Hide details' : 'Details'}
                </button>
                <button
                  onClick={() => onSelect(candidate.url)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </button>
              </div>
            </div>

            {isExpanded && candidate.matchDetails.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-1">Factor</th>
                      <th className="text-right py-1">Weight</th>
                      <th className="text-right py-1">Score</th>
                      <th className="text-left py-1 pl-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidate.matchDetails.map((d, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="py-1 text-gray-700">{d.factor}</td>
                        <td className="py-1 text-right text-gray-500">{d.weight}</td>
                        <td className="py-1 text-right font-medium text-gray-900">{d.score.toFixed(1)}</td>
                        <td className="py-1 pl-4 text-gray-500">{d.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

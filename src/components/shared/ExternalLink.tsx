'use client';

interface ExternalLinkProps {
  url: string;
  maxLength?: number;
}

export default function ExternalLink({ url, maxLength = 35 }: ExternalLinkProps) {
  if (!url) {
    return <span className="text-gray-400 text-sm">--</span>;
  }

  const display = url.length > maxLength ? url.slice(0, maxLength) + '...' : url;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm hover:underline"
    >
      <span className="truncate">{display}</span>
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

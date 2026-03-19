interface ExternalLinkProps {
  url: string;
  label?: string;
  className?: string;
}

export default function ExternalLink({ url, label, className = '' }: ExternalLinkProps) {
  if (!url || url.trim() === '') {
    return <span className="text-gray-400 text-sm italic">No URL</span>;
  }

  let href = url;
  if (!/^https?:\/\//i.test(href)) {
    href = 'https://' + href;
  }

  const displayText = label || url;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm transition-colors group ${className}`}
      title={url}
    >
      <span className="truncate max-w-[240px]">{displayText}</span>
      <svg
        className="w-3.5 h-3.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}

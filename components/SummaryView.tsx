import React, { useMemo } from 'react';

// Declare marked from the global scope (loaded via script tag in index.html)
declare const marked: any;

interface SummaryViewProps {
  summary: string;
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary }) => {
  const parsedHtml = useMemo(() => {
    if (typeof marked === 'undefined') {
      // Fallback for when marked is not loaded yet, or in a test environment
      return summary.replace(/\n/g, '<br />');
    }
    // Use marked to parse markdown into HTML. Marked sanitizes the output by default.
    return marked.parse(summary);
  }, [summary]);

  return (
    <div
      className="prose prose-slate max-w-none prose-headings:font-bold prose-h3:text-xl prose-p:text-slate-600 prose-p:leading-relaxed prose-ul:list-disc prose-ol:list-decimal"
      dangerouslySetInnerHTML={{ __html: parsedHtml }}
    />
  );
};

export default SummaryView;
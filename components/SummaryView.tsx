import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface SummaryViewProps {
  summary: string;
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary }) => {
  return (
    <MarkdownRenderer
      content={summary}
      className="prose prose-slate max-w-none prose-headings:font-bold prose-h3:text-xl prose-p:leading-relaxed prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1"
    />
  );
};

export default SummaryView;


import React from 'react';

interface SummaryViewProps {
  summary: string;
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary }) => {
  return (
    <div className="prose prose-slate max-w-none">
      {summary.split('\n').map((paragraph, index) => (
        <p key={index} className="text-slate-600 leading-relaxed">
          {paragraph}
        </p>
      ))}
    </div>
  );
};

export default SummaryView;

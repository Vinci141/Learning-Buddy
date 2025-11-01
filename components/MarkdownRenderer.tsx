import React, { useMemo } from 'react';

// Declare marked from the global scope (loaded via script tag in index.html)
declare const marked: any;

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const parsedHtml = useMemo(() => {
    if (typeof marked === 'undefined' || !content) {
      return (content || '').replace(/\n/g, '<br />');
    }
    // Use marked to parse markdown into HTML. Marked sanitizes the output by default.
    return marked.parse(content);
  }, [content]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: parsedHtml }}
    />
  );
};

export default MarkdownRenderer;

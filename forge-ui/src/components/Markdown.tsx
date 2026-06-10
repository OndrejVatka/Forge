import type { ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';

/** Render trusted markdown (ticket descriptions, comments) with prose styles. */
export function Markdown({ children }: { children: string }): ReactElement {
  return (
    <div className="markdown text-sm">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

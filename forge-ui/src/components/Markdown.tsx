import type { ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';

/** Render trusted markdown (ticket descriptions, comments); prose styles live in `.markdown`. */
export function Markdown({ children }: { children: string }): ReactElement {
  return (
    <div className="markdown">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

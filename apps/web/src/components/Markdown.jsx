import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/cn';

/**
 * Renders faculty/AI markdown. Raw HTML is never rendered (react-markdown escapes it by
 * default), and links open in a new tab without leaking the opener.
 */
export function Markdown({ children, className }) {
  return (
    <div className={cn('prose-acet', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          img: ({ node: _node, alt, ...props }) => (
            <img {...props} alt={alt ?? ''} loading="lazy" className="max-w-full rounded-xl" />
          ),
        }}
      >
        {children ?? ''}
      </ReactMarkdown>
    </div>
  );
}

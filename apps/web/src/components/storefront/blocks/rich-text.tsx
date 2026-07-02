import { cn } from '@ecom/ui';

interface Props {
  html?: unknown;
  maxWidth?: unknown; // 'prose' | 'full'
}

/**
 * RichText block. The `html` prop is inserted via dangerouslySetInnerHTML.
 * Editors are trusted (only admin-role can write pages), but if this block
 * ever gains a user-generated-content variant, run it through a sanitizer
 * first (e.g., isomorphic-dompurify).
 */
export function RichTextBlock(props: Props) {
  const html = typeof props.html === 'string' ? props.html : '';
  if (!html.trim()) return null;

  const wide = props.maxWidth === 'full';

  return (
    <section
      className={cn(
        'mx-auto px-4 py-6',
        wide ? 'max-w-6xl' : 'max-w-3xl',
      )}
    >
      <div
        className={cn(
          '[&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight',
          '[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight',
          '[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold',
          '[&_p]:my-3 [&_p]:leading-relaxed',
          '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80',
          '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6',
          '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6',
          '[&_li]:my-1',
          '[&_strong]:font-semibold',
          '[&_em]:italic',
          '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs',
          '[&_hr]:my-6',
          '[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

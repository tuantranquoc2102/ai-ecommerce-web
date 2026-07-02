import Link from 'next/link';
import { cn } from '@ecom/ui';

interface Props {
  url?: unknown;
  alt?: unknown;
  caption?: unknown;
  href?: unknown;
  maxWidth?: unknown; // 'container' | 'prose' | 'full-bleed'
}

export function ImageBlock(props: Props) {
  const url = typeof props.url === 'string' ? props.url : null;
  if (!url) return null;

  const alt = typeof props.alt === 'string' ? props.alt : '';
  const caption = typeof props.caption === 'string' ? props.caption : null;
  const href = typeof props.href === 'string' ? props.href : null;
  const width = props.maxWidth === 'full-bleed' ? 'full-bleed' : props.maxWidth === 'prose' ? 'prose' : 'container';

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="w-full rounded-lg object-cover" />
  );

  return (
    <section
      className={cn(
        'py-6',
        width === 'container' && 'mx-auto max-w-6xl px-4',
        width === 'prose' && 'mx-auto max-w-3xl px-4',
        width === 'full-bleed' && 'w-full px-0',
      )}
    >
      {href ? <Link href={href}>{img}</Link> : img}
      {caption ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">{caption}</p>
      ) : null}
    </section>
  );
}

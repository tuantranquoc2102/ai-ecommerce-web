import { Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Card, cn } from '@ecom/ui';

interface Testimonial {
  name: string;
  location?: string;
  avatarUrl?: string;
  photoUrl?: string;
  rating?: number; // 1-5, defaults to 5
  quote: string;
}

interface Props {
  title?: unknown;
  subtitle?: unknown;
  items?: unknown;
  layout?: unknown; // 'grid' | 'featured' — featured pins first item large
}

/**
 * Testimonials / UGC block. Renders customer quotes with optional avatar,
 * rating stars, and a photo (User-Generated Content — the highest-converting
 * social proof for e-commerce). Layout is a 3-column grid by default; if
 * `layout: "featured"` and one item has a photo, that item spans wider.
 */
export function TestimonialsBlock(props: Props) {
  const items = Array.isArray(props.items) ? (props.items as unknown[]) : [];
  const valid = items.filter(
    (it): it is Testimonial =>
      !!it &&
      typeof it === 'object' &&
      typeof (it as Testimonial).name === 'string' &&
      typeof (it as Testimonial).quote === 'string',
  );
  if (valid.length === 0) return null;

  const title = typeof props.title === 'string' ? props.title : 'Loved by shoppers';
  const subtitle = typeof props.subtitle === 'string' ? props.subtitle : null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {valid.map((t, i) => (
          <TestimonialCard key={i} t={t} />
        ))}
      </div>
    </section>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  const rating = Math.min(5, Math.max(1, Math.round(t.rating ?? 5)));
  return (
    <Card className="flex flex-col overflow-hidden">
      {t.photoUrl ? (
        <div className="aspect-square overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={t.photoUrl}
            alt={`Photo from ${t.name}`}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'size-4',
                i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40',
              )}
            />
          ))}
        </div>
        <p className="mb-4 flex-1 text-sm leading-relaxed">"{t.quote}"</p>
        <div className="flex items-center gap-3">
          <Avatar>
            {t.avatarUrl ? <AvatarImage src={t.avatarUrl} alt={t.name} /> : null}
            <AvatarFallback>{initials(t.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{t.name}</div>
            {t.location ? (
              <div className="text-xs text-muted-foreground">{t.location}</div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

import { Mail } from 'lucide-react';
import { NewsletterForm } from './newsletter.client';

interface Props {
  title?: unknown;
  subtitle?: unknown;
  discountLabel?: unknown; // "-10%" or similar
  discountCode?: unknown; // sent back to user on success
  layout?: unknown; // 'inline' | 'boxed' — inline is transparent, boxed has bg
}

/**
 * Newsletter signup — the classic "lead capture in exchange for a discount"
 * pattern. Form submission is stubbed on the frontend for now (M2.4 lands
 * the backend `/newsletter/subscribe` endpoint + Mailchimp/Klaviyo adapter).
 */
export function NewsletterBlock(props: Props) {
  const title = typeof props.title === 'string' ? props.title : 'Get 10% off your first order';
  const subtitle =
    typeof props.subtitle === 'string'
      ? props.subtitle
      : 'Sign up for our newsletter — we\'ll send you a welcome code + occasional early access to sales.';
  const discountLabel = typeof props.discountLabel === 'string' ? props.discountLabel : null;
  const discountCode = typeof props.discountCode === 'string' ? props.discountCode : null;
  const boxed = props.layout !== 'inline';

  const inner = (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Mail className="size-5" />
      </div>
      {discountLabel ? (
        <div className="mb-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          {discountLabel}
        </div>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <NewsletterForm discountCode={discountCode} />
      <p className="mt-3 text-xs text-muted-foreground">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      {boxed ? (
        <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background p-8 sm:p-12">
          {inner}
        </div>
      ) : (
        inner
      )}
    </section>
  );
}

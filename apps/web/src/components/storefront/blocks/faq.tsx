import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

interface Props {
  title?: unknown;
  subtitle?: unknown;
  items?: unknown;
}

/**
 * FAQ block using native <details>/<summary> — no client JS needed, semantic
 * HTML, screen-reader friendly, and works even before hydration. Perfect for
 * a below-the-fold section that shouldn't ship extra JS.
 *
 * Editors provide items[] as { question, answer } — answer accepts plain text
 * (multiline preserved via whitespace-pre-line). For rich HTML content in
 * answers, use a RichText block instead.
 */
export function FaqBlock(props: Props) {
  const items = Array.isArray(props.items) ? (props.items as unknown[]) : [];
  const valid = items.filter(
    (it): it is FaqItem =>
      !!it &&
      typeof it === 'object' &&
      typeof (it as FaqItem).question === 'string' &&
      typeof (it as FaqItem).answer === 'string',
  );
  if (valid.length === 0) return null;

  const title = typeof props.title === 'string' ? props.title : 'Frequently asked questions';
  const subtitle = typeof props.subtitle === 'string' ? props.subtitle : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <div className="mt-8 divide-y rounded-lg border bg-card">
        {valid.map((it, i) => (
          <details key={i} className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 hover:bg-accent/30">
              <span className="text-sm font-medium sm:text-base">{it.question}</span>
              <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="whitespace-pre-line px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
              {it.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

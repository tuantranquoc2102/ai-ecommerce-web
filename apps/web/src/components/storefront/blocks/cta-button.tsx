import Link from 'next/link';
import { Button } from '@ecom/ui';

interface Props {
  label?: unknown;
  href?: unknown;
  variant?: unknown; // matches @ecom/ui Button variants
  size?: unknown; // 'default' | 'sm' | 'lg'
  eventName?: unknown; // reserved — for M3.3 analytics wiring
}

type Variant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
type Size = 'default' | 'sm' | 'lg';

const ALLOWED_VARIANTS: readonly Variant[] = [
  'default',
  'outline',
  'secondary',
  'ghost',
  'destructive',
  'link',
];
const ALLOWED_SIZES: readonly Size[] = ['default', 'sm', 'lg'];

export function CtaButtonBlock(props: Props) {
  const label = typeof props.label === 'string' ? props.label : null;
  const href = typeof props.href === 'string' ? props.href : null;
  if (!label || !href) return null;

  const variant = ALLOWED_VARIANTS.includes(props.variant as Variant)
    ? (props.variant as Variant)
    : 'default';
  const size = ALLOWED_SIZES.includes(props.size as Size)
    ? (props.size as Size)
    : 'default';

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 text-center">
      <Button asChild variant={variant} size={size}>
        <Link href={href}>{label}</Link>
      </Button>
    </section>
  );
}

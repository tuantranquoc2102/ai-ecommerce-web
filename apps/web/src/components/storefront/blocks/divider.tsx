import { cn } from '@ecom/ui';

interface Props {
  label?: unknown;
  thickness?: unknown; // 'thin' | 'thick'
}

export function DividerBlock(props: Props) {
  const label = typeof props.label === 'string' ? props.label : null;
  const thick = props.thickness === 'thick';

  return (
    <section className="mx-auto max-w-6xl px-4 py-4">
      {label ? (
        <div className="flex items-center gap-3">
          <hr className={cn('flex-1', thick ? 'border-t-2' : 'border-t')} />
          <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
            {label}
          </span>
          <hr className={cn('flex-1', thick ? 'border-t-2' : 'border-t')} />
        </div>
      ) : (
        <hr className={thick ? 'border-t-2' : 'border-t'} />
      )}
    </section>
  );
}

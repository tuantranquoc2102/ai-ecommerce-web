import { getProductsByIds, type PublicProduct } from '@/lib/storefront-api';
import { ProductCard } from './product-grid';
import { FlashSaleClient } from './flash-sale-countdown.client';

interface Props {
  endAt?: unknown;
  title?: unknown;
  productIds?: unknown;
  hideAfterEnd?: unknown;
}

export async function FlashSaleCountdownBlock(props: Props) {
  const endAt = typeof props.endAt === 'string' ? props.endAt : null;
  if (!endAt) return null;

  const title = typeof props.title === 'string' ? props.title : '⚡ Flash Sale';
  const ids = Array.isArray(props.productIds)
    ? (props.productIds as unknown[]).filter((x): x is string => typeof x === 'string' && !x.startsWith('REPLACE'))
    : [];
  const products = ids.length > 0
    ? (await getProductsByIds(ids)).filter((p): p is PublicProduct => p !== null)
    : [];

  return (
    <FlashSaleClient
      title={title}
      endAt={endAt}
      hideAfterEnd={props.hideAfterEnd === true}
    >
      {products.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : null}
    </FlashSaleClient>
  );
}

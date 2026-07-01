import { ShoppingBag } from 'lucide-react';
import { EmptyState, PageHeader } from '@ecom/ui';

export default function OrdersPage() {
  return (
    <>
      <PageHeader title="Orders" description="Track and fulfill customer orders." />
      <EmptyState
        icon={<ShoppingBag />}
        title="No orders yet"
        description="Orders from your storefront will appear here."
      />
    </>
  );
}

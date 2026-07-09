'use client';

import { PageHeader } from '@ecom/ui';
import { OrdersTable } from '@/components/orders-table';

export default function OrdersReturnsPage() {
  return (
    <>
      <PageHeader
        title="Returns & cancellations"
        description="Refunded and cancelled orders."
      />
      <OrdersTable statuses={['REFUNDED', 'CANCELLED']} showSearch />
    </>
  );
}

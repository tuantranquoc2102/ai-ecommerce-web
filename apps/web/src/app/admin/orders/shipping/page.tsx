'use client';

import { PageHeader } from '@ecom/ui';
import { OrdersTable } from '@/components/orders-table';

export default function OrdersShippingPage() {
  return (
    <>
      <PageHeader title="Shipping" description="Orders currently in transit to customers." />
      <OrdersTable baseFilters={{ status: 'SHIPPING' }} showSearch />
    </>
  );
}

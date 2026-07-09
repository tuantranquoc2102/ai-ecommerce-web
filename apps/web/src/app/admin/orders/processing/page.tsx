'use client';

import { PageHeader } from '@ecom/ui';
import { OrdersTable } from '@/components/orders-table';

export default function OrdersProcessingPage() {
  return (
    <>
      <PageHeader title="Processing" description="Orders confirmed and being prepared for shipment." />
      <OrdersTable baseFilters={{ status: 'PROCESSING' }} showSearch />
    </>
  );
}

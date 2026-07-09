'use client';

import { PageHeader } from '@ecom/ui';
import { OrdersTable } from '@/components/orders-table';

export default function AdminOrdersPage() {
  return (
    <>
      <PageHeader title="Orders" description="Browse, filter and manage all orders." />
      <OrdersTable showSearch showStatusFilter showPaymentFilter showDateFilter showSort />
    </>
  );
}

import { Box } from 'lucide-react';
import { Button, EmptyState, PageHeader } from '@ecom/ui';

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your storefront catalog."
        actions={<Button>New product</Button>}
      />
      <EmptyState
        icon={<Box />}
        title="No products yet"
        description="Create your first product to see it listed here."
        action={<Button>Create product</Button>}
      />
    </>
  );
}

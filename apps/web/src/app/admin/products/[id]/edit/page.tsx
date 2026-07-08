import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button, PageHeader } from '@ecom/ui';
import { ProductForm } from '@/components/product-form';

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Edit product"
        description="Update details, variants, digital deliverables, and merchandising."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/products">
              <ArrowLeft className="size-4" /> Back to products
            </Link>
          </Button>
        }
      />
      <ProductForm productId={id} />
    </div>
  );
}

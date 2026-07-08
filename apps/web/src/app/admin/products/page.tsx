'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Box, Ellipsis, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  type CategoryTreeNode,
  type ProductStatus,
  type ProductType,
} from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

type Product = {
  id: string;
  title: string;
  slug: string;
  mainImage: string | null;
  type: ProductType;
  digitalType: 'FILE_DOWNLOAD' | 'SERIAL_KEY' | null;
  basePrice: string;
  salePrice: string | null;
  stockQuantity: number;
  status: ProductStatus;
  productCategories: { category: { id: string; name: string } }[];
};

type ListProducts = { items: Product[]; total: number; page: number; pageSize: number };

const STATUS_VARIANT: Record<ProductStatus, 'secondary' | 'success' | 'outline'> = {
  DRAFT: 'secondary',
  ACTIVE: 'success',
  ARCHIVED: 'outline',
};

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const categoryOptions = useMemo(() => flattenCategoryOptions(categories), [categories]);

  async function load() {
    setLoading(true);
    setErr(null);
    const categoryId = categoryFilter === 'ALL' ? undefined : categoryFilter;
    const qs = new URLSearchParams({ pageSize: '100' });
    if (categoryId) qs.set('categoryId', categoryId);
    try {
      const [prod, cats] = await Promise.all([
        apiFetch<ListProducts>(`/products?${qs.toString()}`),
        apiFetch<CategoryTreeNode[]>('/categories/tree'),
      ]);
      setProducts(prod.items);
      setCategories(cats);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [categoryFilter]);

  async function handleDelete(id: string) {
    try {
      await apiFetch<null>(`/products/${id}`, { method: 'DELETE' });
      toast({ title: 'Product archived', variant: 'success' });
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'title',
      header: 'Product',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.mainImage ? (
            <img
              src={row.original.mainImage}
              alt=""
              className="size-10 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="size-10 shrink-0 rounded bg-muted" />
          )}
          <div>
            <div className="font-medium">{row.original.title}</div>
            <code className="text-xs text-muted-foreground">{row.original.slug}</code>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.type === 'DIGITAL' ? `Digital · ${row.original.digitalType}` : 'Physical'}
        </Badge>
      ),
    },
    {
      accessorKey: 'basePrice',
      header: 'Price',
      cell: ({ row }) => {
        const p = row.original;
        return p.salePrice ? (
          <div className="space-x-1">
            <span className="font-medium">${p.salePrice}</span>
            <span className="text-xs text-muted-foreground line-through">${p.basePrice}</span>
          </div>
        ) : (
          <span className="font-medium">${p.basePrice}</span>
        );
      },
    },
    {
      accessorKey: 'stockQuantity',
      header: 'Stock',
      cell: ({ row }) => (
        <span
          className={
            row.original.stockQuantity === 0
              ? 'text-destructive'
              : row.original.stockQuantity < 10
                ? 'text-warning-foreground'
                : ''
          }
        >
          {row.original.stockQuantity}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>
      ),
    },
    {
      id: 'categories',
      header: 'Categories',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.productCategories.slice(0, 2).map(({ category }) => (
            <Badge key={category.id} variant="secondary" className="text-xs">
              {category.name}
            </Badge>
          ))}
          {row.original.productCategories.length > 2 ? (
            <Badge variant="outline" className="text-xs">
              +{row.original.productCategories.length - 2}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/products/${row.original.id}/edit` as Route}>Edit</Link>
              </DropdownMenuItem>
              <ConfirmDialog
                trigger={
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive"
                  >
                    Archive
                  </DropdownMenuItem>
                }
                title={`Archive "${row.original.title}"?`}
                description="The product will be soft-deleted and archived. It won't be visible to customers."
                destructive
                confirmLabel="Archive"
                onConfirm={() => handleDelete(row.original.id)}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your storefront catalog."
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="size-4" /> New product
            </Link>
          </Button>
        }
      />

      {err ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        searchColumn="title"
        searchPlaceholder="Search products by title…"
        toolbar={
          <div className="min-w-55">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="max-h-80 overflow-y-auto">
                <SelectItem value="ALL">All categories</SelectItem>
                {categoryOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        empty={
          <EmptyState
            icon={<Box />}
            title={categoryFilter === 'ALL' ? 'No products yet' : 'No products in this category'}
            description={
              categoryFilter === 'ALL'
                ? 'Create your first product to see it listed here.'
                : 'Try another category or clear the filter.'
            }
            action={
              categoryFilter === 'ALL' ? (
                <Button asChild>
                  <Link href="/admin/products/new">
                    <Plus className="size-4" /> Create product
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setCategoryFilter('ALL')}>
                  Clear filter
                </Button>
              )
            }
          />
        }
      />
    </>
  );
}

function flattenCategoryOptions(
  nodes: CategoryTreeNode[],
): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  const walk = (items: CategoryTreeNode[], depth: number) => {
    for (const node of items) {
      const prefix = depth > 0 ? `${'  '.repeat(depth)}↳ ` : '';
      out.push({ id: node.id, label: `${prefix}${node.name}` });
      walk(node.children, depth + 1);
    }
  };
  walk(nodes, 0);
  return out;
}

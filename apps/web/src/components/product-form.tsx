'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileUp, Link2, Loader2, Plus, Trash2, Wand2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  CreateProductDto,
  defaultSkuStrategy,
  generateVariantMatrix,
  VariantMatrixError,
  type CategoryTreeNode,
  type CreateProductDto as CreateProductValues,
  type DigitalAssetInput,
  type ProductAttributeInput,
  type ProductVariantInput,
} from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Textarea,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';
import { ProductGallery } from '@/components/product-gallery';

type Tag = { id: string; name: string; slug: string };
type ProductOption = { id: string; title: string; mainImage: string | null };
type ListProducts = { items: ProductOption[] };

// Minimal flat category shape returned by POST /categories (no children hydrated).
type CategoryCreated = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
};

const DEFAULT_VALUES: Partial<CreateProductValues> = {
  title: '',
  slug: '',
  description: '',
  type: 'PHYSICAL',
  basePrice: '0',
  stockQuantity: 0,
  status: 'DRAFT',
  categoryIds: [],
  tagIds: [],
  mainImage: '',
  galleryImages: [],
  attributes: [],
  variants: [],
  digitalAssets: [],
  relatedProductIds: [],
  comboProductIds: [],
};

/** Shape returned by GET /products/:id (the rich detail include). */
type ProductDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  mainImage: string | null;
  galleryImages: string[] | null;
  type: 'PHYSICAL' | 'DIGITAL';
  digitalType: 'FILE_DOWNLOAD' | 'SERIAL_KEY' | null;
  basePrice: string;
  salePrice: string | null;
  stockQuantity: number;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  productCategories: { category: { id: string; name: string } }[];
  productTags: { tag: { id: string; name: string } }[];
  attributes: { name: string; values: { id: string; value: string }[] }[];
  variants: {
    sku: string;
    price: string;
    salePrice: string | null;
    stockQuantity: number;
    imageUrl: string | null;
    values: { attributeValue: { value: string; attribute: { name: string } } }[];
  }[];
  digitalAssets: {
    url: string;
    storageKey: string | null;
    fileName: string;
    fileSize: number;
    contentType: string;
  }[];
  relatedProducts: { relatedProductId: string }[];
  comboItems: { comboProductId: string }[];
};

/** Map a server product detail back into the form's value shape for editing. */
function mapProductToValues(
  p: ProductDetail,
  ancestorMap: Map<string, string[]>,
): CreateProductValues {
  return {
    title: p.title,
    slug: p.slug,
    description: p.description ?? '',
    type: p.type,
    digitalType: p.digitalType ?? undefined,
    basePrice: p.basePrice,
    salePrice: p.salePrice ?? undefined,
    stockQuantity: p.stockQuantity,
    weightGrams: p.weightGrams ?? undefined,
    lengthMm: p.lengthMm ?? undefined,
    widthMm: p.widthMm ?? undefined,
    heightMm: p.heightMm ?? undefined,
    status: p.status,
    mainImage: p.mainImage ?? '',
    galleryImages: p.galleryImages ?? [],
    categoryIds: normalizeSelectedCategoryIds(
      p.productCategories.map((pc) => pc.category.id),
      ancestorMap,
    ),
    tagIds: p.productTags.map((pt) => pt.tag.id),
    attributes: p.attributes.map((a) => ({ name: a.name, values: a.values.map((v) => v.value) })),
    variants: p.variants.map((v) => ({
      sku: v.sku,
      price: v.price,
      salePrice: v.salePrice ?? undefined,
      stockQuantity: v.stockQuantity,
      imageUrl: v.imageUrl ?? undefined,
      options: Object.fromEntries(
        v.values.map((vv) => [vv.attributeValue.attribute.name, vv.attributeValue.value]),
      ),
    })),
    digitalAssets: p.digitalAssets.map((a) => ({
      url: a.url,
      storageKey: a.storageKey ?? undefined,
      fileName: a.fileName,
      fileSize: a.fileSize,
      contentType: a.contentType,
    })),
    relatedProductIds: p.relatedProducts.map((r) => r.relatedProductId),
    comboProductIds: p.comboItems.map((c) => c.comboProductId),
  };
}

/**
 * Full-page product form for both create and edit. Self-contained: fetches its
 * own reference data (categories, tags, and the product catalog for
 * related/combo pickers). Handles PHYSICAL vs DIGITAL products, the variant
 * matrix, digital deliverables, and merchandising links. When `productId` is
 * given it hydrates from and PATCHes that product; otherwise it POSTs a new one.
 * On success it redirects to the list.
 */
export function ProductForm({ productId }: { productId?: string } = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(productId);

  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const form = useForm<CreateProductValues>({
    resolver: zodResolver(CreateProductDto),
    defaultValues: DEFAULT_VALUES,
  });

  const type = form.watch('type');
  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const categoryAncestorMap = useMemo(() => buildCategoryAncestorMap(categories), [categories]);
  // A product can't relate to itself, so drop it from the merchandising pickers.
  const relatableOptions = useMemo(
    () => productOptions.filter((o) => o.id !== productId),
    [productOptions, productId],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadErr(null);
      try {
        const [cats, tgs, prods, product] = await Promise.all([
          apiFetch<CategoryTreeNode[]>('/categories/tree'),
          apiFetch<{ items: Tag[] }>('/tags?pageSize=200'),
          apiFetch<ListProducts>('/products?pageSize=100'),
          productId ? apiFetch<ProductDetail>(`/products/${productId}`) : Promise.resolve(null),
        ]);
        if (!active) return;
        setCategories(cats);
        setTags(tgs.items);
        setProductOptions(prods.items);
        if (product) {
          form.reset(mapProductToValues(product, buildCategoryAncestorMap(cats)));
        }
      } catch (e) {
        if (!active) return;
        setLoadErr(e instanceof ApiError ? e.message : (e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function onSubmit(values: CreateProductValues) {
    if (values.type === 'DIGITAL' && !values.digitalType) {
      form.setError('digitalType', { message: 'Required for digital products' });
      return;
    }

    const body: Record<string, unknown> = {
      title: values.title,
      type: values.type,
      basePrice: values.basePrice,
      stockQuantity: values.stockQuantity,
      status: values.status,
    };
    if (values.slug) body.slug = values.slug;
    if (values.description) body.description = values.description;
    if (values.salePrice) body.salePrice = values.salePrice;
    body.mainImage = values.mainImage && values.mainImage.trim() ? values.mainImage : null;
    body.galleryImages = values.galleryImages ?? [];
    body.categoryIds = normalizeSelectedCategoryIds(values.categoryIds ?? [], categoryAncestorMap);
    body.tagIds = values.tagIds ?? [];
    body.relatedProductIds = values.relatedProductIds ?? [];
    body.comboProductIds = values.comboProductIds ?? [];

    if (values.type === 'DIGITAL') {
      body.digitalType = values.digitalType;
      body.digitalAssets = values.digitalAssets ?? [];
    } else {
      // Physical dimensions only apply to physical goods.
      if (values.weightGrams != null) body.weightGrams = values.weightGrams;
      if (values.lengthMm != null) body.lengthMm = values.lengthMm;
      if (values.widthMm != null) body.widthMm = values.widthMm;
      if (values.heightMm != null) body.heightMm = values.heightMm;
    }

    if (values.attributes?.length) body.attributes = values.attributes;
    if (values.variants?.length) body.variants = values.variants;

    try {
      if (productId) {
        await apiFetch(`/products/${productId}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast({ title: 'Product updated', variant: 'success' });
      } else {
        await apiFetch('/products', { method: 'POST', body: JSON.stringify(body) });
        toast({ title: 'Product created', variant: 'success' });
      }
      router.push('/admin/products');
    } catch (e) {
      toast({
        title: isEdit ? 'Update failed' : 'Create failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <Form {...form}>
      {loadErr ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadErr}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-24">
        {/* ---------------------------------------------------------------- Basics */}
        <Card>
          <CardHeader>
            <CardTitle>Basic information</CardTitle>
            <CardDescription>Title, description, and imagery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Blue widget" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="auto-generated" />
                  </FormControl>
                  <FormDescription>Leave blank to auto-generate from the title.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Images</FormLabel>
              <FormControl>
                <ProductGallery
                  gallery={form.watch('galleryImages') ?? []}
                  mainImage={form.watch('mainImage') ?? null}
                  onChange={({ gallery, mainImage }) => {
                    form.setValue('galleryImages', gallery, { shouldDirty: true });
                    form.setValue('mainImage', mainImage ?? '', { shouldDirty: true });
                  }}
                  maxImages={5}
                />
              </FormControl>
            </FormItem>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* -------------------------------------------------------- Type & pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Type &amp; pricing</CardTitle>
            <CardDescription>
              Choose whether this is a physical or digital product, and set pricing and stock.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product type</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(next) => {
                          field.onChange(next);
                          // Clear fields that don't apply to the new type so
                          // stale values can't trip cross-field validation.
                          if (next === 'PHYSICAL') {
                            form.setValue('digitalType', undefined);
                            form.setValue('digitalAssets', []);
                            form.clearErrors('digitalType');
                          } else {
                            form.setValue('weightGrams', undefined);
                            form.setValue('lengthMm', undefined);
                            form.setValue('widthMm', undefined);
                            form.setValue('heightMm', undefined);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PHYSICAL">Physical</SelectItem>
                          <SelectItem value="DIGITAL">Digital</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {type === 'DIGITAL' ? (
                <FormField
                  control={form.control}
                  name="digitalType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Digital type</FormLabel>
                      <FormControl>
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose one" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FILE_DOWNLOAD">File download</SelectItem>
                            <SelectItem value="SERIAL_KEY">Serial key</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {type === 'DIGITAL' ? (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base price</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale price</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        inputMode="decimal"
                        placeholder="optional"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stockQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      {type === 'DIGITAL' ? 'For serial-key stock, or leave as 0.' : null}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ---------------------------------------------- Physical / digital extras */}
        {type === 'PHYSICAL' ? (
          <Card>
            <CardHeader>
              <CardTitle>Shipping dimensions</CardTitle>
              <CardDescription>Optional — used for shipping rate calculation.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <NumberField form={form} name="weightGrams" label="Weight (g)" />
                <NumberField form={form} name="lengthMm" label="Length (mm)" />
                <NumberField form={form} name="widthMm" label="Width (mm)" />
                <NumberField form={form} name="heightMm" label="Height (mm)" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Digital deliverables</CardTitle>
              <CardDescription>
                Upload the downloadable file(s) or paste an external download link. Buyers receive
                these after purchase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DigitalAssetsField
                value={form.watch('digitalAssets') ?? []}
                onChange={(next) =>
                  form.setValue('digitalAssets', next, { shouldDirty: true, shouldValidate: true })
                }
              />
            </CardContent>
          </Card>
        )}

        {/* ------------------------------------------------------- Variant matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
            <CardDescription>
              Optional. Define attributes (e.g. Size, Color), then generate a SKU per combination.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VariantMatrixField
              attributes={form.watch('attributes') ?? []}
              variants={form.watch('variants') ?? []}
              basePrice={form.watch('basePrice')}
              onChange={({ attributes, variants }) => {
                form.setValue('attributes', attributes, { shouldDirty: true });
                form.setValue('variants', variants, { shouldDirty: true, shouldValidate: true });
              }}
            />
            {form.formState.errors.variants ? (
              <p className="mt-2 text-sm text-destructive">
                {form.formState.errors.variants.message ??
                  'Some variants are invalid — regenerate after editing attributes.'}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* --------------------------------------------------- Categories & tags */}
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Categories and tags for filtering and navigation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="categoryIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categories</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <MultiPicker
                        options={flatCategories.map((c) => ({ id: c.id, label: c.name }))}
                        value={field.value ?? []}
                        onChange={(next) =>
                          field.onChange(normalizeSelectedCategoryIds(next, categoryAncestorMap))
                        }
                        emptyLabel="No categories yet. Add one below:"
                      />
                      <QuickAddInline
                        placeholder="New category name…"
                        endpoint="/categories"
                        onCreated={(created: CategoryCreated) => {
                          setCategories((prev) => [
                            ...prev,
                            { ...created, children: [], productCount: 0 },
                          ]);
                          const cur = form.getValues('categoryIds') ?? [];
                          form.setValue('categoryIds', [...cur, created.id], { shouldDirty: true });
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tagIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <MultiPicker
                        options={tags.map((t) => ({ id: t.id, label: t.name }))}
                        value={field.value ?? []}
                        onChange={field.onChange}
                        emptyLabel="No tags yet. Add one below:"
                      />
                      <QuickAddInline
                        placeholder="New tag name…"
                        endpoint="/tags"
                        onCreated={(created: Tag) => {
                          setTags((prev) => [...prev, created]);
                          const cur = form.getValues('tagIds') ?? [];
                          form.setValue('tagIds', [...cur, created.id], { shouldDirty: true });
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ------------------------------------------------- Related & combo links */}
        <Card>
          <CardHeader>
            <CardTitle>Merchandising</CardTitle>
            <CardDescription>
              Cross-sell with related products and &ldquo;frequently bought together&rdquo; combos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <FormLabel>Related products</FormLabel>
              <p className="mb-2 text-sm text-muted-foreground">
                Shown as suggestions on the product page.
              </p>
              <ProductMultiSelect
                options={relatableOptions}
                value={form.watch('relatedProductIds') ?? []}
                onChange={(next) => form.setValue('relatedProductIds', next, { shouldDirty: true })}
              />
            </div>
            <Separator />
            <div>
              <FormLabel>Frequently bought together</FormLabel>
              <p className="mb-2 text-sm text-muted-foreground">
                Bundled as a combo suggestion at checkout.
              </p>
              <ProductMultiSelect
                options={relatableOptions}
                value={form.watch('comboProductIds') ?? []}
                onChange={(next) => form.setValue('comboProductIds', next, { shouldDirty: true })}
              />
            </div>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- Actions */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl justify-end gap-2 px-4 py-3 lg:px-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/products')}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Saving…'
                : isEdit
                  ? 'Save changes'
                  : 'Create product'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

/* ------------------------------------------------------------------ Numeric field */

function NumberField({
  form,
  name,
  label,
}: {
  form: ReturnType<typeof useForm<CreateProductValues>>;
  name: 'weightGrams' | 'lengthMm' | 'widthMm' | 'heightMm';
  label: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              value={field.value ?? ''}
              onChange={(e) =>
                field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
              }
              placeholder="optional"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/* ---------------------------------------------------------------- Digital assets */

async function uploadDigitalFile(file: File) {
  const body = new FormData();
  body.append('file', file);
  return apiFetch<{ url: string; key: string; contentType: string; size: number }>(
    '/media/upload?folder=digital',
    { method: 'POST', body },
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function DigitalAssetsField({
  value,
  onChange,
}: {
  value: DigitalAssetInput[];
  onChange: (next: DigitalAssetInput[]) => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');

  async function handleFiles(files: FileList) {
    setBusy(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (f) => {
          const res = await uploadDigitalFile(f);
          return {
            url: res.url,
            storageKey: res.key,
            fileName: f.name,
            fileSize: res.size,
            contentType: res.contentType,
          } satisfies DigitalAssetInput;
        }),
      );
      onChange([...value, ...uploaded]);
    } catch (e) {
      toast({
        title: 'Upload failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!url) return;
    const fileName = linkName.trim() || url.split('/').pop() || 'download';
    onChange([...value, { url, fileName, fileSize: 0 }]);
    setLinkUrl('');
    setLinkName('');
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const fs = e.target.files;
          if (fs && fs.length > 0) handleFiles(fs);
          e.target.value = '';
        }}
      />

      {value.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {value.map((asset, idx) => (
            <li key={`${asset.url}-${idx}`} className="flex items-center gap-3 p-3">
              {asset.storageKey ? (
                <FileUp className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Link2 className="size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{asset.fileName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {asset.storageKey ? 'Uploaded file' : 'External link'}
                  {asset.fileSize ? ` · ${formatBytes(asset.fileSize)}` : ''} · {asset.url}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
                aria-label="Remove asset"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No deliverables added yet.</p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          {busy ? 'Uploading…' : 'Upload file'}
        </Button>
        <span className="text-xs text-muted-foreground">up to 50&nbsp;MB each</span>
      </div>

      <div className="rounded-md border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Or add an external link</p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…/file.zip"
            className="min-w-55 flex-1"
          />
          <Input
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            placeholder="Display name (optional)"
            className="min-w-40 flex-1"
          />
          <Button type="button" variant="outline" onClick={addLink} disabled={!linkUrl.trim()}>
            <Link2 className="size-4" /> Add link
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Variant matrix */

type MatrixValue = { attributes: ProductAttributeInput[]; variants: ProductVariantInput[] };

/** Stable signature of a variant's option map, for preserving edits across regenerations. */
function optionSignature(options: Record<string, string>): string {
  return Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join('|');
}

function VariantMatrixField({
  attributes,
  variants,
  basePrice,
  onChange,
}: {
  attributes: ProductAttributeInput[];
  variants: ProductVariantInput[];
  basePrice: string;
  onChange: (next: MatrixValue) => void;
}) {
  const { toast } = useToast();
  const [baseSku, setBaseSku] = useState('');
  const [valueDrafts, setValueDrafts] = useState<Record<number, string>>({});

  function setAttributes(next: ProductAttributeInput[]) {
    onChange({ attributes: next, variants });
  }

  function addAttribute() {
    setAttributes([...attributes, { name: '', values: [] }]);
  }

  function updateAttribute(idx: number, patch: Partial<ProductAttributeInput>) {
    setAttributes(attributes.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }

  function removeAttribute(idx: number) {
    setAttributes(attributes.filter((_, i) => i !== idx));
  }

  function addValue(idx: number) {
    const draft = (valueDrafts[idx] ?? '').trim();
    if (!draft) return;
    const attr = attributes[idx];
    if (!attr || attr.values.includes(draft)) return;
    updateAttribute(idx, { values: [...attr.values, draft] });
    setValueDrafts((d) => ({ ...d, [idx]: '' }));
  }

  function removeValue(idx: number, value: string) {
    const attr = attributes[idx];
    if (!attr) return;
    updateAttribute(idx, { values: attr.values.filter((v) => v !== value) });
  }

  function generate() {
    try {
      const combos = generateVariantMatrix(
        attributes.map((a) => ({ attribute: a.name, values: a.values })),
      );
      const prevBySig = new Map(variants.map((v) => [optionSignature(v.options), v]));
      const nextVariants: ProductVariantInput[] = combos.map((combo) => {
        const prev = prevBySig.get(optionSignature(combo));
        return {
          sku: prev?.sku || defaultSkuStrategy(combo, baseSku.trim() || 'SKU'),
          price: prev?.price ?? (basePrice || '0'),
          salePrice: prev?.salePrice,
          stockQuantity: prev?.stockQuantity ?? 0,
          imageUrl: prev?.imageUrl,
          options: combo,
        };
      });
      onChange({ attributes, variants: nextVariants });
      toast({ title: `Generated ${nextVariants.length} variant(s)`, variant: 'success' });
    } catch (e) {
      const msg = e instanceof VariantMatrixError ? e.message : (e as Error).message;
      toast({ title: 'Cannot generate variants', description: msg, variant: 'destructive' });
    }
  }

  function updateVariant(idx: number, patch: Partial<ProductVariantInput>) {
    onChange({ attributes, variants: variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)) });
  }

  function removeVariant(idx: number) {
    onChange({ attributes, variants: variants.filter((_, i) => i !== idx) });
  }

  const attrNames = attributes.map((a) => a.name).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Attribute axes */}
      <div className="space-y-3">
        {attributes.map((attr, idx) => (
          <div key={idx} className="rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={attr.name}
                onChange={(e) => updateAttribute(idx, { name: e.target.value })}
                placeholder="Attribute name (e.g. Size)"
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAttribute(idx)}
                aria-label="Remove attribute"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {attr.values.map((v) => (
                <Badge key={v} variant="secondary" className="gap-1">
                  {v}
                  <button
                    type="button"
                    onClick={() => removeValue(idx, v)}
                    aria-label={`Remove ${v}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={valueDrafts[idx] ?? ''}
                  onChange={(e) => setValueDrafts((d) => ({ ...d, [idx]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addValue(idx);
                    }
                  }}
                  placeholder="Add value…"
                  className="h-8 w-32 text-xs"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addValue(idx)}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addAttribute}>
          <Plus className="size-4" /> Add attribute
        </Button>
      </div>

      {attributes.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 border-t pt-4">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Base SKU</label>
            <Input
              value={baseSku}
              onChange={(e) => setBaseSku(e.target.value)}
              placeholder="e.g. WIDGET"
              className="max-w-xs"
            />
          </div>
          <Button type="button" onClick={generate}>
            <Wand2 className="size-4" /> Generate variants
          </Button>
        </div>
      ) : null}

      {/* Variant rows */}
      {variants.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <div className="min-w-150 divide-y">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_auto] gap-2 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>Variant / SKU</span>
              <span>Price</span>
              <span>Sale price</span>
              <span>Stock</span>
              <span className="sr-only">Actions</span>
            </div>
            {variants.map((variant, idx) => (
              <div
                key={optionSignature(variant.options)}
                className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_auto] items-center gap-2 px-3 py-2"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {attrNames.map((name) => (
                      <Badge key={name} variant="outline" className="text-xs">
                        {variant.options[name]}
                      </Badge>
                    ))}
                  </div>
                  <Input
                    value={variant.sku}
                    onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="SKU"
                  />
                </div>
                <Input
                  value={variant.price}
                  onChange={(e) => updateVariant(idx, { price: e.target.value })}
                  inputMode="decimal"
                  className="h-8"
                />
                <Input
                  value={variant.salePrice ?? ''}
                  onChange={(e) =>
                    updateVariant(idx, { salePrice: e.target.value || undefined })
                  }
                  inputMode="decimal"
                  className="h-8"
                  placeholder="—"
                />
                <Input
                  type="number"
                  min={0}
                  value={variant.stockQuantity}
                  onChange={(e) => updateVariant(idx, { stockQuantity: Number(e.target.value) })}
                  className="h-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeVariant(idx)}
                  aria-label="Remove variant"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- Product multiselect */

function ProductMultiSelect({
  options,
  value,
  onChange,
}: {
  options: ProductOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState('');
  const selected = new Set(value);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? options.filter((o) => o.title.toLowerCase().includes(term)) : options;
  }, [options, q]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">No other products available yet.</p>;
  }

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              {byId.get(id)?.title ?? id}
              <button type="button" onClick={() => toggle(id)} aria-label="Remove">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products…"
        className="max-w-sm"
      />
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">No matches.</p>
        ) : (
          filtered.map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selected.has(opt.id)}
                onCheckedChange={() => toggle(opt.id)}
              />
              {opt.mainImage ? (
                <img src={opt.mainImage} alt="" className="size-7 rounded object-cover" />
              ) : (
                <div className="size-7 rounded bg-muted" />
              )}
              <span className="truncate">{opt.title}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Shared helpers */

function QuickAddInline<T extends { id: string; name: string }>({
  placeholder,
  endpoint,
  onCreated,
}: {
  placeholder: string;
  endpoint: string;
  onCreated: (created: T) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const created = await apiFetch<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      });
      onCreated(created);
      setName('');
      toast({ title: `"${created.name}" added`, variant: 'success' });
    } catch (e) {
      toast({
        title: 'Create failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="h-8 text-xs"
        disabled={busy}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={submit}
        disabled={busy || !name.trim()}
      >
        {busy ? 'Adding…' : 'Add'}
      </Button>
    </div>
  );
}

function MultiPicker({
  options,
  value,
  onChange,
  emptyLabel,
}: {
  options: { id: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  emptyLabel: string;
}) {
  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  const selected = new Set(value);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            className={
              'inline-flex items-center rounded-md border px-2 py-1 text-xs transition-colors ' +
              (active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background hover:bg-accent hover:text-accent-foreground')
            }
            onClick={() => {
              const next = new Set(selected);
              if (active) next.delete(opt.id);
              else next.add(opt.id);
              onChange(Array.from(next));
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function flattenCategories(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const out: CategoryTreeNode[] = [];
  const walk = (n: CategoryTreeNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

function buildCategoryAncestorMap(tree: CategoryTreeNode[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const walk = (nodes: CategoryTreeNode[], parents: string[]) => {
    for (const node of nodes) {
      out.set(node.id, parents);
      walk(node.children, [...parents, node.id]);
    }
  };
  walk(tree, []);
  return out;
}

function normalizeSelectedCategoryIds(
  selected: string[],
  ancestorMap: Map<string, string[]>,
): string[] {
  const out = new Set(selected);
  for (const id of selected) {
    const ancestors = ancestorMap.get(id) ?? [];
    for (const parentId of ancestors) out.add(parentId);
  }
  return Array.from(out);
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronRight, Ellipsis, FolderTree, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  CreateCategoryDto,
  type CategoryTreeNode,
  type CreateCategoryDto as CreateCategoryValues,
} from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Textarea,
  cn,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';
import { ImageUpload } from '@/components/image-upload';

export default function CategoriesPage() {
  const { toast } = useToast();
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoryTreeNode | null>(null);
  const [creatingUnder, setCreatingUnder] = useState<string | null | undefined>(undefined);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<CategoryTreeNode[]>('/categories/tree');
      setTree(res);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    try {
      await apiFetch<null>(`/categories/${id}`, { method: 'DELETE' });
      toast({ title: 'Category deleted', variant: 'success' });
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const flat = flatten(tree);
  const totalCount = flat.length;

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organize products in a hierarchical tree. Nested up to any depth."
        actions={
          <Button onClick={() => setCreatingUnder(null)}>
            <Plus className="size-4" /> New category
          </Button>
        }
      />

      {err ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : tree.length === 0 ? (
        <EmptyState
          icon={<FolderTree />}
          title="No categories yet"
          description="Create your first category to start organizing products."
          action={
            <Button onClick={() => setCreatingUnder(null)}>
              <Plus className="size-4" /> Create category
            </Button>
          }
        />
      ) : (
        <Card className="p-2">
          {tree.map((node) => (
            <CategoryNode
              key={node.id}
              node={node}
              depth={0}
              onEdit={setEditing}
              onCreateChild={setCreatingUnder}
              onDelete={handleDelete}
            />
          ))}
        </Card>
      )}

      {totalCount > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{totalCount} categories total.</p>
      ) : null}

      <CategoryFormSheet
        open={creatingUnder !== undefined}
        onOpenChange={(o) => !o && setCreatingUnder(undefined)}
        parentId={typeof creatingUnder === 'string' ? creatingUnder : null}
        allCategories={flat}
        onSaved={() => {
          setCreatingUnder(undefined);
          load();
        }}
      />
      <CategoryFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        allCategories={flat}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

function CategoryNode({
  node,
  depth,
  onEdit,
  onCreateChild,
  onDelete,
}: {
  node: CategoryTreeNode;
  depth: number;
  onEdit: (n: CategoryTreeNode) => void;
  onCreateChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent',
          depth > 0 && 'ml-6',
        )}
      >
        <button
          type="button"
          aria-label={hasChildren ? (expanded ? 'Collapse' : 'Expand') : 'No children'}
          className={cn(
            'inline-flex size-5 items-center justify-center rounded text-muted-foreground',
            hasChildren && 'hover:bg-muted',
            !hasChildren && 'opacity-30',
          )}
          onClick={() => hasChildren && setExpanded((v) => !v)}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        {node.imageUrl ? (
          <img
            src={node.imageUrl}
            alt=""
            className="size-8 shrink-0 rounded object-cover"
          />
        ) : null}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{node.name}</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {node.slug}
            </code>
            {node.productCount > 0 ? (
              <Badge variant="secondary" className="ml-auto">
                {node.productCount} products
              </Badge>
            ) : null}
          </div>
          {node.description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{node.description}</p>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Actions">
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(node)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateChild(node.id)}>
              Add child
            </DropdownMenuItem>
            <ConfirmDialog
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive"
                  disabled={hasChildren}
                >
                  Delete
                </DropdownMenuItem>
              }
              title={`Delete "${node.name}"?`}
              description={
                hasChildren
                  ? 'This category has child categories.'
                  : 'This cannot be undone.'
              }
              destructive
              confirmLabel="Delete"
              onConfirm={() => onDelete(node.id)}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && hasChildren ? (
        <div>
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategoryFormSheet({
  open,
  onOpenChange,
  initial,
  parentId,
  allCategories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: CategoryTreeNode | null;
  parentId?: string | null;
  allCategories: CategoryTreeNode[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<CreateCategoryValues>({
    resolver: zodResolver(CreateCategoryDto),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      parentId: null,
      sortOrder: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      initial
        ? {
            name: initial.name,
            slug: initial.slug,
            description: initial.description ?? '',
            imageUrl: initial.imageUrl ?? '',
            parentId: initial.parentId,
            sortOrder: initial.sortOrder,
          }
        : {
            name: '',
            slug: '',
            description: '',
            imageUrl: '',
            parentId: parentId ?? null,
            sortOrder: 0,
          },
    );
  }, [open, initial, parentId, form]);

  async function onSubmit(values: CreateCategoryValues) {
    const body: Record<string, unknown> = {
      name: values.name,
      parentId: values.parentId ?? null,
      sortOrder: values.sortOrder ?? 0,
    };
    if (values.slug) body.slug = values.slug;
    if (values.description) body.description = values.description;
    body.imageUrl = values.imageUrl && values.imageUrl.trim() ? values.imageUrl : null;

    try {
      if (initial) {
        await apiFetch(`/categories/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast({ title: 'Category updated', variant: 'success' });
      } else {
        await apiFetch('/categories', { method: 'POST', body: JSON.stringify(body) });
        toast({ title: 'Category created', variant: 'success' });
      }
      onSaved();
    } catch (e) {
      toast({
        title: initial ? 'Update failed' : 'Create failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  // Exclude the current node and its descendants from parent choices (would create cycle).
  const invalidParentIds = new Set<string>();
  if (initial) {
    const walk = (n: CategoryTreeNode) => {
      invalidParentIds.add(n.id);
      n.children.forEach(walk);
    };
    const found = findNode(allCategories, initial.id);
    if (found) walk(found);
  }
  const parentOptions = allCategories.filter((c) => !invalidParentIds.has(c.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{initial ? 'Edit category' : 'New category'}</SheetTitle>
          <SheetDescription>
            {initial
              ? 'Update the category name, slug, description, or parent.'
              : 'Slug auto-generates from name if left blank.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Electronics" autoFocus />
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
                    <Input {...field} placeholder="auto-generated" />
                  </FormControl>
                  <FormDescription>Lowercase kebab-case. Leave empty to auto-generate.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent category</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ?? '__none'}
                      onValueChange={(v) => field.onChange(v === '__none' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="(root)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">(root category)</SelectItem>
                        {parentOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>Choose a parent to nest this category under.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover image</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value ?? ''}
                      onChange={(url) => field.onChange(url ?? '')}
                      folder="categories"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : initial ? 'Save' : 'Create'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function flatten(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const out: CategoryTreeNode[] = [];
  const walk = (n: CategoryTreeNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

function findNode(nodes: CategoryTreeNode[], id: string): CategoryTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}


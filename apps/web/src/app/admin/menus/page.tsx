'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, ListTree, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  CreateMenuDto,
  UpdateMenuDto,
  type CreateMenuDto as CreateMenuValues,
  type MenuPosition,
  type UpdateMenuDto as UpdateMenuValues,
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
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

type Menu = {
  id: string;
  name: string;
  position: MenuPosition;
  hierarchyJson: unknown;
  createdAt: string;
  updatedAt: string;
};

const HIERARCHY_HINT = `[
  { "label": "Home", "url": "/" },
  {
    "label": "Shop",
    "url": "/products",
    "children": [
      { "label": "Electronics", "url": "/c/electronics" },
      { "label": "Books", "url": "/c/books" }
    ]
  },
  { "label": "Blog", "url": "/blog", "target": "_self" }
]`;

const POSITION_VARIANT: Record<MenuPosition, 'default' | 'secondary' | 'outline'> = {
  HEADER: 'default',
  FOOTER: 'secondary',
  SIDEBAR: 'outline',
};

export default function MenusPage() {
  const { toast } = useToast();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<MenuPosition | 'ALL'>('ALL');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Menu | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiFetch<Menu[]>('/menus');
      setMenus(r);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(m: Menu) {
    try {
      await apiFetch<null>(`/menus/${m.id}`, { method: 'DELETE' });
      toast({ title: `Menu "${m.name}" deleted`, variant: 'success' });
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const filtered = menus.filter((m) => tab === 'ALL' || m.position === tab);
  const counts = {
    ALL: menus.length,
    HEADER: menus.filter((m) => m.position === 'HEADER').length,
    FOOTER: menus.filter((m) => m.position === 'FOOTER').length,
    SIDEBAR: menus.filter((m) => m.position === 'SIDEBAR').length,
  };

  return (
    <>
      <PageHeader
        title="Menus"
        description="Navigation menus grouped by placement. Each menu stores a nested items tree."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New menu
          </Button>
        }
      />

      {err ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as MenuPosition | 'ALL')} className="mb-4">
        <TabsList>
          <TabsTrigger value="ALL">All ({counts.ALL})</TabsTrigger>
          <TabsTrigger value="HEADER">Header ({counts.HEADER})</TabsTrigger>
          <TabsTrigger value="FOOTER">Footer ({counts.FOOTER})</TabsTrigger>
          <TabsTrigger value="SIDEBAR">Sidebar ({counts.SIDEBAR})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ListTree />}
          title="No menus yet"
          description="Define the navigation trees storefront layouts pull from."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Create menu
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    <Badge variant={POSITION_VARIANT[m.position]} className="text-xs">
                      {m.position}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {itemCount(m.hierarchyJson)} item(s) · Updated{' '}
                    {new Date(m.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Actions">
                      <Ellipsis className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(m)}>Edit</DropdownMenuItem>
                    <ConfirmDialog
                      trigger={
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      }
                      title={`Delete menu "${m.name}"?`}
                      description="Storefront pages referencing this menu will render empty."
                      destructive
                      confirmLabel="Delete"
                      onConfirm={() => handleDelete(m)}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <ul className="ml-1 space-y-0.5 text-xs text-muted-foreground">
                {previewItems(m.hierarchyJson, 3).map((label, i) => (
                  <li key={i}>· {label}</li>
                ))}
                {previewOverflow(m.hierarchyJson, 3) > 0 ? (
                  <li>… and {previewOverflow(m.hierarchyJson, 3)} more</li>
                ) : null}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <MenuFormSheet
        open={creating}
        onOpenChange={setCreating}
        hierarchyHint={HIERARCHY_HINT}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <MenuFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        hierarchyHint={HIERARCHY_HINT}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

function MenuFormSheet({
  open,
  onOpenChange,
  initial,
  hierarchyHint,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Menu | null;
  hierarchyHint: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;

  const createForm = useForm<CreateMenuValues>({
    resolver: zodResolver(CreateMenuDto),
    defaultValues: { name: '', position: 'HEADER', hierarchyJson: [] },
  });
  const updateForm = useForm<UpdateMenuValues>({
    resolver: zodResolver(UpdateMenuDto),
    defaultValues: { name: '', position: 'HEADER', hierarchyJson: [] },
  });

  const [hierText, setHierText] = useState('[]');
  const [hierErr, setHierErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const h = initial?.hierarchyJson ?? [];
    setHierText(JSON.stringify(h, null, 2));
    setHierErr(null);
    if (initial) {
      updateForm.reset({
        name: initial.name,
        position: initial.position,
        hierarchyJson: initial.hierarchyJson as never,
      });
    } else {
      createForm.reset({ name: '', position: 'HEADER', hierarchyJson: [] });
    }
  }, [open, initial, createForm, updateForm]);

  async function submit() {
    let hierarchy: unknown;
    try {
      hierarchy = JSON.parse(hierText || 'null');
      if (!Array.isArray(hierarchy) && hierarchy !== null) {
        throw new Error('Hierarchy must be a JSON array');
      }
      setHierErr(null);
    } catch (e) {
      setHierErr((e as Error).message);
      return;
    }

    const ok = isEdit ? await updateForm.trigger() : await createForm.trigger();
    if (!ok) return;
    const values = isEdit ? updateForm.getValues() : createForm.getValues();

    const body: Record<string, unknown> = {
      name: values.name,
      position: values.position,
      hierarchyJson: hierarchy,
    };

    try {
      if (isEdit && initial) {
        await apiFetch(`/menus/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast({ title: 'Menu updated', variant: 'success' });
      } else {
        await apiFetch('/menus', { method: 'POST', body: JSON.stringify(body) });
        toast({ title: 'Menu created', variant: 'success' });
      }
      onSaved();
    } catch (e) {
      toast({
        title: isEdit ? 'Update failed' : 'Create failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const active = isEdit ? updateForm : createForm;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit menu' : 'New menu'}</SheetTitle>
          <SheetDescription>
            Hierarchy is a JSON array of nested items. Full drag-drop tree builder is planned
            for M2.2.
          </SheetDescription>
        </SheetHeader>

        <Form {...(active as typeof createForm)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="mt-6 space-y-4"
          >
            <FormField
              control={active.control as typeof createForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} autoFocus placeholder="Main Nav" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={active.control as typeof createForm.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Select value={field.value ?? 'HEADER'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HEADER">Header</SelectItem>
                        <SelectItem value="FOOTER">Footer</SelectItem>
                        <SelectItem value="SIDEBAR">Sidebar</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Hierarchy JSON</label>
              <Textarea
                rows={12}
                spellCheck={false}
                value={hierText}
                onChange={(e) => {
                  setHierText(e.target.value);
                  setHierErr(null);
                }}
                className="font-mono text-xs"
              />
              {hierErr ? (
                <p className="text-xs font-medium text-destructive">Invalid JSON: {hierErr}</p>
              ) : (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Example structure
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
{hierarchyHint}
                  </pre>
                </details>
              )}
            </div>

            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={active.formState.isSubmitting}>
                {active.formState.isSubmitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function itemCount(hierarchy: unknown): number {
  if (!Array.isArray(hierarchy)) return 0;
  let count = 0;
  const walk = (arr: unknown[]) => {
    for (const item of arr) {
      count += 1;
      if (
        item &&
        typeof item === 'object' &&
        'children' in item &&
        Array.isArray((item as { children: unknown[] }).children)
      ) {
        walk((item as { children: unknown[] }).children);
      }
    }
  };
  walk(hierarchy);
  return count;
}

function previewItems(hierarchy: unknown, max: number): string[] {
  if (!Array.isArray(hierarchy)) return [];
  return hierarchy
    .slice(0, max)
    .map((item) =>
      item && typeof item === 'object' && 'label' in item
        ? String((item as { label: unknown }).label)
        : '(unnamed)',
    );
}

function previewOverflow(hierarchy: unknown, shown: number): number {
  if (!Array.isArray(hierarchy)) return 0;
  return Math.max(0, hierarchy.length - shown);
}

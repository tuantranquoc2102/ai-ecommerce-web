'use client';

import { Ellipsis, LayoutTemplate, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BLOCK_SCHEMAS, buildDefaultConfig, findBlockSchema } from '@ecom/shared';
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
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';
import { revalidateStorefront } from '@/lib/revalidate';
import { PropertyEditor } from '@/components/cms/property-editor';
import { BlockPreview } from '@/components/cms/block-preview';

type BlockTemplate = {
  id: string;
  name: string;
  blockType: string;
  config: Record<string, unknown>;
  previewImage: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = { items: BlockTemplate[]; total: number; page: number; pageSize: number };

const CATEGORIES = [
  { key: 'All', types: BLOCK_SCHEMAS.map((s) => s.blockType) },
  { key: 'Media', types: ['HeroBanner', 'BannerSlider', 'ImageBlock'] },
  { key: 'Catalog', types: ['ProductGrid', 'FlashSaleCountdown', 'CategoryList'] },
  { key: 'Trust', types: ['Testimonials', 'TrustBadges', 'FAQ'] },
  { key: 'Conversion', types: ['CTAButton', 'Newsletter'] },
  { key: 'Content', types: ['RichText', 'TextColumns', 'Divider'] },
];

export default function BlockTemplatesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<BlockTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<BlockTemplate | null>(null);
  const [creating, setCreating] = useState<string | null>(null); // holds the blockType being created
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [showPalette, setShowPalette] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiFetch<ListResponse>('/block-templates?pageSize=200');
      setItems(r.items);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(t: BlockTemplate) {
    try {
      await apiFetch<null>(`/block-templates/${t.id}`, { method: 'DELETE' });
      toast({ title: `"${t.name}" deleted`, variant: 'success' });
      // Any page linking this template will now render its fallback props.
      await revalidateStorefront(['pages']);
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const activeTypes = CATEGORIES.find((c) => c.key === category)?.types ?? [];
  const filtered = items.filter((t) => {
    if (category !== 'All' && !activeTypes.includes(t.blockType)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.blockType.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeader
        title="Block templates"
        description="Save configured blocks (title, image, links, colors…) and reuse them across pages. Editors drag templates onto pages instead of hand-editing JSON."
        actions={
          <Button onClick={() => setShowPalette(true)}>
            <Plus className="size-4" /> New template
          </Button>
        }
      />

      {err ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name or block type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.key} value={c.key}>
                {c.key}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate />}
          title={search || category !== 'All' ? 'No matching templates' : 'No templates yet'}
          description={
            search || category !== 'All'
              ? 'Try clearing your filter.'
              : 'Save your first configured block — sliders, hero banners, testimonials, etc.'
          }
          action={
            !search && category === 'All' ? (
              <Button onClick={() => setShowPalette(true)}>
                <Plus className="size-4" /> Create template
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const schema = findBlockSchema(t.blockType);
            return (
              <Card key={t.id} className="overflow-hidden">
                {t.previewImage ? (
                  <div className="aspect-video bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.previewImage} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="h-40 overflow-hidden border-b">
                    <BlockPreview type={t.blockType} props={t.config} compact />
                  </div>
                )}
                <div className="p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{t.name}</h3>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {schema?.label ?? t.blockType}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <Ellipsis className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(t)}>Edit</DropdownMenuItem>
                        <ConfirmDialog
                          trigger={
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          }
                          title={`Delete template "${t.name}"?`}
                          description="Pages using this template will keep the current block config — the template just won't be available for future drops."
                          destructive
                          confirmLabel="Delete"
                          onConfirm={() => handleDelete(t)}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date(t.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BlockTypePaletteSheet
        open={showPalette}
        onOpenChange={setShowPalette}
        onPick={(blockType) => {
          setShowPalette(false);
          setCreating(blockType);
        }}
      />

      <TemplateEditorSheet
        open={creating !== null || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(null);
            setEditing(null);
          }
        }}
        initial={editing}
        initialBlockType={creating}
        onSaved={() => {
          setCreating(null);
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

function BlockTypePaletteSheet({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (blockType: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Choose a block type</SheetTitle>
          <SheetDescription>
            Every template is an instance of a block type. Pick one, then configure the fields.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid grid-cols-1 gap-3">
          {BLOCK_SCHEMAS.map((s) => (
            <button
              key={s.blockType}
              type="button"
              onClick={() => onPick(s.blockType)}
              className="rounded-md border p-4 text-left transition-colors hover:border-primary hover:bg-accent/30"
            >
              <div className="text-sm font-semibold">{s.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.description}</div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TemplateEditorSheet({
  open,
  onOpenChange,
  initial,
  initialBlockType,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: BlockTemplate | null;
  initialBlockType: string | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [blockType, setBlockType] = useState<string>('HeroBanner');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [previewImage, setPreviewImage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setBlockType(initial.blockType);
      setConfig(initial.config ?? {});
      setPreviewImage(initial.previewImage ?? '');
    } else if (initialBlockType) {
      const schema = findBlockSchema(initialBlockType);
      setName('');
      setBlockType(initialBlockType);
      setConfig(schema ? buildDefaultConfig(schema) : {});
      setPreviewImage('');
    }
  }, [open, initial, initialBlockType]);

  const schema = findBlockSchema(blockType);

  async function save() {
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        blockType,
        config,
        ...(previewImage ? { previewImage } : {}),
      };
      if (initial) {
        await apiFetch(`/block-templates/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast({ title: 'Template updated', variant: 'success' });
        // Editing a template affects every page that links to it — purge the
        // storefront pages cache so the new config appears on next request.
        await revalidateStorefront(['pages']);
      } else {
        await apiFetch('/block-templates', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast({ title: 'Template created', variant: 'success' });
      }
      onSaved();
    } catch (e) {
      toast({
        title: initial ? 'Update failed' : 'Create failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {initial ? `Edit "${initial.name}"` : `New ${schema?.label ?? blockType} template`}
          </SheetTitle>
          <SheetDescription>
            {schema?.description ?? 'Configure the block fields below.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Template name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Summer Hero 2026"'
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Block type</label>
            <Select
              value={blockType}
              onValueChange={(v) => {
                setBlockType(v);
                const s = findBlockSchema(v);
                if (s) setConfig(buildDefaultConfig(s));
              }}
              disabled={!!initial}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_SCHEMAS.map((s) => (
                  <SelectItem key={s.blockType} value={s.blockType}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {initial ? (
              <p className="text-xs text-muted-foreground">
                Block type is immutable — create a new template to switch types.
              </p>
            ) : null}
          </div>

          {schema ? (
            <>
              <div className="border-t pt-6">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Live preview
                </h3>
                <BlockPreview type={blockType} props={config} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Updates in real-time as you edit fields below. Data-driven blocks (products,
                  categories) fetch from the public storefront endpoints.
                </p>
              </div>
              <div className="border-t pt-6">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {schema.label} settings
                </h3>
                <PropertyEditor schema={schema} value={config} onChange={setConfig} />
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No schema found for block type &quot;{blockType}&quot;.
            </p>
          )}
        </div>

        <SheetFooter className="mt-8 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create template'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


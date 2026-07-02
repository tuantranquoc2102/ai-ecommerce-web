'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BookOpen,
  GripVertical,
  LayoutTemplate,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  BLOCK_SCHEMAS,
  buildDefaultConfig,
  findBlockSchema,
} from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
  useToast,
} from '@ecom/ui';
import { apiFetch } from '@/lib/api-client';
import { PropertyEditor } from './property-editor';
import { BlockPreview } from './block-preview';

export interface PageBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  /**
   * When set, this block inherits its `type` + `props` from the referenced
   * BlockTemplate at read time. Backend hydrates on public page fetch (see
   * PagesService). Admin editor treats linked blocks as read-only until the
   * user explicitly unlinks. Editing a template updates every page that has
   * an unbroken link to it.
   */
  templateId?: string;
  /** Set when a linked block was inserted, purely for editor display. */
  templateName?: string;
}

interface Props {
  value: PageBlock[];
  onChange: (next: PageBlock[]) => void;
}

interface BlockTemplateRow {
  id: string;
  name: string;
  blockType: string;
  config: Record<string, unknown>;
}

/**
 * Drag-and-drop canvas for editing a page's layoutJson.blocks[]. Emits the
 * full ordered blocks array on every change so the parent can persist.
 *
 * UI split:
 *   - Top-right: "Add block" button opens a picker sheet (block types +
 *     saved templates). Clicking a template appends a block with that
 *     template's config; clicking a block type appends a default config.
 *   - Middle: vertical sortable list of blocks. Each row has drag handle,
 *     block-type badge, block summary, Edit, Delete.
 *   - Clicking Edit opens a nested sheet with PropertyEditor for that block.
 */
export function PageCanvas({ value, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((b) => b.id === active.id);
    const newIndex = value.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  }

  function appendBlock(block: PageBlock) {
    onChange([...value, block]);
    setPickerOpen(false);
    // Auto-open the editor so the user can immediately configure the new block.
    setEditingIndex(value.length);
  }

  function updateAt(index: number, next: PageBlock) {
    const nextBlocks = value.slice();
    nextBlocks[index] = next;
    onChange(nextBlocks);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Page blocks{' '}
          <span className="text-xs font-normal text-muted-foreground">({value.length})</span>
        </span>
        <Button type="button" size="sm" onClick={() => setPickerOpen(true)}>
          <Plus className="size-3.5" /> Add block
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <LayoutTemplate className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No blocks yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your first block from the palette. Drag to reorder, click to edit.
          </p>
          <Button type="button" size="sm" className="mt-4" onClick={() => setPickerOpen(true)}>
            <Plus className="size-3.5" /> Add block
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={value.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {value.map((block, i) => (
                <SortableBlockRow
                  key={block.id}
                  block={block}
                  index={i}
                  onEdit={() => setEditingIndex(i)}
                  onDelete={() => removeAt(i)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <BlockPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPickType={(blockType) => {
          const schema = findBlockSchema(blockType);
          if (!schema) return;
          appendBlock({
            id: randomBlockId(),
            type: blockType,
            props: buildDefaultConfig(schema),
          });
        }}
        onPickTemplate={(tpl) => {
          // Store the link — backend hydrates `props` from the template on read.
          // A local snapshot of `props` is still copied so that (a) if the
          // template is deleted the block still renders sensibly, and (b) the
          // block summary can pull a preview label without a second fetch.
          appendBlock({
            id: randomBlockId(),
            type: tpl.blockType,
            props: JSON.parse(JSON.stringify(tpl.config ?? {})),
            templateId: tpl.id,
            templateName: tpl.name,
          });
        }}
      />

      <BlockEditorSheet
        open={editingIndex !== null}
        onOpenChange={(o) => !o && setEditingIndex(null)}
        block={editingIndex !== null ? value[editingIndex] ?? null : null}
        onSave={(patched) => {
          if (editingIndex === null || !patched) return;
          updateAt(editingIndex, patched);
          setEditingIndex(null);
        }}
      />
    </div>
  );
}

function SortableBlockRow({
  block,
  index,
  onEdit,
  onDelete,
}: {
  block: PageBlock;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const schema = findBlockSchema(block.type);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  } as React.CSSProperties;

  const summary = summarizeBlock(block);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm',
        isDragging && 'shadow-lg ring-2 ring-primary/30',
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-6 text-center text-xs font-medium text-muted-foreground tabular-nums">
        {index + 1}
      </span>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <Badge variant="outline" className="shrink-0 text-xs">
          {schema?.label ?? block.type}
        </Badge>
        {block.templateId ? (
          <Badge variant="secondary" className="shrink-0 gap-1 text-xs" title="Linked to template">
            <Link2 className="size-3" />
            {block.templateName ?? 'Linked'}
          </Badge>
        ) : null}
        <span className="truncate text-sm text-muted-foreground">{summary}</span>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label="Edit block">
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        aria-label="Delete block"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

function BlockPickerSheet({
  open,
  onOpenChange,
  onPickType,
  onPickTemplate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPickType: (blockType: string) => void;
  onPickTemplate: (tpl: BlockTemplateRow) => void;
}) {
  const [tab, setTab] = useState<'types' | 'templates'>('templates');
  const [templates, setTemplates] = useState<BlockTemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErr(null);
    apiFetch<{ items: BlockTemplateRow[] }>('/block-templates?pageSize=200')
      .then((r) => setTemplates(r.items))
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [open]);

  const filteredTypes = useMemo(() => {
    if (!search.trim()) return BLOCK_SCHEMAS;
    const q = search.toLowerCase();
    return BLOCK_SCHEMAS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.blockType.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [search]);

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.blockType.toLowerCase().includes(q),
    );
  }, [templates, search]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add block</SheetTitle>
          <SheetDescription>
            Pick a pre-configured template or start from a raw block type.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8"
            />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">
                Templates ({templates.length})
              </TabsTrigger>
              <TabsTrigger value="types">
                Block types ({BLOCK_SCHEMAS.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === 'templates' ? (
            <div className="space-y-2">
              {err ? (
                <Alert variant="destructive">
                  <AlertDescription>{err}</AlertDescription>
                </Alert>
              ) : null}
              {loading ? (
                <p className="text-xs text-muted-foreground">Loading templates…</p>
              ) : filteredTemplates.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <BookOpen className="mx-auto mb-2 size-6 text-muted-foreground" />
                  <p className="text-sm">
                    {search ? 'No matching templates' : 'No templates yet'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Save configured blocks under <code>/admin/block-templates</code> to reuse them
                    across pages.
                  </p>
                </div>
              ) : (
                filteredTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onPickTemplate(t)}
                    className="w-full rounded-md border p-3 text-left transition-colors hover:border-primary hover:bg-accent/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{t.name}</div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {findBlockSchema(t.blockType)?.label ?? t.blockType}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredTypes.map((s) => (
                <button
                  key={s.blockType}
                  type="button"
                  onClick={() => onPickType(s.blockType)}
                  className="rounded-md border p-3 text-left transition-colors hover:border-primary hover:bg-accent/30"
                >
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {s.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BlockEditorSheet({
  open,
  onOpenChange,
  block,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  block: PageBlock | null;
  onSave: (patched: PageBlock | null) => void;
}) {
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [linkedTemplateId, setLinkedTemplateId] = useState<string | undefined>(undefined);
  const [linkedTemplateName, setLinkedTemplateName] = useState<string | undefined>(undefined);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    if (!open || !block) return;
    setConfig(block.props ?? {});
    setLinkedTemplateId(block.templateId);
    setLinkedTemplateName(block.templateName);
  }, [open, block]);

  const schema = block ? findBlockSchema(block.type) : null;
  const isLinked = !!linkedTemplateId;

  async function unlink() {
    if (!linkedTemplateId) return;
    setUnlinking(true);
    try {
      // Pull the current template config and copy it into props so the block
      // becomes standalone. If the fetch fails (template deleted), fall back
      // to whatever props were stored locally.
      const tpl = await apiFetch<{ config: Record<string, unknown> }>(
        `/block-templates/${linkedTemplateId}`,
      ).catch(() => null);
      const nextProps = tpl?.config
        ? (JSON.parse(JSON.stringify(tpl.config)) as Record<string, unknown>)
        : config;
      setConfig(nextProps);
      setLinkedTemplateId(undefined);
      setLinkedTemplateName(undefined);
      toast({
        title: 'Unlinked from template',
        description: 'Edits here now stay on this page only.',
        variant: 'success',
      });
    } finally {
      setUnlinking(false);
    }
  }

  function apply() {
    if (!block) {
      onSave(null);
      return;
    }
    onSave({
      ...block,
      props: config,
      templateId: linkedTemplateId,
      templateName: linkedTemplateName,
    });
    toast({ title: 'Block updated', variant: 'success' });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Edit block: {schema?.label ?? block?.type ?? '—'}</SheetTitle>
          <SheetDescription>
            {schema?.description ?? 'Adjust the block properties.'}
          </SheetDescription>
        </SheetHeader>

        {isLinked ? (
          <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-start gap-3">
              <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="flex-1 text-sm">
                <div className="font-medium">
                  Linked to template &quot;{linkedTemplateName ?? '(unknown)'}&quot;
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  This block renders from the current template config every time. Editing the
                  template updates every page that links to it. To customize just this instance,
                  unlink first.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={unlink}
                disabled={unlinking}
              >
                {unlinking ? 'Unlinking…' : 'Unlink to customize'}
              </Button>
            </div>
          </div>
        ) : null}

        {block ? (
          <div className="mt-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </h3>
            <BlockPreview type={block.type} props={config} />
          </div>
        ) : null}

        <div className={cn('mt-6', isLinked && 'pointer-events-none opacity-60')}>
          {schema && block ? (
            <>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fields
              </h3>
              <PropertyEditor schema={schema} value={config} onChange={setConfig} />
            </>
          ) : (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No schema for block type &quot;{block?.type ?? 'unknown'}&quot;. Config is treated
              as opaque JSON.
            </Card>
          )}
        </div>

        <SheetFooter className="mt-8 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={apply}>
            Apply changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomBlockId(): string {
  // Short, unique-enough for a single page. Not a UUID because JSON payloads
  // stay small and the block IDs are only referenced by keys and dnd-kit.
  return `b_${Math.random().toString(36).slice(2, 10)}`;
}

/** Pluck a human-readable title/headline out of props for the row summary. */
function summarizeBlock(block: PageBlock): string {
  const props = block.props ?? {};
  const candidates = ['headline', 'title', 'label', 'name', 'bannerPosition'];
  for (const key of candidates) {
    const v = props[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  // Fallback for arrays (e.g. Testimonials.items)
  const items = props.items;
  if (Array.isArray(items) && items.length > 0) {
    const first = items[0] as Record<string, unknown> | undefined;
    if (first) {
      const inner =
        (typeof first.heading === 'string' && first.heading) ||
        (typeof first.question === 'string' && first.question) ||
        (typeof first.name === 'string' && first.name) ||
        (typeof first.title === 'string' && first.title);
      if (inner) return `${items.length} × ${inner}`;
    }
    return `${items.length} items`;
  }
  const slides = props.slides;
  if (Array.isArray(slides) && slides.length > 0) return `${slides.length} slides`;
  return '(no title)';
}

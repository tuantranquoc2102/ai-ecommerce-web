'use client';

import { ImagePlus, Loader2, Star, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, cn, useToast } from '@ecom/ui';
import { ApiError } from '@/lib/api-client';
import { uploadImage } from './image-upload';

interface ProductGalleryProps {
  /** Ordered gallery URLs. */
  gallery: string[];
  /** URL of the current main image; must be one of `gallery`, or empty. */
  mainImage: string | null | undefined;
  onChange: (next: { gallery: string[]; mainImage: string | null }) => void;
  maxImages?: number;
}

/**
 * Multi-image gallery uploader. Up to `maxImages` (default 5) images can be
 * uploaded. One image is designated "main" via a radio-like indicator; the
 * first uploaded image is auto-selected. Users can pick a different main by
 * clicking the star on any tile.
 *
 * Emits a single `onChange` payload with both `gallery` and `mainImage` so
 * consumers (react-hook-form) can set both fields in one go.
 */
export function ProductGallery({
  gallery,
  mainImage,
  onChange,
  maxImages = 5,
}: ProductGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const canAddMore = gallery.length < maxImages;

  async function handleFiles(files: FileList) {
    const remainingSlots = maxImages - gallery.length;
    const toUpload = Array.from(files).slice(0, remainingSlots);
    if (toUpload.length === 0) return;
    if (files.length > remainingSlots) {
      toast({
        title: `Only ${remainingSlots} more allowed`,
        description: `You selected ${files.length} but the limit is ${maxImages}.`,
      });
    }

    setBusy(true);
    try {
      const urls = await Promise.all(toUpload.map((f) => uploadImage(f, 'products')));
      const nextGallery = [...gallery, ...urls];
      // Auto-select first uploaded image as main if none set.
      const nextMain = mainImage && gallery.includes(mainImage) ? mainImage : (nextGallery[0] ?? null);
      onChange({ gallery: nextGallery, mainImage: nextMain });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  function removeAt(idx: number) {
    const removed = gallery[idx];
    const nextGallery = gallery.filter((_, i) => i !== idx);
    let nextMain: string | null = mainImage ?? null;
    if (removed === mainImage) {
      nextMain = nextGallery[0] ?? null;
    }
    onChange({ gallery: nextGallery, mainImage: nextMain });
  }

  function setAsMain(url: string) {
    onChange({ gallery, mainImage: url });
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        className="hidden"
        onChange={(e) => {
          const fs = e.target.files;
          if (fs && fs.length > 0) handleFiles(fs);
          e.target.value = '';
        }}
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {gallery.map((url, idx) => {
          const isMain = url === mainImage;
          return (
            <div
              key={url}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-md border',
                isMain ? 'border-primary ring-2 ring-primary/40' : 'border-input',
              )}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1">
                <button
                  type="button"
                  onClick={() => setAsMain(url)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                    isMain
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background/80 text-foreground opacity-0 group-hover:opacity-100',
                  )}
                  title={isMain ? 'Main image' : 'Set as main'}
                >
                  <Star className={cn('size-3', isMain && 'fill-current')} />
                  {isMain ? 'Main' : 'Set main'}
                </button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="size-5 opacity-0 group-hover:opacity-100"
                  onClick={() => removeAt(idx)}
                  aria-label="Remove image"
                >
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          );
        })}

        {canAddMore ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/30 text-xs text-muted-foreground transition-colors',
              'hover:bg-muted hover:text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImagePlus className="size-5" />
            )}
            <span>{busy ? 'Uploading…' : 'Add image'}</span>
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {gallery.length}/{maxImages} images. Click <Star className="inline size-3" /> to set the
        main image (shown first everywhere).
      </p>
    </div>
  );
}

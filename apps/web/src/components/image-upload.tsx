'use client';

import { ImagePlus, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, cn, useToast } from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

interface ImageUploadProps {
  /** Current image URL, or null/empty for empty state. */
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Subfolder in S3, e.g. "categories" or "products". */
  folder: 'products' | 'categories' | 'users' | 'banners' | 'posts';
  /** Aspect ratio class — default square. */
  aspect?: 'square' | 'video';
  className?: string;
}

/**
 * Single-image upload. Renders a preview when `value` is set; otherwise a
 * click-to-upload dropzone. Uploads via POST /media/upload multipart and
 * bubbles the resulting public URL up via `onChange`.
 */
export function ImageUpload({
  value,
  onChange,
  folder,
  aspect = 'square',
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const url = await uploadImage(file, folder);
      onChange(url);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/30',
        aspect === 'square' ? 'aspect-square' : 'aspect-video',
        'w-40',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = ''; // allow re-selecting same file
        }}
      />

      {value ? (
        <>
          <img src={value} alt="" className="h-full w-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-1 top-1 size-6"
            onClick={() => onChange(null)}
            disabled={busy}
            aria-label="Remove image"
          >
            <X className="size-3.5" />
          </Button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={cn(
            'flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors',
            'hover:bg-muted hover:text-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ImagePlus className="size-5" />
          )}
          <span>{busy ? 'Uploading…' : 'Upload image'}</span>
        </button>
      )}
    </div>
  );
}

/** Shared low-level uploader. Returns the S3 public URL. */
export async function uploadImage(
  file: File,
  folder: 'products' | 'categories' | 'users' | 'banners' | 'posts',
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch<{ url: string; key: string; contentType: string; size: number }>(
    `/media/upload?folder=${encodeURIComponent(folder)}`,
    { method: 'POST', body: form },
  );
  return res.url;
}

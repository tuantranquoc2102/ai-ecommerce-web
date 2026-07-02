import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BlockRenderer } from '@/components/storefront/block-renderer';
import { getPageBySlug } from '@/lib/storefront-api';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page || page.status !== 'PUBLISHED') return {};
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDesc ?? undefined,
  };
}

export default async function DynamicPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  // Preview mode: skip the PUBLISHED gate. NOTE: this is an editor-facing
  // convenience — server does not verify auth here yet. If the URL leaks,
  // any visitor with the slug can see draft content. Tighten to a signed
  // token / admin session cookie before shipping to production.
  const isPreview = preview === '1' || preview === 'true';
  if (!isPreview && page.status !== 'PUBLISHED') notFound();

  return (
    <div className="mx-auto max-w-6xl py-6">
      {isPreview && page.status !== 'PUBLISHED' ? (
        <div className="mx-4 mb-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm">
          <strong>Preview mode</strong> — you are viewing an unpublished{' '}
          <code className="rounded bg-muted px-1">{page.status}</code> page.
        </div>
      ) : null}
      <BlockRenderer layout={page.layoutJson} />
    </div>
  );
}

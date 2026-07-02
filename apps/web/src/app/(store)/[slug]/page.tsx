import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BlockRenderer } from '@/components/storefront/block-renderer';
import { getPageBySlug } from '@/lib/storefront-api';

interface Props {
  params: Promise<{ slug: string }>;
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

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page || page.status !== 'PUBLISHED') {
    notFound();
  }
  return (
    <div className="mx-auto max-w-6xl py-6">
      <BlockRenderer layout={page.layoutJson} />
    </div>
  );
}

import { Construction } from 'lucide-react';
import { EmptyState, PageHeader } from '@ecom/ui';

/**
 * Placeholder for admin screens that are wired into the menu but not yet built.
 * Keeps the standard PageHeader + EmptyState shell so the route looks
 * intentional rather than broken while the feature is under development.
 */
export function UnderConstruction({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={<Construction />}
        title="Đang phát triển"
        description="Tính năng này đang được xây dựng và sẽ sớm ra mắt."
      />
    </>
  );
}

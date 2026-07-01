import { Settings } from 'lucide-react';
import { EmptyState, PageHeader } from '@ecom/ui';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Store, tax, and payment configuration." />
      <EmptyState icon={<Settings />} title="Nothing to configure yet" />
    </>
  );
}

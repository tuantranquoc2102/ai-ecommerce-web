import { Users } from 'lucide-react';
import { EmptyState, PageHeader } from '@ecom/ui';

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users" description="Staff accounts and roles." />
      <EmptyState icon={<Users />} title="No users to display" />
    </>
  );
}

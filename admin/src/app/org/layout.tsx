'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['org_admin']}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

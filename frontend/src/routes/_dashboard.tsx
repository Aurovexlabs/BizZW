import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuthStore } from '../store/auth.store';

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: DashboardLayoutWrapper,
});

function DashboardLayoutWrapper() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { AppLayout } from '@/app/AppLayout';
import { MocksPage } from '@/app/MocksPage';
import { AuditLogViewer } from '@/features/audit-logs/components/AuditLogViewer';
import { UsersAdminPage } from '@/features/users/components/UsersAdminPage';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function AdminProtectedRoute() {
  const user = useAuthStore((state) => state.user);

  if (user?.role !== 'ROLE_ADMIN') {
    return <Navigate to="/mocks" replace />;
  }

  return <Outlet />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/mocks" element={<MocksPage />} />
          <Route path="/monitor" element={<AuditLogViewer />} />
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<UsersAdminPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="/dashboard" element={<Navigate to="/mocks" replace />} />
      <Route path="*" element={<Navigate to="/mocks" replace />} />
    </Routes>
  );
}

import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { DashboardPage } from '@/app/DashboardPage';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

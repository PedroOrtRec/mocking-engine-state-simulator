import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { LogOut, Shield, Sparkles, Terminal } from 'lucide-react';
import { EndpointList } from '@/features/endpoints/components/EndpointList';
import { ChaosControlCard } from '@/features/chaos/components/ChaosControlCard';
import { SessionStateInspector } from '@/features/chaos/components/SessionStateInspector';
import { AuditLogViewer } from '@/features/audit-logs/components/AuditLogViewer';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra de navegación superior */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-5 w-5 text-indigo-400" />
            <span className="font-bold text-white tracking-tight">Mocking Engine Studio</span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-300 font-medium">{user.username}</span>
                <span
                  className={`px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${
                    user.role === 'ROLE_GUEST'
                      ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                      : user.role === 'ROLE_ADMIN'
                      ? 'bg-purple-950/60 border-purple-800 text-purple-300'
                      : 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                  }`}
                >
                  {user.role === 'ROLE_GUEST' ? (
                    <Sparkles className="h-3 w-3" />
                  ) : (
                    <Shield className="h-3 w-3" />
                  )}
                  {user.role}
                </span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal del estudio (se irá poblando en los Módulos 18, 19 y 20) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <EndpointList />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ChaosControlCard />
          <SessionStateInspector />
        </div>
        <AuditLogViewer />
      </main>
    </div>
  );
}

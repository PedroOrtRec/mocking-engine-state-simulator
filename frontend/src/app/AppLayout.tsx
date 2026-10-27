import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { LogOut, Shield, Sparkles, Terminal, Activity, Layers, Users } from 'lucide-react';

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
      isActive
        ? 'bg-indigo-600/20 border-indigo-500/80 text-indigo-300 shadow-sm'
        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
    }`;

  const isAdmin = user?.role === 'ROLE_ADMIN';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de navegación superior con menú Mocks, Monitor y Administración */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo y Enlaces de Navegación */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-400">
                <Terminal className="h-4 w-4" />
              </div>
              <span className="font-bold text-white tracking-tight text-sm hidden sm:inline">
                Mocking Engine Studio
              </span>
            </div>

            <nav className="flex items-center gap-1.5">
              {/* Botón 1: Mocks */}
              <NavLink to="/mocks" className={getNavLinkClass}>
                <Layers className="h-3.5 w-3.5" />
                <span>Mocks</span>
              </NavLink>

              {/* Botón 2: Monitor */}
              <NavLink to="/monitor" className={getNavLinkClass}>
                <Activity className="h-3.5 w-3.5" />
                <span>Monitor</span>
              </NavLink>

              {/* Botón 3: Administración (solo para ADMIN) */}
              {isAdmin && (
                <NavLink to="/admin" className={getNavLinkClass}>
                  <Users className="h-3.5 w-3.5 text-purple-400" />
                  <span>Administración</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* Información del usuario y botón Salir */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-300 font-medium hidden md:inline">{user.username}</span>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1 ${
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
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal inyectado por la ruta activa */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        <Outlet />
      </main>
    </div>
  );
}

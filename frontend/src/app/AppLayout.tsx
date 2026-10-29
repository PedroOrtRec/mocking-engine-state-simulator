import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { LogOut, Shield, Sparkles, Activity, Users, Cable } from 'lucide-react';
import { MockerIcon } from '@/components/ui/MockerIcon';

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 w-full font-semibold transition-all ${
      isActive
        ? 'text-indigo-300'
        : 'text-slate-400 hover:text-slate-200'
    }`;

  const isAdmin = user?.role === 'ROLE_ADMIN';

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-row overflow-hidden">
      {/* Barra de navegación superior con menú Mocks, Monitor y Administración */}
      <aside className="flex flex-col p-6 gap-6 h-full">
          {/* Logo y Enlaces de Navegación */}
          <div className="flex flex-col justify-center items-center gap-6 p-2">
              <div className="p-1.5">
                <MockerIcon />
              </div>
              <span className="font-bold text-white tracking-tight text-sm hidden sm:inline">
                Mocking Engine Studio
              </span>
          </div>
{/* Información del usuario y botón Salir */}
          <div className="flex items-end gap-3">
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
          </div>

            <nav className="flex flex-col items-center gap-6">
              {/* Botón 1: Mocks */}
              <NavLink to="/mocks" className={getNavLinkClass}>
                <Cable className="h-6 w-6" />
                <span>Mocks</span>
              </NavLink>

              {/* Botón 2: Monitor */}
              <NavLink to="/monitor" className={getNavLinkClass}>
                <Activity className="h-6 w-6" />
                <span>Monitor</span>
              </NavLink>

              {/* Botón 3: Administración (solo para ADMIN) */}
              {isAdmin && (
                <NavLink to="/admin" className={getNavLinkClass}>
                  <Users className="h-6 w-6 text-purple-400" />
                  <span>Administración</span>
                </NavLink>
              )}
            </nav>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Salir</span>
            </button>

         </aside>

      {/* Contenido principal inyectado por la ruta activa */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        <Outlet />
      </main>
    </div>
  );
}

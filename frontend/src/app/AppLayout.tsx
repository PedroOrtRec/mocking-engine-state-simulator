import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { LogOut, Shield, Sparkles, Activity, Users, Cable } from 'lucide-react';
import { MockerIcon } from '@/components/ui/MockerIcon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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
        ? 'text-primary font-bold'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  const isAdmin = user?.role === 'ROLE_ADMIN';

  return (
    <div className="h-screen bg-background text-foreground flex flex-row overflow-hidden transition-colors duration-200">
      {/* Barra de navegación superior con menú Mocks, Monitor y Administración */}
      <aside className="flex flex-col p-6 gap-6 h-full border-r border-border bg-card/40 backdrop-blur-sm">
        {/* Logo y Enlaces de Navegación */}
        <div className="flex flex-col justify-center items-center gap-6 p-2">
          <div className="p-1.5">
            <MockerIcon size={200} />
          </div>
          <span className="font-bold text-foreground tracking-tight text-sm hidden sm:inline">
            Mocking Engine Studio
          </span>
        </div>

        {/* Información del usuario */}
        <div className="flex items-end gap-3">
          {user && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium hidden md:inline">{user.username}</span>
              <span
                className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1 ${
                  user.role === 'ROLE_GUEST'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-800'
                    : user.role === 'ROLE_ADMIN'
                    ? 'bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300 dark:bg-purple-950/60 dark:border-purple-800'
                    : 'bg-primary/10 border-primary/30 text-primary'
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

        {/* Selector de tema y botón Salir */}
        <div className="mt-auto flex flex-col gap-3">
          <ThemeToggle className="w-full justify-center" />
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-muted text-xs text-secondary-foreground rounded-lg border border-border transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal inyectado por la ruta activa */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        <Outlet />
      </main>
    </div>
  );
}

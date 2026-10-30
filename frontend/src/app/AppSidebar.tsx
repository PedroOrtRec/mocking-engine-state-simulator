import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { LogOut, Shield, Sparkles, Activity, Users, Cable } from 'lucide-react';
import { MockerIcon } from '@/components/ui/MockerIcon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AppSidebarProps {
  className?: string;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  ROLE_ADMIN: 'Administrador',
  ROLE_USER: 'Usuario',
  ROLE_GUEST: 'Invitado',
};

function formatRoleName(role?: string): string {
  if (!role) return '';
  return ROLE_DISPLAY_NAMES[role] ?? role;
}

export function AppSidebar({ className = '' }: AppSidebarProps) {
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
    <aside
      className={`flex flex-col p-6 gap-6 h-full border-r border-border bg-card/40 backdrop-blur-sm ${className}`}
    >
      {/* 1. Logotipo y Marca */}
      <div className="flex flex-col justify-center items-center gap-6 p-2">
        <div className="p-1.5">
          <MockerIcon size={200} />
        </div>
        <span className="font-bold text-muted-foreground tracking-tight text-sm hidden sm:inline">
          Mocking Engine Studio
        </span>
      </div>

      {/* 2. Menú de Navegación */}
      <nav className="flex flex-col items-center gap-6 bg-secondary/80 p-3 rounded-xl border border-border/30">
        <NavLink to="/mocks" className={getNavLinkClass}>
          <Cable className="h-6 w-6" />
          <span>Mocks</span>
        </NavLink>

        <NavLink to="/monitor" className={getNavLinkClass}>
          <Activity className="h-6 w-6" />
          <span>Monitor</span>
        </NavLink>

        {isAdmin && (
          <NavLink to="/admin" className={getNavLinkClass}>
            <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <span>Administración</span>
          </NavLink>
        )}
      </nav>

      {/* 3. Espaciador flexible para empujar el pie hacia abajo */}
      <div className="flex-1 flex flex-col justify-end gap-2.5">

      {/* 4. Información de Usuario y Rol Activo */}
      {user && (
        <div className="flex items-between gap-2 text-xs p-1 rounded-xl bg-secondary/80 border border-border/30 justify-between">
          <span className="text-foreground font-medium bg-card py-1 px-2 rounded-xl">
            {user.username}
          </span>
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
            {formatRoleName(user.role)}
          </span>
        </div>
      )}

      {/* 5. Selector de Tema y Botón de Salida */}
      <div className="flex flex-col gap-3">
        <ThemeToggle className="w-full justify-center" />
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-xs text-destructive-foreground rounded-lg border border-border transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Salir</span>
        </button>
      </div>
      </div>
    </aside>
  );
}

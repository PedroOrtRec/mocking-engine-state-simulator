import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

export function AppLayout() {
  return (
    <div className="h-screen bg-background text-foreground flex flex-row overflow-hidden transition-colors duration-200">
      {/* Barra lateral de navegación extraída e independiente */}
      <AppSidebar />

      {/* Contenido principal inyectado por la ruta activa */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

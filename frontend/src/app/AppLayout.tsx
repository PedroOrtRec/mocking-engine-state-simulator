import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

export function AppLayout() {
  return (
    <div className="h-screen bg-background text-foreground flex flex-row overflow-hidden transition-colors duration-200">
      {/* Barra lateral de navegación extraída e independiente */}
      <AppSidebar />

      {/* Contenido principal inyectado por la ruta activa */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

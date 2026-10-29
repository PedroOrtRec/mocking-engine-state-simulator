import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { AppSidebar } from './AppSidebar';
import { useAuthStore } from '@/stores/use-auth-store';

describe('AppSidebar Component', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'test-token',
      user: { username: 'alice', role: 'ROLE_USER' },
      isAuthenticated: true,
    });
  });

  it('debe renderizar el logotipo de Mocking Engine y los enlaces base', () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Mocking Engine Studio')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /mocks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /monitor/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /administración/i })).not.toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('Usuario')).toBeInTheDocument();
  });

  it('debe mostrar el enlace de Administración solo para usuarios ROLE_ADMIN', () => {
    useAuthStore.setState({
      token: 'admin-token',
      user: { username: 'super_admin', role: 'ROLE_ADMIN' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /administración/i })).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('debe mostrar el badge de ROLE_GUEST con icono de destello', () => {
    useAuthStore.setState({
      token: 'guest-token',
      user: { username: 'guest_123', role: 'ROLE_GUEST' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Invitado')).toBeInTheDocument();
  });

  it('debe cerrar la sesión del usuario al pulsar Salir', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );

    const logoutBtn = screen.getByRole('button', { name: /salir/i });
    await user.click(logoutBtn);

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});

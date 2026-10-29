import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { AppLayout } from './AppLayout';
import { useAuthStore } from '@/stores/use-auth-store';

describe('AppLayout Component', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'test-token',
      user: { username: 'john_doe', role: 'ROLE_USER' },
      isAuthenticated: true,
    });
  });

  it('debe renderizar enlaces "Mocks" y "Monitor", pero NO "Administración" para ROLE_USER', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /mocks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /monitor/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /administración/i })).not.toBeInTheDocument();
    expect(screen.getByText('john_doe')).toBeInTheDocument();
    expect(screen.getByText('Usuario')).toBeInTheDocument();
  });

  it('debe renderizar enlace "Administración" cuando el rol es ROLE_ADMIN', () => {
    useAuthStore.setState({
      token: 'admin-token',
      user: { username: 'admin_master', role: 'ROLE_ADMIN' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /mocks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /monitor/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /administración/i })).toBeInTheDocument();
    expect(screen.getByText('admin_master')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('debe cerrar sesión al hacer clic en Salir', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    const logoutBtn = screen.getByRole('button', { name: /salir/i });
    await user.click(logoutBtn);

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});

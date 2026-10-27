import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { authApi } from '../api/auth-api';

// Simular el módulo de la API de autenticación
vi.mock('../api/auth-api', () => ({
  authApi: {
    login: vi.fn(),
    guestLogin: vi.fn(),
  },
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar los campos de usuario, contraseña y botones', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar como invitado/i })).toBeInTheDocument();
  });

  it('debe invocar guestLogin al pulsar el botón de invitado', async () => {
    vi.mocked(authApi.guestLogin).mockResolvedValueOnce({
      token: 'fake-guest-jwt',
      username: 'guest_1234',
      role: 'ROLE_GUEST',
      expiresInMs: 86400000,
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const guestButton = screen.getByRole('button', { name: /entrar como invitado/i });
    fireEvent.click(guestButton);

    expect(authApi.guestLogin).toHaveBeenCalledTimes(1);
  });
});

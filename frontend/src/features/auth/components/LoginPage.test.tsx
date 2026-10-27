import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const user = userEvent.setup();
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
    await user.click(guestButton);

    await waitFor(() => {
      expect(authApi.guestLogin).toHaveBeenCalledTimes(1);
    });
  });
});

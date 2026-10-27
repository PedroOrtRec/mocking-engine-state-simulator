import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersAdminPage } from './UsersAdminPage';
import { usersApi, type UserSummary } from '../api/users-api';
import { useAuthStore } from '@/stores/use-auth-store';

vi.mock('../api/users-api', () => ({
  usersApi: {
    getAll: vi.fn(),
    changeRole: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UsersAdminPage Component', () => {
  const mockUsers: UserSummary[] = [
    {
      id: 1,
      username: 'admin_master',
      role: 'ROLE_ADMIN',
      createdAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 2,
      username: 'developer_01',
      role: 'ROLE_USER',
      createdAt: '2026-10-02T12:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.getAll).mockResolvedValue(mockUsers);
    useAuthStore.setState({
      token: 'admin-jwt',
      user: { username: 'admin_master', role: 'ROLE_ADMIN' },
      isAuthenticated: true,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('debe listar los usuarios con sus roles y badges', async () => {
    renderWithClient(<UsersAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('admin_master')).toBeInTheDocument();
    });

    expect(screen.getByText('developer_01')).toBeInTheDocument();
    expect(screen.getByText('Tú')).toBeInTheDocument();
  });

  it('debe deshabilitar el botón de eliminar para la propia cuenta activa', async () => {
    renderWithClient(<UsersAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('admin_master')).toBeInTheDocument();
    });

    const deleteSelfBtn = screen.getByTitle(/no puedes eliminarte a ti mismo/i);
    expect(deleteSelfBtn).toBeDisabled();
  });

  it('debe permitir cambiar el rol de otro usuario', async () => {
    const user = userEvent.setup();
    vi.mocked(usersApi.changeRole).mockResolvedValueOnce();

    renderWithClient(<UsersAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('developer_01')).toBeInTheDocument();
    });

    const roleSelect = screen.getByLabelText(/cambiar rol de developer_01/i);
    await user.selectOptions(roleSelect, 'ROLE_ADMIN');

    await waitFor(() => {
      expect(usersApi.changeRole).toHaveBeenCalledWith(2, 'ROLE_ADMIN');
    });
  });

  it('debe eliminar a otro usuario tras confirmación', async () => {
    const user = userEvent.setup();
    vi.mocked(usersApi.deleteUser).mockResolvedValueOnce();

    renderWithClient(<UsersAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('developer_01')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle(/eliminar usuario/i);
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(usersApi.deleteUser).toHaveBeenCalledWith(2);
    });
  });
});

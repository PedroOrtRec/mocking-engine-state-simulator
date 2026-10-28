import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EndpointList } from './EndpointList';
import { endpointsApi, type MockEndpoint } from '../api/endpoints-api';
import { useAuthStore } from '@/stores/use-auth-store';

vi.mock('../api/endpoints-api', () => ({
  endpointsApi: {
    getAll: vi.fn(),
    toggleActive: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('EndpointList Component', () => {
  const mockEndpoints: MockEndpoint[] = [
    {
      id: 1,
      name: 'Listar Productos',
      httpMethod: 'GET',
      pathPattern: '/api/v1/products',
      statusCode: 200,
      responseBody: '[]',
      stateUpdates: '{"stock": {"$dec": 1}}',
      delayMs: 60,
      errorRate: 0.15,
      failureStatusCode: 502,
      active: true,
      ownerUsername: 'admin',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(endpointsApi.getAll).mockResolvedValue(mockEndpoints);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  it('debe mostrar los endpoints registrados con sus badges de caos', async () => {
    renderWithClient(<EndpointList activeSessionKey="session_abc_123" />);

    await waitFor(() => {
      expect(screen.getByText('Listar Productos')).toBeInTheDocument();
    });

    expect(screen.getByText('60ms')).toBeInTheDocument();
    expect(screen.getByText('15% err')).toBeInTheDocument();
    expect(screen.getByText('Mutación Estado')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('debe abrir el modal de construcción y copiar el comando cURL incluyendo la sesión activa X-Session-ID, parámetros de ruta y body JSON', async () => {
    const user = userEvent.setup();
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText');
    vi.mocked(endpointsApi.getAll).mockResolvedValueOnce([
      {
        id: 2,
        name: 'Crear Pedido',
        httpMethod: 'POST',
        pathPattern: '/api/v1/users/{userId}/orders',
        statusCode: 201,
        responseBody: '{"ok": true}',
        requestSchema: JSON.stringify({
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          required: ['amount', 'role'],
          properties: {
            amount: { type: 'number', minimum: 10 },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
          },
        }),
        active: true,
        ownerUsername: 'admin',
      },
    ]);

    renderWithClient(<EndpointList activeSessionKey="session_custom_99" />);

    await waitFor(() => {
      expect(screen.getByText('Crear Pedido')).toBeInTheDocument();
    });

    const copyBtn = screen.getByTitle(/construir y copiar comando curl/i);
    await user.click(copyBtn);

    expect(
      await screen.findByRole('heading', { name: /construir y copiar petición curl/i })
    ).toBeInTheDocument();

    // Modificar parámetro de ruta {userId}
    const pathParamInput = screen.getByLabelText(/\{userId\}/i);
    await user.clear(pathParamInput);
    await user.type(pathParamInput, '42');

    // Modificar campo numérico 'amount' a un valor inválido (< 10) y comprobar que bloquea la copia
    const amountInput = screen.getByLabelText(/amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '5');

    expect(screen.getByText(/el valor mínimo permitido es 10/i)).toBeInTheDocument();
    const copyModalBtn = screen.getByRole('button', { name: /copiar curl al portapapeles/i });
    expect(copyModalBtn).toBeDisabled();

    // Corregir 'amount' a 50
    await user.clear(amountInput);
    await user.type(amountInput, '50');
    expect(copyModalBtn).not.toBeDisabled();

    await user.click(copyModalBtn);

    await waitFor(() => {
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('/mock/api/v1/users/42/orders')
      );
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('-H "X-Session-ID: session_custom_99"')
      );
      expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('"amount": 50'));
      expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('"role": "USER"'));
    });
  });

  it('debe abrir el modal de edición al hacer clic en el botón de editar', async () => {
    const user = userEvent.setup();
    renderWithClient(<EndpointList />);

    await waitFor(() => {
      expect(screen.getByText('Listar Productos')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle(/editar endpoint y controles de caos/i);
    await user.click(editBtn);

    expect(await screen.findByRole('heading', { name: /editar mock endpoint/i })).toBeInTheDocument();
  });

  it('debe recargar la lista de mocks al cambiar de usuario (ej. de admin a invitado) sin mostrar caché de otro usuario', async () => {
    const adminEndpoints: MockEndpoint[] = [
      {
        id: 10,
        name: 'Endpoint Privado Admin',
        httpMethod: 'GET',
        pathPattern: '/api/admin-only',
        statusCode: 200,
        responseBody: '{}',
        active: true,
        ownerUsername: 'admin',
      },
    ];
    const guestEndpoints: MockEndpoint[] = [];

    useAuthStore.getState().login('admin-token', { username: 'admin', role: 'ROLE_ADMIN' });
    vi.mocked(endpointsApi.getAll)
      .mockResolvedValueOnce(adminEndpoints)
      .mockResolvedValueOnce(guestEndpoints);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30000 } },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <EndpointList />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Endpoint Privado Admin')).toBeInTheDocument();

    // Salir de admin y entrar como invitado
    act(() => {
      useAuthStore.getState().logout();
      useAuthStore.getState().login('guest-token', {
        username: 'guest_9999',
        role: 'ROLE_GUEST',
      });
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <EndpointList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Endpoint Privado Admin')).not.toBeInTheDocument();
      expect(screen.getByText(/no hay endpoints registrados todavía/i)).toBeInTheDocument();
    });
  });
});

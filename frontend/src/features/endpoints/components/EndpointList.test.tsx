import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EndpointList } from './EndpointList';
import { endpointsApi, type MockEndpoint } from '../api/endpoints-api';

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
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('debe copiar el comando cURL incluyendo la sesión activa X-Session-ID', async () => {
    const user = userEvent.setup();
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText');
    renderWithClient(<EndpointList activeSessionKey="session_custom_99" />);

    await waitFor(() => {
      expect(screen.getByText('Listar Productos')).toBeInTheDocument();
    });

    const copyBtn = screen.getByTitle(/copiar comando curl/i);
    await user.click(copyBtn);

    await waitFor(() => {
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('-H "X-Session-ID: session_custom_99"')
      );
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
});

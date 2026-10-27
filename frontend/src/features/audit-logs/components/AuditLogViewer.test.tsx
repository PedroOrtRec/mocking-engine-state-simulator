import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogViewer, type AuditLog } from './AuditLogViewer';
import { apiClient } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AuditLogViewer Component', () => {
  const mockLogs: AuditLog[] = [
    {
      id: 'log-1',
      httpMethod: 'POST',
      requestUri: '/mock/api/v1/cart',
      statusCode: 201,
      durationMs: 45,
      sessionKey: 'user_session_99',
      ownerUsername: 'test_dev',
      timestamp: '2026-10-27T18:00:00Z',
      requestHeaders: { 'x-correlation-id': 'corr-abc-123' },
      requestBody: '{"item": "book"}',
      responseBody: '{"status": "created"}',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockLogs });
  });

  it('debe renderizar el listado de peticiones interceptadas', async () => {
    renderWithClient(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByText('/mock/api/v1/cart')).toBeInTheDocument();
    });

    expect(screen.getByText('201')).toBeInTheDocument();
    expect(screen.getByText('45 ms')).toBeInTheDocument();
    expect(screen.getByText('user_session_99')).toBeInTheDocument();
  });

  it('debe filtrar logs por sessionKey al escribir en el campo de filtro', async () => {
    const user = userEvent.setup();
    renderWithClient(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByText('/mock/api/v1/cart')).toBeInTheDocument();
    });

    const filterInput = screen.getByPlaceholderText(/filtrar por sesión/i);
    await user.type(filterInput, 'test_session');

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/logs', {
        params: { sessionKey: 'test_session' },
      });
    });
  });

  it('debe abrir el modal e inspeccionar cabeceras, requestBody y responseBody', async () => {
    const user = userEvent.setup();
    renderWithClient(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByText('/mock/api/v1/cart')).toBeInTheDocument();
    });

    const inspectBtn = screen.getByRole('button', { name: /ver/i });
    await user.click(inspectBtn);

    expect(await screen.findByText('Detalle de la Petición Interceptada')).toBeInTheDocument();
    expect(screen.getByText(/corr-abc-123/)).toBeInTheDocument();
    expect(screen.getByText(/"item": "book"/)).toBeInTheDocument();
    expect(screen.getByText(/"status": "created"/)).toBeInTheDocument();
    expect(screen.getByText('test_dev')).toBeInTheDocument();
  });
});

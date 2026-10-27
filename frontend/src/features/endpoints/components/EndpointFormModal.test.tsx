import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EndpointFormModal } from './EndpointFormModal';
import { endpointsApi, type MockEndpoint } from '../api/endpoints-api';

vi.mock('../api/endpoints-api', () => ({
  endpointsApi: {
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

describe('EndpointFormModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar el formulario en modo creación y registrar un endpoint', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    vi.mocked(endpointsApi.create).mockResolvedValueOnce({
      id: 10,
      name: 'Obtener usuarios',
      httpMethod: 'GET',
      pathPattern: '/api/users',
      statusCode: 200,
      responseBody: '{"ok": true}',
      active: true,
      ownerUsername: 'test_user',
    });

    renderWithClient(
      <EndpointFormModal isOpen={true} onClose={handleClose} />
    );

    expect(screen.getByRole('heading', { name: /registrar mock endpoint/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/nombre descriptivo/i);
    await user.type(nameInput, 'Obtener usuarios');

    // Seleccionar perfil de red WiFi Rápido (20ms)
    const wifiProfileBtn = screen.getByRole('button', { name: /wifi rápido/i });
    await user.click(wifiProfileBtn);

    const submitBtn = screen.getByRole('button', { name: /crear endpoint/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(endpointsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Obtener usuarios',
          httpMethod: 'GET',
          statusCode: 200,
          delayMs: 20,
        })
      );
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('debe cargar initialData en modo edición y actualizar con update', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    const initialEndpoint: MockEndpoint = {
      id: 5,
      name: 'Simular Carrito',
      httpMethod: 'POST',
      pathPattern: '/api/v1/cart',
      statusCode: 201,
      responseBody: '{"items": 2}',
      delayMs: 250,
      errorRate: 0.15,
      failureStatusCode: 503,
      active: true,
      ownerUsername: 'john_doe',
    };

    vi.mocked(endpointsApi.update).mockResolvedValueOnce(initialEndpoint);

    renderWithClient(
      <EndpointFormModal isOpen={true} onClose={handleClose} initialData={initialEndpoint} />
    );

    expect(screen.getByRole('heading', { name: /editar mock endpoint/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Simular Carrito')).toBeInTheDocument();
    expect(screen.getByText('250 ms')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(endpointsApi.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          name: 'Simular Carrito',
          httpMethod: 'POST',
          delayMs: 250,
          errorRate: 0.15,
          failureStatusCode: 503,
        })
      );
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});

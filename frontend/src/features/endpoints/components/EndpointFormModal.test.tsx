import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EndpointFormModal } from './EndpointFormModal';
import { endpointsApi, type MockEndpoint } from '../api/endpoints-api';
import { STATES_QUERY_KEY } from '@/features/states/hooks/use-states';
import type { ScenarioState } from '@/features/states/api/states-api';

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

  it('debe permitir añadir reglas de mutación de estado visuales y serializarlas', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    vi.mocked(endpointsApi.create).mockResolvedValueOnce({
      id: 20,
      name: 'Comprar producto',
      httpMethod: 'POST',
      pathPattern: '/api/checkout',
      statusCode: 200,
      responseBody: '{"status": "ok"}',
      active: true,
      ownerUsername: 'test_user',
    });

    renderWithClient(<EndpointFormModal isOpen={true} onClose={handleClose} />);

    const nameInput = screen.getByLabelText(/nombre descriptivo/i);
    await user.type(nameInput, 'Comprar producto');

    // Añadir regla de estado
    const addRuleBtn = screen.getByRole('button', { name: /añadir regla de estado/i });
    await user.click(addRuleBtn);

    const propInput = screen.getByPlaceholderText(/propiedad \(ej\. balance\)/i);
    await user.type(propInput, 'balance');

    const opSelect = screen.getByRole('combobox', { name: /operación 1/i });
    await user.selectOptions(opSelect, 'inc');

    const valInput = screen.getByPlaceholderText(/ej\. 1 o \{\{body\.amount\}\}/i);
    await user.type(valInput, '50');

    // Verificar que aparece la vista previa
    expect(screen.getByText(/vista previa json generada/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /crear endpoint/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(endpointsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Comprar producto',
          stateUpdates: expect.stringContaining('"balance"'),
        })
      );
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('debe cargar initialData en modo edición y actualizar con update incluyendo stateUpdates', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    const initialEndpoint: MockEndpoint = {
      id: 5,
      name: 'Simular Carrito',
      httpMethod: 'POST',
      pathPattern: '/api/v1/cart',
      statusCode: 201,
      responseBody: '{"items": 2}',
      stateUpdates: '{\n  "itemsInCart": {\n    "$inc": 1\n  }\n}',
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
    expect(screen.getByDisplayValue('itemsInCart')).toBeInTheDocument();
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
          stateUpdates: expect.stringContaining('"itemsInCart"'),
        })
      );
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('debe detectar parámetros {param} y campos del requestSchema mostrando chips interactivos en las reglas', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    const initialEndpoint: MockEndpoint = {
      id: 9,
      name: 'Actualizar saldo de usuario',
      httpMethod: 'POST',
      pathPattern: '/api/v1/users/{userId}',
      statusCode: 200,
      responseBody: '{"ok": true}',
      requestSchema: JSON.stringify({
        type: 'object',
        properties: {
          amount: { type: 'number' },
        },
      }),
      active: true,
      ownerUsername: 'pedro',
    };

    renderWithClient(
      <EndpointFormModal isOpen={true} onClose={handleClose} initialData={initialEndpoint} />
    );

    // Debe mostrar el badge de parámetro detectado bajo el input de ruta
    expect(screen.getByText('Parámetros detectados:')).toBeInTheDocument();

    // Añadir una regla de estado
    await user.click(screen.getByRole('button', { name: /añadir regla de estado/i }));

    // Al pulsar el chip de {{body.amount}} (number), debe rellenar el valor y ajustar el tipo a number
    const bodyChipBtn = screen.getByRole('button', { name: /\{\{body\.amount\}\}/i });
    await user.click(bodyChipBtn);

    const valInput = screen.getByLabelText(/^Valor 1$/i) as HTMLInputElement;
    expect(valInput.value).toBe('{{body.amount}}');

    const valTypeSelect = screen.getByLabelText(/^Tipo de valor 1$/i) as HTMLSelectElement;
    expect(valTypeSelect.value).toBe('number');
  });

  it('debe mostrar un selector (<select>) con las propiedades del estado de la sesión cuando existen', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const mockStates: ScenarioState[] = [
      {
        id: 3,
        name: 'pruebaestado',
        ownerUsername: 'admin',
        sessionKey: 'admin:pruebaestado',
        system: false,
        stateJson: '{"theme":"dark","count":1}',
      },
    ];
    queryClient.setQueryData(STATES_QUERY_KEY, mockStates);

    render(
      <QueryClientProvider client={queryClient}>
        <EndpointFormModal
          isOpen={true}
          onClose={vi.fn()}
          activeSessionKey="admin:pruebaestado"
        />
      </QueryClientProvider>
    );

    await user.click(screen.getByRole('button', { name: /añadir regla de estado/i }));

    const propSelect = screen.getByRole('combobox', { name: /^Propiedad 1$/i }) as HTMLSelectElement;
    expect(propSelect.value).toBe('theme');

    // Al seleccionar 'count', debe cambiar también el Tipo de valor a 'number'
    await user.selectOptions(propSelect, 'count');
    expect(propSelect.value).toBe('count');

    const valTypeSelect = screen.getByLabelText(/^Tipo de valor 1$/i) as HTMLSelectElement;
    expect(valTypeSelect.value).toBe('number');
  });

  it('debe asignar el código HTTP recomendado al cambiar el Método HTTP y capturar campos del Body de la Petición en los chips', async () => {
    const user = userEvent.setup();
    renderWithClient(<EndpointFormModal isOpen={true} onClose={vi.fn()} />);

    const methodSelect = screen.getByLabelText(/método http/i) as HTMLSelectElement;
    const statusInput = screen.getByLabelText(/código http éxito/i) as HTMLInputElement;

    expect(statusInput.value).toBe('200');

    await user.selectOptions(methodSelect, 'POST');
    expect(statusInput.value).toBe('201');

    await user.selectOptions(methodSelect, 'DELETE');
    expect(statusInput.value).toBe('204');

    // Escribir un JSON de ejemplo en la 4ª fila (Body de la Petición)
    const reqBodyTextarea = screen.getByLabelText(/body de la petición/i);
    fireEvent.change(reqBodyTextarea, {
      target: { value: '{"quantity": 3, "sku": "ITEM-9"}' },
    });

    // Añadir regla de estado y comprobar que aparece el chip {{body.quantity}} (number)
    await user.click(screen.getByRole('button', { name: /añadir regla de estado/i }));

    const qtyChip = screen.getByRole('button', { name: /\{\{body\.quantity\}\}/i });
    await user.click(qtyChip);

    const valInput = screen.getByLabelText(/^Valor 1$/i) as HTMLInputElement;
    expect(valInput.value).toBe('{{body.quantity}}');
  });
});

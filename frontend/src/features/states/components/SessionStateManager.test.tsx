import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionStateManager } from './SessionStateManager';
import { statesApi, type ScenarioState } from '../api/states-api';

vi.mock('../api/states-api', () => ({
  statesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    reset: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('SessionStateManager Component', () => {
  const mockStates: ScenarioState[] = [
    {
      id: 1,
      name: 'default',
      ownerUsername: 'system',
      sessionKey: 'default',
      stateJson: '{"base": true}',
      system: true,
    },
    {
      id: 2,
      name: 'test_session',
      ownerUsername: 'test_user',
      sessionKey: 'test_session_key',
      stateJson: '{"counter": 10}',
      system: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(statesApi.getAll).mockResolvedValue(mockStates);
  });

  it('debe listar las sesiones y mostrar el estado de la sesión seleccionada', async () => {
    renderWithClient(
      <SessionStateManager
        selectedSessionKey="default"
        onSelectSessionKey={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Sistema (Default)')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/seleccionar sesión/i)).toBeInTheDocument();
    expect(screen.getByText('default', { selector: 'code' })).toBeInTheDocument();
  });

  it('debe permitir editar y guardar el JSON en una sesión personalizada', async () => {
    const user = userEvent.setup();
    vi.mocked(statesApi.update).mockResolvedValueOnce({
      ...mockStates[1],
      stateJson: '{"counter": 20}',
    });

    renderWithClient(
      <SessionStateManager
        selectedSessionKey="test_session_key"
        onSelectSessionKey={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test_session')).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText(/variables de estado/i);
    fireEvent.change(textarea, { target: { value: '{"counter": 20}' } });

    const saveBtn = screen.getByRole('button', { name: /guardar estado/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(statesApi.update).toHaveBeenCalledWith(2, {
        stateJson: '{"counter": 20}',
      });
    });
  });

  it('debe mostrar error de validación cuando el JSON no es válido', async () => {
    renderWithClient(
      <SessionStateManager
        selectedSessionKey="test_session_key"
        onSelectSessionKey={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test_session')).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText(/variables de estado/i);
    fireEvent.change(textarea, { target: { value: '{invalido}' } });

    expect(await screen.findByText(/error de sintaxis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar estado/i })).toBeDisabled();
  });

  it('debe abrir modal y crear una nueva sesión', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    vi.mocked(statesApi.create).mockResolvedValueOnce({
      id: 3,
      name: 'nuevo_flujo',
      ownerUsername: 'test_user',
      sessionKey: 'nuevo_flujo_key',
      stateJson: '{}',
      system: false,
    });

    renderWithClient(
      <SessionStateManager
        selectedSessionKey="default"
        onSelectSessionKey={handleSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nueva sesión/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /nueva sesión/i }));

    const nameInput = screen.getByLabelText(/nombre de la sesión/i);
    await user.type(nameInput, 'nuevo_flujo');

    const submitBtn = screen.getByRole('button', { name: /crear sesión/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(statesApi.create).toHaveBeenCalledWith({
        name: 'nuevo_flujo',
        stateJson: expect.any(String),
      });
      expect(handleSelect).toHaveBeenCalledWith('nuevo_flujo_key');
    });
  });

  it('debe restaurar los valores originales del estado al pulsar Restaurar original', async () => {
    const user = userEvent.setup();
    vi.mocked(statesApi.reset).mockResolvedValueOnce({
      ...mockStates[1],
      stateJson: '{"counter": 0}',
      initialStateJson: '{"counter": 0}',
    });

    renderWithClient(
      <SessionStateManager
        selectedSessionKey="test_session_key"
        onSelectSessionKey={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test_session')).toBeInTheDocument();
    });

    const resetBtn = screen.getByRole('button', { name: /restaurar original/i });
    await user.click(resetBtn);

    await waitFor(() => {
      expect(statesApi.reset).toHaveBeenCalledWith(2);
    });
  });
});

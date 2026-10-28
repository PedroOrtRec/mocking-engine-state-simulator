import { apiClient } from '@/lib/api-client';

export interface ScenarioState {
  id: number;
  name: string;
  ownerUsername: string;
  sessionKey: string;
  stateJson: string;
  initialStateJson?: string;
  system: boolean;
  lastAccessedAt?: string;
}

export interface CreateStatePayload {
  name: string;
  stateJson?: string;
}

export interface UpdateStatePayload {
  name?: string;
  stateJson?: string;
}

export const statesApi = {
  getAll: async (): Promise<ScenarioState[]> => {
    const res = await apiClient.get<ScenarioState[]>('/api/v1/admin/states');
    return res.data;
  },

  getById: async (id: number): Promise<ScenarioState> => {
    const res = await apiClient.get<ScenarioState>(`/api/v1/admin/states/${id}`);
    return res.data;
  },

  create: async (payload: CreateStatePayload): Promise<ScenarioState> => {
    const res = await apiClient.post<ScenarioState>('/api/v1/admin/states', payload);
    return res.data;
  },

  update: async (id: number, payload: UpdateStatePayload): Promise<ScenarioState> => {
    const res = await apiClient.put<ScenarioState>(`/api/v1/admin/states/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/states/${id}`);
  },

  reset: async (id: number): Promise<ScenarioState> => {
    const res = await apiClient.post<ScenarioState>(`/api/v1/admin/states/${id}/reset`);
    return res.data;
  },
};

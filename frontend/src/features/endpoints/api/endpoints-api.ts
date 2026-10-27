import { apiClient } from '@/lib/api-client';

export interface MockEndpoint {
  id: number;
  name: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  pathPattern: string;
  statusCode: number;
  responseBody: string;
  responseHeaders?: string;
  requestSchema?: string;
  delayMs?: number;
  errorRate?: number;
  active: boolean;
  ownerUsername: string;
}

export const endpointsApi = {
  getAll: async (): Promise<MockEndpoint[]> => {
    const res = await apiClient.get<MockEndpoint[]>('/api/v1/admin/endpoints');
    return res.data;
  },

  create: async (data: Omit<MockEndpoint, 'id' | 'ownerUsername'>): Promise<MockEndpoint> => {
    const res = await apiClient.post<MockEndpoint>('/api/v1/admin/endpoints', data);
    return res.data;
  },

  update: async (id: number, data: Omit<MockEndpoint, 'id' | 'ownerUsername'>): Promise<MockEndpoint> => {
    const res = await apiClient.put<MockEndpoint>(`/api/v1/admin/endpoints/${id}`, data);
    return res.data;
  },

  toggleActive: async (id: number): Promise<MockEndpoint> => {
    const res = await apiClient.patch<MockEndpoint>(`/api/v1/admin/endpoints/${id}/toggle`);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/endpoints/${id}`);
  },
};

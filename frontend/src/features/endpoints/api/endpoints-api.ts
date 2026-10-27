import { apiClient } from '@/lib/api-client';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface MockEndpoint {
  id: number;
  name: string;
  httpMethod: HttpMethod;
  pathPattern: string;
  statusCode: number;
  responseBody: string;
  responseHeaders?: string;
  delayMs?: number;
  errorRate?: number;
  failureStatusCode?: number;
  requestSchema?: string;
  active: boolean;
  ownerUsername: string;
  ephemeral?: boolean;
}

export type MockEndpointPayload = Omit<MockEndpoint, 'id' | 'ownerUsername'>;

export const endpointsApi = {
  getAll: async (): Promise<MockEndpoint[]> => {
    const res = await apiClient.get<MockEndpoint[]>('/api/v1/admin/endpoints');
    return res.data;
  },

  getById: async (id: number): Promise<MockEndpoint> => {
    const res = await apiClient.get<MockEndpoint>(`/api/v1/admin/endpoints/${id}`);
    return res.data;
  },

  create: async (data: MockEndpointPayload): Promise<MockEndpoint> => {
    const res = await apiClient.post<MockEndpoint>('/api/v1/admin/endpoints', data);
    return res.data;
  },

  update: async (id: number, data: MockEndpointPayload): Promise<MockEndpoint> => {
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

import { apiClient } from '@/lib/api-client';

export interface AuthResponse {
  token: string;
  username: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN' | 'ROLE_GUEST';
  expiresInMs: number;
}

export const authApi = {
  login: async (credentials: { username: string; password: string }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: { username: string; password: string }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', credentials);
    return response.data;
  },

  // Acceso instantáneo en 1-Click:
  guestLogin: async (): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/guest');
    return response.data;
  },
};

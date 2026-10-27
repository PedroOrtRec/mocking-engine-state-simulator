import { apiClient } from '@/lib/api-client';

export type UserRole = 'ROLE_USER' | 'ROLE_ADMIN' | 'ROLE_GUEST';

export interface UserSummary {
  id: number;
  username: string;
  role: UserRole;
  createdAt: string;
}

export const usersApi = {
  getAll: async (): Promise<UserSummary[]> => {
    const res = await apiClient.get<UserSummary[]>('/api/v1/admin/users');
    return res.data;
  },

  changeRole: async (userId: number, newRole: UserRole): Promise<void> => {
    await apiClient.patch(`/api/v1/admin/users/${userId}/role`, null, {
      params: { newRole },
    });
  },

  deleteUser: async (userId: number): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/users/${userId}`);
  },
};

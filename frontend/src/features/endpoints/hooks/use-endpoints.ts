import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpointsApi } from '../api/endpoints-api';
import { useAuthStore } from '@/stores/use-auth-store';

export const ENDPOINTS_QUERY_KEY = ['mockEndpoints'] as const;

export function useEndpoints() {
  const queryClient = useQueryClient();
  const username = useAuthStore((state) => state.user?.username ?? 'anonymous');
  const scopedKey = [...ENDPOINTS_QUERY_KEY, username] as const;

  const endpointsQuery = useQuery({
    queryKey: scopedKey,
    queryFn: endpointsApi.getAll,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const toggleMutation = useMutation({
    mutationFn: endpointsApi.toggleActive,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENDPOINTS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: endpointsApi.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENDPOINTS_QUERY_KEY });
    },
  });

  return {
    endpoints: endpointsQuery.data ?? [],
    isLoading: endpointsQuery.isLoading,
    toggleEndpoint: toggleMutation.mutate,
    deleteEndpoint: deleteMutation.mutate,
  };
}

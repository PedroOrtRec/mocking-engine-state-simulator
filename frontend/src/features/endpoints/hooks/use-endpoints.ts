import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpointsApi } from '../api/endpoints-api';

const QUERY_KEY = ['mockEndpoints'];

export function useEndpoints() {
  const queryClient = useQueryClient();

  const endpointsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: endpointsApi.getAll,
  });

  const toggleMutation = useMutation({
    mutationFn: endpointsApi.toggleActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: endpointsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    endpoints: endpointsQuery.data ?? [],
    isLoading: endpointsQuery.isLoading,
    toggleEndpoint: toggleMutation.mutate,
    deleteEndpoint: deleteMutation.mutate,
  };
}

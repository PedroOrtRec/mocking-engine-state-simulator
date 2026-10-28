import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statesApi, type CreateStatePayload, type UpdateStatePayload } from '../api/states-api';

export const STATES_QUERY_KEY = ['scenarioStates'] as const;

export function useStates() {
  const queryClient = useQueryClient();

  const statesQuery = useQuery({
    queryKey: STATES_QUERY_KEY,
    queryFn: statesApi.getAll,
    refetchInterval: 3000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateStatePayload) => statesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STATES_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateStatePayload }) =>
      statesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STATES_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => statesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STATES_QUERY_KEY });
    },
  });

  return {
    states: statesQuery.data ?? [],
    isLoading: statesQuery.isLoading,
    isError: statesQuery.isError,
    error: statesQuery.error,
    createState: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateState: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteState: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

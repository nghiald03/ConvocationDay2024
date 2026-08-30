import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteBachelor } from '../api/delete-bachelor';
import { bachelorKeys } from './bachelor-query-options';

export function useDeleteBachelorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBachelor,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bachelorKeys.lists() });
    },
  });
}

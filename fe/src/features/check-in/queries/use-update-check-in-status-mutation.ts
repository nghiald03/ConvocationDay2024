import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCheckInStatus } from '../api/update-check-in-status';
import type { CheckIn } from '../model/check-in';
import { checkInKeys } from './check-in-query-options';

export function useUpdateCheckInStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCheckInStatus,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: checkInKeys.list() });
      const previous = queryClient.getQueryData<CheckIn[]>(checkInKeys.list());

      queryClient.setQueryData<CheckIn[]>(checkInKeys.list(), (current = []) =>
        current.map((item) =>
          item.checkinId === input.checkinId ? { ...item, status: input.status } : item
        )
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(checkInKeys.list(), context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: checkInKeys.list() });
    },
  });
}

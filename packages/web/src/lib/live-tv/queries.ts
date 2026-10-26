import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../session';
import { useServerInfo } from '../server-info';
import type { BaseItemDto, BaseItemDtoQueryResult } from '../types';
import { fetchChannels, type LiveTimer } from './api';

export function useLiveTvAllowed() {
  const { user } = useSession();
  return useServerInfo().stock && user.Policy?.EnableLiveTvAccess !== false;
}

function useLiveKey() {
  const { client, user } = useSession();
  return ['jf', client.base, user.Id, 'live-tv'] as const;
}

export function useChannels() {
  const { client, user } = useSession();
  return useQuery({
    queryKey: [...useLiveKey(), 'channels'],
    queryFn: ({ signal }) => fetchChannels(client, user.Id!, signal),
    enabled: useLiveTvAllowed(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useGuide(channelId: string | undefined, day: string) {
  const { client, user } = useSession();
  // eslint-disable-next-line lingui/no-unlocalized-strings -- ISO timestamp
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return useQuery({
    queryKey: [...useLiveKey(), 'guide', channelId, day],
    queryFn: ({ signal }) =>
      client.get<BaseItemDtoQueryResult>(
        '/LiveTv/Programs',
        {
          UserId: user.Id,
          ChannelIds: channelId,
          MinEndDate: start.toISOString(),
          MaxStartDate: end.toISOString(),
          SortBy: 'StartDate',
          SortOrder: 'Ascending',
          Fields: 'Overview',
          Limit: 500,
        },
        signal
      ),
    enabled: useLiveTvAllowed() && !!channelId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useLiveRecords(enabled: boolean) {
  const { client, user } = useSession();
  const key = useLiveKey();
  const allowed = useLiveTvAllowed();
  const recordings = useQuery({
    queryKey: [...key, 'recordings'],
    queryFn: ({ signal }) =>
      client.get<BaseItemDtoQueryResult>(
        '/LiveTv/Recordings',
        {
          UserId: user.Id,
          Limit: 200,
          Fields: 'Overview',
          SortBy: 'DateCreated',
          SortOrder: 'Descending',
        },
        signal
      ),
    enabled: allowed && enabled,
    staleTime: 30_000,
  });
  const timers = useQuery({
    queryKey: [...key, 'timers'],
    queryFn: ({ signal }) =>
      client.get<{ Items?: LiveTimer[] }>(
        '/LiveTv/Timers',
        { UserId: user.Id },
        signal
      ),
    enabled: allowed && user.Policy?.EnableLiveTvManagement === true,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });
  return { recordings, timers };
}

export function useLiveActions() {
  const { client, user } = useSession();
  const cache = useQueryClient();
  const key = useLiveKey();
  const refresh = () => cache.invalidateQueries({ queryKey: key });
  const favorite = useMutation({
    mutationFn: async (channel: BaseItemDto) => {
      const path = `/UserFavoriteItems/${channel.Id}`;
      if (channel.UserData?.IsFavorite)
        await client.delete(path, { UserId: user.Id });
      else await client.post(path, undefined, { UserId: user.Id });
    },
    onSuccess: refresh,
  });
  const record = useMutation({
    mutationFn: async (program: BaseItemDto) => {
      if (user.Policy?.EnableLiveTvManagement !== true)
        throw new Error('live-tv-forbidden');
      const defaults = await client.get<Record<string, unknown>>(
        '/LiveTv/Timers/Defaults',
        { ProgramId: program.Id }
      );
      await client.post('/LiveTv/Timers', {
        ...defaults,
        ProgramId: program.Id,
        ChannelId: program.ChannelId,
        Name: program.Name,
        StartDate: program.StartDate,
        EndDate: program.EndDate,
      });
    },
    onSuccess: refresh,
  });
  const cancel = useMutation({
    mutationFn: (timer: LiveTimer) =>
      client.delete(`/LiveTv/Timers/${timer.Id}`),
    onSuccess: refresh,
  });
  return { favorite, record, cancel };
}

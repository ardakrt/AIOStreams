import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import React from 'react';
import {
  BiChevronLeft,
  BiChevronRight,
  BiHeart,
  BiPlay,
  BiRefresh,
  BiTv,
} from 'react-icons/bi';
import { Button } from '@aiostreams/ui/button';
import { cn } from '@aiostreams/ui/core/styling';
import { toast } from 'sonner';
import { PageBody } from '../components/layout';
import { useSession } from '../lib/session';
import { JellyfinError } from '../lib/client';
import { formatLocale } from '../lib/i18n';
import { posterUrl } from '../lib/images';
import { navigate, to } from '../lib/paths';
import { programProgress } from '../lib/live-tv/api';
import {
  useChannels,
  useGuide,
  useLiveActions,
  useLiveRecords,
  useLiveTvAllowed,
} from '../lib/live-tv/queries';
import type { BaseItemDto } from '../lib/types';

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function timeRange(program: BaseItemDto) {
  const time = (value?: string | null) =>
    value && Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleTimeString(formatLocale(), {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
  return [time(program.StartDate), time(program.EndDate)]
    .filter(Boolean)
    .join(' – ');
}

export function ChannelLogo({
  channel,
  large = false,
}: {
  channel: BaseItemDto;
  large?: boolean;
}) {
  const { client } = useSession();
  const url = posterUrl(client, channel, { maxWidth: large ? 200 : 80 });
  const [failed, setFailed] = React.useState<string>();
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg bg-white/5 p-2',
        large ? 'h-24 w-40 sm:h-28 sm:w-48' : 'h-12 w-16'
      )}
    >
      {url && failed !== url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain"
          onError={() => setFailed(url)}
        />
      ) : (
        <BiTv
          aria-hidden
          className={
            large ? 'h-10 w-10 text-white/65' : 'h-6 w-6 text-white/65'
          }
        />
      )}
    </span>
  );
}

export function LiveTvPage() {
  const allowed = useLiveTvAllowed();
  const { user } = useSession();
  const channels = useChannels();
  const [tab, setTab] = React.useState<'channels' | 'recordings'>('channels');
  const [search, setSearch] = React.useState('');
  const [favorites, setFavorites] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string>();
  const [day, setDay] = React.useState(dayKey);
  const [now, setNow] = React.useState(Date.now);
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const all = channels.data ?? [];
  const filtered = React.useMemo(
    () =>
      all.filter(
        (c) =>
          (!favorites || c.UserData?.IsFavorite) &&
          `${c.Name} ${c.ChannelNumber ?? ''}`
            .toLocaleLowerCase(formatLocale())
            .includes(search.toLocaleLowerCase(formatLocale()))
      ),
    [all, favorites, search]
  );
  const selected = filtered.find((c) => c.Id === selectedId) ?? filtered[0];
  const guide = useGuide(selected?.Id, day);
  const { recordings, timers } = useLiveRecords(tab === 'recordings');
  const actions = useLiveActions();
  const current =
    guide.data?.Items?.find(
      (p) =>
        Date.parse(p.StartDate ?? '') <= now &&
        Date.parse(p.EndDate ?? '') > now
    ) ??
    (selected?.CurrentProgram &&
    Date.parse(selected.CurrentProgram.EndDate ?? '') > now
      ? selected.CurrentProgram
      : undefined);
  const canRecord = user.Policy?.EnableLiveTvManagement === true;
  const fail = () => toast.error(t`The change could not be saved. Try again.`);
  if (!allowed)
    return (
      <PageBody>
        <h1 className="text-3xl font-semibold">
          <Trans>Live TV</Trans>
        </h1>
        <p className="text-white/65">
          <Trans>Live TV is not available for this server or account.</Trans>
        </p>
      </PageBody>
    );
  return (
    <PageBody>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          <Trans>Live TV</Trans>
        </h1>
        <Button
          intent="gray-outline"
          onClick={() => {
            void channels.refetch();
            void guide.refetch();
          }}
          disabled={channels.isFetching}
          leftIcon={<BiRefresh />}
        >
          <Trans>Refresh</Trans>
        </Button>
      </header>
      <div
        className="flex gap-6 border-b border-white/10"
        role="group"
        aria-label={t`Live TV sections`}
      >
        {(['channels', 'recordings'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'border-b-2 px-1 pb-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4',
              tab === value
                ? 'border-white text-white'
                : 'border-transparent text-white/65 hover:text-white'
            )}
          >
            {value === 'channels' ? (
              <Trans>Channels & guide</Trans>
            ) : (
              <Trans>Recordings</Trans>
            )}
          </button>
        ))}
      </div>
      {tab === 'channels' ? (
        <>
          {channels.isLoading ? (
            <p role="status">
              <Trans>Loading channels…</Trans>
            </p>
          ) : channels.error ? (
            <div role="alert" className="space-y-3">
              <p>
                {channels.error instanceof JellyfinError &&
                channels.error.status === 403
                  ? t`Your account does not have permission to watch Live TV.`
                  : t`Channels could not be loaded. Check your connection and try again.`}
              </p>
              <Button
                intent="gray-outline"
                onClick={() => void channels.refetch()}
              >
                <Trans>Try again</Trans>
              </Button>
            </div>
          ) : !all.length ? (
            <p className="text-white/65">
              <Trans>
                No channels are available. Check Live TV in your Jellyfin
                server.
              </Trans>
            </p>
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
              <section aria-label={t`Channels`} className="min-w-0 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    aria-label={t`Search channels`}
                    placeholder={t`Search channels`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    type="search"
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm placeholder:text-white/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  />
                  <button
                    type="button"
                    aria-label={t`Favorite channels`}
                    aria-pressed={favorites}
                    onClick={() => setFavorites(!favorites)}
                    className={cn(
                      'rounded-lg p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                      favorites
                        ? 'bg-white text-black'
                        : 'bg-white/5 hover:bg-white/10'
                    )}
                  >
                    <BiHeart className="h-5 w-5" />
                  </button>
                </div>
                <div
                  className="max-h-[50dvh] overflow-y-auto lg:max-h-[65dvh]"
                  role="group"
                  aria-label={t`Choose a channel`}
                >
                  {filtered.map((channel) => (
                    <button
                      type="button"
                      key={channel.Id}
                      aria-pressed={channel.Id === selected?.Id}
                      onClick={() => setSelectedId(channel.Id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg p-3 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
                        channel.Id === selected?.Id
                          ? 'bg-white/10'
                          : 'hover:bg-white/5'
                      )}
                    >
                      <ChannelLogo channel={channel} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {channel.ChannelNumber && (
                            <span className="me-2 text-sm tabular-nums text-white/65">
                              {channel.ChannelNumber}
                            </span>
                          )}
                          {channel.Name}
                        </span>
                        <span className="mt-1 block truncate text-sm text-white/65">
                          {channel.CurrentProgram?.Name ??
                            t`Program information unavailable`}
                        </span>
                      </span>
                      {channel.UserData?.IsFavorite && (
                        <BiHeart
                          aria-label={t`Favorite`}
                          className="shrink-0"
                        />
                      )}
                    </button>
                  ))}
                  {!filtered.length && (
                    <p className="p-3 text-sm text-white/65">
                      <Trans>No channels match your search or filter.</Trans>
                    </p>
                  )}
                </div>
              </section>
              {selected && (
                <section
                  className="min-w-0 space-y-7"
                  aria-label={selected.Name ?? t`Selected channel`}
                >
                  <div className="space-y-5 rounded-2xl bg-white/5 p-5 sm:p-7">
                    <div className="flex flex-wrap items-center gap-5">
                      <ChannelLogo channel={selected} large />
                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-2xl font-semibold">
                          {selected.Name}
                        </h2>
                        <p className="mt-2 text-sm text-white/65">
                          {current
                            ? timeRange(current)
                            : t`Program information unavailable`}
                        </p>
                      </div>
                    </div>
                    {current && (
                      <div className="space-y-3">
                        <h3 className="text-xl font-medium">{current.Name}</h3>
                        <div
                          role="progressbar"
                          aria-label={t`Current program progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(
                            programProgress(current, now) * 100
                          )}
                          className="h-1 overflow-hidden rounded-full bg-white/15"
                        >
                          <div
                            className="h-full bg-white"
                            style={{
                              width: `${programProgress(current, now) * 100}%`,
                            }}
                          />
                        </div>
                        {current.Overview && (
                          <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-white/65">
                            {current.Overview.replace(/<[^>]*>/g, '')}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        intent="white"
                        leftIcon={<BiPlay />}
                        onClick={() => navigate(to.livePlay(selected.Id!))}
                      >
                        <Trans>Watch live</Trans>
                      </Button>
                      <Button
                        intent="gray-outline"
                        leftIcon={<BiHeart />}
                        disabled={actions.favorite.isPending}
                        onClick={() =>
                          actions.favorite.mutate(selected, { onError: fail })
                        }
                      >
                        {selected.UserData?.IsFavorite ? (
                          <Trans>Remove favorite</Trans>
                        ) : (
                          <Trans>Add favorite</Trans>
                        )}
                      </Button>
                    </div>
                  </div>
                  <section aria-label={t`Program guide`} className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-xl font-semibold">
                        <Trans>Program guide</Trans>
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={t`Previous day`}
                          className="rounded p-2 hover:bg-white/10 focus-visible:outline"
                          onClick={() => {
                            const date = new Date(`${day}T12:00:00`);
                            date.setDate(date.getDate() - 1);
                            setDay(dayKey(date));
                          }}
                        >
                          <BiChevronLeft className="h-5 w-5 rtl:-scale-x-100" />
                        </button>
                        <input
                          type="date"
                          aria-label={t`Guide date`}
                          value={day}
                          onChange={(e) => {
                            if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))
                              setDay(e.target.value);
                          }}
                          className="min-w-0 rounded-lg bg-white/5 px-3 py-2 text-sm [color-scheme:dark]"
                        />
                        <button
                          type="button"
                          aria-label={t`Next day`}
                          className="rounded p-2 hover:bg-white/10 focus-visible:outline"
                          onClick={() => {
                            const date = new Date(`${day}T12:00:00`);
                            date.setDate(date.getDate() + 1);
                            setDay(dayKey(date));
                          }}
                        >
                          <BiChevronRight className="h-5 w-5 rtl:-scale-x-100" />
                        </button>
                      </div>
                    </div>
                    {guide.isLoading ? (
                      <p role="status">
                        <Trans>Loading guide…</Trans>
                      </p>
                    ) : guide.error ? (
                      <p role="alert" className="text-white/65">
                        <Trans>
                          The program guide could not be loaded. You can still
                          watch the channel.
                        </Trans>
                      </p>
                    ) : !guide.data?.Items?.length ? (
                      <p className="text-sm text-white/65">
                        <Trans>
                          No guide data for this day. You can still watch the
                          channel.
                        </Trans>
                      </p>
                    ) : (
                      <ol className="divide-y divide-white/10">
                        {guide.data.Items.map((program) => {
                          const timer = timers.data?.Items?.find(
                            (v) =>
                              v.ProgramId === program.Id &&
                              v.Status !== 'Cancelled'
                          );
                          const live =
                            Date.parse(program.StartDate ?? '') <= now &&
                            Date.parse(program.EndDate ?? '') > now;
                          return (
                            <li
                              key={program.Id}
                              className="flex flex-wrap items-start gap-3 py-4"
                            >
                              <div className="w-28 shrink-0 pt-1 text-sm tabular-nums text-white/65">
                                {timeRange(program)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-medium">
                                    {program.Name}
                                  </h3>
                                  {live && (
                                    <span className="rounded bg-white/10 px-2 py-0.5 text-xs">
                                      <Trans>On now</Trans>
                                    </span>
                                  )}
                                </div>
                                {program.Overview && (
                                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-white/65">
                                    {program.Overview.replace(/<[^>]*>/g, '')}
                                  </p>
                                )}
                              </div>
                              {canRecord &&
                                Date.parse(program.EndDate ?? '') > now && (
                                  <Button
                                    size="sm"
                                    intent="gray-outline"
                                    disabled={
                                      actions.record.isPending ||
                                      actions.cancel.isPending ||
                                      timers.isLoading ||
                                      !!timers.error
                                    }
                                    onClick={() =>
                                      timer
                                        ? actions.cancel.mutate(timer, {
                                            onError: fail,
                                          })
                                        : actions.record.mutate(program, {
                                            onError: fail,
                                            onSuccess: () =>
                                              toast.success(
                                                t`Recording scheduled`
                                              ),
                                          })
                                    }
                                  >
                                    {timer ? (
                                      <Trans>Cancel recording</Trans>
                                    ) : (
                                      <Trans>Record</Trans>
                                    )}
                                  </Button>
                                )}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </section>
                </section>
              )}
            </div>
          )}
        </>
      ) : (
        <section className="space-y-8">
          {canRecord && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">
                <Trans>Scheduled recordings</Trans>
              </h2>
              {timers.error ? (
                <p role="alert">
                  <Trans>Scheduled recordings could not be loaded.</Trans>
                </p>
              ) : timers.isLoading ? (
                <p role="status">
                  <Trans>Loading…</Trans>
                </p>
              ) : !timers.data?.Items?.length ? (
                <p className="text-white/65">
                  <Trans>No recordings are scheduled.</Trans>
                </p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {timers.data.Items.map((timer) => (
                    <li
                      key={timer.Id}
                      className="flex items-center justify-between gap-4 py-4"
                    >
                      <div className="min-w-0">
                        <h3 className="break-words font-medium">
                          {timer.Name}
                        </h3>
                        <p className="mt-1 text-sm text-white/65">
                          {timer.ChannelName} ·{' '}
                          {timer.StartDate &&
                            new Date(timer.StartDate).toLocaleString(
                              formatLocale()
                            )}
                        </p>
                      </div>
                      <Button
                        intent="gray-outline"
                        disabled={actions.cancel.isPending}
                        onClick={() =>
                          actions.cancel.mutate(timer, { onError: fail })
                        }
                      >
                        <Trans>Cancel recording</Trans>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">
              <Trans>Recordings</Trans>
            </h2>
            {recordings.isLoading ? (
              <p role="status">
                <Trans>Loading…</Trans>
              </p>
            ) : recordings.error ? (
              <p role="alert">
                <Trans>Recordings could not be loaded.</Trans>
              </p>
            ) : !recordings.data?.Items?.length ? (
              <p className="text-white/65">
                <Trans>No recordings yet.</Trans>
              </p>
            ) : (
              <ul className="divide-y divide-white/10">
                {recordings.data.Items.map((item) => (
                  <li key={item.Id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 rounded-lg p-4 text-start hover:bg-white/5 focus-visible:outline"
                      onClick={() => navigate(to.play(item.Id!, ''))}
                    >
                      <BiPlay aria-hidden className="h-7 w-7 shrink-0" />
                      <span className="min-w-0">
                        <span className="block break-words font-medium">
                          {item.Name}
                        </span>
                        <span className="text-sm text-white/65">
                          {item.ChannelName}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </PageBody>
  );
}

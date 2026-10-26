import { plural, t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import React from 'react';
import {
  BiChevronLeft,
  BiChevronRight,
  BiCalendar,
  BiHeart,
  BiPlay,
  BiRefresh,
  BiSearch,
  BiTv,
} from 'react-icons/bi';
import { Button, IconButton } from '@aiostreams/ui/button';
import { TextInput } from '@aiostreams/ui/text-input';
import { Tooltip } from '@aiostreams/ui/tooltip';
import { Popover } from '@aiostreams/ui/popover';
import { Skeleton } from '@aiostreams/ui/skeleton';
import { LuffyError } from '@aiostreams/ui/shared/luffy-error';
import { cn } from '@aiostreams/ui/core/styling';
import { toast } from 'sonner';
import { PageBody } from '../components/layout';
import {
  BackdropFrame,
  HeroDetails,
  HeroMeta,
  HeroShade,
} from '../components/hero';
import { CachedImage } from '../components/cached-image';
import { Artwork, WideCard } from '../components/cards';
import { MediaRow } from '../components/media-row';
import { PillTabs } from '../components/pill-tabs';
import { useSession } from '../lib/session';
import { JellyfinError } from '../lib/client';
import { formatLocale } from '../lib/i18n';
import { landscapeUrls, posterUrl } from '../lib/images';
import { navigate, to } from '../lib/paths';
import { storage } from '../lib/storage';
import { programProgress } from '../lib/live-tv/api';
import {
  channelLabel,
  channelSearch,
  programOnNow,
  programRemaining,
} from '../lib/live-tv/presentation';
import {
  useChannels,
  useGuide,
  useLiveActions,
  useLiveRecords,
  useLiveTvAllowed,
} from '../lib/live-tv/queries';
import type { BaseItemDto } from '../lib/types';
import { LiveRecordings } from './live-recordings';

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
  const url = posterUrl(client, channel, { maxWidth: large ? 240 : 96 });
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center',
        large ? 'h-12 w-24' : 'h-8 w-12'
      )}
    >
      <Artwork
        src={url}
        alt=""
        className="object-contain"
        standIn={<BiTv aria-hidden className="size-5 text-[--muted]" />}
      />
    </span>
  );
}

export function LiveTvPage() {
  const allowed = useLiveTvAllowed();
  const { client, user } = useSession();
  const channels = useChannels();
  const selectionKey = `aiostreams-web-live-channel:${client.base}:${user.Id}`;
  const [tab, setTab] = React.useState<'channels' | 'recordings'>('channels');
  const [search, setSearch] = React.useState('');
  const [favorites, setFavorites] = React.useState(false);
  const [genre, setGenre] = React.useState('');
  const [failedArt, setFailedArt] = React.useState<string[]>([]);
  const [selectedId, setSelectedId] = React.useState(
    () => storage.get<string>(selectionKey) ?? undefined
  );
  const [inspecting, setInspecting] = React.useState<BaseItemDto | null>(null);
  const [day, setDay] = React.useState(dayKey);
  const [now, setNow] = React.useState(Date.now);
  const list = React.useRef<HTMLDivElement>(null);
  const channelTitle = React.useRef<HTMLHeadingElement>(null);
  const browseChannels = () => {
    channelTitle.current?.scrollIntoView({ block: 'start' });
    channelTitle.current?.focus({ preventScroll: true });
  };
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const all = channels.data ?? [];
  const genres = React.useMemo(
    () =>
      [...new Set(all.flatMap((c) => c.Genres ?? []))].sort((a, b) =>
        a.localeCompare(b, formatLocale())
      ),
    [all]
  );
  const filtered = React.useMemo(() => {
    const query = channelSearch(search);
    return all.filter(
      (c) =>
        (!favorites || c.UserData?.IsFavorite) &&
        (!genre || c.Genres?.includes(genre)) &&
        channelSearch(`${c.Name} ${c.ChannelNumber ?? ''}`).includes(query)
    );
  }, [all, favorites, genre, search]);
  const selected =
    all.find((c) => c.Id === selectedId) ?? filtered[0] ?? all[0];
  const select = (channel: BaseItemDto) => {
    setSelectedId(channel.Id);
    setInspecting(null);
    storage.set(selectionKey, channel.Id);
  };
  const guide = useGuide(selected?.Id, day);
  const { timers } = useLiveRecords(false);
  const actions = useLiveActions();
  const programs = guide.data?.Items ?? [];
  const current =
    programs.find((p) => programOnNow(p, now)) ??
    (programOnNow(selected?.CurrentProgram, now)
      ? selected?.CurrentProgram
      : undefined);
  const shown = inspecting ?? current;
  const shownLive = programOnNow(shown, now);
  const minutesLeft = shown ? programRemaining(shown, now) : 0;
  const display = shown
    ? { ...shown, Overview: shown.Overview?.replace(/<[^>]*>/g, '') }
    : selected;
  const art = shown
    ? landscapeUrls(client, shown, { maxWidth: 1920 }).filter(
        (url) => !failedArt.includes(url)
      )
    : [];
  const canRecord = user.Policy?.EnableLiveTvManagement === true;
  const fail = () => toast.error(t`The change could not be saved. Try again.`);
  const watch = (channel: BaseItemDto) => {
    select(channel);
    navigate(to.livePlay(channel.Id!));
  };
  React.useEffect(() => {
    const rail = list.current;
    // eslint-disable-next-line lingui/no-unlocalized-strings -- DOM selector
    const row = rail?.querySelector<HTMLElement>('[data-selected="true"]');
    if (
      rail &&
      row &&
      (row.offsetTop < rail.scrollTop ||
        row.offsetTop + row.offsetHeight > rail.scrollTop + rail.clientHeight)
    )
      rail.scrollTop = Math.max(0, row.offsetTop - rail.clientHeight / 3);
  }, [selected?.Id]);
  const recordControl = (program: BaseItemDto) => {
    if (!canRecord || Date.parse(program.EndDate ?? '') <= now) return null;
    const timer = timers.data?.Items?.find(
      (v) => v.ProgramId === program.Id && v.Status !== 'Cancelled'
    );
    return (
      <Button
        size="sm"
        intent="gray-outline"
        className="rounded-full"
        disabled={
          actions.record.isPending ||
          actions.cancel.isPending ||
          timers.isLoading ||
          !!timers.error
        }
        onClick={() =>
          timer
            ? actions.cancel.mutate(timer, { onError: fail })
            : actions.record.mutate(program, {
                onError: fail,
                onSuccess: () => toast.success(t`Recording scheduled`),
              })
        }
      >
        {timer ? <Trans>Cancel recording</Trans> : <Trans>Record</Trans>}
      </Button>
    );
  };
  const moveDay = (direction: number) => {
    // eslint-disable-next-line lingui/no-unlocalized-strings -- ISO timestamp
    const date = new Date(`${day}T12:00:00`);
    date.setDate(date.getDate() + direction);
    setDay(dayKey(date));
    setInspecting(null);
  };
  const dateTools = (
    <div className="flex flex-wrap items-center gap-1">
      <IconButton
        intent="gray-subtle"
        className="rounded-full"
        aria-label={t`Previous day`}
        icon={<BiChevronLeft className="rtl:-scale-x-100" />}
        onClick={() => moveDay(-1)}
      />
      <TextInput
        type="date"
        size="sm"
        aria-label={t`Guide date`}
        fieldClass="w-36"
        style={{ colorScheme: 'dark' }}
        value={day}
        onValueChange={(value) => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            setDay(value);
            setInspecting(null);
          }
        }}
      />
      <IconButton
        intent="gray-subtle"
        className="rounded-full"
        aria-label={t`Next day`}
        icon={<BiChevronRight className="rtl:-scale-x-100" />}
        onClick={() => moveDay(1)}
      />
      {day !== dayKey() && (
        <Button
          intent="gray-link"
          size="sm"
          onClick={() => {
            setDay(dayKey());
            setInspecting(null);
          }}
        >
          <Trans>Today</Trans>
        </Button>
      )}
    </div>
  );
  // eslint-disable-next-line lingui/no-unlocalized-strings -- ISO timestamp
  const guideDay = new Date(`${day}T12:00:00`);
  const datePicker = (
    <Popover
      align="end"
      className="w-auto max-w-[calc(100vw-2rem)] rounded-xl bg-[--paper] p-3"
      trigger={
        <Button
          size="sm"
          intent="gray-subtle"
          className="rounded-full"
          aria-label={t`Guide date`}
          leftIcon={<BiCalendar />}
        >
          {guideDay.toLocaleDateString(formatLocale(), {
            day: 'numeric',
            month: 'short',
          })}
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="text-sm font-semibold">
          <Trans>Guide date</Trans>
        </p>
        {dateTools}
      </div>
    </Popover>
  );
  if (!allowed)
    return (
      <PageBody>
        <h1 className="text-3xl font-bold">
          <Trans>Live TV</Trans>
        </h1>
        <p className="text-[--muted]">
          <Trans>Live TV is not available for this server or account.</Trans>
        </p>
      </PageBody>
    );
  return (
    <PageBody>
      <div className="space-y-8" data-ui="live-tv-workspace">
        <h1 data-ui="page-title" className="text-3xl font-bold">
          <Trans>Live TV</Trans>
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs<'channels' | 'recordings'>
            name="live-tv-section"
            options={[
              { value: 'channels', label: t`Live channels` },
              { value: 'recordings', label: t`Recordings` },
            ]}
            value={tab}
            onChange={setTab}
          />
          <Button
            intent="gray-subtle"
            size="sm"
            className="rounded-full"
            onClick={() => {
              void channels.refetch();
              if (selected) void guide.refetch();
            }}
            disabled={channels.isFetching}
            leftIcon={<BiRefresh />}
          >
            <Trans>Refresh</Trans>
          </Button>
        </div>
        {tab === 'recordings' ? (
          <LiveRecordings />
        ) : channels.isLoading ? (
          <div className="space-y-4" role="status">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-5 w-48" />
            <p>
              <Trans>Loading channels…</Trans>
            </p>
          </div>
        ) : channels.error ? (
          <LuffyError
            title={
              channels.error instanceof JellyfinError &&
              channels.error.status === 403
                ? t`Your account does not have permission to watch Live TV.`
                : t`Channels could not be loaded. Check your connection and try again.`
            }
          >
            <Button
              intent="gray-outline"
              className="mt-4 rounded-full"
              onClick={() => void channels.refetch()}
            >
              <Trans>Try again</Trans>
            </Button>
          </LuffyError>
        ) : !all.length ? (
          <p className="text-[--muted]">
            <Trans>
              No channels are available. Check Live TV in your Jellyfin server.
            </Trans>
          </p>
        ) : (
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 space-y-8 pe-4 lg:pe-10">
              {selected && display && (
                <section
                  data-ui="live-tv-showcase"
                  data-artwork={!!art.length}
                  aria-label={selected.Name ?? t`Selected channel`}
                  className={cn(
                    'relative isolate',
                    art.length
                      ? 'flex min-h-[26rem] flex-col justify-end overflow-hidden sm:min-h-[30rem]'
                      : 'py-3'
                  )}
                >
                  {!!art.length && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -z-[1]"
                    >
                      <BackdropFrame className="max-w-[calc(30rem*2.6)]">
                        <CachedImage
                          src={art[0]}
                          alt=""
                          data-ui="hero-backdrop"
                          className="absolute inset-0 h-full w-full object-cover object-top"
                          onError={() =>
                            setFailedArt((old) => [...old.slice(-20), art[0]])
                          }
                        />
                      </BackdropFrame>
                      <HeroShade />
                    </div>
                  )}
                  <div
                    data-ui="hero-content"
                    className="relative max-w-3xl space-y-4 py-3"
                    key={`${selected.Id}:${shown?.Id ?? ''}`}
                  >
                    <HeroDetails
                      item={display}
                      heading="h2"
                      actions={false}
                      overviewClass="line-clamp-2 sm:line-clamp-3 sm:text-base"
                      metadata={
                        <HeroMeta
                          parts={[
                            [
                              'channel',
                              <span className="inline-flex items-center gap-2">
                                <ChannelLogo channel={selected} />
                                <span>{selected.Name}</span>
                              </span>,
                            ],
                            ['time', shown ? timeRange(shown) : null],
                            [
                              'state',
                              shownLive
                                ? t`Live`
                                : shown?.StartDate
                                  ? new Date(
                                      shown.StartDate
                                    ).toLocaleDateString(formatLocale())
                                  : null,
                            ],
                          ]}
                        />
                      }
                    />
                    <div
                      data-ui="hero-actions"
                      className="flex flex-wrap items-center gap-2"
                    >
                      {!inspecting || shownLive ? (
                        <Button
                          intent="white"
                          className="rounded-full"
                          leftIcon={<BiPlay className="text-xl" />}
                          onClick={() => watch(selected)}
                        >
                          <Trans>Watch live</Trans>
                        </Button>
                      ) : (
                        <>
                          {shown && recordControl(shown)}
                          <Button
                            intent="gray-outline"
                            className="rounded-full"
                            onClick={() => setInspecting(null)}
                          >
                            <Trans>Return to live</Trans>
                          </Button>
                        </>
                      )}
                      <Tooltip
                        trigger={
                          <IconButton
                            intent="gray-subtle"
                            className="rounded-full"
                            icon={<BiHeart />}
                            aria-label={
                              selected.UserData?.IsFavorite
                                ? t`Remove favorite`
                                : t`Add favorite`
                            }
                            disabled={actions.favorite.isPending}
                            onClick={() =>
                              actions.favorite.mutate(selected, {
                                onError: fail,
                              })
                            }
                          />
                        }
                      >
                        {selected.UserData?.IsFavorite ? (
                          <Trans>Remove favorite</Trans>
                        ) : (
                          <Trans>Add favorite</Trans>
                        )}
                      </Tooltip>
                    </div>
                    {shownLive && shown && (
                      <div className="flex max-w-sm items-center gap-3 pt-2">
                        <div
                          role="progressbar"
                          aria-label={t`Current program progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(
                            programProgress(shown, now) * 100
                          )}
                          className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/15"
                        >
                          <span
                            className="block h-full bg-white/70"
                            style={{
                              width: `${programProgress(shown, now) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-[--muted]">
                          {plural(minutesLeft, {
                            one: '# minute left',
                            other: '# minutes left',
                          })}
                        </span>
                      </div>
                    )}
                    <Button
                      intent="gray-outline"
                      className="rounded-full xl:hidden"
                      leftIcon={<BiTv />}
                      onClick={browseChannels}
                    >
                      <Trans>Channels</Trans>
                    </Button>
                  </div>
                </section>
              )}
              <section aria-label={t`Program guide`}>
                {guide.error || (!guide.isLoading && !programs.length) ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold sm:text-xl">
                        <Trans>Program guide</Trans>
                      </h2>
                      {datePicker}
                    </div>
                    <p
                      role={guide.error ? 'alert' : undefined}
                      className="text-sm text-[--muted]"
                    >
                      {guide.error ? (
                        <Trans>
                          The program guide could not be loaded. You can still
                          watch the channel.
                        </Trans>
                      ) : (
                        <Trans>
                          No guide data for this day. You can still watch the
                          channel.
                        </Trans>
                      )}
                    </p>
                  </div>
                ) : (
                  <MediaRow
                    key={`${selected?.Id}:${day}`}
                    id={`live-guide:${selected?.Id}:${day}`}
                    title={t`Program guide`}
                    shape="wide"
                    loading={guide.isLoading}
                    action={datePicker}
                    startIndex={Math.max(
                      0,
                      programs.findIndex((program) =>
                        programOnNow(program, now)
                      )
                    )}
                  >
                    {programs.map((program) => {
                      const images = landscapeUrls(client, program, {
                        maxWidth: 640,
                      });
                      const live = programOnNow(program, now);
                      return (
                        <div
                          key={program.Id}
                          className="space-y-3"
                          data-ui="live-tv-program"
                          data-current={live}
                        >
                          {images.length ? (
                            <WideCard
                              image={images}
                              title={program.Name ?? ''}
                              subtitle={timeRange(program)}
                              onClick={() => setInspecting(program)}
                              unavailable={!live}
                              progress={
                                live
                                  ? programProgress(program, now) * 100
                                  : null
                              }
                            />
                          ) : (
                            <button
                              type="button"
                              data-ui="live-tv-program-details"
                              onClick={() => setInspecting(program)}
                              className="group block w-full space-y-2 rounded-lg py-2 text-start"
                            >
                              <span className="block text-xs text-[--muted]">
                                {timeRange(program)}
                                {live && (
                                  <span className="ms-2 text-gray-200">
                                    <Trans>On now</Trans>
                                  </span>
                                )}
                              </span>
                              <span className="block truncate font-semibold group-hover:text-white">
                                {program.Name}
                              </span>
                              {program.Overview && (
                                <span className="line-clamp-2 text-sm text-[--muted]">
                                  {program.Overview.replace(/<[^>]*>/g, '')}
                                </span>
                              )}
                            </button>
                          )}
                          {recordControl(program)}
                        </div>
                      );
                    })}
                  </MediaRow>
                )}
                {guide.isLoading && (
                  <span role="status" className="sr-only">
                    <Trans>Loading guide…</Trans>
                  </span>
                )}
              </section>
            </div>
            <aside
              aria-label={t`Channels`}
              className="min-w-0 space-y-4 xl:sticky xl:top-8 xl:border-s xl:border-white/10 xl:ps-6"
            >
              <div className="flex items-center justify-between gap-3">
                <h2
                  ref={channelTitle}
                  tabIndex={-1}
                  className="scroll-mt-6 text-lg font-semibold sm:text-xl"
                >
                  <Trans>Channels</Trans>
                </h2>
                <span className="text-xs text-[--muted]">
                  {all.length.toLocaleString(formatLocale())}
                </span>
              </div>
              <TextInput
                type="search"
                aria-label={t`Search channels`}
                placeholder={t`Search channels`}
                value={search}
                onValueChange={setSearch}
                leftIcon={<BiSearch className="text-xl" />}
              />
              <PillTabs<boolean>
                name="live-tv-filter"
                options={[
                  { value: false, label: t`All channels` },
                  { value: true, label: t`Favourites` },
                ]}
                value={favorites}
                onChange={setFavorites}
              />
              {genres.length > 1 && (
                <select
                  aria-label={t`Channel category`}
                  value={genre}
                  onChange={(event) => setGenre(event.target.value)}
                  className="max-w-full rounded-lg bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="">{t`All categories`}</option>
                  {genres.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              )}
              <div
                ref={list}
                role="group"
                aria-label={t`Choose a channel`}
                className="relative max-h-[24rem] space-y-1 overflow-y-auto overscroll-contain p-1 xl:max-h-[calc(100dvh-21rem)]"
              >
                {filtered.map((channel) => {
                  const label = channelLabel(channel);
                  const channelName = channel.Name ?? label.title;
                  const quality =
                    label.quality.find((value) => value.endsWith('p')) ??
                    label.quality[0];
                  const active = channel.Id === selected?.Id;
                  const onNow = programOnNow(channel.CurrentProgram, now)
                    ? channel.CurrentProgram
                    : undefined;
                  return (
                    <div
                      key={channel.Id}
                      data-selected={active}
                      className={cn(
                        'group flex items-center rounded-lg transition-colors hover:bg-white/[0.04]',
                        active && 'bg-white/[0.06]'
                      )}
                    >
                      <button
                        type="button"
                        data-ui="live-tv-channel-select"
                        aria-pressed={active}
                        title={channel.Name ?? ''}
                        onClick={() => select(channel)}
                        onDoubleClick={() => watch(channel)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-3 text-start"
                      >
                        <ChannelLogo channel={channel} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {label.title}
                          </span>
                          {onNow?.Name && (
                            <span className="mt-1 block truncate text-xs text-[--muted]">
                              {onNow.Name}
                            </span>
                          )}
                        </span>
                        <span className="text-xs tabular-nums text-[--muted]">
                          {quality ?? channel.ChannelNumber}
                        </span>
                      </button>
                      <IconButton
                        intent="gray-basic"
                        size="sm"
                        className="me-1 shrink-0 rounded-full opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                        aria-label={t`Watch ${channelName}`}
                        icon={<BiPlay />}
                        onClick={() => watch(channel)}
                      />
                    </div>
                  );
                })}
                {!filtered.length && (
                  <p className="py-4 text-sm text-[--muted]">
                    <Trans>No channels match your search or filter.</Trans>
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </PageBody>
  );
}

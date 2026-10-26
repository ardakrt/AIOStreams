import { plural, t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import React from 'react';
import {
  BiChevronLeft,
  BiChevronRight,
  BiHeart,
  BiPlay,
  BiRefresh,
  BiSearch,
  BiTimeFive,
} from 'react-icons/bi';
import { Button } from '@aiostreams/ui/button';
import { cn } from '@aiostreams/ui/core/styling';
import { toast } from 'sonner';
import { PageBody } from '../components/layout';
import { useSession } from '../lib/session';
import { JellyfinError } from '../lib/client';
import { formatLocale } from '../lib/i18n';
import { landscapeUrls, posterUrl } from '../lib/images';
import { navigate, to } from '../lib/paths';
import { storage } from '../lib/storage';
import { useAction } from '../lib/input';
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
import './live-tv.css';

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
  const url = posterUrl(client, channel, { maxWidth: large ? 480 : 120 });
  const [failed, setFailed] = React.useState<string>();
  const label = channelLabel(channel).title;
  return (
    <span className={cn('live-tv-logo', large && 'live-tv-logo-large')}>
      {url && failed !== url ? (
        <img
          src={url}
          alt=""
          loading={large ? 'eager' : 'lazy'}
          className="h-full w-full object-contain"
          onError={() => setFailed(url)}
        />
      ) : (
        <span aria-hidden className="live-tv-logo-initials">
          {large
            ? label
            : label
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => word[0])
                .join('')}
        </span>
      )}
    </span>
  );
}

function StageImage({
  urls,
  onFailure,
}: {
  urls: string[];
  onFailure(url: string): void;
}) {
  const url = urls[0];
  return url ? (
    <div className="live-tv-stage-art" aria-hidden>
      <img src={url} alt="" onError={() => onFailure(url)} />
      <div className="live-tv-stage-shade" />
    </div>
  ) : null;
}

function LiveBadge() {
  return (
    <span className="live-tv-live-badge">
      <span aria-hidden />
      <Trans>Live</Trans>
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
  const [day, setDay] = React.useState(dayKey);
  const [now, setNow] = React.useState(Date.now);
  const list = React.useRef<HTMLDivElement>(null);
  const schedule = React.useRef<HTMLOListElement>(null);
  const scrollGuide = (direction: number) => {
    const strip = schedule.current;
    if (!strip || document.activeElement !== strip) return false;
    strip.scrollBy({
      left: direction * Math.max(240, strip.clientWidth * 0.75),
    });
    return true;
  };
  useAction('nav.left', () => scrollGuide(-1));
  useAction('nav.right', () => scrollGuide(1));
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
  const filtered = React.useMemo(
    () =>
      all.filter(
        (c) =>
          (!favorites || c.UserData?.IsFavorite) &&
          (!genre || c.Genres?.includes(genre)) &&
          channelSearch(`${c.Name} ${c.ChannelNumber ?? ''}`).includes(
            channelSearch(search)
          )
      ),
    [all, favorites, genre, search]
  );
  // Filtering the rail does not discard what the viewer is considering.
  const selected =
    all.find((c) => c.Id === selectedId) ?? filtered[0] ?? all[0];
  const select = (channel: BaseItemDto) => {
    setSelectedId(channel.Id);
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
  const next = programs.find((p) => Date.parse(p.StartDate ?? '') > now);
  const minutesLeft = current ? programRemaining(current, now) : 0;
  const canRecord = user.Policy?.EnableLiveTvManagement === true;
  const art = current
    ? landscapeUrls(client, current, { maxWidth: 1600 }).filter(
        (url) => !failedArt.includes(url)
      )
    : [];
  const fail = () => toast.error(t`The change could not be saved. Try again.`);
  const watch = (channel: BaseItemDto) => {
    select(channel);
    navigate(to.livePlay(channel.Id!));
  };
  React.useEffect(() => {
    const rail = list.current;
    // eslint-disable-next-line lingui/no-unlocalized-strings -- DOM selector
    const row = rail?.querySelector<HTMLElement>('[data-selected="true"]');
    if (!rail || !row) return;
    if (
      row.offsetTop < rail.scrollTop ||
      row.offsetTop + row.offsetHeight > rail.scrollTop + rail.clientHeight
    )
      rail.scrollTop = Math.max(0, row.offsetTop - rail.clientHeight / 3);
  }, [selected?.Id]);
  React.useEffect(() => {
    const strip = schedule.current;
    const card = strip?.querySelector<HTMLElement>('[data-current="true"]');
    if (strip)
      strip.scrollLeft = card
        ? Math.max(0, card.offsetLeft - strip.offsetLeft)
        : 0;
  }, [selected?.Id, day, guide.data]);
  const recordControl = (program: BaseItemDto) => {
    if (!canRecord || Date.parse(program.EndDate ?? '') <= now) return null;
    const timer = timers.data?.Items?.find(
      (v) => v.ProgramId === program.Id && v.Status !== 'Cancelled'
    );
    return (
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
  };
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
      <div className="live-tv-shell" data-ui="live-tv-workspace">
        <header className="live-tv-header">
          <div className="live-tv-heading">
            <h1>
              <Trans>Live TV</Trans>
            </h1>
            <nav aria-label={t`Live TV sections`}>
              <button
                type="button"
                aria-pressed={tab === 'channels'}
                onClick={() => setTab('channels')}
              >
                <Trans>Live channels</Trans>
              </button>
              <button
                type="button"
                aria-pressed={tab === 'recordings'}
                onClick={() => setTab('recordings')}
              >
                <Trans>Recordings</Trans>
              </button>
            </nav>
          </div>
          <div className="live-tv-header-tools">
            <time
              className="live-tv-clock"
              dateTime={new Date(now).toISOString()}
            >
              <BiTimeFive aria-hidden />
              {new Date(now).toLocaleTimeString(formatLocale(), {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
            <Button
              intent="gray-outline"
              size="sm"
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
        </header>
        {tab === 'recordings' ? (
          <div className="live-tv-recordings">
            <LiveRecordings />
          </div>
        ) : channels.isLoading ? (
          <div className="live-tv-loading" role="status">
            <span className="live-tv-loading-block" />
            <p>
              <Trans>Loading channels…</Trans>
            </p>
          </div>
        ) : channels.error ? (
          <div role="alert" className="live-tv-message">
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
          <div className="live-tv-message">
            <p>
              <Trans>
                No channels are available. Check Live TV in your Jellyfin
                server.
              </Trans>
            </p>
          </div>
        ) : (
          <div className="live-tv-body">
            <div className="live-tv-main">
              {selected && (
                <section
                  className={cn(
                    'live-tv-stage',
                    art.length > 0 && 'live-tv-stage-with-art'
                  )}
                  aria-label={selected.Name ?? t`Selected channel`}
                  data-ui="live-tv-showcase"
                >
                  <div className="live-tv-stage-brand" aria-hidden>
                    <ChannelLogo channel={selected} large />
                  </div>
                  <StageImage
                    key={current?.Id ?? selected.Id}
                    urls={art}
                    onFailure={(url) =>
                      setFailedArt((old) => [...old.slice(-20), url])
                    }
                  />
                  <div className="live-tv-stage-body" key={selected.Id}>
                    <div className="live-tv-stage-channel">
                      <ChannelLogo channel={selected} />
                      <span>{selected.Name}</span>
                      {current && <LiveBadge />}
                    </div>
                    <h2 className="live-tv-program-title">
                      {current?.Name ?? channelLabel(selected).title}
                    </h2>
                    <div className="live-tv-program-meta">
                      {current ? (
                        <>
                          <span>{timeRange(current)}</span>
                          {current.Genres?.slice(0, 2).map((value) => (
                            <span key={value}>{value}</span>
                          ))}
                        </>
                      ) : (
                        <span>
                          <Trans>Program information unavailable</Trans>
                        </span>
                      )}
                    </div>
                    {current?.Overview && (
                      <p className="live-tv-synopsis">
                        {current.Overview.replace(/<[^>]*>/g, '')}
                      </p>
                    )}
                    <div className="live-tv-stage-actions">
                      <Button
                        intent="white"
                        size="lg"
                        leftIcon={<BiPlay />}
                        onClick={() => watch(selected)}
                      >
                        <Trans>Watch live</Trans>
                      </Button>
                      <button
                        type="button"
                        className="live-tv-favorite-action"
                        aria-label={
                          selected.UserData?.IsFavorite
                            ? t`Remove favorite`
                            : t`Add favorite`
                        }
                        aria-pressed={!!selected.UserData?.IsFavorite}
                        title={
                          selected.UserData?.IsFavorite
                            ? t`Remove favorite`
                            : t`Add favorite`
                        }
                        disabled={actions.favorite.isPending}
                        onClick={() =>
                          actions.favorite.mutate(selected, { onError: fail })
                        }
                      >
                        <BiHeart aria-hidden />
                      </button>
                    </div>
                    {current && (
                      <div className="live-tv-stage-progress">
                        <div
                          role="progressbar"
                          aria-label={t`Current program progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(
                            programProgress(current, now) * 100
                          )}
                        >
                          <span
                            style={{
                              width: `${programProgress(current, now) * 100}%`,
                            }}
                          />
                        </div>
                        <span>
                          {plural(minutesLeft, {
                            one: '# minute left',
                            other: '# minutes left',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              )}
              {next && (
                <div className="live-tv-next">
                  <div>
                    <span className="live-tv-next-label">
                      <Trans>Up next</Trans>
                    </span>
                    <time>{timeRange(next)}</time>
                  </div>
                  <p>{next.Name}</p>
                </div>
              )}
              <section aria-label={t`Program guide`} className="live-tv-guide">
                <div className="live-tv-guide-header">
                  <h2>
                    <Trans>Program guide</Trans>
                  </h2>
                  <div className="live-tv-date-tools">
                    <button
                      type="button"
                      aria-label={t`Previous day`}
                      onClick={() => moveDay(-1)}
                    >
                      <BiChevronLeft className="rtl:-scale-x-100" />
                    </button>
                    <input
                      type="date"
                      aria-label={t`Guide date`}
                      value={day}
                      onChange={(e) => {
                        if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))
                          setDay(e.target.value);
                      }}
                    />
                    <button
                      type="button"
                      aria-label={t`Next day`}
                      onClick={() => moveDay(1)}
                    >
                      <BiChevronRight className="rtl:-scale-x-100" />
                    </button>
                    {day !== dayKey() && (
                      <button
                        type="button"
                        className="live-tv-today"
                        onClick={() => setDay(dayKey())}
                      >
                        <Trans>Today</Trans>
                      </button>
                    )}
                  </div>
                </div>
                {guide.isLoading ? (
                  <p role="status" className="live-tv-guide-notice">
                    <Trans>Loading guide…</Trans>
                  </p>
                ) : guide.error ? (
                  <p role="alert" className="live-tv-guide-notice">
                    <Trans>
                      The program guide could not be loaded. You can still watch
                      the channel.
                    </Trans>
                  </p>
                ) : !programs.length ? (
                  <p className="live-tv-guide-notice">
                    <Trans>
                      No guide data for this day. You can still watch the
                      channel.
                    </Trans>
                  </p>
                ) : (
                  <ol
                    ref={schedule}
                    className="live-tv-schedule"
                    tabIndex={0}
                    aria-label={t`Browse program guide`}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'Home' || event.key === 'End') {
                        event.preventDefault();
                        event.currentTarget.scrollLeft =
                          event.key === 'Home'
                            ? 0
                            : event.currentTarget.scrollWidth;
                      }
                    }}
                  >
                    {programs.map((program) => {
                      const live = programOnNow(program, now);
                      const past = Date.parse(program.EndDate ?? '') <= now;
                      return (
                        <li
                          key={program.Id}
                          className={cn(
                            'live-tv-program',
                            live && 'live-tv-program-current',
                            past && 'live-tv-program-past'
                          )}
                          data-current={live}
                        >
                          <div className="live-tv-program-time">
                            <time>{timeRange(program)}</time>
                            {live && (
                              <span>
                                <Trans>On now</Trans>
                              </span>
                            )}
                          </div>
                          <h3>{program.Name}</h3>
                          {program.Overview && (
                            <p>{program.Overview.replace(/<[^>]*>/g, '')}</p>
                          )}
                          <div className="live-tv-program-action">
                            {recordControl(program)}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </div>
            <aside className="live-tv-rail" aria-label={t`Channels`}>
              <div className="live-tv-rail-header">
                <h2>
                  <Trans>Channels</Trans>
                </h2>
                <span>{all.length.toLocaleString(formatLocale())}</span>
              </div>
              <div className="live-tv-search">
                <BiSearch aria-hidden />
                <input
                  aria-label={t`Search channels`}
                  placeholder={t`Search channels`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="search"
                />
              </div>
              <div
                className="live-tv-channel-filters"
                role="group"
                aria-label={t`Channel filters`}
              >
                <button
                  type="button"
                  aria-pressed={!favorites}
                  onClick={() => setFavorites(false)}
                >
                  <Trans>All channels</Trans>
                </button>
                <button
                  type="button"
                  aria-pressed={favorites}
                  onClick={() => setFavorites(true)}
                >
                  <BiHeart aria-hidden />
                  <Trans>Favourites</Trans>
                </button>
                {genres.length > 1 && (
                  <select
                    aria-label={t`Channel category`}
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                  >
                    <option value="">{t`All categories`}</option>
                    {genres.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div
                className="live-tv-rail-list"
                ref={list}
                role="group"
                aria-label={t`Choose a channel`}
              >
                {filtered.map((channel) => {
                  const label = channelLabel(channel);
                  const quality =
                    label.quality.find((value) => value.endsWith('p')) ??
                    label.quality[0];
                  const channelName = channel.Name ?? label.title;
                  const active = channel.Id === selected?.Id;
                  const onNow = programOnNow(channel.CurrentProgram, now)
                    ? channel.CurrentProgram
                    : undefined;
                  return (
                    <div
                      key={channel.Id}
                      className="live-tv-channel"
                      data-selected={active}
                    >
                      <button
                        type="button"
                        data-ui="live-tv-channel-select"
                        aria-pressed={active}
                        title={channel.Name ?? ''}
                        onClick={() => select(channel)}
                        onDoubleClick={() => watch(channel)}
                      >
                        <span className="live-tv-channel-number">
                          {channel.ChannelNumber}
                        </span>
                        <ChannelLogo channel={channel} />
                        <span className="live-tv-channel-copy">
                          <span className="live-tv-channel-name">
                            {label.title}
                          </span>
                          {onNow?.Name && (
                            <span className="live-tv-channel-program">
                              {onNow.Name}
                            </span>
                          )}
                        </span>
                        <span className="live-tv-channel-quality">
                          {quality && <span>{quality}</span>}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="live-tv-quick-play"
                        aria-label={t`Watch ${channelName}`}
                        onClick={() => watch(channel)}
                      >
                        <BiPlay aria-hidden />
                      </button>
                      {active && onNow && (
                        <span
                          aria-hidden
                          className="live-tv-channel-progress"
                          style={{
                            width: `${programProgress(onNow, now) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
                {!filtered.length && (
                  <p className="live-tv-filter-empty">
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

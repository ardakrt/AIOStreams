import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BiArrowBack,
  BiChevronLeft,
  BiChevronRight,
  BiFullscreen,
  BiPause,
  BiPlay,
  BiRefresh,
  BiVolumeFull,
  BiVolumeMute,
} from 'react-icons/bi';
import { Button } from '@aiostreams/ui/button';
import { cn } from '@aiostreams/ui/core/styling';
import { useSession } from '../lib/session';
import { currentHost } from '../lib/hosts';
import { navigate, to } from '../lib/paths';
import {
  LiveReporter,
  openChannel,
  type LivePlayback,
} from '../lib/live-tv/api';
import { useChannels, useLiveTvAllowed } from '../lib/live-tv/queries';
import { usePlayer } from '../lib/playback/use-player';
import { useNowPlaying } from '../lib/playback/now-playing';
import { useAction } from '../lib/input';
import { videoEngine } from '../lib/playback/video';
import {
  toggleDocumentFullscreen,
  usePlayerFullscreen,
} from '../lib/playback/fullscreen';
import { usePlaybackPrefs } from '../lib/user-config';
import { settings, useSetting } from '../lib/settings';
import { indexForTrack } from '../lib/remote/tracks';
import type { BaseItemDto } from '../lib/types';
import { usePlayerPage } from './player';
import { timeRange } from './live-tv';

// A channel change waits for the previous consumer to release its tuner.
let handoff: Promise<unknown> = Promise.resolve();

export function LivePlayerPage({ channelId }: { channelId: string }) {
  const { client, user } = useSession();
  const allowed = useLiveTvAllowed();
  const [attempt, setAttempt] = React.useState(0);
  const [transcode, setTranscode] = React.useState(false);
  const [ready, setReady] = React.useState<{
    channelId: string;
    attempt: number;
    playback: LivePlayback;
  }>();
  const [failed, setFailed] = React.useState(false);
  const failures = React.useRef(0);
  React.useEffect(() => {
    failures.current = 0;
  }, [channelId]);
  const finish = React.useRef<(() => Promise<void>) | null>(null);
  const channels = useChannels();
  const channel = useQuery({
    queryKey: ['jf', client.base, user.Id, 'live-channel', channelId],
    queryFn: ({ signal }) =>
      client.get<BaseItemDto>(
        `/LiveTv/Channels/${encodeURIComponent(channelId)}`,
        { UserId: user.Id },
        signal
      ),
    enabled: allowed,
    staleTime: 30_000,
  });
  // Channel details refresh in parallel; cached list metadata is enough to play.
  const channelItem =
    channel.data ?? channels.data?.find((item) => item.Id === channelId);
  const prefs = usePlaybackPrefs();
  usePlayerPage();
  usePlayerFullscreen(true);
  React.useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    let pageHidden = false;
    setFailed(false);
    const pending = handoff
      .catch(() => {})
      .then(async () => {
        if (cancelled) return;
        const playback = await openChannel(
          client,
          user.Id!,
          channelId,
          !!currentHost().player,
          transcode
        );
        if (!cancelled) setReady({ channelId, attempt, playback });
        return playback;
      });
    handoff = pending.catch(() => {});
    void pending.catch(() => {
      if (!cancelled) setFailed(true);
    });
    const release = () => {
      cancelled = true;
      const stop = finish.current;
      finish.current = null;
      handoff = pending
        .then(async (playback) => {
          if (stop) await stop();
          else await playback?.close();
        })
        .catch(() => {});
    };
    const onHide = () => {
      if (!pageHidden) {
        pageHidden = true;
        // Do not defer the keepalive close until a stop response arrives during unload.
        void pending.then((playback) => playback?.close()).catch(() => {});
        release();
      }
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      if (!pageHidden) release();
    };
  }, [client, user.Id, channelId, attempt, allowed, transcode]);
  const playback =
    ready?.channelId === channelId && ready.attempt === attempt
      ? ready.playback
      : undefined;
  const reconnect = React.useCallback(() => setAttempt((n) => n + 1), []);
  const autoReconnect = React.useCallback(() => {
    failures.current++;
    setAttempt((n) => n + 1);
  }, []);
  const back = () => navigate(to.liveTv, { replace: true });
  if (!allowed || failed || (channel.error && !channelItem))
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black p-6">
        <div role="alert" className="max-w-md space-y-5 text-center">
          <h1 className="text-xl font-semibold">
            <Trans>The live channel could not be opened.</Trans>
          </h1>
          <p className="text-sm text-white/65">
            <Trans>
              Check your connection and Live TV permission. The tuner may also
              be in use.
            </Trans>
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button intent="gray-outline" onClick={back}>
              <Trans>Back to channels</Trans>
            </Button>
            {allowed && (
              <Button intent="white" onClick={reconnect}>
                <Trans>Try again</Trans>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  if (!playback || !channelItem || prefs.isLoading)
    return (
      <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black">
        <p role="status">
          <Trans>Opening live channel…</Trans>
        </p>
        <Button intent="gray-outline" onClick={back}>
          <Trans>Back to channels</Trans>
        </Button>
      </div>
    );
  return (
    <LiveVideo
      key={`${channelId}:${attempt}:${transcode}`}
      item={channelItem}
      playback={playback}
      prefs={prefs.prefs}
      finish={finish}
      reconnect={reconnect}
      transcode={() => {
        setTranscode(true);
        reconnect();
      }}
      transcoding={transcode}
      autoReconnect={failures.current < 3 ? autoReconnect : undefined}
      channels={channels.data ?? []}
      back={back}
    />
  );
}

function LiveVideo({
  item,
  playback,
  prefs,
  finish,
  reconnect,
  autoReconnect,
  transcode,
  transcoding,
  channels,
  back,
}: {
  item: BaseItemDto;
  playback: LivePlayback;
  prefs: ReturnType<typeof usePlaybackPrefs>['prefs'];
  finish: React.RefObject<(() => Promise<void>) | null>;
  reconnect(): void;
  transcode(): void;
  transcoding: boolean;
  channels: BaseItemDto[];
  back(): void;
  autoReconnect?: () => void;
}) {
  const { client } = useSession();
  const video = React.useRef<HTMLVideoElement>(null);
  const [hostPlayer] = React.useState(() => currentHost().player);
  const [subtitleStyle] = useSetting(settings.subtitle.style);
  const [visible, setVisible] = React.useState(true);
  const [interrupted, setInterrupted] = React.useState(false);
  const [now, setNow] = React.useState(Date.now);
  const lastTouch = React.useRef(Date.now());
  const [retrying, setRetrying] = React.useState(false);
  const player = usePlayer(hostPlayer ?? videoEngine(video), {
    client,
    item,
    source: playback.source,
    url: playback.url,
    startMs: 0,
    live: true,
    onEnded: () => setInterrupted(true),
    onClosed: back,
    prefs,
    subtitleStyle,
  });
  const latest = React.useRef(player);
  latest.current = player;
  const reporter = React.useRef<LiveReporter | null>(null);
  // Install the cleanup before the first frame, so rapid channel changes also release.
  React.useEffect(() => {
    const stop = async () => {
      if (reporter.current) await reporter.current.stop();
      else await playback.close();
    };
    finish.current = stop;
    return () => {
      void stop();
    };
  }, [playback, finish]);
  React.useEffect(() => {
    if (!player.state.started || reporter.current) return;
    const report = new LiveReporter(client, item.Id!, playback, () => {
      const p = latest.current;
      return {
        paused: p.state.paused,
        audio: indexForTrack(
          playback.source.MediaStreams ?? [],
          p.audioTracks,
          'audio',
          p.state.audio
        ),
        subtitle: indexForTrack(
          playback.source.MediaStreams ?? [],
          p.subtitleTracks,
          'subtitle',
          p.state.subtitle
        ),
      };
    });
    reporter.current = report;
    report.start();
  }, [player.state.started, client, item.Id, playback]);
  React.useEffect(() => {
    // eslint-disable-next-line lingui/no-unlocalized-strings -- Jellyfin event names
    reporter.current?.progress(player.state.paused ? 'Pause' : 'Unpause');
  }, [player.state.paused]);
  React.useEffect(() => {
    reporter.current?.progress('AudioTrackChange');
  }, [player.state.audio]);
  React.useEffect(() => {
    reporter.current?.progress('SubtitleTrackChange');
  }, [player.state.subtitle]);
  React.useEffect(() => {
    const timer = setInterval(() => {
      reporter.current?.progress();
      setNow(Date.now());
    }, 10_000);
    return () => clearInterval(timer);
  }, []);
  const error = !!player.state.error || interrupted;
  React.useEffect(() => {
    if (player.state.paused || !player.state.waiting || error) return;
    const timer = setTimeout(() => setInterrupted(true), 25_000);
    return () => clearTimeout(timer);
  }, [player.state.paused, player.state.waiting, error]);
  React.useEffect(() => {
    if (!error || !autoReconnect) return;
    setRetrying(true);
    const timer = setTimeout(autoReconnect, 3000);
    return () => clearTimeout(timer);
  }, [error, autoReconnect]);
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (
        Date.now() - lastTouch.current > 5000 &&
        !latest.current.state.paused &&
        !error
      )
        setVisible(false);
    }, 1000);
    return () => clearInterval(timer);
  }, [error]);
  const wake = () => {
    lastTouch.current = Date.now();
    setVisible(true);
  };
  const at = channels.findIndex((c) => c.Id === item.Id);
  const change = React.useCallback(
    (direction: number) => {
      if (channels.length < 2) return;
      const channel =
        channels[
          (Math.max(0, at) + direction + channels.length) % channels.length
        ];
      navigate(to.livePlay(channel.Id!), { replace: true });
    },
    [channels, at]
  );
  useNowPlaying(item, player, {
    live: true,
    onStop: back,
    onNext: channels.length > 1 ? () => change(1) : undefined,
    onPrevious: channels.length > 1 ? () => change(-1) : undefined,
  });
  useAction('back', back);
  useAction('player.controls', () => {
    wake();
  });
  useAction('player.playPause', () => {
    wake();
    latest.current.togglePlay();
  });
  useAction('player.play', () => {
    wake();
    latest.current.setPaused(false);
  });
  useAction('player.pause', () => {
    wake();
    latest.current.setPaused(true);
  });
  useAction('player.stop', back);
  useAction('player.next', () => change(1));
  useAction('player.previous', () => change(-1));
  useAction('player.fullscreen', toggleDocumentFullscreen);
  React.useEffect(() => {
    const key = (e: KeyboardEvent) => {
      // eslint-disable-next-line lingui/no-unlocalized-strings -- DOM selectors
      if ((e.target as HTMLElement).matches('input,select,textarea')) return;
      if (e.key === 'Escape' || e.key === 'BrowserBack') {
        e.preventDefault();
        back();
      } else if (e.key === ' ' || e.key === 'MediaPlayPause') {
        if ((e.target as HTMLElement).closest('button')) return;
        e.preventDefault();
        latest.current.togglePlay();
      }
      // eslint-disable-next-line lingui/no-unlocalized-strings -- DOM keyboard codes
      else if (e.key === 'PageUp') {
        e.preventDefault();
        change(1);
      }
      // eslint-disable-next-line lingui/no-unlocalized-strings -- DOM keyboard codes
      else if (e.key === 'PageDown') {
        e.preventDefault();
        change(-1);
      } else if (e.key.toLowerCase() === 'f') toggleDocumentFullscreen();
      wake();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [back, change]);
  React.useEffect(() => {
    const awake = currentHost().keepAwake;
    if (!awake) return;
    awake(true);
    return () => awake(false);
  }, []);
  const current =
    channels.find((c) => c.Id === item.Id)?.CurrentProgram ??
    item.CurrentProgram;
  const currentProgram =
    current && Date.parse(current.EndDate ?? '') > now ? current : undefined;
  const control =
    'rounded-lg p-3 text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  return (
    <div
      data-page="live-player"
      className={cn('fixed inset-0', !visible && !error && 'cursor-none')}
      onPointerMove={wake}
      onPointerDown={wake}
      onFocusCapture={wake}
    >
      {!hostPlayer && (
        <video
          ref={video}
          autoPlay
          playsInline
          className="h-full w-full bg-black object-contain"
        />
      )}
      {!player.state.started && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <p role="status">
            <Trans>Opening live channel…</Trans>
          </p>
        </div>
      )}
      {player.state.waiting && player.state.started && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p role="status" className="rounded-lg bg-black/80 px-5 py-3">
            <Trans>Buffering…</Trans>
          </p>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="absolute inset-0 flex items-center justify-center bg-black/90 p-6"
        >
          <div className="max-w-md space-y-5 text-center">
            <h2 className="text-xl font-semibold">
              <Trans>The live stream was interrupted.</Trans>
            </h2>
            <p className="text-sm text-white/65">
              {retrying
                ? t`Reconnecting…`
                : t`Reconnect to return to the live broadcast.`}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button intent="white" onClick={reconnect}>
                <Trans>Reconnect</Trans>
              </Button>
              {!transcoding && (
                <Button intent="gray-outline" onClick={transcode}>
                  <Trans>Try server transcoding</Trans>
                </Button>
              )}
              <Button intent="gray-outline" onClick={back}>
                <Trans>Back to channels</Trans>
              </Button>
            </div>
          </div>
        </div>
      )}
      <div
        data-ui="player-controls"
        data-visible={visible || error ? '' : undefined}
        inert={!visible && !error}
        className={cn(
          'pointer-events-none absolute inset-0 flex flex-col justify-between transition-opacity duration-200 motion-reduce:transition-none [&>div]:pointer-events-auto',
          visible || error ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div
          data-ui="player-top-bar"
          className="flex items-start gap-4 bg-gradient-to-b from-black/90 to-transparent p-5 pb-16 pt-12 sm:p-8 sm:pt-12"
        >
          <button
            type="button"
            aria-label={t`Back to channels`}
            className={control}
            onClick={back}
          >
            <BiArrowBack className="h-6 w-6 rtl:-scale-x-100" />
          </button>
          <div className="min-w-0 pt-2">
            <h1 className="truncate text-xl font-semibold">{item.Name}</h1>
            {currentProgram && (
              <p className="mt-1 text-sm text-white/75">
                {currentProgram.Name} · {timeRange(currentProgram)}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-4 bg-gradient-to-t from-black/95 to-transparent px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-20 sm:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="me-2 inline-flex items-center gap-2 rounded bg-red-600 px-2 py-1 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <Trans>Live</Trans>
            </span>
            <span className="text-white/75">{currentProgram?.Name}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label={t`Previous channel`}
                className={control}
                disabled={channels.length < 2}
                onClick={() => change(-1)}
              >
                <BiChevronLeft className="h-6 w-6 rtl:-scale-x-100" />
              </button>
              <button
                type="button"
                aria-label={player.state.paused ? t`Play` : t`Pause`}
                className={control}
                onClick={player.togglePlay}
              >
                {player.state.paused ? (
                  <BiPlay className="h-7 w-7" />
                ) : (
                  <BiPause className="h-7 w-7" />
                )}
              </button>
              <button
                type="button"
                aria-label={t`Next channel`}
                className={control}
                disabled={channels.length < 2}
                onClick={() => change(1)}
              >
                <BiChevronRight className="h-6 w-6 rtl:-scale-x-100" />
              </button>
              <button
                type="button"
                aria-label={t`Return to live`}
                className={control}
                onClick={reconnect}
              >
                <BiRefresh className="h-6 w-6" />
              </button>
              <label className="sr-only" htmlFor="live-channel-select">
                <Trans>Choose a channel</Trans>
              </label>
              <select
                id="live-channel-select"
                value={item.Id}
                onChange={(e) =>
                  navigate(to.livePlay(e.target.value), { replace: true })
                }
                className="max-w-[min(65vw,240px)] rounded-lg bg-black/80 p-2.5 text-white focus-visible:outline"
              >
                {channels.map((channel) => (
                  <option key={channel.Id} value={channel.Id}>
                    {channel.ChannelNumber} {channel.Name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {player.audioTracks.length > 1 && (
                <select
                  aria-label={t`Audio track`}
                  value={player.state.audio ?? ''}
                  onChange={(e) => player.setAudio(e.target.value)}
                  className="max-w-40 rounded bg-black/80 p-2 text-sm text-white"
                >
                  {player.audioTracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.label}
                    </option>
                  ))}
                </select>
              )}
              {!!player.subtitleTracks.length && (
                <select
                  aria-label={t`Subtitles`}
                  value={player.state.subtitle ?? ''}
                  onChange={(e) => player.setSubtitle(e.target.value || null)}
                  className="max-w-40 rounded bg-black/80 p-2 text-sm text-white"
                >
                  <option value="">{t`Off`}</option>
                  {player.subtitleTracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.label}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                aria-label={player.state.muted ? t`Unmute` : t`Mute`}
                className={control}
                onClick={player.toggleMute}
              >
                {player.state.muted ? (
                  <BiVolumeMute className="h-6 w-6" />
                ) : (
                  <BiVolumeFull className="h-6 w-6" />
                )}
              </button>
              <input
                type="range"
                aria-label={t`Volume`}
                min={0}
                max={1}
                step={0.05}
                value={Math.min(
                  1,
                  player.state.muted ? 0 : player.state.volume
                )}
                onChange={(e) => player.setVolume(Number(e.target.value))}
                className="w-20 accent-white"
              />
              <button
                type="button"
                aria-label={t`Fullscreen`}
                className={control}
                onClick={toggleDocumentFullscreen}
              >
                <BiFullscreen className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

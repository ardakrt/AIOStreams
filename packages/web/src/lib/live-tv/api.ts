import type { JellyfinClient } from '../client';
import type {
  BaseItemDto,
  BaseItemDtoQueryResult,
  PlaybackInfoResponse,
  SourceInfo,
} from '../types';

export interface LiveTimer {
  Id?: string | null;
  ProgramId?: string | null;
  ChannelId?: string;
  ChannelName?: string | null;
  Name?: string | null;
  StartDate?: string;
  EndDate?: string;
  Status?: string;
}

/** Page through channels: server limits must not silently hide the rest. */
export async function fetchChannels(
  client: JellyfinClient,
  userId: string,
  signal?: AbortSignal
): Promise<BaseItemDto[]> {
  const items: BaseItemDto[] = [];
  for (;;) {
    const page = await client.get<BaseItemDtoQueryResult>(
      '/LiveTv/Channels',
      {
        UserId: userId,
        StartIndex: items.length,
        Limit: 200,
        AddCurrentProgram: true,
        EnableUserData: true,
        Fields: 'Overview,Genres',
        SortBy: 'ChannelNumber,SortName',
        SortOrder: 'Ascending',
      },
      signal
    );
    const next = page.Items ?? [];
    if (!next.length) break;
    items.push(...next);
    if (
      page.TotalRecordCount != null
        ? items.length >= page.TotalRecordCount
        : next.length < 200
    )
      break;
  }
  return items;
}

export function programProgress(
  program: BaseItemDto | null | undefined,
  now: number
): number {
  const start = Date.parse(program?.StartDate ?? '');
  const end = Date.parse(program?.EndDate ?? '');
  return Number.isFinite(start) && end > start
    ? Math.min(1, Math.max(0, (now - start) / (end - start)))
    : 0;
}

export function liveProfile(native: boolean) {
  return {
    MaxStreamingBitrate: 120_000_000,
    DirectPlayProfiles: native
      ? [{ Type: 'Video' }, { Type: 'Audio' }]
      : [
          {
            Type: 'Video',
            Container: 'mp4,m4v',
            VideoCodec: 'h264',
            AudioCodec: 'aac,mp3',
          },
        ],
    TranscodingProfiles: [
      {
        Type: 'Video',
        Context: 'Streaming',
        Protocol: 'hls',
        Container: 'ts',
        VideoCodec: 'h264',
        AudioCodec: 'aac',
        MaxAudioChannels: '2',
        MinSegments: 2,
        BreakOnNonKeyFrames: true,
      },
    ],
    SubtitleProfiles: [{ Format: 'vtt', Method: 'External' }],
  };
}

export interface LivePlayback {
  source: SourceInfo;
  playSessionId: string;
  url: string;
  method: 'DirectPlay' | 'DirectStream' | 'Transcode';
  /** Releases this consumer, including a transcode, exactly once. */
  close(): Promise<void>;
}

/** Use the server route, never a tuner path that may only exist on the server. */
export function liveUrl(
  client: JellyfinClient,
  itemId: string,
  source: SourceInfo,
  playSessionId: string
): Pick<LivePlayback, 'url' | 'method'> {
  if (source.SupportsDirectPlay || source.SupportsDirectStream) {
    const container = (source.Container ?? 'ts')
      .split(',')[0]
      .replace(/^mpegts$/, 'ts');
    return {
      url: client.url(
        `/Videos/${encodeURIComponent(itemId)}/stream.${/^[a-z0-9]+$/i.test(container) ? container : 'ts'}`,
        {
          Static: true,
          MediaSourceId: source.Id,
          LiveStreamId: source.LiveStreamId,
          PlaySessionId: playSessionId,
          DeviceId: client.deviceId,
          ApiKey: client.token,
        }
      ),
      method: source.SupportsDirectPlay ? 'DirectPlay' : 'DirectStream',
    };
  }
  if (source.SupportsTranscoding && source.TranscodingUrl) {
    const base = new URL(`${client.base}/`);
    const path = source.TranscodingUrl;
    const url = new URL(
      path.startsWith(base.pathname) ? path : path.replace(/^\//, ''),
      base
    );
    // Never send this account's token to a third-party URL returned by a server.
    if (url.origin !== new URL(client.base).origin)
      throw new Error('live-tv-invalid-stream');
    if (!url.searchParams.has('api_key') && !url.searchParams.has('ApiKey'))
      url.searchParams.set('ApiKey', client.token ?? '');
    url.searchParams.set('PlaySessionId', playSessionId);
    return { url: url.href, method: 'Transcode' };
  }
  throw new Error('live-tv-no-source');
}

/** Do not cancel an opening request: a late response still needs its tuner released. */
export async function openChannel(
  client: JellyfinClient,
  userId: string,
  itemId: string,
  native: boolean,
  transcode = false
): Promise<LivePlayback> {
  const profile = liveProfile(native && !transcode);
  const body = {
    UserId: userId,
    IsPlayback: true,
    // Let Jellyfin negotiate and open in one round trip; keep the explicit-open
    // fallback below for servers that still return an unopened source.
    AutoOpenLiveStream: true,
    EnableDirectPlay: native && !transcode,
    EnableDirectStream: native && !transcode,
    EnableTranscoding: true,
    DeviceProfile: profile,
  };
  const info = await client.post<PlaybackInfoResponse>(
    `/Items/${encodeURIComponent(itemId)}/PlaybackInfo`,
    body
  );
  let source = info.MediaSources?.find(
    (s) =>
      s.Type !== 'Placeholder' &&
      (s.RequiresOpening ||
        s.SupportsDirectPlay ||
        s.SupportsDirectStream ||
        s.TranscodingUrl)
  );
  const playSessionId =
    info.PlaySessionId || crypto.randomUUID().replaceAll('-', '');
  let closing: Promise<void> | undefined;
  const close = () =>
    (closing ??= (async () => {
      const jobs: Promise<unknown>[] = [];
      if (source?.LiveStreamId)
        jobs.push(
          client.request('POST', '/LiveStreams/Close', {
            query: { LiveStreamId: source.LiveStreamId },
            keepalive: true,
          })
        );
      if (source?.TranscodingUrl)
        jobs.push(
          client.request('DELETE', '/Videos/ActiveEncodings', {
            query: { DeviceId: client.deviceId, PlaySessionId: playSessionId },
            keepalive: true,
          })
        );
      await Promise.allSettled(jobs);
    })());
  try {
    if (!source || info.ErrorCode) throw new Error('live-tv-no-source');
    if (source.RequiresOpening && !source.LiveStreamId) {
      const opened = await client.post<{ MediaSource?: SourceInfo }>(
        '/LiveStreams/Open',
        {
          ...body,
          ItemId: itemId,
          OpenToken: source.OpenToken,
          PlaySessionId: playSessionId,
        }
      );
      source = opened.MediaSource;
    }
    if (!source) throw new Error('live-tv-no-source');
    return {
      source,
      playSessionId,
      ...liveUrl(client, itemId, source, playSessionId),
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}

/** Live reports carry LiveStreamId and never create an offline resume position. */
export class LiveReporter {
  private queue: Promise<unknown> = Promise.resolve();
  private stopped = false;
  private closing: Promise<void> | undefined;
  constructor(
    private client: JellyfinClient,
    private itemId: string,
    private playback: LivePlayback,
    private state: () => { paused: boolean; audio?: number; subtitle?: number }
  ) {}
  private send(path: string, extra: Record<string, unknown> = {}) {
    const body = {
      ItemId: this.itemId,
      MediaSourceId: this.playback.source.Id,
      LiveStreamId: this.playback.source.LiveStreamId,
      PlaySessionId: this.playback.playSessionId,
      CanSeek: false,
      PlayMethod: this.playback.method,
      PositionTicks: 0,
      IsPaused: this.state().paused,
      AudioStreamIndex: this.state().audio,
      SubtitleStreamIndex: this.state().subtitle,
      ...extra,
    };
    this.queue = this.queue
      .catch(() => {})
      .then(() => this.client.request('POST', path, { body, keepalive: true }));
    return this.queue;
  }
  start() {
    if (!this.stopped) void this.send('/Sessions/Playing').catch(() => {});
  }
  progress(event = 'TimeUpdate') {
    if (!this.stopped)
      void this.send('/Sessions/Playing/Progress', { EventName: event }).catch(
        () => {}
      );
  }
  stop(): Promise<void> {
    return (this.closing ??= this.finish());
  }
  private async finish() {
    this.stopped = true;
    try {
      await this.send('/Sessions/Playing/Stopped');
    } catch {
      /* Closing still releases the tuner. */
    } finally {
      await this.playback.close();
    }
  }
}

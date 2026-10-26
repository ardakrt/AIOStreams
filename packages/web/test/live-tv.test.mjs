import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const code = ts.transpileModule(
  readFileSync(new URL('../src/lib/live-tv/api.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }
).outputText;
const { fetchChannels, liveUrl, openChannel, LiveReporter, programProgress } =
  await import(
    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  );

function fake(respond) {
  const calls = [];
  const client = {
    base: 'https://example.test/jellyfin',
    token: 'fixture-secret',
    deviceId: 'fixture-device',
    url(path, query) {
      const url = new URL(this.base + path);
      for (const [k, v] of Object.entries(query ?? {}))
        if (v != null) url.searchParams.set(k, v);
      return url.href;
    },
    async request(method, path, init = {}) {
      calls.push({ method, path, ...init });
      return respond?.(method, path, init);
    },
    get(path, query, signal) {
      return this.request('GET', path, { query, signal });
    },
    post(path, body, query) {
      return this.request('POST', path, { body, query });
    },
  };
  return { client, calls };
}

test('all channels are fetched even when the server caps each page below the requested limit', async () => {
  const { client, calls } = fake((_, __, { query }) => ({
    Items: Array.from(
      { length: Math.min(100, 305 - query.StartIndex) },
      (_, n) => ({ Id: String(query.StartIndex + n) })
    ),
    TotalRecordCount: 305,
  }));
  assert.equal((await fetchChannels(client, 'user')).length, 305);
  assert.deepEqual(
    calls.map((c) => c.query.StartIndex),
    [0, 100, 200, 300]
  );
});

test('live direct streams use the authenticated server path and live session, never tuner localhost', () => {
  const { client } = fake();
  const source = {
    Id: 'source',
    Path: 'http://127.0.0.1:8096/private-tuner',
    Container: 'mpegts',
    LiveStreamId: 'live-1',
    SupportsDirectStream: true,
  };
  const stream = liveUrl(client, 'channel', source, 'play-1');
  const url = new URL(stream.url);
  assert.equal(url.pathname, '/jellyfin/Videos/channel/stream.ts');
  assert.equal(url.searchParams.get('LiveStreamId'), 'live-1');
  assert.equal(url.searchParams.get('PlaySessionId'), 'play-1');
  assert.equal(stream.method, 'DirectStream');
});

test('a required tuner is opened once, and concurrent close callers await the same release', async () => {
  let release;
  const wait = new Promise((r) => {
    release = r;
  });
  const { client, calls } = fake((_, path) => {
    if (path.endsWith('/PlaybackInfo'))
      return {
        PlaySessionId: 'p1',
        MediaSources: [{ Id: 's1', RequiresOpening: true, OpenToken: 'open' }],
      };
    if (path === '/LiveStreams/Open')
      return {
        MediaSource: {
          Id: 's1',
          LiveStreamId: 'l1',
          RequiresClosing: true,
          SupportsDirectPlay: true,
          Container: 'ts',
        },
      };
    if (path === '/LiveStreams/Close') return wait;
  });
  const session = await openChannel(client, 'user', 'channel', true);
  assert.equal(calls[0].body.AutoOpenLiveStream, false);
  assert.equal(calls[1].body.OpenToken, 'open');
  const a = session.close(),
    b = session.close();
  assert.equal(a, b);
  assert.equal(calls.filter((c) => c.path === '/LiveStreams/Close').length, 1);
  release();
  await a;
});

test('an invalid source is still closed after opening, and tokens never attach to third-party transcoding', async () => {
  const { client, calls } = fake((_, path) => {
    if (path.endsWith('/PlaybackInfo'))
      return {
        MediaSources: [{ Id: 's1', RequiresOpening: true, OpenToken: 'open' }],
      };
    if (path === '/LiveStreams/Open')
      return {
        MediaSource: {
          Id: 's1',
          LiveStreamId: 'l1',
          SupportsTranscoding: true,
          TranscodingUrl: 'https://other.test/steal',
        },
      };
  });
  await assert.rejects(
    openChannel(client, 'user', 'channel', true),
    /invalid-stream/
  );
  assert.ok(calls.some((c) => c.path === '/LiveStreams/Close'));
});

test('transcoding fallback is negotiated and stopped by its own play session', async () => {
  const { client, calls } = fake((_, path) =>
    path.endsWith('/PlaybackInfo')
      ? {
          PlaySessionId: 'p1',
          MediaSources: [
            {
              Id: 's1',
              SupportsTranscoding: true,
              TranscodingUrl: '/Videos/channel/master.m3u8?x=1',
              LiveStreamId: 'l1',
            },
          ],
        }
      : undefined
  );
  const session = await openChannel(client, 'user', 'channel', true, true);
  assert.equal(calls[0].body.EnableDirectPlay, false);
  assert.equal(session.method, 'Transcode');
  assert.equal(
    new URL(session.url).pathname,
    '/jellyfin/Videos/channel/master.m3u8'
  );
  await session.close();
  assert.ok(
    calls.some(
      (c) =>
        c.path === '/Videos/ActiveEncodings' && c.query.PlaySessionId === 'p1'
    )
  );
});

test('a transcoding URL that already includes the server base path is not prefixed twice', () => {
  const { client } = fake();
  const stream = liveUrl(
    client,
    'channel',
    {
      SupportsTranscoding: true,
      TranscodingUrl: '/jellyfin/Videos/channel/master.m3u8',
    },
    'p1'
  );
  assert.equal(
    new URL(stream.url).pathname,
    '/jellyfin/Videos/channel/master.m3u8'
  );
});

test('start, progress, stop are ordered, carry live identity, and release even if stop fails', async () => {
  let released = 0;
  const { client, calls } = fake((_, path) => {
    if (path.endsWith('/Stopped')) throw new Error('offline');
  });
  const reporter = new LiveReporter(
    client,
    'channel',
    {
      source: { Id: 's1', LiveStreamId: 'l1' },
      playSessionId: 'p1',
      method: 'DirectStream',
      close: async () => {
        released++;
      },
    },
    () => ({ paused: false, audio: 1 })
  );
  reporter.start();
  reporter.progress();
  const a = reporter.stop(),
    b = reporter.stop();
  assert.equal(a, b);
  await a;
  assert.deepEqual(
    calls.map((c) => c.path),
    [
      '/Sessions/Playing',
      '/Sessions/Playing/Progress',
      '/Sessions/Playing/Stopped',
    ]
  );
  for (const { body } of calls) {
    assert.equal(body.LiveStreamId, 'l1');
    assert.equal(body.CanSeek, false);
    assert.equal(body.PlayMethod, 'DirectStream');
  }
  assert.equal(released, 1);
  reporter.progress();
  await Promise.resolve();
  assert.equal(calls.length, 3);
});

test('guide progress clamps expired and future programs and handles missing dates', () => {
  const program = {
    StartDate: '2026-01-01T00:00:00Z',
    EndDate: '2026-01-01T01:00:00Z',
  };
  assert.equal(
    programProgress(program, Date.parse('2026-01-01T00:30:00Z')),
    0.5
  );
  assert.equal(programProgress(program, Date.parse('2026-01-02')), 1);
  assert.equal(programProgress(program, 0), 0);
  assert.equal(programProgress({}, Date.now()), 0);
});

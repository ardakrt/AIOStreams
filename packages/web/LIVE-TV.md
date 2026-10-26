# Jellyfin Live TV

The standalone app adds `/live-tv` for a stock Jellyfin server when the account has Live TV access. Channels and guide data come from the existing server configuration; this does not configure tuners or import playlists. Desktop playback uses the existing libmpv engine.

- Channels are fetched in pages, with current programs, user favorites and channel numbers. Search and favorite filtering work locally.
- The selected channel has a daily guide in the device's local time. Missing guide data does not block watching.
- Accounts with `EnableLiveTvManagement` can create and cancel program timers. Recordings are listed separately and open through the existing file player.
- `/play/live/:channelId` requests `AutoOpenLiveStream` with PlaybackInfo, so Jellyfin can negotiate and open a tuner in one network round trip. A server returning an unopened source still uses the explicit-open fallback. Channel details refresh in parallel; cached channel-list metadata is sufficient to mount playback. Live URLs use the authenticated Jellyfin stream route rather than a tuner URL that may only be reachable from the server.
- Live start/progress/stop reports carry `LiveStreamId`, the negotiated play method and `CanSeek: false`. They do not write offline file-resume positions.
- Changing channels waits for the previous consumer to close. Leaving while an open response is pending still closes that consumer. Transcode cleanup is scoped to this device and play session.
- Interruptions retry at most three times. A stalled player times out after 25 seconds. Manual reconnect returns to live; the error screen also offers server transcoding.
- Live controls support previous/next channels, pause, audio/subtitles, volume and fullscreen. Space/K toggles pause, Page Up/Down changes channels, and Back/Escape returns to channels. File seeking, thumbnail extraction and next-episode behavior do not run for broadcasts.

## Validation

Live TV reuses the application's `HeroDetails`, `HeroMeta`, `HeroShade`, `BackdropFrame`, `MediaRow`, `WideCard`, `PillTabs`, inputs and pill actions. The bespoke showcase stylesheet was removed. Genuine program artwork blends through the existing hero mask; missing artwork leaves compact, transparent details. Image-free programs use unboxed entries in the shared media row. Selecting a guide entry inspects its details without pretending a future program is currently playable. Dates use the native calendar popover; row arrows browse programs. A narrow-screen Channels action beside playback scrolls and focuses the channel heading. Last-channel restoration and accent/spacing-tolerant search remain supported.

Run `pnpm -F @aiostreams/web test:live-tv`, `test:i18n:tr`, `lint`, `typecheck` and `build:standalone`.

The preceding Live TV integration's Windows native validation used a separate portable copy and device identity against an existing Jellyfin server: 589 channels, H.264 1080p/AAC playback, channel changes, reconnect, keyboard controls, favorite save/restore, guide loading, timer creation/cancellation and successful stream-close responses. No timer from validation was retained. The showcase update was checked in isolated browser fixtures at 2560px, 1280px and 390px, including sparse data, 589 channel rows, keyboard guide scrolling and last-channel restoration. Empty channels/recordings, permission failure, retry limits and late-open cleanup also passed. Native playback was not repeated for the showcase update because automatic approval blocked relaunching the test application.

For the application-consistency update, a browser fixture compared computed hero typography and primary-button geometry directly against the home route: font, line height, weight, radius, dimensions and padding matched. The original home metadata smoke check still passed. The final UI fixtures also covered program inspection, the mobile channel shortcut, calendar next/previous-day changes, valid/broken artwork, shared-row keyboard navigation, favorite/record actions and retry cleanup with no page errors or horizontal overflow at the three viewport sizes. These fixture results do not claim fresh native playback validation.

Other native platforms, browser-specific HLS playback and completion of an actual scheduled recording were not validated in this change. Time shifting and series recording management are not implemented. Ordinary file playback retains its existing behavior; only Live TV sets the new live flags.

## Startup optimization validation

The fast-start update passes 12 Live TV protocol/presentation tests, including one-request auto-open, explicit-open fallback and release of invalid auto-opened sources. An isolated browser fixture held the channel-detail response and confirmed playback requested the stream using cached channel metadata before that response was released, with no explicit-open request and successful session cleanup. This establishes removal of an API round trip and a metadata gate, not a measured reduction in real-channel time to first frame. Native buffering and Jellyfin server settings were not changed. Jellyfin's tuner startup, source probing, any transcoding and the player's initial buffer remain possible latency sources.

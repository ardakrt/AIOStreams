# Jellyfin Live TV

The standalone app adds `/live-tv` for a stock Jellyfin server when the account has Live TV access. Channels and guide data come from the existing server configuration; this does not configure tuners or import playlists. Desktop playback uses the existing libmpv engine.

- Channels are fetched in pages, with current programs, user favorites and channel numbers. Search and favorite filtering work locally.
- The selected channel has a daily guide in the device's local time. Missing guide data does not block watching.
- Accounts with `EnableLiveTvManagement` can create and cancel program timers. Recordings are listed separately and open through the existing file player.
- `/play/live/:channelId` negotiates PlaybackInfo and opens sources that require it. Live URLs use the authenticated Jellyfin stream route rather than a tuner URL that may only be reachable from the server.
- Live start/progress/stop reports carry `LiveStreamId`, the negotiated play method and `CanSeek: false`. They do not write offline file-resume positions.
- Changing channels waits for the previous consumer to close. Leaving while an open response is pending still closes that consumer. Transcode cleanup is scoped to this device and play session.
- Interruptions retry at most three times. A stalled player times out after 25 seconds. Manual reconnect returns to live; the error screen also offers server transcoding.
- Live controls support previous/next channels, pause, audio/subtitles, volume and fullscreen. Space/K toggles pause, Page Up/Down changes channels, and Back/Escape returns to channels. File seeking, thumbnail extraction and next-episode behavior do not run for broadcasts.

## Validation

The program-led showcase keeps a compact channel rail alongside the selected broadcast, a bounded horizontal daily guide, last-channel restoration and accent/spacing-tolerant search. Quality labels are read from the server's channel names. Artwork is used only when supplied by Jellyfin; missing artwork uses the channel mark or a fitted typographic fallback. Empty program descriptions do not reserve poster-sized blank space. The guide is keyboard reachable and supports arrows and Home/End.

Run `pnpm -F @aiostreams/web test:live-tv`, `test:i18n:tr`, `lint`, `typecheck` and `build:standalone`.

The preceding Live TV integration's Windows native validation used a separate portable copy and device identity against an existing Jellyfin server: 589 channels, H.264 1080p/AAC playback, channel changes, reconnect, keyboard controls, favorite save/restore, guide loading, timer creation/cancellation and successful stream-close responses. No timer from validation was retained. The showcase update was checked in isolated browser fixtures at 2560px, 1280px and 390px, including sparse data, 589 channel rows, keyboard guide scrolling and last-channel restoration. Empty channels/recordings, permission failure, retry limits and late-open cleanup also passed. Native playback was not repeated for the showcase update because automatic approval blocked relaunching the test application.

Other native platforms, browser-specific HLS playback and completion of an actual scheduled recording were not validated in this change. Time shifting and series recording management are not implemented. Ordinary file playback retains its existing behavior; only Live TV sets the new live flags.

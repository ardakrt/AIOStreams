# Live TV extension

Mode: Operate. Platform: existing React web interface in the Windows desktop wrapper.

Direction: extend the incumbent AIOStreams interface. Keep its black surfaces, Inter typography, white primary actions, rounded controls and existing sidebar/mobile navigation. No new visual identity, artwork, promotional copy or external IPTV setup.

The primary task is choosing and watching a channel from the user's existing Jellyfin server. Program details and compact searchable channels remain the focus, using the surrounding application's actual components rather than a separate design system. Empty guide data must never prevent playback. Preserve recording and favorite controls.

## Direction contract

THESIS: Live TV is a native-feeling AIOStreams page, not an independent IPTV dashboard. The user explicitly rejected the separate showcase styling and pinned the existing application as visual authority.

OWN-WORLD: Reuse HeroDetails, HeroShade, BackdropFrame, MediaRow, WideCard, PillTabs, TextInput, Button and IconButton. Inherit their tokens, type, pills, spacing, focus and motion. Remove the custom Live TV stylesheet, boxed stage and decorative wordmark.

STORY: Find a channel, understand what is airing and what follows, then watch. Keep the last selected channel, hide repetitive missing-data labels, and surface real categories only.

FIRST VIEWPORT: The standard page title and pill tabs precede native hero details. Genuine artwork blends into the page through the existing hero mask; absent artwork produces compact unboxed details. Guide programs use the shared media row, and searchable channels sit alongside on wide screens. No independent canvas, clock, palette or card language.

FORM: User-pinned integration into the incumbent application; this supersedes seed a58dfc9e's showcase treatment. No new concept tournament. Signature interaction: selecting a channel or guide program updates the same native hero details while preserving guide context.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Live playback fills the native video surface with lightweight overlays for back, channel changes, live reconnect, audio/subtitle selection, volume and fullscreen. Hide controls after inactivity. No file seek bar, automatic episode playback, offline resume write or thumbnail indexing. Release the old tuner before acquiring a new one. Reconnect automatically at most three times per interruption sequence.

Validation: real server channels, native libmpv playback, next channel/reconnect, favorite restoration, guide and reversible recording creation/cancellation. Isolated fixtures cover empty/error states, retry bounds, and small-screen layout. Screenshots containing example channel/program names are fixture evidence only.

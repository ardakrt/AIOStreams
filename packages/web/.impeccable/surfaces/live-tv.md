# Live TV extension

Mode: Operate. Platform: existing React web interface in the Windows desktop wrapper.

Direction: extend the incumbent AIOStreams interface. Keep its black surfaces, Inter typography, white primary actions, rounded controls and existing sidebar/mobile navigation. No new visual identity, artwork, promotional copy or external IPTV setup.

The primary task is choosing and watching a channel from the user's existing Jellyfin server. The user rejected the initial oversized information card and selected a program-led showcase, with program artwork/information ahead of a compact adjacent channel list. Empty guide data must never prevent playback. Preserve recording and favorite controls.

## Direction contract

THESIS: A program-led TV showcase replaces the stretched settings-card composition. Selection feels like browsing television, with one primary watch action.

OWN-WORLD: AIOStreams black canvas, Inter, white watch action, fine neutral dividers; genuine program art and channel marks. No fabricated broadcast artwork or image-shaped placeholders.

STORY: Find a channel, understand what is airing and what follows, then watch. Keep the last selected channel, hide repetitive missing-data labels, and surface real categories only.

FIRST VIEWPORT: At 2560px, a bounded showcase occupies the main column, compact searchable channels sit alongside, and the daily schedule follows in a time-led strip. Program title, synopsis and watch action retain a readable measure. At 1280px the hierarchy compresses; on phones showcase precedes channels and guide.

FORM: Program showcase, grounded candidate 4, selected explicitly by the user from seed a58dfc9e. Code-led working interface this run; no workflow default is stored. Signature interaction: channel selection changes the program stage while retaining guide context.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Live playback fills the native video surface with lightweight overlays for back, channel changes, live reconnect, audio/subtitle selection, volume and fullscreen. Hide controls after inactivity. No file seek bar, automatic episode playback, offline resume write or thumbnail indexing. Release the old tuner before acquiring a new one. Reconnect automatically at most three times per interruption sequence.

Validation: real server channels, native libmpv playback, next channel/reconnect, favorite restoration, guide and reversible recording creation/cancellation. Isolated fixtures cover empty/error states, retry bounds, and small-screen layout. Screenshots containing example channel/program names are fixture evidence only.

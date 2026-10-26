# Live TV extension

Mode: Operate. Platform: existing React web interface in the Windows desktop wrapper.

Direction: extend the incumbent AIOStreams interface. Keep its black surfaces, Inter typography, white primary actions, rounded controls and existing sidebar/mobile navigation. No new visual identity, artwork, promotional copy or external IPTV setup.

The primary task is choosing and watching a channel from the user's existing Jellyfin server. A searchable channel list sits beside the selected channel's current program and watch/favorite actions on desktop, and above them on narrow screens. The daily guide follows the selected channel. Recordings and scheduled timers share a second section. Account permissions govern management controls. Empty guide data must never prevent playback.

Live playback fills the native video surface with lightweight overlays for back, channel changes, live reconnect, audio/subtitle selection, volume and fullscreen. Hide controls after inactivity. No file seek bar, automatic episode playback, offline resume write or thumbnail indexing. Release the old tuner before acquiring a new one. Reconnect automatically at most three times per interruption sequence.

Validation: real server channels, native libmpv playback, next channel/reconnect, favorite restoration, guide and reversible recording creation/cancellation. Isolated fixtures cover empty/error states, retry bounds, and small-screen layout. Screenshots containing example channel/program names are fixture evidence only.

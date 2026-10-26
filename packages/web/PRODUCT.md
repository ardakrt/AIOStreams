# AIOStreams app

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People watching their Jellyfin library in the existing desktop app. The current user wants to watch the live channels already configured on their Jellyfin server, in Turkish.

## Product Purpose

Browse and play media from a selected Jellyfin-compatible server. Extend the existing app with channels, guide information, favorites, live playback and recording controls where the server and account support them.

## Capabilities and Constraints

The established React interface runs inside a native desktop wrapper with libmpv. Preserve the existing navigation, saved sign-in, media playback, branding and translations. Channel sources and guide data belong to Jellyfin; this feature does not administer tuners or import IPTV credentials. Native Windows playback is the primary validation target. Real playback and server-side persistence must be verified separately from fixture UI tests.

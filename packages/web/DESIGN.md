---
name: AIOStreams web app — Live TV integration
description: Live TV inherits the existing app's hero, media rows and shared controls.
colors:
  background: "var(--background)"
  foreground: "var(--foreground)"
  muted: "var(--muted)"
  paper: "var(--paper)"
  border: "var(--border)"
  ring: "var(--ring)"
  white: "#ffffff"
  black: "#000000"
typography:
  hero-title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
  hero-title-desktop:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.25
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
rounded:
  control: "8px"
  pill: "9999px"
spacing:
  compact: "8px"
  detail: "16px"
  section: "32px"
components:
  hero-watch:
    backgroundColor: "{colors.white}"
    textColor: "{colors.black}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  input-basic:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.foreground}"
    rounded: "var(--radius)"
    height: "40px"
    padding: "0 12px"
---

# Design System: AIOStreams web app — Live TV integration

## Overview

**Creative North Star: "The existing AIOStreams app"**

The user explicitly pinned the surrounding app as visual authority and rejected the separate showcase treatment. This record describes Live TV's reuse of existing app primitives, not a new palette, typography system or whole-app design approval. The bespoke Live TV stylesheet, boxed stage and decorative wordmark were removed.

`HeroDetails`, `HeroMeta`, `HeroShade` and `BackdropFrame` now supply the same hero language used by the home route. `MediaRow`, `WideCard`, `PillTabs` and the shared UI package provide browsing and controls. The optional hero metadata and heading inputs preserve the default home behavior. The frontmatter references incumbent theme variables; it does not freeze a new Live TV color ramp.

Evidence for this revision is the current source and app-style fixture captures at wide desktop, desktop and phone sizes, compared with the actual home route. This is visual/fixture evidence, not a fresh claim of native playback or live-server validation.

**Key Characteristics:**
- Shared home-hero typography and primary action geometry.
- Transparent page integration with genuine optional artwork.
- Existing pill tabs, controls and media-row navigation.
- Compact missing-art states without invented image panels.

## Colors

### Primary

- **White and black:** the existing white hero action uses dark text. Its shared hover states remain owned by the button component.

### Neutral

- **Background and foreground:** inherited directly from the active app theme. The Live TV workspace adds no independent canvas or large gray stage.
- **Muted, paper and border:** existing theme roles for supporting information, inputs, the calendar popover and separators.
- **Ring:** the app's global focus treatment remains authoritative.

**The Inheritance Rule.** Reuse the actual shared component and theme role instead of approximating its appearance with new local shades.

## Typography

**Display and body font:** the shared Inter stack.

The live program heading is rendered by `HeroDetails`, using the same bold, tightly led title as the home hero: the compact title token below the desktop breakpoint and the desktop token above it. `HeroMeta` supplies its existing small-text row and separators. The overview retains the hero's gray supporting text and responsive line clamps, rather than a bespoke synopsis scale.

Page titles use the standard bold page-heading treatment. Channel labels, program captions, dates and controls use their existing app roles. These are inherited variants, not a new Live TV type ramp.

**The Shared Hero Rule.** Home and Live TV hero titles and primary actions must remain the same components, including typography, pill radius, dimensions and padding.

## Layout

The page uses `PageBody`, the existing title and pill tabs. A wide-screen grid places the flexible details/guide area beside a 20rem channel list at the extra-large breakpoint. Below that breakpoint the same content stacks. There is no fixed-width showcase shell or independent stage background.

Genuine supplied artwork uses the shared backdrop frame, mask and shades. When artwork is missing or all candidates fail, the details have compact content-driven height; no image-shaped placeholder reserves an empty hero. The existing hero measure bounds title and overview text.

Guide programs use the shared wide `MediaRow`, including its bounded item widths, keyboard/focus behavior, current-program starting position and visible scrolling arrows. These arrows scroll programs only. A separate calendar button opens the shared `Popover` containing date, previous-day, next-day and Today controls. Date selection must not masquerade as media-row navigation.

On narrow layouts, the Channels action near playback controls scrolls to and focuses the channel heading. The list retains its bounded vertical scroll area; server/user-scoped selection is remembered and the selected row is brought into view when necessary. This avoids requiring a long guide traversal merely to find channel selection.

## Elevation & Depth

Live TV adds no card shadow or raised showcase surface. Artwork blends into the page using the home hero's existing masks and directional shades. Shared popovers, tooltips and navigation retain the elevation owned by those primitives. Loading uses `Skeleton`; actionable errors use `LuffyError`, rather than a separate visual vocabulary.

## Shapes

Primary hero actions, icon actions and local tabs reuse the app's pills. Inputs and channel selection areas use existing control corners. Genuine images keep the shared artwork component's behavior. Missing channel marks use the existing TV icon fallback; no decorative text watermark is introduced.

## Components

### Hero details and actions

Render the shown program through `HeroDetails`, with `HeroMeta` carrying channel, time and status. Use the shared white pill button for watching and shared icon/tooltip controls for favorites. Inspecting another guide program updates those same hero details; Return to live restores the broadcast context. Default home hero behavior remains intact.

### Media rows and program entries

Use `WideCard` only when genuine program artwork exists. Without it, show unboxed, clickable time/title/description text within the same media row. Recording controls reflect server state and account permissions. Do not create gray image substitutes or an independent schedule-card style.

### Channel list

Use the existing `TextInput`, `PillTabs`, `Artwork` and button/icon-button patterns. Rows show channel name, available current-program information and server-derived quality or channel number. Selection and quick play keep the app's hover/focus behavior. Search, favorites, real categories and remembered selection remain functional.

### Calendar, loading and errors

The calendar is a distinct shared popover, opened by a labeled calendar action. Its internal arrows change dates; the media-row arrows outside it browse programs. Shared skeleton and error components cover loading and failure. Missing guide information does not prevent watching.

### Recordings and playback

Recordings remain a separate section using incumbent lists and controls. This document's scope is the current Live TV surface and reused primitives; it does not certify playback overlays, native startup or server writes from fixture appearance.

## Do's and Don'ts

### Do:
- **Do** reuse the actual home hero and shared controls.
- **Do** inherit theme roles rather than introducing local palette or type ramps.
- **Do** keep absent-art details compact and guide entries unboxed.
- **Do** distinguish calendar navigation from program scrolling.
- **Do** keep Channels reachable beside the narrow-layout playback area.

### Don't:
- **Don't** restore a giant gray stage, decorative watermark or bespoke showcase stylesheet.
- **Don't** reserve an empty artwork rectangle for missing program images.
- **Don't** change the home hero's default behavior to accommodate Live TV.
- **Don't** present fixture captures as fresh native-playback or server-operation evidence.

Not canonized: the rejected showcase palette, title ramp, fixed stage and card language are superseded. Shared muted styles are recorded as inherited usage, not as an independent contrast approval. No whole-app or fresh native validation is asserted.

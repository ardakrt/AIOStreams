---
name: AIOStreams web app — Live TV extension
description: Existing dark media interface, documented from the shipped Live TV implementation.
colors:
  canvas: "#070707"
  white: "#ffffff"
  black: "#000000"
  surface: "rgb(255 255 255 / 0.05)"
  selected-surface: "rgb(255 255 255 / 0.10)"
  secondary-text: "rgb(255 255 255 / 0.65)"
  divider: "rgb(255 255 255 / 0.10)"
typography:
  section-title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.625
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
rounded:
  control: "8px"
  container: "16px"
spacing:
  compact: "8px"
  control: "12px"
  group: "16px"
  section: "32px"
components:
  button-white:
    backgroundColor: "{colors.white}"
    textColor: "{colors.black}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  channel-selected:
    backgroundColor: "{colors.selected-surface}"
    rounded: "{rounded.control}"
    padding: "12px"
  input-search:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
---

# Design System: AIOStreams web app — Live TV extension

## Overview

**Creative North Star: "Existing AIOStreams interface"**

This is a descriptive record of the Live TV extension within the established app, not a new identity or a whole-app design audit. Evidence is the shared theme and button implementation, the Live TV pages, and the captured channel/guide surface. Playback overlays are described from code; their visual states were outside the finish review's capture scope.

The interface keeps attention on channel names, program information and watching. White primary actions sit against nearly black surfaces. Typography and compact controls carry hierarchy without introducing new artwork or promotional decoration.

**Key Characteristics:**
- Restrained neutral surfaces with clear selected states.
- Inter typography shared with the surrounding app.
- Library icons and genuine server-provided channel artwork.
- Lightweight overlays above the native video surface.

## Colors

The extension uses the incumbent dark neutral palette. Frontmatter records the repeated values used by this extension, not every color available in the shared theme.

### Primary

- **White:** primary watch actions, active section markers and program progress.

### Neutral

- **Canvas:** the shared dark page field.
- **Surface / selected surface:** translucent white layers distinguish containers, hover and selection.
- **Secondary text:** descriptive copy, times and channel metadata use the extension's higher-opacity secondary treatment. The shared theme's lower-opacity muted value is not promoted as a rule for this extension.
- **Divider:** understated separators distinguish guide rows and sections.

**The Selection Rule.** Distinguish selection through surface tone and an explicit control state; the channel list uses `aria-pressed`, and section controls add a white underline.

## Typography

**Display and body font:** Inter with the shared system sans-serif fallback stack.

Page titles are semibold; section headings and selected channel names establish the next level. Repeated program and channel names use medium weight. Supporting text is smaller and uses relaxed line height for descriptions. Times and channel numbers use tabular numerals. Descriptions preserve supplied paragraph breaks, while channel rows truncate secondary text to maintain scanability.

**The Content Hierarchy Rule.** Give the channel or program name more emphasis than its number, time or explanatory text.

## Layout

The extension inherits the app's padded page body and navigation. At the desktop breakpoint, the channel column is bounded between 260px and 340px and the information column takes the remaining space; their gap follows the section spacing token. Below that breakpoint, channels precede details in a single column. The channel list scrolls independently within a viewport-relative height. Long names wrap in details rather than forcing horizontal overflow.

The daily guide belongs to the selected channel. These composition choices are scoped to Live TV; they are not a mandatory template for other app screens. The existing mobile navigation reserves safe-area space through the page shell.

## Elevation & Depth

Live TV content uses tonal layering and thin dividers rather than card shadows. The inherited navigation can use its established bar treatment. Playback controls use black-to-transparent gradients to keep controls legible over video; this is a functional overlay treatment, not a decorative page background.

## Shapes

Controls, channel rows and logo holders share gently curved corners. The larger selected-program container uses the container radius. Progress tracks are thin and fully rounded. Genuine channel logos remain contained within their holders rather than being cropped into a decorative silhouette.

## Components

### Buttons

The shared white button identifies the watch action. Gray outline buttons remain secondary for favorites, refresh and recording management. Default buttons are 40px tall; compact record controls use the shared smaller variant. Hover changes the surface tone, disabled controls reduce opacity and stop pointer interaction, and keyboard focus follows the app's global outline treatment.

### Channel rows

Rows combine a contained logo, number, name and current-program summary. They have a full-width hit area, compact padding, a selected surface tone and a visible keyboard focus mark. The TV library icon is the fallback when a real logo is absent or fails to load.

### Inputs / Fields

The search input uses a subtle translucent fill, a thin white border and the control radius. Its label is available to assistive technology. The guide date uses the browser's native date control with a dark color scheme. Player selectors retain native select behavior.

### Navigation

The existing sidebar and mobile navigation gain one Live TV destination. Within the surface, two text controls switch channel/guide content and recordings. The active section uses white text and an underline; inactive labels retain the secondary text treatment.

### Program information and playback

The selected program shows its name, time range, progress and description before actions. Guide rows use thin separators and time/name hierarchy; their recording controls reflect server state. A small “on now” status identifies the current program. Playback overlays provide back, transport, channel, audio/subtitle, volume and fullscreen controls, with explicit focus and loading/error states.

## Do's and Don'ts

### Do:
- **Do** reuse the existing shared controls and Inter typography.
- **Do** keep primary watching actions prominent and metadata subordinate.
- **Do** use real channel artwork or the existing TV icon fallback.
- **Do** preserve keyboard focus and a readable secondary-text treatment.

### Don't:
- **Don't** treat the Live TV two-column composition as a whole-app layout mandate.
- **Don't** replace server program information with invented content or decorative artwork.
- **Don't** canonize uncaptured playback or recording states as visually reviewed.

Not canonized: no new craft-floor violations were identified in the captured channel/guide surface; the shared lower-opacity muted token and uncaptured states are deliberately excluded from visual approval.

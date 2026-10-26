---
name: AIOStreams web app — Live TV showcase
description: Program-led showcase and compact channel rail, recorded from the implemented extension.
colors:
  canvas: "#070707"
  stage: "#111114"
  foreground: "#f7f7f8"
  white: "#ffffff"
  synopsis: "#c1c1ca"
  meta: "#b5b5bf"
  channel-name: "#e0e0e8"
  channel-program: "#a0a0ad"
  divider: "#ffffff14"
  selected-channel: "#ffffff10"
  guide-surface: "#ffffff04"
  live-text: "#ff9696"
typography:
  program-title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(32px, 3vw, 54px)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  synopsis:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    lineHeight: 1.7
  section-title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  channel-name:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  program-card-title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.45
rounded:
  control: "8px"
  guide-card: "10px"
  stage: "16px"
spacing:
  tight: "12px"
  group: "18px"
  rail-inset: "24px"
  columns: "28px"
components:
  button-white:
    backgroundColor: "{colors.white}"
    textColor: "#000000"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  guide-card:
    backgroundColor: "{colors.guide-surface}"
    rounded: "{rounded.guide-card}"
    padding: "18px"
  channel-selected:
    backgroundColor: "{colors.selected-channel}"
    rounded: "{rounded.control}"
  input-search:
    backgroundColor: "#ffffff06"
    textColor: "#eeeeee"
    rounded: "{rounded.control}"
    padding: "10px 12px 10px 36px"
---

# Design System: AIOStreams web app — Live TV showcase

## Overview

**Creative North Star: "Program showcase"**

This record describes the user-selected Live TV composition: current-program information leads, a compact searchable channel rail sits alongside it, and the selected channel's daily guide follows. It supersedes the earlier oversized information-card layout. The surrounding AIOStreams black canvas, Inter typography, shared controls and navigation remain incumbent.

The detailed shades and type sizes in this record come from the finished `live-tv.css`; they are not claimed to be an exact reuse of the previous extension's palette or type ramp. The current evidence is visual and fixture-based. Dense fixtures use 589 illustrative channels and nine programs; neither those captures nor this document establish a fresh native launch or live-server result. The inspected real server supplied no program artwork.

**Key Characteristics:**
- Program-led hierarchy with a compact channel rail on the right.
- Genuine optional art, with a content-sized text/logotype fallback.
- Time-led guide cards with bounded width and keyboard scrolling.
- Remembered channel selection and restrained neutral layering.

## Colors

### Primary

- **White:** the shared watch action, active navigation marker and selected channel name.

### Secondary

- **Live text:** the muted warm red of the live-status badge. Favorite status and current-program labels use related warm status treatments from the implementation.

### Neutral

- **Canvas and stage:** nearly black but distinct grounds separate the surrounding page from the program stage.
- **Foreground and channel name:** primary information stays near white.
- **Synopsis, meta and channel program:** separate cool neutral shades establish density and hierarchy; they are intentionally distinct values in the finished CSS.
- **Divider, selected channel and guide surface:** low-opacity white layers mark structure and selection without elevated card shadows.

**The Selection Rule.** Use the implemented row surface, selected name treatment and explicit control state to distinguish the chosen channel. Do not turn every channel into an independent elevated card.

## Typography

**Display and body font:** Inter with the incumbent system sans-serif fallback stack.

The current program title uses a balanced, tightly tracked display treatment with a readable character measure. The stage synopsis has a relaxed line height and a three-line clamp. Channel names are compact medium-weight labels; their current-program summaries are smaller and truncated. Guide card titles sit between those roles, and time information uses tabular numerals.

The stage title becomes 36px in the intermediate layout and 32px on small phones. Synopsis copy becomes 13px on phones, while guide and rail headings remain compact. These values describe this showcase; they do not redefine every AIOStreams page heading.

**The Hierarchy Rule.** Make the current program the reading entry point; channel navigation and schedule metadata support it.

## Layout

The shell is centered and capped at 1760px. Its desktop grid gives the stage and guide the flexible main column and places a 350px rail on the right, separated by the column gap and a fine vertical divider. The rail narrows to 290px below 1250px. It stays sticky on desktop and scrolls its list independently.

At 900px and below, the order becomes stage, next-program line, channels, then guide. The rail loses sticky positioning and its divider; the channel list has a bounded height. At 540px and below, the header wraps, the clock is omitted, and the stage takes the available width.

**The Content-Sized Fallback Rule.** A stage without genuine artwork derives its height from its content and padding. The artwork-specific minimum heights apply only to the art variant. Do not add a fixed-height image placeholder to an empty-art program.

The guide is a horizontal, proximity-snapping strip. Cards are bounded between their minimum and maximum widths rather than expanding a lone program across the main column. The strip is keyboard-focusable: left/right navigation scrolls it, Home/End reach its boundaries, and initial positioning brings the current program into view. Selected rail rows are likewise brought into their list viewport when needed. Selection is stored per server and user.

## Elevation & Depth

The showcase uses subtle tonal differences, thin borders and contained surfaces, without new card shadows. Genuine program art receives directional dark gradients to retain title and action legibility. The no-art stage stays a plain dark field. The inherited navigation and native playback overlays retain their existing treatments.

The stage's short reveal uses a small movement and fade. Reduced-motion preference disables this reveal and transitions within the surface. This is a bounded change-of-selection cue rather than a repeated entrance animation for every row.

## Shapes

The stage has the largest corner radius; guide cards use the intermediate radius, and controls and rail rows share the control radius. Progress tracks are thin and contained. Logos keep their real proportions. Missing small logos use channel-name initials, while the larger decorative fallback uses a single-line text/logotype constrained to its available width. It truncates instead of wrapping into a vertical wordmark, and is omitted on phones.

## Components

### Buttons

The shared white watch action is the primary control. The adjacent square favorite control uses an outline and a distinct pressed state. Recording and refresh actions stay secondary. Shared disabled and focus behavior remains in force.

### Program stage

Show the channel mark/name and current status, then the program title, supplied metadata, synopsis and watch action. The optional large channel mark is supporting material. Use only genuine server-provided program images; failed candidates fall through without fabricated art. Missing program information falls back to the channel name rather than repeating empty-data labels.

### Channel rail

Rows combine a channel number, contained logo or initials, cleaned channel name, current-program text and quality badges found in the actual server name. An adjacent quick-play control appears for selection, hover or keyboard focus; it remains visible on narrow screens. Search normalizes punctuation and Turkish accents. Filters expose favorites and real supplied categories. Remember the selected channel rather than resetting it when the list refreshes.

### Guide cards

Each card leads with a time range, then title and a bounded synopsis. Current and past programs have distinct surface/text treatments. Recording controls use the server's actual timer state and account permissions. A sparse guide remains compact instead of stretching one card to fill the stage width.

### Inputs / Fields

The compact search field has an inset search icon, a low-opacity fill and thin border. Section navigation uses text and an active underline. The date field retains native dark date-picker behavior; date navigation and Today remain lightweight adjacent controls. Keyboard focus follows the global app outline.

### Recordings and playback

Recordings remain a separate section using existing list and button patterns. Playback is functionally preserved by this layout work; native playback and recording-operation claims are outside this turn's visual/fixture evidence.

## Do's and Don'ts

### Do:
- **Do** lead with program information and keep the channel rail compact.
- **Do** let missing-art stages size to their content.
- **Do** keep guide cards bounded and the strip reachable by keyboard.
- **Do** preserve selection and reveal the selected/current item within its scroll container.
- **Do** use genuine supplied art or the implemented text/logotype fallback.

### Don't:
- **Don't** stretch sparse guide cards or empty artwork areas to fill unused space.
- **Don't** let the decorative logotype wrap or overpower the program title.
- **Don't** invent categories, quality claims or broadcast imagery.
- **Don't** present fixture captures as live-server or native-playback evidence.

Not canonized: the previous palette/type entries and reversed mobile reading order were superseded, not preserved as guidance. The large fallback's low-opacity text is decorative and is not a body-copy contrast token. No fresh native-launch approval is asserted by this record.

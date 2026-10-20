# Design analysis — reference screenshots → Couch of Power

Source: `design-reference/01-table.jpeg`, `02-profile.jpeg`, `03-shop.jpeg`, `04-home.jpeg`
(a mobile poker app). We recreate the **style** only. No logo, brand name, emoji art or
illustrations are copied. All artwork in Couch of Power (avatars, card backs, couch) is original SVG.

## 1. What makes it feel premium

1. **Pure black canvas (#000).** There is no gradient background and no noise. Content floats on true
   black, so on OLED phones the UI feels like it is lit from within.
2. **Very few colors, used as signals.** Almost everything is white or grey. Color only appears where
   it means something: a green timer, a yellow pot, gold prices, the coral "LAG" pill.
3. **Line, not fill.** Most containers are 2px hairline outlines (#2C2C2E–#3A3A3C) with big radii.
   Filled surfaces (#1C1C1E) are only used for shop tiles.
4. **Tactile objects.** The bright things are physical objects: white playing cards with a soft
   inner gradient, 3D-rendered chips, chests and avatars. A flat UI with a few "real" objects on it.
5. **Inactivity is shown by dimming.** Players who are not in the hand drop to ~30% opacity. You can
   tell who is active without reading anything.
6. **Generous spacing and large type.** A 16px gutter, 12px gaps, and labels 15–17px or bigger. Nothing
   feels cramped even with 5 players on a 375px screen.

## 2. Color palette (sampled and normalised)

| Token | Hex | Where in the reference | Use in Couch of Power |
|---|---|---|---|
| `ink-0` background | `#000000` | every screen | app background |
| `ink-1` surface | `#141416` | shop tiles, sections | sheets, panels |
| `ink-2` raised | `#1C1C1E` | tile fill, pills | inputs, chips, list rows |
| `line` | `#2C2C2E` | card / button outlines | default 2px outlines |
| `line-strong` | `#48484A` | focus outlines, dashed "+" seat | hover, empty seat ring |
| `text` | `#F5F5F7` | names, numbers | primary text |
| `text-2` | `#8E8E93` | "Friends", "6,543 XP" | secondary text |
| `text-3` | `#4A4A4E` | dimmed players | inactive / disabled |
| `go` green | `#30D158` | turn timer pie, link icon | **your turn**, online, empty seat glow |
| `pot` yellow | `#F7D046` | "64" pot pill | counts, highlight numbers |
| `gold` | `#F0A93B` | chip prices, "Golden" | win and trophy accents |
| `coral` | `#FF6A4D` | "LAG" pill, gradient | **Team A** default ("Soare") |
| `sky` | `#3AB4FF` | gem currency | **Team B** default ("Val") |
| `card` | `#FBFBFD → #ECECEF` | playing card faces | name-slip face |
| `card-red` | `#F2453D` | ♦ ♥ suits | slip accent |

Extra team colors you can pick (chosen for contrast on black, no purple): mint `#3DDC97`,
gold `#F0A93B`, rose `#FF5C8A`, ice `#9FD8FF`.

The home "Cash Games" card uses a soft pastel gradient (blue→mint). This is the only gradient in the
app. We use the same idea once, for the hero mode card on the home screen.

## 3. Typography

The reference uses SF Pro (iOS system font): neutral grotesque, regular weight for names, **light
(300) for big numerals** (the huge "0", "200", "14").

- **Onest** (Google Fonts) is the closest non-Inter match. It has the same open apertures and
  humanist-grotesque proportions, it supports `ș ț ă î â` (latin-ext), and its 300 weight works for
  large numerals.
- Scale (px): 12 / 13 / 15 / 17 / 20 / 24 / 32 / 48 / 72. Body 15–17, labels 13, display 32+.
- Weights: 300 for display numerals, 400 for body, 500 for names and buttons, 600 rarely.
- Buttons use sentence case. "ADD FRIENDS" is the one uppercase exception, and we do not copy it.
- Numbers use `font-variant-numeric: tabular-nums` (timers, codes).

## 4. Spacing, radii, depth

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 48. The page gutter is 16px (reference 18px @1x),
  gaps between tiles 12px, section spacing 32–48px.
- **Radii:** cards and panels 28px, list rows and pill buttons 24px or full pill, playing cards 14px,
  small pills 999px, the tab bar has no container.
- **Borders:** 2px solid `line`. Primary outline buttons use a 2.5px white border (the "ADD FRIENDS"
  style).
- **Shadows:** almost none. Depth comes from object shading: the cards have a top-light vertical
  gradient plus a 1px inner highlight. Only floating objects (cards, sheets) get a soft
  `0 12px 32px rgba(0,0,0,.6)`.
- Tiles fade out at the bottom (border mask) instead of having a closing edge. We use the same mask on
  scrollable lists.

## 5. Components in the reference → our translation

| Reference | How it's drawn | Couch of Power |
|---|---|---|
| Player avatar row at the top of the table | 3D character (64px) + name (15px, truncated) + chip count; inactive players at 30% opacity; "D" dealer badge bottom-right; green pie timer above the active player | **Seats around the room.** Original SVG "pebble" characters (soft radial shading, simple face, colour-seeded per name). Team badge where the "D" badge sits, green pie ring on the **caller**, and players not involved dimmed |
| Empty seat "+" | 2px grey circle with a thin "+" | **The empty seat:** dashed circle that glows green (the only glowing thing on screen) |
| Community cards | Five white cards, rank top-left, suit bottom-left, red/black | **Name slips:** white cards with the name in the top-left and a small couch glyph in the corner |
| Hole cards (face down) | Black card with a thin-line ornamental eye pattern | **Your secret slip, face down:** original line-art pattern (concentric couch/arch motif). Tap and hold to flip |
| Chip stack box | Outlined 28px-radius box with an object + number | **Action box:** "Strigă un nume" when it's your turn; turn count otherwise |
| "Wait for the next hand" | Full-width 2px outlined pill, grey text | **Status pill:** "Așteaptă – strigă Andrei" / "E rândul tău" (turns green) |
| Pot pill "64" | Yellow numerals on a dark pill | Counts (couch score per team: e.g. "3/4") |
| Tab bar | 3 line icons, active one filled white, no labels, no background | Home / Play / Profile is not needed. We use a bottom action bar with the same icon weight |
| Stats radar | Thin dashed grid, a single vivid shape | Win screen: couch diagram where the winning team's seats fill with color |
| Leaderboard rows | Medal, avatar, name 17px + secondary 15px grey | Lobby player list, event log rows |
| Settings gear / back arrow | 2px stroke rounded line icons, 24px | Same stroke (lucide icons at 2px stroke, rounded caps) |

## 6. Turns, active player, states

- The active player has full opacity, everyone else is dimmed, and a **green countdown pie** sits above
  the active player.
- The main CTA changes its label to describe the state ("Wait for the next hand"), so there is never a
  dead screen.
- **Our rules:** the caller gets the green pie ring and full opacity. The empty seat glows green. A
  thin green arrow connects the caller to the empty seat. When it's your turn the status pill fills
  green, the phone vibrates and the action box becomes a big "Strigă un nume" button. Connection loss
  shows as a grey dot on the player and a top banner.

## 7. Iconography

Line icons with a 2px stroke, rounded joins, 24px, white. Only the active tab is filled. We use
`lucide-react` at `strokeWidth={2}` and never emoji.

## 8. Navigation patterns

- One primary action per screen, anchored at the bottom (thumb zone). The back arrow is at the top left
  and the settings icon at the top right.
- Horizontal carousels for "modes" (the Cash Games card peeks off the edge). We use the same pattern on
  the home screen for Mode 1 / Mode 2 / Tutorial.

## 9. Signature for Couch of Power

**The couch itself.** At the top of the room is a drawn sofa silhouette: a thick 3px rounded outline
with armrests. Its seats sit inside it, and it fills with the team's colour as a team takes it over.
Each seat on the couch has a small segment in a progress bar under the sofa ("3/4 Soare"). Everything
else stays quiet: black canvas, hairline outlines, white cards.

## 10. Rules we follow from this

- No purple gradients, no glassmorphism, no emoji icons, no Inter.
- Colour = meaning. Green = your turn / empty seat / online. Team colours only on team things.
- Motion only for feedback: a seat move (~350ms spring), a card flip (~250ms), a turn pulse (once).
  All of it is turned off under `prefers-reduced-motion`.

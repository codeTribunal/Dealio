---
target: app logo SVG (Frame 1(1).svg) for home/menu/Play Store
total_score: 9
p0_count: 2
p1_count: 2
timestamp: 2026-07-02T18-41-59Z
slug: app-logo-frame1-svg
---
# Dealio App Logo SVG ("Frame 1(1).svg") — Critique Snapshot

Method: dual-agent (A: brand design review · B: deterministic technical facts). Detector not applicable (.svg unscannable); no browser. Heuristic table adapted for a static mark: only the 5 applicable heuristics scored (of 20, not 40).

## Score — 9/20 applicable (mark: good; this export: fails all three stated contexts)

| Heuristic | Score | Key issue |
|---|---|---|
| Match system / real world | 3 | "d" + blue quarter reads as progress/chart — good CRM semantics; dot reads disconnected small |
| Consistency & standards | 1 | Diverges from the shipped flat DealioMark (adds plate/shadows/hardcoded ink); violates Play full-bleed + adaptive-icon layering |
| Recognition (grid distinctiveness) | 2 | Another blue rounded icon next to Click/Payme/Telegram; quarter+dot are the distinguishing gestures and the dot dies at grid size |
| Flexibility (scalability) | 1 | Dot ≈2.2px at 24px; eroded ring quadrant ≈1.1px; 10u-blur shadows become mud ≤48px |
| Aesthetic & minimalist | 2 | Flat mark is calm/trustworthy; three baked glow-shadows push it to sticker/emboss, against brand voice |

## Verdict
The MARK is right (identical path data to the shipping web DealioMark — real identity discipline). This EXPORT is a raw Figma frame, wrong for all three contexts:
- **Flutter in-app**: flutter_svg 2.3.0 (vector_graphics_compiler 1.2.5) has no <filter> parser — all three shadows silently drop; `shape-rendering="crispEdges"` disables anti-aliasing on the curved stroke; hardcoded #0F172A ink is invisible on dark bg #0B1323.
- **Menu ~24px**: dot and eroded ring quadrant fail; shadows smear.
- **Google Play**: 120×110 non-square, transparent margins (with low-alpha shadow spill in them), baked shadows — all against the 512×512 full-bleed spec; no adaptive foreground/background layering (66/108 safe zone).

## Key technical facts (Assessment B)
- Blue #3B82F6 ≈ token accent #3C83F6 (1/255 off; splash hardcodes 0xFF3C83F6 — canonicalize).
- Ink #0F172A = Tailwind slate-900 = splash slate 0xFF0F1729 (off-token "brand navy" already in circulation); token text-1 is #1B2641.
- Plate #FAFAF8 is warm (matches nothing in the cool token set) BUT equals the existing adaptive-icon background in colors.xml/pubspec.
- Paint-order defect: blue quarter fills to r=30 (stroke centerline) and paints AFTER the stroke → ring is 5u on that quadrant vs 10u elsewhere, with step-notches at 3 and 6 o'clock. Inherited from the shipped DealioMark — an undecided mark-level question.
- Repo already has: flutter_launcher_icons pipeline (icon_padded.png on #FAFAF8), native splash, splash_mark_noshadow.png (prior evidence shadows had to be flattened), no monochrome/themed-icon layer, no in-app SVG logo usage today.

## Priority issues
1. **P0 — Launcher-unusable geometry** (non-square, transparent margins + shadow spill, baked shadows). Fix: adaptive layers — full-bleed background + foreground mark in the 66/108 safe zone, no shadows; 512 PNG for Play.
2. **P0 — Filters break Flutter** (silently dropped; crispEdges degrades curves). Fix: strip filters/shape-rendering; flat theme-aware mark in-app.
3. **P1 — Ring erosion** (5u vs 10u ring). Decide once in the master: inset quarter to r=25 or paint under the stroke; propagate to web DealioMark.
4. **P1 — Off-system plate + baked ink** (#FAFAF8 plate on cool surfaces; #0F172A invisible in dark mode). Fix: transparent in-app mark; plates only on launcher.
5. **P2 — No small-size variant** (dot/quarter fail ≤24px). Fix: simplified cut for menu/favicon.
6. **P3 — Color drift** (#3B82F6 vs #3C83F6 vs three navies). Canonicalize per-token hexes.

## Questions
1. Among Tashkent's blue app icons (Click, Payme, Telegram), should the launcher lead with the navy ink rather than blue?
2. Does the dot get a job (notification motif) or get cut below 24px?
3. Ring erosion: deliberate layering or bug? The answer belongs in the master geometry, web + app.

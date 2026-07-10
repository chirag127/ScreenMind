# ScreenMind — Website Concept Demos

Three interactive MVP directions for the ScreenMind landing site. Same idea (a
physics-driven scroll story), three different central metaphors. **Vibe and
interaction only** — copy/content is placeholder, to be replaced once we pick a
direction.

## Run

Open `index.html` in a modern browser (Chrome/Edge/Firefox on desktop) and click
into each concept. Everything is plain HTML + [Three.js](https://threejs.org)
loaded from a CDN — **no build step, no install.**

If a demo shows a blank screen (some browsers block ES-module import maps over
`file://`), serve the folder instead:

```bash
cd landing
python -m http.server
# then open http://localhost:8000
```

## The three concepts

| # | Concept | Central object | Interaction |
|---|---------|----------------|-------------|
| 01 | **The Memory Strand** | A glowing neural thread with captured screen-moments threaded on as glass beads | Scroll flies you *along* the strand; cursor pushes beads, springs settle them back |
| 02 | **The Brain** | A point-cloud brain of ~4,600 "memory" neurons + synapse lines | Scroll flies you *inside* it; cursor parts the neurons like a ripple |
| 03 | **Pixels → Meaning** | ~3,000 instanced pixels that scatter as noise and assemble into meaning | Scroll drives the noise→`MIND` assembly; cursor disturbs the pixels |

All three share the ScreenMind palette (bg `#05060d`, violet `#8b5cf6`, cyan
`#22d3ee`) and use bloom + a physics loop (cursor force + spring-return, damped).

## Notes for the real build

These are throwaway MVPs to choose a direction. The production site will add:

- **Full scroll narrative** (Capture → Analyze → Remember → Recall → Automate →
  Privacy vault) with real dashboard screenshots on the beads/frames.
- **Grab-and-fling** sandbox interactions (these MVPs only do cursor push).
- **Docs mode** — the 3D story docks into a fast, readable, themed docs section
  (likely Astro + Starlight) fed by the existing `README` / `MCP_SETUP.md` /
  `ARCHITECTURE.md` / `docs/BUILD_YOUR_OWN_AGENT.md`.
- **`prefers-reduced-motion` + low-power fallbacks** — a lightweight tool
  shouldn't ship a laptop-melting site.

## Structure

```
landing/
├── index.html            # concept chooser
├── memory-strand/index.html
├── brain/index.html
└── pixels/index.html
```

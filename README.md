# InfraVis — the story and the website

An interactive, hand-drawn introduction to InfraVis (the Swedish national
research infrastructure for data visualization), made to catch the attention
of funders and partners, which then opens onto a new InfraVis website.

A firefly guides the visitor across a whiteboard (a blackboard in dark mode)
from chapter to chapter. Each chapter plays its opening and then waits: the
visitor plays with it, then moves on with **Next** (→ / space), back with ←,
or leaves for the website (Esc / "Skip to the website"). Nothing is narrated:
the story is told in short comic boxes.

| # | Chapter | Project · node(s) | What you can do |
|---|---|---|---|
| 0 | Title | — | start the story, or go straight to the website (funded-by line with the Swedish Research Council) |
| 1 | Data in the dark | — | move the firefly's light over unreadable numbers; *Visualize it* gathers them into a tree, coloured by height |
| 2 | A forest of points | ForestVis · LNU | turn a 3D LiDAR-style plot; colour by height / NDVI; pick trees |
| 3 | Into the Amazon | Amazon from within · LNU | opens with a bridge from the ForestVis sketch: the light conifers un-draw while rainforest trees and vines draw in and the water rises (while the jaguar loads); then the project's 3D jaguar: on a limb in the wet season, on the forest floor (looking round, licking) in the dry one; terns crossing |
| 4 | Nine nodes, one infrastructure | all 43 projects on infravis.se | the collaboration network on a hand-drawn Sweden: nodes are the universities' emblems, sized by their projects; edges as thick as the projects two nodes share; hover a project, node or edge to light up its part of the network, click a project for its card |
| 5 | Your project next | InfraVis user support (infravis.se/services-resources) | the turn to the visitor: three steps drawn one by one — ask (help desk, free, first answer within three hours), meet an expert (mid-level, free, up to ~80 h), build it together (in-depth: annual call 300 SEK/h, otherwise 600 SEK/h) — and *Apply for support* / info@infravis.se |
| 6 | InfraVis | — | the nodes fly into the nine circles of the logo, it draws itself, the firefly lands on the yellow tip; *Enter InfraVis*: the website's bar slides in and the logo flies from the middle of the screen into its slot in the header |

Cut for length (kept in `viewer/src/story/scenes/`, one line each in
`story.js` to bring back): *Small things, big data* (Buzz Pollination,
Butterflies in VR, GenomeLens) and *Darkness matters*. Removed: *From forest
to fork* (the trade-flow chapter), replaced by the Amazon chapter's bridge.

**Next** walks through each chapter's beats before leaving it (Visualize →
greenness → pick a tree… → dry / wet season → a tour of four collaborations).

The website (`#site`) follows infravis.se today section by section (black
header, grey hero with the site's own three-layer wave, partner strip, the
call block and highlights carousel, the purple user-support section, the
footer), with a dark mode (partner logos in light monochrome) and gentle
motion: the wave layers breathe, curved lines drift, the carousel turns. The
firefly, smaller here, waits in the header while the page scrolls and, after
a few still seconds, perches on an edge of the interface in view. Content is
a placeholder from the current site and the projects database; what it
finally says is still to be decided.

The InfraVis logo in the website's header and footer, and in the story's
top bar, rebuilds itself now and then (and on hover): the arcs are drawn, the
nine nodes pop, the name is written letter by letter (`site/logoLoop.js`).

`viewer/firefly-lab.html` shows the 3D firefly and its two clips from any side.

```
assets/      sources, not served: official logos (InfraVis logo pack, partner SVGs),
             portraits (originals + people.json), the raw 3D models and their credits
pipeline/    Node scripts that turn assets/ into static/ (see PIPELINE.md)
static/      the public root the app serves: everything the browser downloads
viewer/      Vite app (src/), shot.mjs (headless screenshots through Edge)
  src/main.js         boot, one animation loop, story ↔ site routing
  src/story/          the scene manager (story.js) and one module per chapter (scenes/)
  src/site/           the website
  src/draw/           the hand-drawn look: ink.js (pen draw-in, boiling lines), sketches.js, firefly.js
  src/three/          the 3D bits: shared renderer (stage.js), firefly, point forest, jungle
  src/amazon/         jaguar rig + poses borrowed from the Amazon project (jaguar.js patched only for loading)
  src/data/           nodes, projects, people (generated)
  src/ui/             comic boxes, credits (faces, node badges), project mini-animations
```

## Phones

Every chapter and the website have a phone layout (`@media (max-width: 760px)`
in each scene's CSS, `site.css`): text on top and the 3D or map below, smaller
boxes and buttons, touch instead of hover (a finger leads the firefly, taps
replace hovers, the carousel swipes). The firefly's white/black silhouette is
rendered by the 3D shader itself, so it looks the same on every device. Any
change to the desktop version gets its phone equivalent, checked with
`node shot.mjs <hash> out.png size:390x844 mobile:1`.

## Performance

This is meant to be the front door of the main website, so it has to run on
any PC:

- First paint loads ~15 KB of JS+CSS (gzip). Every chapter is its own module,
  fetched when the chapter before it starts.
- three.js (~190 KB gzip) and the firefly (539 KB, full-resolution textures)
  are fetched after first paint (on the website, a few seconds after it has
  settled). Only this 3D firefly is ever shown: it fades in once loaded (the
  drawn one is a fallback for browsers without WebGL). Only chapters 2 and 4 use
  3D in the page, through one shared WebGL renderer (pixel ratio ≤ 1.5,
  rendering only while its chapter is on screen and the tab is visible).
- The heavy assets of the source projects are not brought in: no point-cloud
  streaming from ForestVis (the plot is generated in the browser), and the
  Amazon jaguar is cut from 8.5 MB to 0.9 MB (2 clips, 512 px WebP, meshopt)
  and loads only in its chapter, while the firefly loops with its light up.
- Maps are baked to SVG path data (Sweden 8 KB, world 14 KB gzip); portraits
  are 128 px WebP (93 KB for all 45).
- Animations that are not visible stop drawing; `prefers-reduced-motion`
  turns off the boiling lines, pen draw-ins and flights.

## Online

Every push to `main` builds the viewer and publishes it on GitHub Pages
(`.github/workflows/pages.yml`): https://claudiodgl.github.io/InfraVis_web/
(one-time setting: repository Settings → Pages → Source: *GitHub Actions*).

## Running

Requirements: Node 22 (a portable copy works: this was built with
`~/.local/tools/node-v22.20.0-win-arm64`). Microsoft Edge for `shot.mjs`.

```sh
cd viewer
npm ci
npm run dev          # http://localhost:5180
npm run build        # -> viewer/dist (static files; deploy anywhere)
```

Deep links: `#story/<chapter>` (e.g. `#story/amazon`), `#site`.

Screenshots for checking a change:

```sh
node shot.mjs "#story/forest" out.png wait:9000 click:".tool-row button:nth-child(2)" wait:800
```

## Still to decide / check

- The website's final content and structure.
- `verify: true` entries in `viewer/src/data/projects.js` (the Amazon
  project's credits and wording).
- Seven partner logos are taken from Wikipedia under fair use (see
  `assets/logos/partners/CREDITS.md`); before publishing, use each
  university's official brand files.
- Project images on the site are linked from infravis.se.

## Credits

See [CREDITS.md](CREDITS.md).

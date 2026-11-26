# WebGL portfolio — Astro 5 + Tailwind v4 + OGL

Motion-first, single-page-feel developer portfolio. The home page is a WebGL strip of image slices.
Clicking a slice opens a coloured preview, and from there you can open the project page. The canvas
and the animation loop stay alive across page changes.

## Quick start

```bash
npm install
npm run fetch:images   # downloads the placeholder images (already done once) + builds thumbnails
npm run dev            # http://localhost:4321
npm test               # vitest: math, easing, layout
npm run build          # astro check + static build to dist/
npm run preview
npm run verify         # (with preview running) screenshots of every state -> ./screenshots
```

## Editing content

| What | Where |
| --- | --- |
| Name, tagline, availability, socials, clients, awards, about heading | `src/data/site.ts` |
| Projects (title, colours, meta, images) | `src/content/projects/*.json` |
| Images | `public/images/projects/<slug>/cover.webp, 01.webp …` |

To use your own images, replace the files and **keep the same filenames**, then run
`npm run fetch:images` again. It skips files that already exist and rebuilds the thumbnails.
`cover` must also be the first entry of `images`. It is the WebGL texture and the first image on the
project page, so the hand-off between the two is seamless.

## Tuning the feel

All durations, easings, sizes, damping factors, bulge/skew strength, ruler geometry and so on live in
**`src/scripts/config.ts`**. Layout sizes there are also written into CSS custom properties
(`--prev-w`, `--proj-w`, …), so the DOM and WebGL always agree. Colours and fonts are tokens at the
top of `src/styles/global.css`. To swap the display font, change `--font-display`.

## How it works

```
src/scripts/
  app.ts               boots once; RAF state, input, page state machine, View Transition hooks
  config.ts            every tunable value
  motion/              raf (single loop, pauses when the tab is hidden), math (damp…), ease, tween
  gl/renderer.ts       OGL renderer; the camera is placed so 1 world unit = 1 CSS px
  gl/layout.ts         pure rect maths: gallery / preview / project layouts (unit tested)
  gl/slices.ts         one plane per project; blends the three layouts every frame
  gl/shaders/          bulge + velocity skew (vert), grey → colour → duotone (frag)
  input/wheel.ts       normalised wheel + touch + mouse drag → scroll delta, taps
  pages/               home (split title, explore), project (wipe, thumbs), about (scramble)
  ui/                  splitText, reveal, ruler, loader, scramble, corners
```

- **State machine:** `gallery ⇄ preview → project` (and back), plus `any ⇄ about`. Every transition
  is a 0..1 value being tweened (`preview`, `project`, `alpha`, `kf`). `gl/slices.ts` turns those
  values into plane rects.
- **Navigation:** Astro `<ClientRouter />`. `astro:before-preparation` runs the exit animation in
  parallel with the fetch. `astro:after-swap` restores the theme colours (Astro replaces `<html>`
  attributes on every swap), prepares the new page and starts its intro. `#gl`, the loader, the
  ruler, the logo and any corner that doesn't change are kept with `transition:persist`.
- **Preview → project hand-off:** the selected plane morphs to the project image rect. After the swap
  it lines up with the real `<img>`. The image is then revealed underneath the canvas, and the plane
  fades out on the next frame. Going back does the reverse. If you had switched to another image,
  it first wipes back to the cover.
- **Debugging:** `window.__portfolio()` returns a snapshot of the scene state and the measured FPS.

## Notes and deliberate deviations from the brief

- **Astro 5.18** was used, as specified (Astro 7 is current).
- **Sizes follow the reference screenshots** where they disagree with the brief. The strip starts at
  48% of the width (brief: ~40%), and the preview image is 48vw × 50vh (brief: 40vh). Both are in
  `config.ts`.
- **Font:** League Gothic (variable, self-hosted via Fontsource) for the logo and titles, chosen to
  match the very condensed face in the reference. Long titles are still shrunk to fit.
- **Pagination colour** is the accent `#CC9933`. It falls back to the text colour when the project
  colour is too close to the accent (for example, the gold project).
- **Neighbour tint** is a real duotone (shadows darker, highlights lighter than the page colour)
  rather than a multiply, because a multiply can't produce the lighter highlights seen in the
  reference.
- **Mobile (< 768px):** the strip stays horizontal with wider slices (18vw). Vertical *or* horizontal
  swipes scroll it. Project and about pages scroll natively, and the thumbnails become a row.
- **Reduced motion:** turns off the bulge, skew, parallax and intro offsets, and text uses opacity
  fades. The plane morphs between layouts are kept, because they show where the image went.
- **No WebGL:** the hidden project list is shown as plain links.

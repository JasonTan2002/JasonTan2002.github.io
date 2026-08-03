# Zixuan Tan — Academic Portfolio

An interactive academic homepage built with React, Three.js, and Vite.

## Structure

- `src/` — readable React, Three.js, styles, and source media
- `assets/` — generated files served directly by GitHub Pages
- `index.html` — deployed page entry

The repository intentionally has no `public/` directory. Source media is kept
under `src/media` and Vite emits the optimized deployment copy into `assets/`.

## Development

```bash
npm install
npm run dev
```

Run `npm run build` before publishing. GitHub Pages currently serves the
compiled `index.html` and `assets/` from `master`.

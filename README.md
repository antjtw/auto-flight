# AutoFlight

IPF-compliant powerlifting flight order builder for the YNEPF.

## Files

- `App.jsx` — top-level component with state, settings UI, file upload, share, print, dark-mode toggle
- `LiftingOrderView.jsx` — the order document (event header, days, sessions, flights, lifters)
- `primitives.jsx` — `Pill` and `Toggle` reusable components
- `theme.css` — full source palette as CSS variables, with light and dark schemes plus print styles
- `constants.js` — weight class orders, age category map, comp type map, CSV field aliases, sample lifters
- `utils.js` — pure helpers (number parsing, name formatting, weight class normalisation, OpenIPF URL rewriter, shuffle)
- `parseCsv.js` — standard CSV parser plus Square Online order export detector and parser
- `buildFlights.js` — flight packing algorithm (separation modes, even distribution, multi-day session distribution)
- `samples/dummy_entries_messy.csv` — fake messy CSV for testing the standard parser
- `samples/dummy_square_export.csv` — fake Square Online export for testing that parser path

## Dependencies

```
react
papaparse
lucide-react
tailwindcss
```

Tailwind is used for utility classes; the colour values come from CSS variables defined in `theme.css`, so Tailwind only needs to support `[var(--name)]` arbitrary values (this is default behaviour in Tailwind 3+).

## Wiring it in

Import `App` and render it as your root component:

```jsx
import App from "./autoflight/App.jsx";

export default function Root() {
  return <App />;
}
```

The `theme.css` is imported automatically by `App.jsx`, so you don't need to import it separately.

## Theme behaviour

The theme respects `prefers-color-scheme` by default. The toggle in the top bar cycles: auto → light → dark → auto. The chosen theme is persisted to `localStorage` under the key `autoflight-theme`.

The order document sits on a warm cream (`--bg-paper`, Iron Oxide 10) on screen so the rust accents read as cohesive. When you Save as PDF the print stylesheet forces it to plain white so you're not wasting ink.

## Sharing a configuration

The Share link button encodes the entire state (lifters, settings, event details, host division) into the URL hash and copies it to the clipboard. Anyone opening that link loads the same view. No backend involved.

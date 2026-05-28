# AutoFlight

IPF-compliant powerlifting flight order builder for the YNEPF.

## Running locally

You'll need Node 18 or newer.

```sh
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

## Building for production

```sh
npm run build
```

The static site lands in `dist/`. You can host it anywhere that serves static files — Vercel, Netlify, GitHub Pages, a plain S3 bucket, your own server.

To preview the built bundle locally before deploying:

```sh
npm run preview
```

## Deploying

The simplest route is Vercel or Netlify, both of which auto-detect Vite projects.

- **Vercel**: push to GitHub, then import the repo at https://vercel.com/new. No config needed.
- **Netlify**: same flow, drag the repo in at https://app.netlify.com/start.
- **GitHub Pages**: build locally then push the `dist/` folder to a `gh-pages` branch.

## Project layout

```
autoflight/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.jsx                 React entry point
│   ├── App.jsx                  Top-level component, state, settings UI, share, print
│   ├── LiftingOrderView.jsx     The order document
│   ├── primitives.jsx           Pill, Toggle
│   ├── theme.css                Tailwind directives + CSS variable palette + print styles
│   ├── constants.js             Class orders, age/comp maps, CSV field aliases, sample lifters
│   ├── utils.js                 Pure helpers (parsing, formatting, normalisation)
│   ├── parseCsv.js              Standard CSV plus Square Online detector and parser
│   └── buildFlights.js          Flight packing algorithm
└── public/
    └── samples/                 Synthetic sample CSVs for testing
        ├── dummy_entries_messy.csv
        └── dummy_square_export.csv
```

## How it works (briefly)

- **CSV parsing**: drop a CSV onto the upload box. The parser detects whether it's a standard column-mapped file or a Square Online order export, and dispatches accordingly. Square exports come as UTF-16 tab-separated with all the lifter data crammed inside a single "Item Modifiers" cell — the parser unpacks that into proper fields.
- **Weight class is the authoritative marker.** A lifter's sex is determined by the F or M prefix on their weight class (F63, M83, M120+, etc.). Any standalone "Male" or "Female" answer on a form is ignored. This keeps things trans-inclusive without making the organiser do anything special.
- **Flight building** respects IPF rules: 14 full-power lifters per flight, 20 total when bench-only mixes in, 20 for bench-only-only flights. Sessions group flights, days group sessions. The "How the order is built" expander explains the chosen configuration in plain English.
- **Theme**: light/dark with system-preference auto-detection. Toggle in the top bar cycles auto → light → dark → auto. Choice is persisted in `localStorage`.
- **Share**: encodes the full state (lifters, settings, event details) into the URL hash and copies to clipboard. No backend.
- **Save as PDF**: triggers the browser's print dialog with a print stylesheet that forces white backgrounds, keeps each day on its own page, and avoids breaking flights mid-card.

## Credit

Built by Ant `#FFF` ([@shred.kemper](https://instagram.com/shred.kemper)) for the YNEPF.

Built to the IPF Technical Rulebook (2026) flight and ordering conventions. Always check final orders against your federation's published rules.

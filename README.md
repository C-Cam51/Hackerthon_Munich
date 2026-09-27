# Graveyard of Dead Projects

Speed camera for renewable project developers, shown as an add-on inside a dvlp.energy-style web-GIS (integration mockup).

## Run
Open `index.html` in a browser, or run `python3 -m http.server` and go to http://localhost:8000.
Reset the demo state: run `resetDemo()` in the browser console.

## Where to change what
| What | File |
|---|---|
| Scoring, thresholds, start credits, map bounds | `CONFIG` at the top of `app.js` |
| Base cases, red/yellow zones, reasons, demo pipeline | `data.js` |
| Research data per region (auto-loaded) | `data/*.js` (push into `window.EXTRA_*`) |
| Colors | `:root` tokens in `style.css` |
| Layout / texts | `index.html` |

Leaflet is vendored in `vendor/` so the demo works without a CDN.

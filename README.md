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
| Research data per region | `data/*.js` (push into `window.EXTRA_*`), **register new files in `boot.js`** |
| Colors | `:root` tokens in `style.css` |
| Layout / texts | `index.html` |

Leaflet is vendored in `vendor/` so the demo works without a CDN.

## Safety nets
- **No stale cache:** `boot.js` loads CSS, data and app with a fresh `?v=` on every page load, so a push is live after the Pages deploy (~1 min). Changes to `index.html` markup itself may still need a hard reload (Ctrl+Shift+R).
- **Data check:** `node tools/validate.js` checks ids, reasons, status, tech, DACH coordinates and zone size (max 35 km). It runs on every push (GitHub Actions → "Validate data"); a red ✗ means the data must be fixed.

## Demo sites
Default demo sites are in `CONFIG.demos` (app.js). To re-place them without code: turn on **Satellite imagery** in the layer panel,
draw a free field with ✏️, open **Set up demo sites** in the demo bar and click **📌 Save as demo ①/②**. This is stored in the
browser (survives ↺ Reset); the shown coordinates can be pasted into `CONFIG.demos` to make them permanent.

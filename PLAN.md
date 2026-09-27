# Graveyard of Dead Projects – Implementation Plan (60 min)

> Working title (DE): *Friedhof der toten Projekte*. The prototype UI is in English.

## Pitch in one sentence
Only about 1 in 10 renewable-energy projects gets a grid connection. Every developer has a
"graveyard" of dead projects. We collect them and turn them into a **speed camera ("Blitzer")
for new projects**: before you invest, see whether your site looks like one that has already failed.

## Core rule: one in, one out
- Every dead project you upload earns **1 check credit**.
- Every check of a new project costs **1 credit**.
- 10 dead projects uploaded = 10 new projects checked.

## Views (tabs in one single-page app)
1. **Map** (OpenStreetMap / Leaflet, Germany)
   - Markers: dead projects (popup: name, technology, MW, failure reason, year).
   - **Red zones**: blocked grid areas → click shows *why* (e.g. substation overloaded) and *until when*.
   - **Yellow zones**: grid capacity expected to free up in 2–3 years (e.g. 10 MW)
     → button *"Express interest"* + counter *"5 other developers are already interested"*.
   - Everything else: white/unmarked = no information.
2. **Failure reasons** (search)
   - Search box + filter chips (Grid capacity, Permitting, Nature protection, Land lease,
     Local opposition, Economics, Military/radar ...) → list of example cases.
3. **Upload dead project** (form: name, technology, MW, location click on map or lat/lng,
   grid operator, failure reason category + free text, year) → +1 credit.
4. **Check new project** (form: technology, MW, location) → costs 1 credit →
   result: traffic light (red/yellow/green) + list of similar dead projects with similarity score
   + whether the location is inside a red/yellow zone.

## Tech stack (as simple as possible)
- Static `index.html` + `app.js` + `style.css`, no build step, no backend.
- Leaflet from CDN, OSM tiles.
- Seed data in `data.js` (≈25 fictitious dead projects, ≈6 red zones, ≈4 yellow zones as polygons).
- State (credits, uploads, interests) in `localStorage`.
- Demo: open `index.html` or serve via `python3 -m http.server`.

## Similarity logic ("Blitzer")
Score 0–100 per dead project:
- distance: < 10 km → +50, < 30 km → +30, < 60 km → +10
- same technology → +20
- similar size (±50 % MW) → +15
- same grid operator → +15
Plus: location inside red zone → **RED**; inside yellow zone → **YELLOW** (hint to express interest);
otherwise traffic light based on max score (≥ 60 red, ≥ 30 yellow, else green).

## Timeline
| min | task |
|-----|------|
| 0–10  | Skeleton: HTML, tabs, Leaflet map of Germany, credit badge |
| 10–20 | Seed data: dead projects, red + yellow zones; render on map with popups |
| 20–30 | Yellow zone "Express interest" + counter; red zone reason + blocked-until |
| 30–40 | Failure-reason search view with filter chips and example cards |
| 40–50 | Upload form (+1 credit) and check form (−1 credit) with similarity result |
| 50–60 | Polish, demo story, README, push |

## Demo script (2 min)
1. Problem: 9 of 10 projects die, grid info is intransparent and only valid for today.
2. Map: red areas (blocked until 2029, why), yellow area (10 MW frees up 2027, 5 developers interested).
3. Search "grid": real-looking example failures.
4. Try to check a project with 0 credits → blocked. Upload a dead project → +1 credit.
5. Check new 20 MW solar park near a graveyard → RED, 3 similar dead projects shown.

## Out of scope for the prototype
Login, real backend, real grid-operator data, verification of uploads, anonymisation.

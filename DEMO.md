# Live demo script – Graveyard of Dead Projects

**Length:** about 2 minutes. **Live URL:** https://c-cam51.github.io/Hackerthon_Munich/
The pitch comes before this; the script covers only the clicks. Quoted labels are exactly what's on screen.

---

## 0. Before you go on stage (checklist)

| ✓ | Do this |
|---|---|
| ☐ | Open the live URL in Chrome/Firefox, **full screen** (F11 / Ctrl+Cmd+F), laptop on power, notifications off |
| ☐ | Hard reload: **Ctrl+Shift+R** (Mac: **Cmd+Shift+R**) |
| ☐ | Click **Reset** (in the right-hand panel, "Check site" tab, Demo bar). Page reloads |
| ☐ | Check the header shows **2 credits**. The **Projects** page should list "Solar park Uckermark West" with Stage **Stopped** and a **Bury · +1 credit** button (then go back to **🗺️ Site search**) |
| ☐ | Browser zoom 100% (Ctrl/Cmd+0). If the right panel covers too much of the map on a projector, try 90% |
| ☐ | Map shows the whole DACH region (the start view). Close any open map popup (× or Esc) |
| ☐ | Do a full dry run, then **Reset** again. The demo spends credits and stores them in localStorage |
| ☐ | **Backup:** in a second tab, run `python3 -m http.server` in the repo folder and open http://localhost:8000. Leaflet is vendored, so only the OSM map tiles need internet |

---

## 1. Live steps

The screen: dvlp.energy host on the left (**Site search / Projects / Grid connection**, add-on **🪦 Graveyard**). On the right is the add-on panel **🪦 Graveyard of Dead Projects** with the tabs **Check site · Failure reasons · Bury project**.

| # | Click | What appears | Say (one line) |
|---|---|---|---|
| 1 | Nothing; point at the right-hand panel | Panel "🪦 Graveyard of Dead Projects", "One in, one out", counter **2 credits** | "This is our add-on inside dvlp.energy. Every developer starts with two checks." |
| 2 | **Demo 1 · Risky site** (Demo bar) | The map flies to Speichersdorf in Upper Franconia and a blue site polygon is drawn. The form fills in "Solar park Speichersdorf Süd", Solar, 25 MW. Wait about 2 s until "Site drawn · … ha" appears | "Say I want to build a 25 MW solar park in Upper Franconia." |
| 3 | **Run graveyard check · 1 credit** | Red verdict **"A comparable project already failed here"**. Below it is the box **"Previous attempt at this site (2025)"**: **Solarpark Haidenaab**, 2.7 km away · Abandoned, tags *Opposition / permitting* and *Land / municipality*. **Why it failed:** "In Speichersdorf's first-ever citizens' vote on 29 June 2025, the council's motion for the Haidenaab solar park lost 772 to 1,106. A citizens' petition also passed that bars the municipality from providing its land for ground-mounted PV…". Then "Similar dead projects (5)". Credits drop to **1** | "Flash! Someone tried right next door last year, and the town voted it down. The land is legally off the table. That's months of work saved." |
| 4 | **Demo 2 · Clear site** → wait for the polygon → **Run graveyard check · 1 credit** | The map flies to open farmland in the Ochsenfurter Gau (Lower Franconia). Green verdict **"No failed projects nearby"**: "No failed projects within 60 km and no known grid restriction at this site." Credits drop to **0** | "Same check on farmland in Lower Franconia. No graves, so go ahead." |
| 5 | **Run graveyard check · 1 credit** again | Red box **"No credits left"**: "One in, one out: bury one of your dead projects first to unlock a check." | "Now I'm out of checks. It works like a library: to take something out, you have to give something back." |
| 6 | Left sidebar **📁 Projects** | "Project pipeline" table. The row **Solar park Uckermark West** (Solar, 80 MW, Uckermark, BB) has Stage **Stopped** | "This is my pipeline in dvlp. This project is already dead." |
| 7 | In that row: **Bury · +1 credit** | A dialog opens: **Bury "Solar park Uckermark West"**, "Why did it die?" (*Grid connection* is already ticked) | "One click, and the reason is already filled in." |
| 8 | **Bury · +1 credit** | The dialog closes. The row now shows **"Added to graveyard · +1 credit"** and the credit counter jumps to **1** | "Buried. My failure is now data for everyone, and I get a check back." |
| 9 | Left sidebar **🗺️ Site search** | The map is back. The new grave is a red dot in Uckermark, north-east of Berlin | "And it's on the map right away." |

**Stop here if time is short (about 1:30).**

### Optional (+30–40 s)

| # | Click | What appears | Say |
|---|---|---|---|
| 10 | **Red zone:** zoom to **south of Nuremberg**, around **Roth / Schwabach** (about 20 km south of Nuremberg city centre). Click the **empty red area**, not a grave dot | Popup **"🔴 Roth / Schwabach / Wendelstein PV connection stop"**, Grid operator N-ERGIE Netz. **Why blocked:** "Upstream N-ERGIE lines are overloaded…" **Blocked until:** "Open-ended; N-ERGIE is expanding the grid (about 100 construction sites by 2028)" | "Red means the grid is blocked. You see why and until when, before you spend a euro." |
| 11 | **Yellow zone:** go to **Lower Bavaria, on the Danube about 10–15 km east of Straubing (Irlbach)** and click the yellow circle | Popup **"🟡 New substation Irlbach"**: "**230 MW** connection capacity expected to free up from **2028**", Grid operator Bayernwerk Netz, "**3** other developers already expressed interest." Button **Express interest** | "Yellow means capacity is freeing up. I see three others are already interested." |
| 12 | **Express interest** | The button changes to **"Interest registered"** | "One click, and the brokerage team knows I want it." |
| 13 | Panel tab **Failure reasons** → type `grid` in the search box | Insight "**69** dead projects from **45** developers are already public on the internet. Developers do share their failures.", bar chart by reason, and cards filtered to grid cases, each with **Source ↗** and **Show on map →** | "Every grave is searchable by reason, and each one has a source." |

Alternative yellow zone (more interest): **"LEW Einspeisesteckdose Balzhausen"**, between Augsburg and Günzburg in Bavarian Swabia (about 30 km west of Augsburg). 80 MW from 2025, 7 interested. It overlaps the yellow zone "Bavarian Swabia 'feed-in socket' round 2", so the click can open either one.

---

## 2. If something goes wrong

| Symptom | Fix |
|---|---|
| Map tiles are grey or blank, but circles and dots still show | Network or OSM problem. Keep talking, since the verdicts still work without tiles. Switch to hotspot or the backup tab |
| Credits aren't 2 at the start, Uckermark is already "Buried", or the state looks odd | Click **Reset** (Check site tab). It clears localStorage and reloads |
| Page looks unstyled or old | Hard reload **Ctrl/Cmd+Shift+R**, then **Reset** |
| Demo button pressed but no verdict | The demo button only draws the site. Click **Run graveyard check · 1 credit** afterwards |
| Clicked too early, mid-animation | Wait until "Site drawn · … ha" appears, then run the check (or press the demo button again) |
| "No credits left" too early (for example at step 3) | Credits were already used. **Reset**, then restart at step 2 |
| Clicking a zone opens a project popup instead | You hit a grave dot. Close the popup and click an empty spot inside the circle |
| Map got stuck in draw mode (cursor changes, "Click the corners of your site") | Click **✓ Finish drawing** |
| Wrong panel tab visible | Click **Check site** in the panel, or **🪦 Graveyard** in the sidebar |
| Bury dialog closed without a credit | You pressed **Cancel**. Click **Bury · +1 credit** again |
| Live URL unreachable | Backup: `python3 -m http.server` in the repo folder, then http://localhost:8000 |

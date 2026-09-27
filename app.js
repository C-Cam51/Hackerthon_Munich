// Graveyard of Dead Projects – prototype embedded in a dvlp.energy-style host shell.
// No backend: state lives in localStorage. Data lives in data*.js. Tweak behaviour in CONFIG.

const CONFIG = {
  startCredits: 2,      // demo version starts with two free checks
  maxZoneRadiusKm: 10,  // zones must be substation-local; larger ones are ignored
  mapBounds: [[45.8, 5.8], [55.1, 17.2]], // DACH
  // similarity scoring for the "speed camera" check
  distance: [{ km: 10, pts: 50 }, { km: 30, pts: 30 }, { km: 60, pts: 10 }],
  sameTech: 20,
  similarSize: 15,      // within ±sizeTolerance
  sizeTolerance: 0.5,
  sameOperator: 15,
  minMatchScore: 25,    // show matches from this score
  maxMatches: 5,
  redAt: 60,            // score ≥ → red
  yellowAt: 30,         // score ≥ → yellow
  // demo scenarios for the pitch: polygon corners [lat, lng]
  demos: [
    { name: "Solar park Speichersdorf Süd", tech: "solar", mw: 25, operator: "",
      polygon: [[49.8552, 11.7485], [49.8555, 11.7555], [49.8510, 11.7560], [49.8507, 11.7490]] },   // open land SW of Speichersdorf, ~3 km from failed Solarpark Haidenaab (2025)
    { name: "Solar park Ochsenfurter Gau", tech: "solar", mw: 25, operator: "",
      polygon: [[49.6222, 10.0765], [49.6225, 10.0835], [49.6180, 10.0840], [49.6177, 10.0770]] },   // farmland between Aub and Ippesheim, no graves within 60 km
  ],
  triedHereKm: 10,      // "someone already tried here" if a dead project is this close
  stages: ["Site search", "Grid request", "Permitting", "Built", "Stopped"],
};

// ---------- Data sources: data.js + every data/*.js file (they push into window.EXTRA_*) ----------
const valid = p => p && REASONS[p.reasons?.[0]] && STATUS[p.status] && TECH_OK.includes(p.tech) && isFinite(p.lat) && isFinite(p.lng);
const TECH_OK = ["solar", "wind", "storage"];
const PROJECTS = [...SEED_PROJECTS, ...(window.EXTRA_PROJECTS || [])]
  .map(p => ({ ...p, reasons: (p.reasons || []).filter(r => REASONS[r]) })).filter(valid);
const localZone = z => z.radiusKm <= CONFIG.maxZoneRadiusKm || (console.warn("zone too large, ignored:", z.id), false);
const REDS = [...RED_ZONES, ...(window.EXTRA_RED_ZONES || [])].filter(localZone);
const YELLOWS = [...YELLOW_ZONES, ...(window.EXTRA_YELLOW_ZONES || [])].filter(localZone);

// ---------- State ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem("gdp2_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("gdp2_" + k, JSON.stringify(v)); } catch {} },
};
const state = {
  credits: store.get("credits", CONFIG.startCredits),
  buried: store.get("buried", []),        // projects uploaded by the user
  interests: store.get("interests", {}),  // yellow zone id -> true
  pipeline: store.get("pipeline", DEMO_PIPELINE),
};
function save() { Object.entries(state).forEach(([k, v]) => store.set(k, v)); }
window.resetDemo = () => { ["credits", "buried", "interests", "pipeline"].forEach(k => localStorage.removeItem("gdp2_" + k)); location.reload(); };

const allProjects = () => [...PROJECTS, ...state.buried];
const TECH = { solar: "Solar", wind: "Wind", storage: "Storage" };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function setCredits(delta) {
  state.credits += delta; save();
  const el = $("#credit-count");
  el.textContent = state.credits;
  $("#credit-label").textContent = state.credits === 1 ? "credit" : "credits";
  el.parentElement.classList.remove("bump"); void el.offsetWidth; el.parentElement.classList.add("bump");
}

// ---------- Navigation ----------
function showHost(name) {
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.host === name && !b.dataset.mod));
  $$(".host-view").forEach(v => v.classList.toggle("active", v.id === "host-" + name));
  if (name === "map") setTimeout(() => map.invalidateSize(), 0);
  if (name === "projects") renderPipeline();
  if (name === "grid") renderGrid();
}
function showMod(name) {
  $$(".mtab").forEach(b => b.classList.toggle("active", b.dataset.mod === name));
  $$(".mod").forEach(m => m.classList.toggle("active", m.id === "mod-" + name));
}
$$(".nav-item").forEach(b => b.addEventListener("click", () => { showHost(b.dataset.host); if (b.dataset.mod) showMod(b.dataset.mod); }));
$$(".mtab").forEach(b => b.addEventListener("click", () => showMod(b.dataset.mod)));
window.showHost = showHost; window.showMod = showMod;

// ---------- Rendering helpers ----------
const tags = rs => rs.map(r => `<span class="tag" style="background:${REASONS[r].color}">${REASONS[r].label}</span>`).join("");

function projectHtml(p) {
  return `<h4>${esc(p.name)}</h4>
    <div class="meta">${esc(p.developer || "Anonymous developer")} · ${TECH[p.tech]}${p.mw ? " · " + p.mw + " MW" : ""}${p.place ? " · " + esc(p.place) : ""} · ${p.year}</div>
    <div>${tags(p.reasons)} <span class="status">${STATUS[p.status]}</span></div>
    <p>${esc(p.text)}</p>
    ${p.quote ? `<blockquote>„${esc(p.quote)}“</blockquote>` : ""}
    ${p.weakSource ? `<div class="warn">⚠ Secondary source – verify</div>` : ""}
    ${p.source ? `<a href="${esc(p.source)}" target="_blank" rel="noopener">Source ↗</a>` : `<span class="muted">Buried by a developer (anonymised)</span>`}`;
}

const interestCount = z => z.baseInterest + (state.interests[z.id] ? 1 : 0);
function interestBtn(z) {
  const mine = !!state.interests[z.id];
  return `<button type="button" class="small-btn ${mine ? "done" : ""}" data-int="${z.id}" onclick="toggleInterest('${z.id}', event)">${mine ? "✓ Interest expressed" : "Express interest"}</button>`;
}
function yellowHtml(z) {
  return `<div class="popup"><h4>🟡 ${esc(z.name)}</h4>
    <p><b>${z.mw} MW</b> connection capacity expected to free up from <b>${esc(z.from)}</b>.</p>
    ${z.operator ? `<p>Grid operator: ${esc(z.operator)}</p>` : ""}
    ${z.note ? `<p class="muted">${esc(z.note)}</p>` : ""}
    <p><b>${z.baseInterest}</b> other developers already expressed interest.</p>
    ${interestBtn(z)}</div>`;
}
function redHtml(z) {
  return `<div class="popup"><h4>🔴 ${esc(z.name)}</h4>
    ${z.operator ? `<p>Grid operator: ${esc(z.operator)}</p>` : ""}
    <p><b>Why blocked:</b> ${esc(z.why)}</p>
    <p><b>Blocked until:</b> ${esc(z.until)}</p>
    ${z.techs ? `<p><b>Applies to:</b> ${z.techs.map(t => TECH[t]).join(", ")} only</p>` : ""}
    <p class="muted">Area approximate (substation catchment).</p></div>`;
}

// ---------- Map ----------
const map = L.map("map", { zoomSnap: 0.5 }).fitBounds(CONFIG.mapBounds);
const streetTiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
const satTiles = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagery &copy; Esri" });
$("#sat-toggle").addEventListener("change", e => {
  if (e.target.checked) { map.removeLayer(streetTiles); satTiles.addTo(map).bringToBack(); }
  else { map.removeLayer(satTiles); streetTiles.addTo(map).bringToBack(); }
});

const POPUP = () => ({ maxWidth: Math.min(320, window.innerWidth - 90), autoPanPaddingTopLeft: L.point(window.innerWidth > 900 ? 270 : 20, 20), autoPanPaddingBottomRight: L.point(20, 20) });
const layers = { red: L.layerGroup().addTo(map), yellow: L.layerGroup().addTo(map), graves: L.layerGroup().addTo(map) };
const yellowCircles = {};
REDS.forEach(z => L.circle([z.lat, z.lng], { radius: z.radiusKm * 1000, color: "#d62828", weight: 2, fillOpacity: .35 }).bindPopup(redHtml(z), POPUP()).addTo(layers.red));
YELLOWS.forEach(z => {
  yellowCircles[z.id] = L.circle([z.lat, z.lng], { radius: z.radiusKm * 1000, color: "#c99a00", weight: 2, fillColor: "#f4c20d", fillOpacity: .4 })
    .bindPopup(() => yellowHtml(z), POPUP()).addTo(layers.yellow);
});
function renderGraves() {
  layers.graves.clearLayers();
  allProjects().forEach(p => L.circleMarker([p.lat, p.lng], { radius: 7, color: "#fff", weight: 2, fillColor: REASONS[p.reasons[0]].color, fillOpacity: 1 })
    .bindPopup(`<div class="popup">${projectHtml(p)}</div>`, POPUP()).addTo(layers.graves));
}
$$("[data-layer]").forEach(cb => cb.addEventListener("change", () => cb.checked ? layers[cb.dataset.layer].addTo(map) : map.removeLayer(layers[cb.dataset.layer])));

window.toggleInterest = (id, ev) => {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  state.interests[id] = !state.interests[id]; save();
  const z = YELLOWS.find(y => y.id === id), mine = !!state.interests[id];
  // update every button/counter for this zone in place (popup, check result, grid tab)
  $$(`[data-int="${id}"]`).forEach(b => { b.classList.toggle("done", mine); b.textContent = mine ? "✓ Interest expressed" : "Express interest"; });
  $$(`[data-count="${id}"]`).forEach(s => { s.textContent = interestCount(z); });
};

// Map click sets the location of the active form (check or bury)
let pin = null;
function setPin(lat, lng) {
  const form = $("#mod-bury").classList.contains("active") ? $("#upload-form") : $("#check-form");
  form.lat.value = lat.toFixed(4); form.lng.value = lng.toFixed(4);
  pin ? pin.setLatLng([lat, lng]) : (pin = L.marker([lat, lng]).addTo(map));
}
map.doubleClickZoom.disable();
map.on("click", e => {
  if (drawing) {
    drawPts.push([e.latlng.lat, e.latlng.lng]);
    clearShape(); drawShape = L.polygon(drawPts, { color: "#1d4ed8", weight: 3, dashArray: "4", fillOpacity: .15 }).addTo(map);
    drawInfo.textContent = `${drawPts.length} corners · double-click or ✓ to finish`;
    return;
  }
  if ($("#mod-reasons").classList.contains("active")) showMod("check");
  if (!$("#mod-bury").classList.contains("active")) { clearShape(); drawInfo.textContent = "Point selected · or ✏️ draw the site"; }
  setPin(e.latlng.lat, e.latlng.lng);
});

// ---------- Drawing a site (polygon) ----------
let drawing = false, drawPts = [], drawShape = null;
const drawBtn = $("#draw-btn"), drawInfo = $("#draw-info");
function clearShape() { if (drawShape) map.removeLayer(drawShape); drawShape = null; }
function areaHa(pts) { // shoelace on a local projection
  const lat0 = pts[0][0] * Math.PI / 180, R = 6371000;
  const xy = pts.map(([la, ln]) => [ln * Math.PI / 180 * R * Math.cos(lat0), la * Math.PI / 180 * R]);
  let s = 0; xy.forEach((p, i) => { const q = xy[(i + 1) % xy.length]; s += p[0] * q[1] - q[0] * p[1]; });
  return Math.abs(s / 2) / 10000;
}
function setSite(pts) {
  clearShape();
  drawShape = L.polygon(pts, { color: "#1d4ed8", weight: 3, fillOpacity: .25 }).addTo(map);
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length, lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const f = $("#check-form"); f.lat.value = lat.toFixed(4); f.lng.value = lng.toFixed(4);
  if (pin) { map.removeLayer(pin); pin = null; }
  drawInfo.textContent = `Site drawn · ${areaHa(pts).toFixed(1)} ha`;
  lastSite = pts;
}
function stopDrawing() {
  drawing = false; document.body.classList.remove("drawing");
  drawBtn.classList.remove("active"); drawBtn.textContent = "✏️ Draw site on map";
  if (drawPts.length >= 3) setSite(drawPts); else { clearShape(); drawInfo.textContent = "or click the map for a point"; }
}
drawBtn.addEventListener("click", () => {
  if (drawing) return stopDrawing();
  drawing = true; drawPts = []; clearShape();
  document.body.classList.add("drawing");
  drawBtn.classList.add("active"); drawBtn.textContent = "✓ Finish drawing";
  drawInfo.textContent = "Click the corners of your site";
});
map.on("dblclick", e => { if (drawing) { L.DomEvent.stop(e); stopDrawing(); } });

// Demo sites can be re-placed in the UI ("Save as demo"); stored separately so Reset keeps them.
const demoOverrides = (() => { try { return JSON.parse(localStorage.getItem("gdp_demo_sites") || "{}"); } catch { return {}; } })();
let lastSite = null;
window.saveDemo = i => {
  if (!lastSite) return alert("Draw a site first (✏️ Draw site on map).");
  demoOverrides[i] = lastSite;
  try { localStorage.setItem("gdp_demo_sites", JSON.stringify(demoOverrides)); } catch {}
  const coords = JSON.stringify(lastSite.map(([la, ln]) => [+la.toFixed(4), +ln.toFixed(4)]));
  $("#demo-coords").innerHTML = `Saved as demo ${i + 1}. Coordinates (send to dev to make permanent):<br><code>${coords}</code>`;
};
window.clearDemoSites = () => { try { localStorage.removeItem("gdp_demo_sites"); } catch {} location.reload(); };

async function runDemo(i) {
  const d = { ...CONFIG.demos[i], ...(demoOverrides[i] ? { polygon: demoOverrides[i] } : {}) }, f = $("#check-form");
  showHost("map"); showMod("check"); if (drawing) stopDrawing();
  $("#check-result").innerHTML = "";
  f.pname.value = d.name; f.tech.value = d.tech; f.mw.value = d.mw; f.operator.value = d.operator;
  map.flyToBounds(L.latLngBounds(d.polygon).pad(6), { duration: 1.2 });
  await new Promise(r => setTimeout(r, 1300));
  clearShape();
  for (let k = 1; k <= d.polygon.length; k++) {   // animate drawing corner by corner
    clearShape(); drawShape = L.polygon(d.polygon.slice(0, k), { color: "#1d4ed8", weight: 3, fillOpacity: .25 }).addTo(map);
    await new Promise(r => setTimeout(r, 250));
  }
  setSite(d.polygon);
}
$$("[data-demo]").forEach(b => b.addEventListener("click", () => runDemo(+b.dataset.demo)));

// ---------- Failure reasons ----------
let activeReason = null;
function renderChips() {
  $("#chips").innerHTML = Object.entries(REASONS).map(([k, r]) =>
    `<button class="chip ${activeReason === k ? "active" : ""}" data-r="${k}" style="${activeReason === k ? "background:" + r.color : ""}">${r.label}</button>`).join("");
  $$("#chips .chip").forEach(c => c.addEventListener("click", () => { activeReason = activeReason === c.dataset.r ? null : c.dataset.r; renderChips(); renderResults(); }));
}
function renderStats() {
  const ps = allProjects();
  const counts = Object.keys(REASONS).map(k => [k, ps.filter(p => p.reasons.includes(k)).length]);
  const max = Math.max(1, ...counts.map(c => c[1]));
  const abandoned = ps.filter(p => p.status === "abandoned");
  const gridMain = abandoned.filter(p => p.reasons[0] === "grid").length;
  const gridUndead = ps.filter(p => p.reasons.includes("grid") && p.status !== "abandoned").length;
  const devs = new Set(PROJECTS.map(p => p.developer).filter(Boolean)).size;
  $("#stats").innerHTML = `<div class="insight"><b>${PROJECTS.length}</b> dead projects from <b>${devs}</b> developers are already public on the internet. Developers do share their failures.</div>
    <div class="insight">Of <b>${abandoned.length}</b> publicly abandoned projects, only <b>${gridMain}</b> name the grid as main reason, but <b>${gridUndead}</b> grid cases are "undead" (on hold, delayed, in court). Grid deaths stay silent. Bury yours.</div>
    ${counts.map(([k, n]) => `<div class="bar-row"><span>${REASONS[k].label}</span><div class="bar" style="width:${n / max * 100}%;background:${REASONS[k].color}"></div><span>${n}</span></div>`).join("")}`;
}
function renderResults() {
  const q = $("#search").value.trim().toLowerCase();
  const list = allProjects().filter(p => {
    if (activeReason && !p.reasons.includes(activeReason)) return false;
    const hay = [p.name, p.developer, p.place, p.text, p.quote, p.operator, STATUS[p.status], TECH[p.tech], ...p.reasons.map(r => REASONS[r].label)].join(" ").toLowerCase();
    return q.split(/\s+/).every(w => hay.includes(w));
  });
  $("#results").innerHTML = list.length
    ? list.map(p => `<div class="card">${projectHtml(p)}<div><button class="linklike" data-fly="${p.id}">Show on map →</button></div></div>`).join("")
    : `<p class="muted">No graves match. Maybe you have one to bury?</p>`;
  $$("[data-fly]").forEach(b => b.addEventListener("click", () => {
    const p = allProjects().find(x => x.id === b.dataset.fly);
    map.setView([p.lat, p.lng], 11);
    layers.graves.eachLayer(l => { const ll = l.getLatLng(); if (ll.lat === p.lat && ll.lng === p.lng) l.openPopup(); });
  }));
}
$("#search").addEventListener("input", renderResults);

// ---------- Bury (upload) ----------
const reasonBoxes = (checked = ["grid"]) => Object.entries(REASONS).map(([k, r]) =>
  `<label><input type="checkbox" name="reasons" value="${k}" ${checked.includes(k) ? "checked" : ""}> ${r.label}</label>`).join("");
$("#reason-boxes").innerHTML = reasonBoxes();
$("#status-select").innerHTML = Object.entries(STATUS).map(([k, s]) => `<option value="${k}">${s}</option>`).join("");

function bury(p) {
  state.buried.push({ id: "u" + Date.now(), developer: "", place: "", source: "", year: 2026, status: "abandoned", ...p });
  setCredits(+1);
  renderGraves(); renderStats(); renderResults();
}

$("#upload-form").addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target, msg = $("#upload-msg");
  const reasons = [...f.querySelectorAll("input[name=reasons]:checked")].map(i => i.value);
  if (!reasons.length) { msg.className = "msg err"; msg.textContent = "Pick at least one reason."; return; }
  bury({ name: f.pname.value, tech: f.tech.value, mw: +f.mw.value, lat: +f.lat.value, lng: +f.lng.value, operator: f.operator.value,
    reasons, status: f.status.value, year: +f.year.value, text: f.text.value || "No details given." });
  msg.className = "msg ok"; msg.textContent = `🪦 "${f.pname.value}" rests in peace. +1 credit.`;
  f.pname.value = ""; f.text.value = "";
});

// ---------- Check (the speed camera) ----------
function km(a, b) {
  const r = d => d * Math.PI / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
function similarity(np, p) {
  const d = km(np, p), why = [];
  let score = 0;
  const band = CONFIG.distance.find(b => d < b.km);
  if (band) { score += band.pts; why.push(`${d < 10 ? d.toFixed(1) : d.toFixed(0)} km away`); }
  if (np.tech === p.tech) { score += CONFIG.sameTech; why.push("same technology"); }
  if (p.mw && np.mw && Math.abs(np.mw - p.mw) <= CONFIG.sizeTolerance * p.mw) { score += CONFIG.similarSize; why.push("similar size"); }
  if (np.operator && p.operator && np.operator.toLowerCase() === p.operator.toLowerCase()) { score += CONFIG.sameOperator; why.push("same grid operator"); }
  return { p, d, score: Math.min(100, score), why };
}

function runCheck(np) {
  const out = $("#check-result");
  if (state.credits < 1) {
    out.innerHTML = `<div class="verdict red"><h3>No credits left</h3>One in, one out: bury one of your dead projects first to unlock a check.
      <button class="primary" type="button" onclick="showMod('bury')">Bury a project</button></div>`;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  setCredits(-1);
  const appliesTo = (z, tech) => !z.techs || z.techs.includes(tech);
  const inRed = REDS.find(z => km(np, z) <= z.radiusKm && appliesTo(z, np.tech));
  const inYellow = YELLOWS.find(z => km(np, z) <= z.radiusKm && appliesTo(z, np.tech));
  const matches = allProjects().filter(p => p.status !== "revived").map(p => similarity(np, p)).filter(m => band(m) && m.score >= CONFIG.minMatchScore)
    .sort((a, b) => b.score - a.score).slice(0, CONFIG.maxMatches);
  const top = matches[0]?.score || 0;

  const tried = matches.find(m => m.d <= CONFIG.triedHereKm);
  const triedHtml = tried ? `<div class="tried">
      <h4>⚠ Someone already tried here${tried.p.year ? " in " + tried.p.year : ""}</h4>
      <p><b>${esc(tried.p.name)}</b>, ${tried.d.toFixed(1)} km away · ${STATUS[tried.p.status]}</p>
      <p>${tags(tried.p.reasons)}</p>
      <p><b>Why it failed:</b> ${esc(tried.p.text)}</p>
      ${tried.p.quote ? `<blockquote>„${esc(tried.p.quote)}“</blockquote>` : ""}
      ${tried.p.source ? `<a href="${esc(tried.p.source)}" target="_blank" rel="noopener">Source ↗</a>` : ""}</div>` : "";

  let level, title, body;
  if (inRed) { level = "red"; title = "🔴 Flash! Grid blocked here"; body = `<b>${esc(inRed.name)}</b><br>${esc(inRed.why)}<br><b>Until:</b> ${esc(inRed.until)}`; }
  else if (inYellow) { level = "yellow"; title = "🟡 Capacity expected to free up"; body = `${inYellow.mw} MW from ${esc(inYellow.from)} at <b>${esc(inYellow.name)}</b>. <span data-count="${inYellow.id}">${interestCount(inYellow)}</span> developers interested.<br>${interestBtn(inYellow)}`; }
  else if (top >= CONFIG.redAt) { level = "red"; title = "🔴 Watch out! This site has a grave"; body = "A very similar project right here has already failed. Check the reasons before you invest."; }
  else if (top >= CONFIG.yellowAt) { level = "yellow"; title = "🟡 Caution"; body = "Similar projects in the region failed. Check the reasons below."; }
  else { level = "green"; title = "🟢 No dead projects nearby"; body = `No failed projects within ${CONFIG.distance.at(-1).km} km and no blocked grid area. Go ahead: no known graves here.`; }

  const pname = $("#check-form").pname.value.trim();
  out.innerHTML = `<div class="verdict ${level}">${pname ? `<div class="muted" style="color:inherit;opacity:.85">${esc(pname)}</div>` : ""}<h3>${title}</h3><div>${body}</div>${triedHtml}</div>
    <h4 style="margin:14px 0 4px">Similar dead projects (${matches.length})</h4>
    ${matches.length ? matches.map(m => `<div class="match"><span class="score">${m.score}%</span> · <b>${esc(m.p.name)}</b> ${tags(m.p.reasons)}<br>
      <span class="muted">${m.why.join(" · ")}: ${esc(m.p.text)}</span></div>`).join("") : `<p class="muted">None within ${CONFIG.distance.at(-1).km} km.</p>`}`;
  out.scrollIntoView({ behavior: "smooth", block: "start" });
}
const band = m => m.d < CONFIG.distance.at(-1).km;

$("#check-form").addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target;
  runCheck({ tech: f.tech.value, mw: +f.mw.value, operator: f.operator.value.trim(), lat: +f.lat.value, lng: +f.lng.value });
});

// ---------- Host: project pipeline ----------
function renderPipeline() {
  $("#pipeline-body").innerHTML = state.pipeline.map(p => {
    const dead = p.stage === "Stopped";
    const action = p.buried ? `<span class="buried">🪦 Buried · +1 credit earned</span>`
      : dead ? `<button class="small-btn" data-bury="${p.id}">🪦 Bury · +1 credit</button>`
      : `<button class="small-btn ghost" data-check="${p.id}">Graveyard check · 1 credit</button>`;
    return `<tr class="${dead ? "dead" : ""}"><td><b>${esc(p.name)}</b></td><td>${TECH[p.tech]}</td><td>${p.mw}</td><td>${esc(p.place)}</td>
      <td><select data-stage="${p.id}" ${p.buried ? "disabled" : ""}>${CONFIG.stages.map(s => `<option ${s === p.stage ? "selected" : ""}>${s}</option>`).join("")}</select></td>
      <td>${action}</td></tr>`;
  }).join("");
  $$("[data-stage]").forEach(s => s.addEventListener("change", () => { pipe(s.dataset.stage).stage = s.value; save(); renderPipeline(); }));
  $$("[data-bury]").forEach(b => b.addEventListener("click", () => openBuryDialog(pipe(b.dataset.bury))));
  $$("[data-check]").forEach(b => b.addEventListener("click", () => {
    const p = pipe(b.dataset.check), f = $("#check-form");
    showHost("map"); showMod("check");
    f.tech.value = p.tech; f.mw.value = p.mw; f.operator.value = p.operator;
    setPin(p.lat, p.lng); map.setView([p.lat, p.lng], 9);
    runCheck(p);
  }));
}
const pipe = id => state.pipeline.find(p => p.id === id);

let buryTarget = null;
function openBuryDialog(p) {
  buryTarget = p;
  $("#bury-title").textContent = `Bury "${p.name}"`;
  $("#dialog-reasons").innerHTML = reasonBoxes();
  $("#bury-dialog-form").text.value = "";
  $("#bury-dialog").showModal();
}
$("#bury-dialog").addEventListener("close", () => {
  if ($("#bury-dialog").returnValue !== "ok" || !buryTarget) return;
  const f = $("#bury-dialog-form");
  const reasons = [...f.querySelectorAll("input[name=reasons]:checked")].map(i => i.value);
  const p = buryTarget;
  bury({ name: p.name, tech: p.tech, mw: p.mw, lat: p.lat, lng: p.lng, place: p.place, operator: p.operator,
    reasons: reasons.length ? reasons : ["grid"], text: f.text.value || "Stopped in pipeline." });
  p.buried = true; save(); renderPipeline();
});

// ---------- Host: grid connection brokerage ----------
function renderGrid() {
  $("#grid-list").innerHTML = YELLOWS.map(z => `<div class="card">
    <h4>🟡 ${esc(z.name)}</h4>
    <div class="meta">${z.operator ? esc(z.operator) + " · " : ""}${z.mw} MW from ${esc(z.from)}</div>
    ${z.note ? `<p>${esc(z.note)}</p>` : ""}
    <p><b data-count="${z.id}">${interestCount(z)}</b> developers interested</p>
    ${interestBtn(z)}</div>`).join("");
}

// ---------- Init ----------
$("#credit-count").textContent = state.credits;
$("#credit-label").textContent = state.credits === 1 ? "credit" : "credits";
renderGraves(); renderChips(); renderStats(); renderResults();

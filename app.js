// Graveyard of Dead Projects – prototype logic (no backend, state in localStorage).

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem("gdp_" + key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("gdp_" + key, JSON.stringify(value)); } catch {}
  },
};

let credits = store.get("credits", 0);
let myProjects = store.get("projects", []);
let interests = store.get("interests", {});

const allProjects = () => [...SEED_PROJECTS, ...myProjects];
const TECH_LABEL = { solar: "Solar", wind: "Wind", storage: "Storage" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- Credits ----------
function renderCredits() {
  const el = document.getElementById("credit-count");
  el.textContent = credits;
  const badge = el.parentElement;
  badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump");
  store.set("credits", credits);
}

// ---------- Tabs ----------
const maps = {};
document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
function showView(name) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + name));
  setTimeout(() => Object.values(maps).forEach(m => m.invalidateSize()), 0);
}

// ---------- Map helpers ----------
const GERMANY = [[47.2, 5.8], [55.1, 15.1]];
function baseMap(id) {
  const m = L.map(id, { zoomSnap: 0.5 }).fitBounds(GERMANY);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18, attribution: "&copy; OpenStreetMap contributors",
  }).addTo(m);
  return m;
}

function reasonTags(reasons) {
  return reasons.map(r => `<span class="tag" style="background:${REASONS[r].color}">${REASONS[r].label}</span>`).join("");
}

function projectHtml(p) {
  return `
    <h4>${esc(p.name)}</h4>
    <div class="meta">${esc(p.developer || "Anonymous developer")} · ${TECH_LABEL[p.tech]}${p.mw ? " · " + p.mw + " MW" : ""} · ${esc(p.place || "")} · ${p.year}</div>
    <div>${reasonTags(p.reasons)} <span class="status">${STATUS[p.status]}</span></div>
    <p>${esc(p.text)}</p>
    ${p.quote ? `<blockquote>„${esc(p.quote)}“</blockquote>` : ""}
    ${p.weakSource ? `<div class="warn">⚠ Secondary source – verify before use</div>` : ""}
    ${p.source ? `<a href="${esc(p.source)}" target="_blank" rel="noopener">Source</a>` : `<span class="muted">Uploaded by a developer</span>`}`;
}

function projectMarker(p) {
  const color = REASONS[p.reasons[0]].color;
  return L.circleMarker([p.lat, p.lng], {
    radius: 7, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1,
  }).bindPopup(`<div class="popup">${projectHtml(p)}</div>`, { maxWidth: 320 });
}

function interestCount(z) { return z.baseInterest + (interests[z.id] ? 1 : 0); }

function yellowPopup(z) {
  const mine = !!interests[z.id];
  const others = z.baseInterest;
  return `<div class="popup">
    <h4>🟡 ${esc(z.name)}</h4>
    <p><b>${z.mw} MW</b> grid connection capacity expected to free up from <b>${z.from}</b>.</p>
    ${z.operator ? `<p>Grid operator: ${esc(z.operator)}</p>` : ""}
    ${z.note ? `<p class="muted">${esc(z.note)}</p>` : ""}
    <p><b>${others}</b> other developer${others === 1 ? " has" : "s have"} already expressed interest.</p>
    <button class="interest-btn ${mine ? "done" : ""}" onclick="toggleInterest('${z.id}')">
      ${mine ? "✓ You expressed interest" : "Express interest"}</button>
    <p class="muted">Demo data</p>
  </div>`;
}

function redPopup(z) {
  return `<div class="popup">
    <h4>🔴 ${esc(z.name)}</h4>
    ${z.operator ? `<p>Grid operator: ${esc(z.operator)}</p>` : ""}
    <p><b>Why blocked:</b> ${esc(z.why)}</p>
    <p><b>Blocked until:</b> ${esc(z.until)}</p>
    ${z.illustrative ? `<p class="muted">Site anonymised in source – area illustrative.</p>` : ""}
  </div>`;
}

const yellowLayers = {};
function drawZones(m, withPopups = true) {
  RED_ZONES.forEach(z => {
    const c = L.circle([z.lat, z.lng], { radius: z.radiusKm * 1000, color: "#d62828", weight: 2, fillColor: "#d62828", fillOpacity: 0.3 }).addTo(m);
    if (withPopups) c.bindPopup(redPopup(z));
  });
  YELLOW_ZONES.forEach(z => {
    const c = L.circle([z.lat, z.lng], { radius: z.radiusKm * 1000, color: "#c99a00", weight: 2, fillColor: "#f4c20d", fillOpacity: 0.4 }).addTo(m);
    if (withPopups) { c.bindPopup(() => yellowPopup(z)); yellowLayers[z.id] = c; }
  });
}

window.toggleInterest = id => {
  interests[id] = !interests[id];
  store.set("interests", interests);
  const layer = yellowLayers[id];
  if (layer) layer.setPopupContent(yellowPopup(YELLOW_ZONES.find(z => z.id === id)));
};

// ---------- Main map ----------
maps.main = baseMap("map");
drawZones(maps.main);
const projectLayer = L.layerGroup().addTo(maps.main);
function renderProjectMarkers() {
  projectLayer.clearLayers();
  allProjects().forEach(p => projectMarker(p).addTo(projectLayer));
}
renderProjectMarkers();

// ---------- Failure reasons view ----------
let activeReason = null;
const chipsEl = document.getElementById("chips");
function renderChips() {
  chipsEl.innerHTML = Object.entries(REASONS).map(([k, r]) =>
    `<button class="chip ${activeReason === k ? "active" : ""}" data-r="${k}" style="${activeReason === k ? "background:" + r.color : ""}">${r.label}</button>`
  ).join("");
  chipsEl.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => {
    activeReason = activeReason === c.dataset.r ? null : c.dataset.r;
    renderChips(); renderResults();
  }));
}

function renderStats() {
  const ps = allProjects();
  const counts = Object.keys(REASONS).map(k => [k, ps.filter(p => p.reasons.includes(k)).length]);
  const max = Math.max(...counts.map(c => c[1]));
  const gridExplicit = ps.filter(p => p.reasons[0] === "grid" && ["abandoned"].includes(p.status)).length;
  const abandoned = ps.filter(p => p.status === "abandoned").length;
  document.getElementById("stats").innerHTML = `
    <div class="insight"><b>Insight:</b> Among publicly <i>abandoned</i> projects, the grid is the stated main reason in only
      ${gridExplicit} of ${abandoned}. Among the grid cases, most are <i>undead</i> (on hold, delayed, in litigation).
      Developers rarely go public with grid refusals, so most grid deaths stay silent. That is why the graveyard needs <b>your</b> uploads.</div>
    ${counts.map(([k, n]) => `<div class="bar-row"><span>${REASONS[k].label}</span>
      <div class="bar" style="width:${(n / max) * 100}%;background:${REASONS[k].color}"></div><span>${n}</span></div>`).join("")}`;
}

function renderResults() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  const list = allProjects().filter(p => {
    if (activeReason && !p.reasons.includes(activeReason)) return false;
    if (!q) return true;
    const hay = [p.name, p.developer, p.place, p.text, p.quote, p.operator, STATUS[p.status], TECH_LABEL[p.tech],
      ...p.reasons.map(r => REASONS[r].label)].join(" ").toLowerCase();
    return q.split(/\s+/).every(w => hay.includes(w));
  });
  const el = document.getElementById("results");
  el.innerHTML = list.length
    ? list.map(p => `<div class="card">${projectHtml(p).replace("<h4>", "<h3>").replace("</h4>", "</h3>")}
        <div><button class="linklike" data-id="${p.id}">Show on map →</button></div></div>`).join("")
    : `<p class="muted">No dead projects match. Maybe you have one to bury?</p>`;
  el.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => {
    const p = allProjects().find(x => x.id === b.dataset.id);
    showView("map");
    setTimeout(() => {
      maps.main.setView([p.lat, p.lng], 10);
      projectLayer.eachLayer(l => { const ll = l.getLatLng(); if (ll.lat === p.lat && ll.lng === p.lng) l.openPopup(); });
    }, 50);
  }));
}
document.getElementById("search").addEventListener("input", renderResults);

// ---------- Location pickers ----------
function locationPicker(mapId, form) {
  const m = baseMap(mapId);
  drawZones(m, false);
  allProjects().forEach(p => L.circleMarker([p.lat, p.lng], { radius: 4, color: "#333", weight: 1, fillOpacity: .7 }).addTo(m));
  let marker = null;
  const set = (lat, lng) => {
    form.lat.value = lat.toFixed(4); form.lng.value = lng.toFixed(4);
    if (marker) marker.setLatLng([lat, lng]); else marker = L.marker([lat, lng]).addTo(m);
  };
  m.on("click", e => set(e.latlng.lat, e.latlng.lng));
  ["lat", "lng"].forEach(f => form[f].addEventListener("change", () => {
    const lat = +form.lat.value, lng = +form.lng.value;
    if (lat && lng) set(lat, lng);
  }));
  return m;
}

// ---------- Upload ----------
const uploadForm = document.getElementById("upload-form");
document.getElementById("reason-boxes").innerHTML = Object.entries(REASONS).map(([k, r]) =>
  `<label><input type="checkbox" name="reasons" value="${k}" ${k === "grid" ? "checked" : ""}> ${r.label}</label>`).join("");
document.getElementById("status-select").innerHTML = Object.entries(STATUS).map(([k, s]) =>
  `<option value="${k}">${s}</option>`).join("");
maps.upload = locationPicker("upload-map", uploadForm);

uploadForm.addEventListener("submit", e => {
  e.preventDefault();
  const f = uploadForm;
  const reasons = [...f.querySelectorAll("input[name=reasons]:checked")].map(i => i.value);
  const msg = document.getElementById("upload-msg");
  if (!reasons.length) { msg.className = "msg err"; msg.textContent = "Pick at least one failure reason."; return; }
  const p = {
    id: "u" + Date.now(), name: f.name.value, developer: "", tech: f.tech.value, mw: +f.mw.value,
    lat: +f.lat.value, lng: +f.lng.value, place: "", operator: f.operator.value,
    reasons, status: f.status.value, year: +f.year.value, text: f.text.value || "No details given.", source: "",
  };
  myProjects.push(p);
  store.set("projects", myProjects);
  credits += 1; renderCredits();
  renderProjectMarkers(); renderStats(); renderResults();
  L.circleMarker([p.lat, p.lng], { radius: 4, color: "#333", weight: 1, fillOpacity: .7 }).addTo(maps.upload);
  L.circleMarker([p.lat, p.lng], { radius: 4, color: "#333", weight: 1, fillOpacity: .7 }).addTo(maps.check);
  msg.className = "msg ok";
  msg.textContent = `🪦 "${p.name}" rests in peace. +1 credit. You now have ${credits}.`;
  f.name.value = ""; f.text.value = "";
});

// ---------- Check (the speed camera) ----------
function distanceKm(a, b) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function similarity(np, p) {
  const d = distanceKm(np, p);
  let score = 0; const why = [];
  if (d < 10) { score += 50; why.push(`${d.toFixed(0)} km away`); }
  else if (d < 30) { score += 30; why.push(`${d.toFixed(0)} km away`); }
  else if (d < 60) { score += 10; why.push(`${d.toFixed(0)} km away`); }
  if (np.tech === p.tech) { score += 20; why.push("same technology"); }
  if (p.mw && np.mw && Math.abs(np.mw - p.mw) <= 0.5 * p.mw) { score += 15; why.push("similar size"); }
  if (np.operator && p.operator && np.operator.toLowerCase() === p.operator.toLowerCase()) { score += 15; why.push("same grid operator"); }
  return { p, d, score, why };
}

const checkForm = document.getElementById("check-form");
maps.check = locationPicker("check-map", checkForm);

checkForm.addEventListener("submit", e => {
  e.preventDefault();
  const out = document.getElementById("check-result");
  if (credits < 1) {
    out.innerHTML = `<div class="verdict red"><h3>No credits left</h3>
      One in, one out: bury one of your dead projects first to unlock a check.
      <div><button class="primary" type="button" onclick="showView('upload')">Bury a project</button></div></div>`;
    return;
  }
  credits -= 1; renderCredits();
  const np = { tech: checkForm.tech.value, mw: +checkForm.mw.value, operator: checkForm.operator.value.trim(),
    lat: +checkForm.lat.value, lng: +checkForm.lng.value };

  const inRed = RED_ZONES.find(z => distanceKm(np, z) <= z.radiusKm);
  const inYellow = YELLOW_ZONES.find(z => distanceKm(np, z) <= z.radiusKm);
  const matches = allProjects().map(p => similarity(np, p)).filter(m => m.d < 60 && m.score >= 25)
    .sort((a, b) => b.score - a.score).slice(0, 5);
  const top = matches[0]?.score || 0;

  let level, title, body;
  if (inRed) {
    level = "red"; title = "🔴 Flash! Grid blocked here";
    body = `<b>${esc(inRed.name)}</b>: ${esc(inRed.why)}<br><b>Until:</b> ${esc(inRed.until)}`;
  } else if (inYellow) {
    level = "yellow"; title = "🟡 Capacity expected to free up";
    body = `${inYellow.mw} MW from ${inYellow.from} at <b>${esc(inYellow.name)}</b>. ${interestCount(inYellow)} developers interested.
      <div><button class="primary" type="button" onclick="toggleInterest('${inYellow.id}');this.textContent='✓ Interest expressed';this.disabled=true">Express interest</button></div>`;
  } else if (top >= 60) {
    level = "red"; title = "🔴 Flash! Looks like a dead project";
    body = "Very similar projects nearby have already failed.";
  } else if (top >= 30) {
    level = "yellow"; title = "🟡 Caution";
    body = "Some similar projects in the region have failed. Check the reasons below.";
  } else {
    level = "green"; title = "🟢 No known graves nearby";
    body = "No similar dead projects in the graveyard. That doesn't guarantee a grid connection.";
  }

  out.innerHTML = `<div class="verdict ${level}"><h3>${title}</h3><div>${body}</div></div>
    <h3 style="margin-top:16px">Similar dead projects (${matches.length})</h3>
    ${matches.length ? matches.map(m => `<div class="match"><span class="score">${m.score}%</span> ·
      <b>${esc(m.p.name)}</b> ${reasonTags(m.p.reasons)}<br>
      <span class="muted">${m.why.join(" · ")} — ${esc(m.p.text)}</span></div>`).join("")
      : `<p class="muted">None within 60 km.</p>`}
    <p class="muted">Credits left: ${credits}</p>`;
});

// ---------- Init ----------
renderCredits();
renderChips();
renderStats();
renderResults();

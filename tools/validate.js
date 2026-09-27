// Data quality check. Run: node tools/validate.js  (also runs on every push via GitHub Actions)
// Fails (exit 1) on broken or implausible data so it never reaches the live demo.
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const boot = fs.readFileSync(path.join(root, "boot.js"), "utf8");
const files = JSON.parse(boot.match(/const FILES = (\[[\s\S]*?\]);/)[1].replace(/,\s*\]/, "]"))
  .filter(f => f.endsWith(".js") && f !== "app.js");

const ctx = { window: {}, console };
vm.createContext(ctx);
const errors = [];
for (const f of files) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) { errors.push(`${f}: listed in boot.js but missing`); continue; }
  try { vm.runInContext(fs.readFileSync(p, "utf8").replace(/^const (\w+)/gm, "var $1"), ctx, { filename: f }); }
  catch (e) { errors.push(`${f}: syntax/runtime error: ${e.message}`); }
}
const { REASONS, STATUS, SEED_PROJECTS = [], RED_ZONES = [], YELLOW_ZONES = [], window: w } = ctx;
const MAX_ZONE_KM = 10, TECH = ["solar", "wind", "storage"];
const inDACH = z => z.lat > 45.7 && z.lat < 55.2 && z.lng > 5.8 && z.lng < 17.3;
const projects = [...SEED_PROJECTS, ...(w.EXTRA_PROJECTS || [])];
const zones = [...RED_ZONES, ...(w.EXTRA_RED_ZONES || []), ...YELLOW_ZONES, ...(w.EXTRA_YELLOW_ZONES || [])];
const ids = new Set();
const dup = id => { if (ids.has(id)) return true; ids.add(id); return false; };

for (const p of projects) {
  const e = m => errors.push(`project ${p.id || p.name}: ${m}`);
  if (!p.id || dup(p.id)) e("missing or duplicate id");
  if (!p.name) e("missing name");
  if (!TECH.includes(p.tech)) e(`unknown tech "${p.tech}"`);
  if (!p.reasons?.length || p.reasons.some(r => !REASONS[r])) e(`bad reasons ${JSON.stringify(p.reasons)}`);
  if (!STATUS[p.status]) e(`unknown status "${p.status}"`);
  if (!inDACH(p)) e(`coordinates outside DACH (${p.lat}, ${p.lng})`);
  if (typeof p.mw !== "number" || p.mw < 0) e("mw must be a number ≥ 0");
}
for (const z of zones) {
  const e = m => errors.push(`zone ${z.id || z.name}: ${m}`);
  if (!z.id || dup(z.id)) e("missing or duplicate id");
  if (!(z.radiusKm > 0 && z.radiusKm <= MAX_ZONE_KM)) e(`radiusKm ${z.radiusKm} not in 1..${MAX_ZONE_KM} (zones must be local)`);
  if (z.illustrative) e("illustrative zones are not allowed – zones must be sourced and local");
  if (!inDACH(z)) e(`coordinates outside DACH (${z.lat}, ${z.lng})`);
  if (z.techs && z.techs.some(t => !TECH.includes(t))) e(`bad techs ${JSON.stringify(z.techs)}`);
}
console.log(`${projects.length} projects, ${zones.length} zones checked from ${files.length} files`);
if (errors.length) { console.error("✗ " + errors.length + " problem(s):\n  " + errors.join("\n  ")); process.exit(1); }
console.log("✓ data OK");

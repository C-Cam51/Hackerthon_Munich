// Loads styles, data and app fresh on every page load (bypasses browser/GitHub Pages cache).
// To add a data file: add it to FILES below.
const FILES = [
  "style.css",
  "data.js",
  "data/nb.js", "data/sob.js", "data/fr.js", "data/at.js", "data/gd.js", "data/ch.js", "data/bw.js", "data/by2.js", "data/west.js",
  "app.js",
];
(async () => {
  const v = "?v=" + Date.now();
  for (const f of FILES) {
    await new Promise(resolve => {
      const el = f.endsWith(".css")
        ? Object.assign(document.createElement("link"), { rel: "stylesheet", href: f + v })
        : Object.assign(document.createElement("script"), { src: f + v, async: false });
      el.onload = resolve;
      el.onerror = () => { console.warn("could not load", f); resolve(); };
      (f.endsWith(".css") ? document.head : document.body).appendChild(el);
    });
  }
})();

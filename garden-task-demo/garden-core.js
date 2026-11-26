/* Garden task: shared definitions (environments, gardens, puppets, data helpers).
   Loaded after js/gardens.js and before the plugins and experiment.js. */
window.GardenCore = (function () {
  "use strict";

  // Gardens come from js/gardens.js, made by gardens/make_gardens.py (see gardens/README.md).
  // Every bush pays 1-6 points except the puppet's, which pays FOUND_POINTS (10).
  const SET = window.GARDEN_SET;
  if (!SET) throw new Error("js/gardens.js is missing: run gardens/make_gardens.py (see gardens/README.md).");
  const FOUND_POINTS = SET.meta.found_points || 10;
  const POINT_OPTIONS = [1, 2, 3, 4, 5, 6, FOUND_POINTS];   // every amount a click can pay
  const MAX_POINTS = FOUND_POINTS;
  // Older garden files marked the puppet's bush with a 7; treat that as finding the puppet.
  const toPoints = v => (!SET.meta.found_points && v === 7) ? FOUND_POINTS : v;

  // Clicks per learning garden. Edit DEFAULTS, or override from the URL for piloting: ?clicks=30
  const Q = new URLSearchParams(location.search);
  const DEFAULTS = { clicks: 30 };
  const qClicks = parseInt(Q.get("clicks"), 10);
  const SETTINGS = { clicks: isFinite(qClicks) ? Math.min(60, Math.max(5, qClicks)) : DEFAULTS.clicks };
  const GRID = SET.meta.grid, N = GRID * GRID, GARDEN_CLICKS = SETTINGS.clicks;

  // Smooth and rough gardens differ only in how noisy the clues are (p in the generator);
  // random gardens pay from a fixed sequence regardless of which bush is clicked.
  const ENVS = {
    smooth: { label: "Smooth", p: SET.meta.p_smooth, random: false },
    rough:  { label: "Rough",  p: SET.meta.p_rough,  random: false },
    random: { label: "Random", mean: SET.meta.random_mean, random: true }
  };

  // Pronouns used in the on-screen text. To change one, edit only these lines
  // (HE = he/him/his, SHE = she/her/her).
  const HE = { he: "he", him: "him", his: "his" }, SHE = { he: "she", him: "her", his: "her" };
  const PUPPETS = [
    { id: "sprout",  name: "Sprout",  color: "#4FA83A", colorName: "green", ...SHE },
    { id: "drizzle", name: "Drizzle", color: "#2F6FD0", colorName: "blue",  ...SHE },
    { id: "poppy",   name: "Poppy",   color: "#D8452F", colorName: "red",   ...SHE }
  ];
  // A fourth character used only in the practice round, so that none of the three study
  // puppets gets extra experience before the learning phase.
  const PRACTICE_PUPPET = { id: "pebble", name: "Pebble", color: "#8E949B", colorName: "grey", ...SHE };
  const byId = id => PUPPETS.find(p => p.id === id) || (id === PRACTICE_PUPPET.id ? PRACTICE_PUPPET : undefined);

  /* ---------- gardens ---------- */
  const COORD = Array.from({ length: N }, (_, i) => [Math.floor(i / GRID), i % GRID]);
  const byKey = {};
  SET.gardens.forEach(g => { byKey[`${g.condition}:${g.id}`] = g; });
  const ALL_IDS = [...new Set(SET.gardens.map(g => g.id))];
  // Each participant works through the garden ids in a random order, and each id is used only
  // once per participant (smooth and rough gardens with the same id share a puppet location).
  // If a session needs more gardens than the file has, the ids are shuffled and reused.
  let idQueue = [];
  const nextId = () => { if (!idQueue.length) idQueue = shuffle(ALL_IDS); return idQueue.shift(); };
  // A new garden of the given environment: values (bush index -> points) for smooth/rough,
  // or the click-by-click sequence for random.
  function makeGarden(envKey) {
    const id = nextId(), g = byKey[`${envKey}:${id}`];
    if (ENVS[envKey].random) return { set_id: id, values: null, sequence: g.sequence.map(toPoints), probs: g.probs };
    return { set_id: id, values: g.values.flat().map(toPoints), sequence: null, creature: g.creature };
  }
  // Points for clicking bush idx. In a random garden the k-th click pays sequence[k] wherever
  // it lands (garden.n = clicks made in this garden so far).
  function pointsAt(garden, idx) {
    if (!ENVS[garden.env].random) return garden.values[idx];
    if (garden.n < garden.sequence.length) return garden.sequence[garden.n];
    // Sequence used up (only if a garden gets more clicks than the file allows): draw from probs.
    let u = Math.random(), k = 0;
    while (k < garden.probs.length - 1 && u > garden.probs[k]) { u -= garden.probs[k]; k++; }
    return toPoints(k + 1);
  }
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* ---------- drawings ---------- */
  function puppetSVG(pid) {
    const p = byId(pid), c = p.color;
    const eye = (x, y, r = 7) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + 1.5}" cy="${y + 1}" r="${r * 0.5}" fill="#1b1b1b"/><circle cx="${x + 2.8}" cy="${y - 1.2}" r="${r * 0.17}" fill="#fff"/>`;
    const feet = `<ellipse cx="38" cy="104" rx="10" ry="5" fill="${c}" style="filter:brightness(.75)"/><ellipse cx="62" cy="104" rx="10" ry="5" fill="${c}" style="filter:brightness(.75)"/>`;
    let body = "";
    if (pid === "sprout") body = `
      <path d="M44 34 Q40 20 30 14" stroke="#3b6b25" stroke-width="3" fill="none"/><ellipse cx="27" cy="13" rx="9" ry="5" fill="#7ac943" transform="rotate(-25 27 13)"/>
      <path d="M56 34 Q60 22 70 16" stroke="#3b6b25" stroke-width="3" fill="none"/><ellipse cx="73" cy="15" rx="9" ry="5" fill="#7ac943" transform="rotate(25 73 15)"/>
      ${feet}<ellipse cx="50" cy="68" rx="36" ry="36" fill="${c}"/><ellipse cx="50" cy="80" rx="20" ry="16" fill="#fff" opacity=".28"/>
      ${eye(38, 60)}${eye(62, 60)}<path d="M40 78 Q50 88 60 78" stroke="#1b1b1b" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (pid === "drizzle") body = `
      ${feet}<path d="M50 8 C66 36 86 56 86 74 A36 32 0 0 1 14 74 C14 56 34 36 50 8 Z" fill="${c}"/>
      <path d="M36 50 Q40 40 46 36" stroke="#fff" stroke-width="4" fill="none" opacity=".45" stroke-linecap="round"/>
      ${eye(38, 70, 8)}${eye(62, 70, 8)}<ellipse cx="50" cy="88" rx="5" ry="4" fill="#1b1b1b"/>`;
    if (pid === "pebble") body = `
      ${feet}<path d="M16 96 C6 74 12 46 36 36 C56 28 82 34 89 60 C95 80 88 100 68 102 L30 102 C24 102 19 100 16 96 Z" fill="${c}"/>
      <ellipse cx="34" cy="50" rx="7" ry="4" fill="#fff" opacity=".3"/>
      ${eye(40, 66)}${eye(64, 66)}<path d="M42 84 Q52 92 62 84" stroke="#1b1b1b" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (pid === "poppy") body = `
      <path d="M22 40 L28 14 L42 34 Z" fill="${c}"/><path d="M78 40 L72 14 L58 34 Z" fill="${c}"/>
      <circle cx="50" cy="26" r="7" fill="#ffd23f"/><circle cx="50" cy="26" r="3" fill="#e07b00"/>
      ${feet}<rect x="14" y="32" width="72" height="70" rx="20" fill="${c}"/><rect x="28" y="74" width="44" height="18" rx="9" fill="#fff" opacity=".25"/>
      ${eye(36, 58)}${eye(64, 58)}<path d="M36 80 L64 80 Q58 90 50 90 Q42 90 36 80 Z" fill="#1b1b1b"/><rect x="45" y="80" width="10" height="4" fill="#fff"/>`;
    return `<svg class="gt-puppet" viewBox="0 0 100 110" role="img" aria-label="${p.name}">${body}</svg>`;
  }
  // Five-point valence faces for the optional affect rating (1 = very sad ... 5 = very happy).
  function faceSVG(level) {
    const curve = [-12, -6, 0, 6, 12][level - 1];
    const fill = ["#C9D6E8", "#DCE4EE", "#EEEDE4", "#F6E7A8", "#F4D35E"][level - 1];
    return `<svg class="gt-face" viewBox="0 0 60 60" role="img" aria-label="${["very sad", "sad", "okay", "happy", "very happy"][level - 1]}">
      <circle cx="30" cy="30" r="27" fill="${fill}" stroke="#4a4a3a" stroke-width="2"/>
      <circle cx="21" cy="24" r="3.4" fill="#2a2a22"/><circle cx="39" cy="24" r="3.4" fill="#2a2a22"/>
      <path d="M18 ${42 - curve / 2} Q30 ${42 + curve} 42 ${42 - curve / 2}" stroke="#2a2a22" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  }
  /* ---------- virtual pointer ---------- */
  // Browsers do not let a web page move the real mouse pointer. So that the pointer can be put
  // back in the centre of the screen, garden trials lock the real pointer (Pointer Lock API), which
  // hides it, and draw a pointer of their own that the page can move. Real mouse movement moves
  // the drawn pointer, and clicks are passed on to whatever is under it, so the rest of the task
  // works unchanged. Pressing Esc gives the normal pointer back; the next click in a garden locks
  // it again. If the browser refuses the lock, the normal pointer is used.
  const cursor = (() => {
    const supported = typeof document !== "undefined" && "requestPointerLock" in document.documentElement;
    let wanted = false, active = false, x = 0, y = 0, el = null, hover = null;
    const ensureEl = () => {
      if (!el) {
        el = document.createElement("div"); el.className = "gt-vcursor"; el.hidden = true;
        el.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M3 2 L3 19 L7.8 14.6 L11.3 22 L14.6 20.6 L11.1 13.3 L18 13.3 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
        document.body.appendChild(el);
      }
      return el;
    };
    const target = () => document.elementFromPoint(x, y);
    const draw = () => {
      ensureEl().style.transform = `translate(${x}px, ${y}px)`;
      // Show hover effects on the button under the drawn pointer.
      const t = target(), b = t && t.closest("button");
      if (b !== hover) { if (hover) hover.classList.remove("gt-vhover"); hover = b; if (hover) hover.classList.add("gt-vhover"); }
    };
    const fire = type => { const t = target(); if (t) t.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, view: window })); };
    const move = (dx, dy) => {
      x = Math.min(window.innerWidth - 1, Math.max(0, x + dx)); y = Math.min(window.innerHeight - 1, Math.max(0, y + dy));
      draw(); fire("mousemove");
    };
    // Put the drawn pointer in the centre of the screen; listeners get a "gt-cursorreset" event.
    const center = () => {
      x = Math.round(window.innerWidth / 2); y = Math.round(window.innerHeight / 2);
      if (!active) return;
      draw(); document.dispatchEvent(new MouseEvent("gt-cursorreset", { clientX: x, clientY: y }));
    };
    const setActive = on => {
      active = on;
      document.body.classList.toggle("gt-locked", on);
      ensureEl().hidden = !on;
      if (on) center();
      else if (hover) { hover.classList.remove("gt-vhover"); hover = null; }
    };
    if (typeof window !== "undefined") {
      // While locked, real mouse events carry no useful position, so they are replaced by events
      // at the drawn pointer's position.
      window.addEventListener("mousemove", e => { if (!active || !e.isTrusted) return; e.stopImmediatePropagation(); move(e.movementX, e.movementY); }, true);
      ["mousedown", "mouseup", "click"].forEach(type => window.addEventListener(type, e => {
        if (!active || !e.isTrusted) return; e.stopImmediatePropagation(); e.preventDefault(); fire(type);
      }, true));
      document.addEventListener("pointerlockchange", () => setActive(!!document.pointerLockElement && wanted));
    }
    return {
      supported, get active() { return active; },
      lock() {
        wanted = true;
        if (!supported || document.pointerLockElement) return;
        try { const p = document.body.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* keep the normal pointer */ }
      },
      unlock() { wanted = false; if (document.pointerLockElement) document.exitPointerLock(); else if (active) setActive(false); },
      center,
      _test: { activate: () => { wanted = true; setActive(true); }, move, click: () => { fire("mousedown"); fire("mouseup"); fire("click"); } }
    };
  })();

  /* ---------- narration ---------- */
  // Recorded instructions in audio/. A clip is a file name, or { file, start, end } (seconds) to
  // play only part of a file. Playing a clip stops the one before it; replay() repeats the last.
  // play(clip, onDone) calls onDone once the clip has finished (or right away if it cannot
  // play), so screens can wait for the narration before their buttons work. A clip that is
  // stopped early because another one starts does not call its onDone.
  //
  // All clips play through one audio player. Browsers block sound until the participant clicks,
  // and some (Safari) unlock each player separately, so one player means one click unlocks
  // everything. preload() downloads the files one at a time in the order given (the first
  // screens' clips first), and a clip plays from its downloaded copy when that is ready.
  const audio = (() => {
    const off = new URLSearchParams(location.search).get("audio") === "0";
    const player = new Audio(), ready = {};   // ready[file] = downloaded copy (blob URL)
    player.preload = "auto";
    let loaded = null, playing = false, stopAt = null, raf = null, last = null, session = null;
    // Before a file's download finishes, it plays straight from the folder; the ?v= stamp
    // makes the browser fetch it fresh for this visit.
    const visit = Date.now();
    const srcOf = f => ready[f] || `audio/${f}?v=${visit}`;
    // stop() cancels the playing clip's onDone; the clip reaching its end calls it.
    const stop = (finished = false) => {
      if (raf) cancelAnimationFrame(raf); raf = null;
      if (playing) player.pause(); playing = false;
      const s = session; session = null;
      if (s) { clearTimeout(s.failsafe); if (finished) s.done(); else s.cancelled = true; }
    };
    const watch = () => {
      if (!playing) return;
      if (stopAt !== null && player.currentTime >= stopAt) { stop(true); return; }
      raf = requestAnimationFrame(watch);
    };
    const play = (clip, onDone) => {
      stop(); last = clip || null;
      if (!clip || off) { if (onDone) onDone(); return; }
      const s = { cancelled: false, called: false, failsafe: null };
      s.done = () => { if (s.called || s.cancelled) return; s.called = true; clearTimeout(s.failsafe); if (session === s) { session = null; playing = false; } if (onDone) onDone(); };
      session = s;
      const c = typeof clip === "string" ? { file: clip } : clip, start = c.start || 0;
      stopAt = c.end ?? null; playing = true; player.muted = false;
      // Load the file into the player unless it is already there (e.g. the second half of a split clip).
      if (loaded !== c.file) { player.src = srcOf(c.file); loaded = c.file; }
      // If the browser never reports the end, stop waiting a little after the clip's length.
      const arm = () => { if (s.cancelled || s.called) return; const len = (stopAt ?? player.duration) - start; s.failsafe = setTimeout(s.done, (isFinite(len) ? len : 20) * 1000 + 1500); };
      if (player.readyState >= 1) { player.currentTime = start; arm(); }
      else player.addEventListener("loadedmetadata", () => { if (session === s) player.currentTime = start; arm(); }, { once: true });
      player.addEventListener("ended", () => { if (session === s) s.done(); }, { once: true });
      player.addEventListener("error", () => { if (session === s) s.done(); }, { once: true });
      const p = player.play(); if (p && p.catch) p.catch(() => { if (session === s) s.done(); });   // e.g. blocked before the first click
      raf = requestAnimationFrame(watch);
    };
    // Download the files one after another. If downloading is not possible (e.g. the page was
    // opened from a file on disk), clips simply play straight from the audio folder.
    const preload = async files => {
      if (off) return;
      for (const f of files) {
        if (ready[f]) continue;
        try {
          // "reload" always downloads a fresh copy, so a replaced or renumbered recording is never
          // played from an old copy kept by the browser (a renamed file keeps its old date, so
          // asking the server whether it changed is not enough).
          const r = await fetch("audio/" + f, { cache: "reload" });
          if (!r.ok) continue;
          ready[f] = URL.createObjectURL(await r.blob());
        } catch (err) { return; }
      }
    };
    // On the first click or key press, start the player silently if nothing is playing yet, so
    // the browser lets it play sound from then on.
    const SILENT = "data:audio/wav;base64,UklGRpYDAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YXIDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";  // 20 ms of silence
    let unlocked = false;
    const unlock = () => {
      if (unlocked || off) return; unlocked = true;
      if (playing) return;
      player.src = SILENT; loaded = null;
      const p = player.play(); if (p && p.catch) p.catch(() => {});
    };
    ["click", "touchend", "keydown"].forEach(t => document.addEventListener(t, unlock, true));
    return { play, stop: () => stop(), replay: onDone => play(last, onDone), preload, unlock, get off() { return off; } };
  })();

  // A short three-note chime for the sound check, made in the browser (no file needed).
  function chimeURL() {
    const rate = 22050, notes = [523.25, 659.25, 783.99], gap = 0.32, n = Math.round(rate * (gap * notes.length + 0.6));
    const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const t = i / rate; let x = 0;
      notes.forEach((f, k) => { const d = t - k * gap; if (d >= 0) x += Math.sin(2 * Math.PI * f * d) * Math.exp(-d * 3.5) * Math.min(1, d * 200); });
      v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x * 0.35)) * 32767, true);
    }
    return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  }

  /* ---------- full screen ---------- */
  // enter() must be called from a click. Once the task has asked for full screen, leaving it
  // shows a message with a button to go back (see experiment.js); exits are counted.
  const fullscreen = (() => {
    const d = document, root = d.documentElement;
    const supported = !!(root.requestFullscreen || root.webkitRequestFullscreen);
    const isOn = () => !!(d.fullscreenElement || d.webkitFullscreenElement);
    const enter = () => {
      try { const p = (root.requestFullscreen || root.webkitRequestFullscreen).call(root); return p && p.then ? p : Promise.resolve(); }
      catch (err) { return Promise.reject(err); }
    };
    const exit = () => { if (!isOn()) return; try { const p = (d.exitFullscreen || d.webkitExitFullscreen).call(d); if (p && p.catch) p.catch(() => {}); } catch (err) { /* ignore */ } };
    return { supported, isOn, enter, exit };
  })();
  // Small speaker button that replays the screen's narration.
  const replayButton = '<button type="button" class="gt-replay" aria-label="Hear it again"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>';

  /* ---------- data ---------- */
  const state = { total: 0, gardenCount: 0, clickRows: [], predRows: [], affectRows: [], mouseRows: [] };
  function toCSV(rows) {
    if (!rows.length) return "";
    const keys = Object.keys(rows[0]);
    const esc = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [keys.join(","), ...rows.map(r => keys.map(k => esc(r[k])).join(","))].join("\n");
  }
  function download(filename, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  return { GRID, N, GARDEN_CLICKS, MAX_POINTS, FOUND_POINTS, POINT_OPTIONS, SETTINGS, DEFAULTS, SET, ENVS, PUPPETS, PRACTICE_PUPPET, COORD, byId, cursor, audio, replayButton, chimeURL, fullscreen, makeGarden,
           pointsAt, shuffle, puppetSVG, faceSVG, state, toCSV, download };
})();

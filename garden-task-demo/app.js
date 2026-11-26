/* Short, simplified demo of the Garden Search Task (no jsPsych, no narration, no data saved).
   Flow: intro -> one short garden with each puppet -> one free-choice round -> summary. */
(function () {
  "use strict";
  const C = GardenCore;
  const app = document.getElementById("app");
  const LEARN_CLICKS = 10, CHOICE_CLICKS = 15;
  // Fixed environment per puppet, as in the study.
  const ENV_OF = { sprout: "smooth", drizzle: "rough", poppy: "random" };
  const ORDER = ["sprout", "drizzle", "poppy"];

  let total = 0, perPuppet = {};

  const card = (inner) => { app.innerHTML = `<div class="gt-card">${inner}</div>`; window.scrollTo(0, 0); };
  const onBtn = (id, fn) => document.getElementById(id).addEventListener("click", fn);
  const pups = () => `<div class="gt-cardpups">${ORDER.map(C.puppetSVG).join("")}</div>`;

  function intro() {
    total = 0; perPuppet = {}; ORDER.forEach(p => { perPuppet[p] = { clicks: 0, points: 0, found: 0 }; });
    card(`
      <h2>Garden Search Task</h2>
      <p class="gt-tag">Try a short demo of the study</p>
      ${pups()}
      <p>Sprout, Drizzle and Poppy are hiding in their gardens. Each bush you click shows a number
        of points from 1 to 6. Bigger numbers can mean you are getting closer to the puppet, who is
        worth 10 points. But some gardens give better clues than others!</p>
      <p>First you play a short garden with each puppet. Then you get a round where you can switch
        between puppets whenever you like.</p>
      <p class="gt-muted">The demo has ${LEARN_CLICKS} clicks per puppet and a ${CHOICE_CLICKS}-click choice round. No data is recorded.</p>
      <button class="gt-btn" id="go">Start demo</button>`);
    onBtn("go", () => learn(0));
  }

  function learn(k) {
    const pid = ORDER[k], p = C.byId(pid);
    card(`<div class="gt-cardpups">${C.puppetSVG(pid)}</div><h2>Now play with ${p.name}!</h2>
      <p>You have ${LEARN_CLICKS} clicks in ${p.name}'s garden. Click ${p.name} to make ${p.him} hide, then search the bushes.</p>
      <button class="gt-btn" id="go">Next</button>`);
    onBtn("go", () => garden({ forced: pid, nClicks: LEARN_CLICKS, onDone: pts => transition(pts, () => k + 1 < ORDER.length ? learn(k + 1) : chooseIntro()) }));
  }

  function transition(pts, next) {
    card(`<h2>Great job!</h2><p>You earned ${pts} points in that garden.</p><button class="gt-btn" id="go">Next</button>`);
    onBtn("go", next);
  }

  function chooseIntro() {
    card(`${pups()}<h2>You choose!</h2>
      <p>Now you have ${CHOICE_CLICKS} clicks, and you can play with any puppet. Click a puppet at the top
        of the screen to switch whenever you like. Which garden will you pick?</p>
      <button class="gt-btn" id="go">Start</button>`);
    onBtn("go", () => garden({ forced: null, nClicks: CHOICE_CLICKS, onDone: end }));
  }

  function end() {
    const row = pid => { const p = C.byId(pid), s = perPuppet[pid];
      return `<div class="gt-result">${C.puppetSVG(pid)}<strong>${p.name}</strong><span>${s.clicks} clicks · ${s.points} points</span></div>`; };
    card(`<h2>Demo complete</h2>
      <p>You earned <strong>${total}</strong> points in all.</p>
      <div class="gt-results">${ORDER.map(row).join("")}</div>
      <p>Did you notice the difference? In Sprout's garden the numbers reliably lead to the puppet,
        in Drizzle's garden the clues are noisier, and in Poppy's garden the numbers are random, so
        there is nothing to learn.</p>
      <p class="gt-muted">This is a short, simplified version of the task. In the full study, children
        and adults play many more gardens, predict how many points they will earn with each puppet,
        and choose freely across several rounds. This lets us ask whether people explore based on how
        much they are learning, or on how much more (or less) they are learning than they expected.</p>
      <button class="gt-btn ghost" id="again">Play again</button>`);
    onBtn("again", intro);
  }

  /* ---------- one garden (forced puppet) or one free-choice round ---------- */
  function garden({ forced, nClicks, onDone }) {
    const gardens = {};
    let current = forced, done = 0, lastIdx = null, busy = false, found = false, roundPts = 0;
    const tip = forced ? null : "Remember! You can switch puppets any time by clicking them at the top of the screen.";
    let showTip = !!tip;

    const newGarden = pid => {
      gardens[pid] = Object.assign({ puppet: pid, env: ENV_OF[pid], revealed: {}, n: 0, hidden: false }, C.makeGarden(ENV_OF[pid]));
    };
    if (forced) newGarden(forced);

    const hedge = () => `<div class="gt-hedgebar"><div class="gt-puppets">${ORDER.map(C.byId).map(p => {
      const active = current === p.id, waiting = forced && !active;
      return `<button class="gt-pup ${active ? "active" : ""} ${waiting ? "waiting" : ""}" data-act="pup" data-id="${p.id}" ${forced ? 'tabindex="-1" aria-disabled="true"' : ""}>${C.puppetSVG(p.id)}<span class="gt-nm">${p.name}</span></button>`;
    }).join("")}</div></div>`;

    const status = () => {
      const left = forced
        ? `${C.byId(current).name}'s garden · click ${Math.min(done + 1, nClicks)} of ${nClicks}`
        : `${nClicks - done} clicks left · switch puppets any time`;
      return `<div class="gt-status"><span>${left}</span><span class="gt-score">Points: ${total}</span></div>`;
    };

    const grid = () => {
      const g = gardens[current];
      let over = "";
      if (showTip) over = `<div class="gt-found gt-tip"><div class="gt-found-msg">${tip}</div><button class="gt-btn" data-act="tip-ok">OK</button></div>`;
      else if (found) over = `<div class="gt-found">${C.puppetSVG(g.puppet)}<div class="gt-found-msg">Good job! You found ${C.byId(g.puppet).name}!</div>${done < nClicks ? `<button class="gt-btn" data-act="next-garden">Keep playing</button>` : ""}</div>`;
      else if (!g) over = `<div class="gt-prompt">Click a puppet to start playing!</div>`;
      else if (!g.hidden) over = `<div class="gt-hide"><button data-act="hide" aria-label="Make ${C.byId(g.puppet).name} hide">${C.puppetSVG(g.puppet)}</button><div class="gt-say">Click ${C.byId(g.puppet).name} to make ${C.byId(g.puppet).him} hide!</div></div>`;
      const locked = !g || !g.hidden || busy || found || showTip;
      let cells = "";
      for (let i = 0; i < C.N; i++) {
        const rv = g ? g.revealed[i] : undefined;
        if (rv !== undefined) {
          const just = lastIdx === i, isFound = rv === C.MAX_POINTS;
          cells += `<button class="gt-bush rev p${rv} ${just ? "just" : ""} ${isFound ? "found" : ""}" disabled aria-label="${rv} points">${isFound ? C.puppetSVG(g.puppet) : ""}<span class="gt-v">${rv}</span>${just ? `<span class="gt-fl">+${rv}</span>` : ""}</button>`;
        } else cells += `<button class="gt-bush" data-act="bush" data-i="${i}" aria-label="Bush"></button>`;
      }
      return `<div class="gt-gardenwrap"><div class="gt-garden ${locked ? "locked" : ""} ${current ? `gt-g-${current}` : ""}" style="grid-template-columns:repeat(${C.GRID},1fr)">${cells}${over}</div></div>`;
    };

    const render = () => {
      app.innerHTML = `<div class="gt-stage">${hedge()}${current ? status() : `<div class="gt-status"><span>${nClicks} clicks · switch puppets any time</span><span class="gt-score">Points: ${total}</span></div>`}${grid()}</div>`;
    };

    const finish = () => { app.removeEventListener("click", onClick); onDone(roundPts); };

    const onClick = e => {
      const t = e.target.closest("[data-act]");
      if (!t) return;
      const act = t.dataset.act;
      if (act === "tip-ok" && showTip) { showTip = false; render(); return; }
      if (act === "next-garden" && found) { found = false; lastIdx = null; newGarden(current); render(); return; }
      if (busy || found || showTip) return;
      if (act === "pup" && !forced) {
        const pid = t.dataset.id;
        if (pid !== current) { current = pid; lastIdx = null; if (!gardens[pid]) newGarden(pid); render(); }
      } else if (act === "hide") {
        busy = true;
        const ov = app.querySelector(".gt-hide"); if (ov) ov.classList.add("go");
        setTimeout(() => { gardens[current].hidden = true; busy = false; render(); }, 420);
      } else if (act === "bush") {
        const g = gardens[current], idx = +t.dataset.i;
        if (!g || !g.hidden || g.revealed[idx] !== undefined) return;
        const pts = C.pointsAt(g, idx), isPuppet = pts === C.MAX_POINTS;
        g.revealed[idx] = pts; g.n++; done++; lastIdx = idx;
        total += pts; roundPts += pts;
        const s = perPuppet[current]; s.clicks++; s.points += pts; if (isPuppet) s.found++;
        const over = done >= nClicks;
        if (isPuppet) {
          busy = true; render();
          setTimeout(() => { busy = false; found = true; render(); if (over) setTimeout(finish, 1800); }, 1100);
        } else if (over) { busy = true; render(); setTimeout(finish, 800); }
        else render();
      }
    };
    app.addEventListener("click", onClick);
    render();
  }

  intro();
})();

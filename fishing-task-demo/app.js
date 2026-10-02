(function () {
  // One stretch of a real schedule from the full study: amounts drift from turn to turn,
  // sometimes jump, and can go negative. x/y are flash positions in the task's
  // normalised units (-1 to 1, origin at the centre of the screen).
  const GOAL_SIZE = 33;
  const SCHEDULE = [
    { fish_val: 1.25, octopus_val: 3.013, crab_val: 4.724, fish_x: 0.348, fish_y: 0.347, octopus_x: -0.415, octopus_y: 0.221, crab_x: -0.265, crab_y: -0.389 },
    { fish_val: 1.698, octopus_val: 3.724, crab_val: -0.399, fish_x: -0.391, fish_y: -0.259, octopus_x: 0.392, octopus_y: -0.35, crab_x: -0.42, crab_y: 0.158 },
    { fish_val: 1.837, octopus_val: -2.928, crab_val: 2.697, fish_x: -0.464, fish_y: -0.005, octopus_x: 0.456, octopus_y: -0.407, crab_x: 0.37, crab_y: 0.233 },
    { fish_val: 1.138, octopus_val: -5.395, crab_val: 3.01, fish_x: 0.179, fish_y: -0.178, octopus_x: 0.282, octopus_y: 0.304, crab_x: -0.474, crab_y: 0.379 },
    { fish_val: 13.713, octopus_val: -6.0, crab_val: 1.883, fish_x: -0.059, fish_y: -0.465, octopus_x: -0.023, octopus_y: 0.42, crab_x: -0.481, crab_y: -0.075 },
    { fish_val: 14.86, octopus_val: -5.23, crab_val: 3.062, fish_x: -0.224, fish_y: -0.067, octopus_x: -0.014, octopus_y: 0.418, crab_x: 0.409, crab_y: 0.134 },
    { fish_val: 2.674, octopus_val: -4.982, crab_val: 3.717, fish_x: 0.292, fish_y: 0.449, octopus_x: 0.448, octopus_y: -0.224, crab_x: 0.023, crab_y: -0.093 },
    { fish_val: 1.894, octopus_val: -5.736, crab_val: 3.182, fish_x: 0.433, fish_y: -0.297, octopus_x: 0.281, octopus_y: 0.172, crab_x: -0.471, crab_y: 0.072 },
    { fish_val: 0.423, octopus_val: -4.294, crab_val: 4.102, fish_x: 0.146, fish_y: -0.08, octopus_x: -0.387, octopus_y: -0.38, crab_x: -0.118, crab_y: 0.423 },
    { fish_val: -0.359, octopus_val: -4.307, crab_val: 2.558, fish_x: -0.399, fish_y: 0.487, octopus_x: 0.36, octopus_y: 0.48, crab_x: 0.031, crab_y: -0.131 },
    { fish_val: -2.045, octopus_val: -2.339, crab_val: 3.217, fish_x: -0.464, fish_y: -0.421, octopus_x: 0.001, octopus_y: -0.462, crab_x: -0.168, crab_y: 0.285 },
    { fish_val: -3.042, octopus_val: -1.849, crab_val: 3.267, fish_x: 0.184, fish_y: -0.295, octopus_x: -0.402, octopus_y: -0.139, crab_x: -0.46, crab_y: 0.314 },
    { fish_val: 10.789, octopus_val: -3.002, crab_val: 3.192, fish_x: -0.094, fish_y: -0.266, octopus_x: -0.295, octopus_y: 0.367, crab_x: 0.394, crab_y: -0.417 },
    { fish_val: 11.386, octopus_val: -4.365, crab_val: 3.403, fish_x: -0.481, fish_y: -0.233, octopus_x: 0.28, octopus_y: -0.096, crab_x: -0.215, crab_y: 0.249 },
    { fish_val: 2.037, octopus_val: 10.342, crab_val: 3.636, fish_x: -0.147, fish_y: -0.479, octopus_x: 0.313, octopus_y: 0.497, crab_x: -0.275, crab_y: -0.076 },
    { fish_val: 2.755, octopus_val: 11.141, crab_val: 4.051, fish_x: -0.409, fish_y: -0.274, octopus_x: 0.306, octopus_y: -0.136, crab_x: -0.251, crab_y: 0.385 },
    { fish_val: 9.151, octopus_val: 10.601, crab_val: 4.577, fish_x: -0.257, fish_y: 0.385, octopus_x: -0.454, octopus_y: -0.368, crab_x: -0.021, crab_y: -0.39 },
    { fish_val: 8.885, octopus_val: 11.683, crab_val: 4.531, fish_x: 0.023, fish_y: 0.284, octopus_x: 0.483, octopus_y: 0.099, crab_x: -0.399, crab_y: 0.34 },
  ];
  const MAX_TRIALS = SCHEDULE.length;

  const SPATIAL_WEIGHT = 42; // amount per unit of screen width, as in the full study
  const FLASH_MS = 700;
  const LOCATE_GAP_MS = 350;
  const UPDATE_MS = 2000;
  const CHOICE_HEIGHTS = [0.4, 0.1, -0.2];
  const NET_LEFT = -0.8;
  const NET_Y = -0.85;

  const CREATURES = [
    { key: "fish", src: "images/fish.png" },
    { key: "octopus", src: "images/octopus.png" },
    { key: "crab", src: "images/crab.png" },
  ];

  const screens = {};
  document.querySelectorAll(".screen").forEach((s) => (screens[s.id] = s));

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  const el = (id) => document.getElementById(id);
  const stage = el("stage");
  const itemsEl = el("items");
  const hintEl = el("hint");

  let trial = 0;
  let net = 0;
  let netSpecies = null;
  let onStageClick = null;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // normalised units -> percent of the stage
  const pctX = (x) => ((x + 1) / 2) * 100;
  const pctY = (y) => ((1 - y) / 2) * 100;
  const pctW = (w) => (w / 2) * 100;

  function place(node, x, y) {
    node.style.left = pctX(x) + "%";
    node.style.top = pctY(y) + "%";
    return node;
  }

  function addImage(src, cls, x, y) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.className = cls;
    itemsEl.appendChild(place(img, x, y));
    return img;
  }

  function setPhase(phase, hint) {
    stage.dataset.phase = phase;
    hintEl.textContent = hint;
  }

  function drawNet(colour) {
    el("net-goal").style.left = pctX(NET_LEFT) + "%";
    el("net-goal").style.width = pctW(GOAL_SIZE / SPATIAL_WEIGHT) + "%";
    el("net-zone").style.top = pctY(NET_Y) + "%";
    el("net-fill").style.width = Math.min(100, (net / GOAL_SIZE) * 100) + "%";
    el("net-fill").dataset.colour = colour;
    el("net-icon").src = netSpecies ? netSpecies.src : "images/fishing_net.png";
  }

  function startTrial() {
    itemsEl.innerHTML = "";
    el("trial-count").textContent = `${MAX_TRIALS - trial}/${MAX_TRIALS}`;
    drawNet("orange");
    setPhase("ready", "");
  }

  function flash() {
    const t = SCHEDULE[trial];
    itemsEl.innerHTML = "";
    CREATURES.forEach((c) => addImage(c.src, "creature", t[c.key + "_x"], t[c.key + "_y"]));
    setPhase("flash", "");
    setTimeout(() => locate(shuffle(CREATURES)), FLASH_MS);
  }

  // The creatures are probed one at a time, in a random order.
  function locate(queue) {
    itemsEl.innerHTML = "";
    if (!queue.length) return choose();
    const c = queue[0];
    el("probe").src = c.src;
    setPhase("locate", `Click where the ${c.key} flashed.`);

    onStageClick = (e) => {
      onStageClick = null;
      const r = stage.getBoundingClientRect();
      const dot = document.createElement("div");
      dot.className = "location-circle";
      dot.style.left = ((e.clientX - r.left) / r.width) * 100 + "%";
      dot.style.top = ((e.clientY - r.top) / r.height) * 100 + "%";
      itemsEl.appendChild(dot);
      setTimeout(() => locate(queue.slice(1)), LOCATE_GAP_MS);
    };
  }

  function choose() {
    const t = SCHEDULE[trial];
    const heights = shuffle(CHOICE_HEIGHTS);
    setPhase("choose", "Click a creature to catch it.");

    CREATURES.forEach((c, i) => {
      const value = t[c.key + "_val"];
      const icon = addImage(c.src, "choice-icon", -0.7, heights[i]);
      const bar = document.createElement("div");
      // green adds to the net, red takes away from it
      bar.className = "value-bar " + (value < 0 ? "negative" : "positive");
      bar.style.width = pctW(Math.abs(value) / SPATIAL_WEIGHT) + "%";
      itemsEl.appendChild(place(bar, -0.6, heights[i]));
      icon.addEventListener("click", () => pick(c, value));
    });
  }

  function pick(creature, value) {
    if (stage.dataset.phase !== "choose") return;
    const t = SCHEDULE[trial];
    const switched = netSpecies !== null && netSpecies.key !== creature.key;

    // Switching throws back everything in the net.
    net = Math.max(0, switched ? value : net + value);
    netSpecies = creature;
    trial += 1;
    const filled = net > GOAL_SIZE;

    itemsEl.innerHTML = "";
    const x = t[creature.key + "_x"];
    const y = t[creature.key + "_y"];
    addImage("images/fishing_net.png", "caught-net", x, y);
    addImage(creature.src, "creature", x, y);
    el("trial-count").textContent = `${MAX_TRIALS - trial}/${MAX_TRIALS}`;
    setPhase("update", switched ? "You switched creatures, so the net was emptied first." : "");

    setTimeout(() => drawNet("green"), UPDATE_MS / 2);
    setTimeout(() => {
      if (filled) {
        el("money-count").textContent = "1";
        el("end-summary").innerHTML = `You filled the net in <b>${trial}</b> turns.`;
        showScreen("screen-end");
      } else if (trial >= MAX_TRIALS) {
        el("end-summary").textContent = "You ran out of turns before the net was full.";
        showScreen("screen-end");
      } else {
        startTrial();
      }
    }, UPDATE_MS);
  }

  function startGame() {
    trial = 0;
    net = 0;
    netSpecies = null;
    el("money-count").textContent = "0";
    startTrial();
    showScreen("screen-game");
  }

  stage.addEventListener("click", (e) => {
    if (stage.dataset.phase === "locate" && onStageClick) onStageClick(e);
  });
  el("go-btn").addEventListener("click", flash);
  el("start-btn").addEventListener("click", startGame);
  el("restart-btn").addEventListener("click", startGame);
})();

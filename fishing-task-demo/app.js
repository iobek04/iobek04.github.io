(function () {
  const NET_CAPACITY = 100;
  const VALUE_TO_NET_SCALE = 0.5;
  const AUTO_ADVANCE_MS = 1400;

  const CREATURES = [
    { key: "fish", src: "images/fish.png" },
    { key: "crab", src: "images/crab.png" },
    { key: "octopus", src: "images/octopus.png" },
  ];

  const screens = {};
  document.querySelectorAll(".screen").forEach((s) => (screens[s.id] = s));

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  const rowsEl = document.getElementById("creature-rows");
  const netIconEl = document.getElementById("net-icon");
  const netFillEl = document.getElementById("net-fill");
  const hintEl = document.getElementById("hint");
  const trialNumEl = document.getElementById("trial-num");
  const moneyCountEl = document.getElementById("money-count");
  const finalTrialsEl = document.getElementById("final-trials");

  let trial = 1;
  let net = 0;
  let netSpecies = null;
  let locked = false;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderTrial() {
    rowsEl.innerHTML = "";
    trialNumEl.textContent = trial;
    moneyCountEl.textContent = "0";
    hintEl.textContent = "Click a creature to add it to your net.";

    shuffle(CREATURES).forEach((c) => {
      const value = rand(15, 90);
      const row = document.createElement("div");
      row.className = "creature-row";
      row.dataset.key = c.key;
      row.dataset.value = value;
      row.innerHTML = `
        <img src="${c.src}" alt="">
        <div class="value-bar-outer"><div class="value-bar-fill" style="width:${value}%"></div></div>
      `;
      row.addEventListener("click", () => pick(row, value, c));
      rowsEl.appendChild(row);
    });
  }

  function pick(row, value, creature) {
    if (locked) return;
    locked = true;
    hintEl.textContent = "Adding to net...";

    row.classList.add("picked");
    document.querySelectorAll(".creature-row").forEach((r) => {
      if (r !== row) r.classList.add("dimmed");
    });

    const switched = netSpecies !== null && netSpecies !== creature.key;

    const applyGain = () => {
      netIconEl.src = creature.src;
      netIconEl.style.visibility = "visible";
      netSpecies = creature.key;
      net = Math.min(NET_CAPACITY, net + value * VALUE_TO_NET_SCALE);
      netFillEl.style.width = net + "%";

      setTimeout(() => {
        if (net >= NET_CAPACITY) {
          finalTrialsEl.textContent = trial;
          showScreen("screen-end");
        } else {
          trial += 1;
          locked = false;
          renderTrial();
        }
      }, AUTO_ADVANCE_MS);
    };

    setTimeout(() => {
      if (switched) {
        hintEl.textContent = "Different creature — net empties and starts over!";
        net = 0;
        netFillEl.style.width = "0%";
        setTimeout(applyGain, 500);
      } else {
        applyGain();
      }
    }, 350);
  }

  function startGame() {
    trial = 1;
    net = 0;
    netSpecies = null;
    locked = false;
    netFillEl.style.width = "0%";
    netIconEl.style.visibility = "hidden";
    renderTrial();
    showScreen("screen-game");
  }

  document.getElementById("start-btn").addEventListener("click", startGame);
  document.getElementById("restart-btn").addEventListener("click", startGame);
})();

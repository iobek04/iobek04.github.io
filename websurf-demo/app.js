(function () {
  const TOTAL_ROUNDS = 3;

  const CATEGORIES = [
    { key: "animals", label: "animals", img: "img/Animal.jpg", video: "videos/animals.mp4" },
    { key: "nature", label: "nature", img: "img/Nature.jpg", video: "videos/nature.mp4" },
    { key: "sports", label: "sports", img: "img/Sports.jpg", video: "videos/sports.mp4" },
    { key: "crazy_tricks", label: "crazy tricks", img: "img/CrazyTricks.jpg", video: "videos/crazy_tricks.mp4" },
  ];

  const screens = {};
  document.querySelectorAll(".screen").forEach((s) => (screens[s.id] = s));

  function showScreen(id) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[id].classList.add("active");
  }

  const el = (id) => document.getElementById(id);

  let round = 1;
  let currentOffer = null;
  let stats = { loaded: 0, skipped: 0, stopped: 0 };
  let waitTimer = null;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function updateRoundLabels() {
    [el("round-num"), el("round-num-2")].forEach((n) => n && (n.textContent = round));
    [el("round-total"), el("round-total-2")].forEach((n) => n && (n.textContent = TOTAL_ROUNDS));
  }

  function sampleOffer() {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const waitSecs = Math.round(rand(4, 8));
    return { ...cat, waitSecs };
  }

  function newOffer() {
    currentOffer = sampleOffer();
    el("offer-img").src = currentOffer.img;
    el("offer-category").textContent = currentOffer.label;
    el("offer-secs").textContent = currentOffer.waitSecs;
    updateRoundLabels();
    showScreen("screen-offer");
  }

  function finishRound() {
    round += 1;
    if (round > TOTAL_ROUNDS) {
      el("end-summary").innerHTML =
        `Across ${TOTAL_ROUNDS} galleries you loaded <b>${stats.loaded}</b> video(s), ` +
        `skipped a gallery <b>${stats.skipped}</b> time(s), and stopped waiting early <b>${stats.stopped}</b> time(s).`;
      showScreen("screen-end");
    } else {
      newOffer();
    }
  }

  function startWait() {
    const stopBtn = el("stop-btn");
    const toast = el("revision-toast");
    const fill = el("progress-fill");
    const elapsedEl = el("elapsed");

    updateRoundLabels();
    el("wait-category").textContent = currentOffer.label;
    stopBtn.classList.remove("show");
    toast.classList.remove("show");
    fill.style.width = "0%";
    elapsedEl.textContent = "0";
    showScreen("screen-wait");

    let total = currentOffer.waitSecs;
    let elapsed = 0;
    let revisionDone = false;
    const revisionAt = total * rand(0.35, 0.55);
    const willRevise = Math.random() < 0.55;
    const startedAt = performance.now();

    const stopTimer = setTimeout(() => stopBtn.classList.add("show"), 1200);

    waitTimer = setInterval(() => {
      elapsed = (performance.now() - startedAt) / 1000;

      if (willRevise && !revisionDone && elapsed >= revisionAt) {
        revisionDone = true;
        const extra = Math.round(rand(2, 4));
        total += extra;
        toast.textContent = `This video is taking longer than expected — ${extra} more seconds.`;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2200);
      }

      const pct = Math.min(100, (elapsed / total) * 100);
      fill.style.width = pct + "%";
      elapsedEl.textContent = elapsed.toFixed(1);

      if (elapsed >= total) {
        clearInterval(waitTimer);
        clearTimeout(stopTimer);
        stats.loaded += 1;
        playVideo();
      }
    }, 100);

    stopBtn.onclick = () => {
      clearInterval(waitTimer);
      clearTimeout(stopTimer);
      stats.stopped += 1;
      finishRound();
    };
  }

  function playVideo() {
    const v = el("video-el");
    const tapBtn = el("tap-play-btn");
    tapBtn.classList.remove("show");
    v.src = currentOffer.video;
    showScreen("screen-video");

    const tryPlay = () => v.play().catch(() => tapBtn.classList.add("show"));
    tapBtn.onclick = () => {
      tapBtn.classList.remove("show");
      v.play().catch(() => {});
    };
    v.oncanplay = tryPlay;
    tryPlay();

    const done = () => {
      v.removeEventListener("ended", done);
      showRating();
    };
    v.addEventListener("ended", done);
    setTimeout(done, 7000); // safety fallback
  }

  function showRating() {
    document.querySelectorAll("#stars span").forEach((s) => s.classList.remove("filled"));
    showScreen("screen-rating");
  }

  document.getElementById("stars").addEventListener("click", (e) => {
    const v = Number(e.target.dataset.v);
    if (!v) return;
    document.querySelectorAll("#stars span").forEach((s) => {
      s.classList.toggle("filled", Number(s.dataset.v) <= v);
    });
  });

  el("start-btn").addEventListener("click", () => {
    round = 1;
    stats = { loaded: 0, skipped: 0, stopped: 0 };
    newOffer();
  });

  el("skip-btn").addEventListener("click", () => {
    stats.skipped += 1;
    newOffer();
  });

  el("load-btn").addEventListener("click", startWait);

  el("rating-next-btn").addEventListener("click", finishRound);

  el("restart-btn").addEventListener("click", () => {
    round = 1;
    stats = { loaded: 0, skipped: 0, stopped: 0 };
    newOffer();
  });
})();

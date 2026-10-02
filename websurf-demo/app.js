(function () {
  // Gallery order is fixed, as in the full study; the demo makes one offer per gallery.
  const CATEGORIES = [
    { key: "crazy_tricks", img: "img/CrazyTricks.jpg", video: "videos/crazy_tricks.mp4" },
    { key: "sports", img: "img/Sports.jpg", video: "videos/sports.mp4" },
    { key: "animals", img: "img/Animal.jpg", video: "videos/animals.mp4" },
    { key: "nature", img: "img/Nature.jpg", video: "videos/nature.mp4" },
  ];

  // Shortened for the demo. The full study uses 10-40 s waits and 5-25 s updates.
  const WAIT_RANGE_SECS = [8, 20];
  const REVISION_DELTA_SECS = [3, 8];
  const REVISION_EDGE_SECS = 3; // no updates in the first or last few seconds
  const REVISION_PAUSE_MS = 1200;
  const TRAVEL_REVEAL_GAP_MS = 900;
  const TRAVEL_HOLD_AFTER_DONE_MS = 300;

  const screens = {};
  document.querySelectorAll(".screen").forEach((s) => (screens[s.id] = s));

  function showScreen(id) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[id].classList.add("active");
  }

  const el = (id) => document.getElementById(id);

  let galleryIdx = 0;
  let currentOffer = null;
  let stats = { loaded: 0, skipped: 0, stopped: 0 };
  let waitFrame = null;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  // 40% no update, 30% time added, 30% time subtracted.
  function pickRevisionType() {
    const r = Math.random();
    if (r < 0.4) return "none";
    if (r < 0.7) return "frustration";
    return "pleasant_surprise";
  }

  function sampleOffer() {
    return { ...CATEGORIES[galleryIdx], totalSecs: Math.round(rand(...WAIT_RANGE_SECS)) };
  }

  function nextGallery() {
    galleryIdx += 1;
    if (galleryIdx >= CATEGORIES.length) {
      el("end-summary").innerHTML =
        `Across ${CATEGORIES.length} offers you watched <b>${stats.loaded}</b> video(s), ` +
        `skipped <b>${stats.skipped}</b> gallery(ies), and stopped waiting <b>${stats.stopped}</b> time(s).`;
      showScreen("screen-end");
    } else {
      showTravel();
    }
  }

  function showTravel() {
    const lines = Array.from(document.querySelectorAll(".travel-line"));
    let i = 0;
    const highlight = () =>
      lines.forEach((line, j) => {
        line.classList.toggle("on", j <= i);
        line.classList.toggle("current", j === i);
      });
    highlight();
    showScreen("screen-travel");

    const iv = setInterval(() => {
      i += 1;
      if (i >= lines.length) {
        clearInterval(iv);
        setTimeout(showOffer, TRAVEL_HOLD_AFTER_DONE_MS);
        return;
      }
      highlight();
    }, TRAVEL_REVEAL_GAP_MS);
  }

  function showOffer() {
    currentOffer = sampleOffer();
    el("offer-img").src = currentOffer.img;
    el("offer-img").alt = currentOffer.key.replace("_", " ");
    el("offer-secs").textContent = currentOffer.totalSecs;
    showScreen("screen-offer");
  }

  function skipOffer() {
    stats.skipped += 1;
    nextGallery();
  }

  function startWait() {
    const fill = el("progress-fill");
    const elapsedEl = el("elapsed");
    const totalEl = el("total-secs");
    const toast = el("rev-toast");

    const originalTotal = currentOffer.totalSecs;
    let total = originalTotal;
    const revisionType = pickRevisionType();
    const revisionAt = rand(REVISION_EDGE_SECS, Math.max(REVISION_EDGE_SECS, originalTotal - REVISION_EDGE_SECS));
    let revisionDone = revisionType === "none";

    el("wait-img").src = currentOffer.img;
    totalEl.textContent = total;
    fill.style.width = "0%";
    elapsedEl.textContent = "0";
    toast.classList.remove("show");
    showScreen("screen-wait");

    // The clock pauses while an update message is on screen.
    let elapsedMs = 0;
    let last = performance.now();
    let pausedUntil = 0;
    let done = false;

    const tick = (now) => {
      if (done) return;
      if (now >= pausedUntil) elapsedMs += now - last;
      last = now;
      const elapsed = elapsedMs / 1000;

      if (!revisionDone && elapsed >= revisionAt) {
        revisionDone = true;
        const delta = Math.round(rand(...REVISION_DELTA_SECS));
        const sign = revisionType === "frustration" ? 1 : -1;
        // never set the total below what has already elapsed
        total = Math.max(Math.ceil(elapsed) + 1, originalTotal + sign * delta);
        totalEl.textContent = total;
        el("rev-toast-text").textContent =
          sign > 0 ? `Update: adding ${delta} seconds.` : `Surprise: subtracting ${delta} seconds.`;
        toast.classList.add("show");
        pausedUntil = now + REVISION_PAUSE_MS;
        setTimeout(() => toast.classList.remove("show"), REVISION_PAUSE_MS);
      }

      fill.style.width = Math.min(100, (elapsed / total) * 100) + "%";
      elapsedEl.textContent = Math.floor(elapsed);

      if (elapsed >= total) {
        endWait();
        stats.loaded += 1;
        playVideo();
        return;
      }
      waitFrame = requestAnimationFrame(tick);
    };

    const stopNow = () => {
      if (done) return;
      endWait();
      stats.stopped += 1;
      nextGallery();
    };
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        stopNow();
      }
    };
    function endWait() {
      done = true;
      cancelAnimationFrame(waitFrame);
      window.removeEventListener("keydown", onKey, true);
      toast.classList.remove("show");
    }

    el("stop-btn").onclick = stopNow;
    window.addEventListener("keydown", onKey, true);
    waitFrame = requestAnimationFrame(tick);
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

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      v.removeEventListener("ended", done);
      v.pause();
      showRating();
    };
    v.addEventListener("ended", done);
    setTimeout(done, 7000); // safety fallback
  }

  function showRating() {
    el("rating-slider").value = 50;
    el("rating-next-btn").disabled = true; // the slider must be moved first
    showScreen("screen-rating");
  }

  function startDemo() {
    galleryIdx = 0;
    stats = { loaded: 0, skipped: 0, stopped: 0 };
    showTravel();
  }

  el("rating-slider").addEventListener("input", () => (el("rating-next-btn").disabled = false));
  el("rating-next-btn").addEventListener("click", nextGallery);
  el("skip-btn").addEventListener("click", skipOffer);
  el("load-btn").addEventListener("click", startWait);
  el("start-btn").addEventListener("click", startDemo);
  el("restart-btn").addEventListener("click", startDemo);

  // Left arrow skips and right arrow loads, as in the full study.
  window.addEventListener("keydown", (e) => {
    if (!screens["screen-offer"].classList.contains("active")) return;
    if (e.key === "ArrowLeft") skipOffer();
    if (e.key === "ArrowRight") startWait();
  });
})();

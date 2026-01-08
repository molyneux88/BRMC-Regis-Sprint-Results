const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";
const EXAGGERATION = 5.5;
const ANIMATION_DURATION = 10000; // ms

let firstLoad = true;
const previousPositions = {};

/* ------------------------------
   Helpers
--------------------------------*/
function isValidPosition(pos) {
  return Number.isFinite(pos) && pos > 0;
}

function isWithdrawn(row) {
  return (
    row.best_lap === "Withdrawn" ||
    row.best_lap === null ||
    row.best_lap === "" ||
    !Number.isFinite(row.best_lap)
  );
}

function formatLapSafe(value) {
  if (!Number.isFinite(value)) return "0:00.000";
  const min = Math.floor(value / 60);
  const sec = (value % 60).toFixed(3);
  return `${min}:${sec.padStart(6, "0")}`;
}

/* ------------------------------
   Main loader
--------------------------------*/
async function loadLeaderboard() {
  try {
    const response = await fetch(API_URL, { mode: "cors" });
    const rawData = await response.json();

    // 🔴 Remove empty / junk rows
    const data = rawData.filter(row => isValidPosition(row.position));

    const leaderboard = document.getElementById("leaderboard");
    if (!leaderboard) return;

    /* ---------- First load ---------- */
    if (firstLoad) {
      leaderboard.innerHTML = "";

      data.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.id = `car-${row.car_number}`;

        rowDiv.innerHTML = `
          <div class="position">${row.position}<span class="arrow"></span></div>
          <div class="number">#${row.car_number}</div>
          <div class="driver">${row.driver}</div>
          <div class="car">${row.car}</div>
          <div class="lap">${formatLapSafe(row.best_lap)}</div>
          <div class="gap">${row.gap_to_first_display ?? "—"}</div>
        `;

        if (isWithdrawn(row)) {
          rowDiv.classList.add("withdrawn");
          rowDiv.querySelector(".lap").textContent = "0:00.000";
          rowDiv.querySelector(".gap").textContent = "—";
        }

        leaderboard.appendChild(rowDiv);
        previousPositions[row.car_number] = row.position;
      });

      document.getElementById("lastUpdated").textContent =
        "Last updated: " + new Date().toLocaleTimeString();

      firstLoad = false;
      return;
    }

    /* ---------- FLIP STEP 1: measure old ---------- */
    const firstRects = {};
    Array.from(leaderboard.children).forEach(row => {
      firstRects[row.id] = row.getBoundingClientRect();
    });

    /* ---------- Update content ---------- */
    data.forEach(row => {
      const rowDiv = document.getElementById(`car-${row.car_number}`);
      if (!rowDiv) return;

      const arrow = rowDiv.querySelector(".arrow");

      // Withdrawn handling
      if (isWithdrawn(row)) {
        rowDiv.classList.add("withdrawn");
        rowDiv.classList.remove("up", "down");
        arrow.textContent = "";
        arrow.classList.remove("up", "down");

        rowDiv.querySelector(".lap").textContent = "0:00.000";
        rowDiv.querySelector(".gap").textContent = "—";

        previousPositions[row.car_number] = row.position;
        return;
      }

      rowDiv.classList.remove("withdrawn");

      rowDiv.querySelector(".position").childNodes[0].textContent = row.position;
      rowDiv.querySelector(".driver").textContent = row.driver;
      rowDiv.querySelector(".car").textContent = row.car;
      rowDiv.querySelector(".lap").textContent = formatLapSafe(row.best_lap);
      rowDiv.querySelector(".gap").textContent =
        row.gap_to_first_display ?? "—";

      const oldPos = previousPositions[row.car_number];

      if (oldPos !== undefined) {
        if (row.position < oldPos) {
          rowDiv.classList.add("up");
          rowDiv.classList.remove("down");
          arrow.textContent = "↑";
          arrow.classList.add("up");
          arrow.classList.remove("down");
        } else if (row.position > oldPos) {
          rowDiv.classList.add("down");
          rowDiv.classList.remove("up");
          arrow.textContent = "↓";
          arrow.classList.add("down");
          arrow.classList.remove("up");
        }
      }

      previousPositions[row.car_number] = row.position;
    });

    /* ---------- Reorder DOM first ---------- */
    data.forEach(row => {
      leaderboard.appendChild(
        document.getElementById(`car-${row.car_number}`)
      );
    });

    /* ---------- FLIP STEP 2: measure new ---------- */
    const lastRects = {};
    Array.from(leaderboard.children).forEach(row => {
      lastRects[row.id] = row.getBoundingClientRect();
    });

    /* ---------- FLIP STEP 3: invert ---------- */
    Array.from(leaderboard.children).forEach(row => {
      const first = firstRects[row.id];
      const last = lastRects[row.id];
      if (!first || !last) return;

      const deltaY = first.top - last.top;
      if (deltaY !== 0) {
        row.style.transition = "none";
        row.style.transform = `translateY(${deltaY * EXAGGERATION}px)`;
      }
    });

    /* ---------- FLIP STEP 4: play ---------- */
    requestAnimationFrame(() => {
      Array.from(leaderboard.children).forEach(row => {
        if (row.style.transform) {
          row.style.transition = `transform ${ANIMATION_DURATION}ms ease`;
          row.style.transform = "";
        }
      });
    });

    /* ---------- Timestamp ---------- */
    document.getElementById("lastUpdated").textContent =
      "Last updated: " + new Date().toLocaleTimeString();

  } catch (err) {
    console.error("Error loading leaderboard:", err);
  }
}

/* ------------------------------
   Polling
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
  setInterval(loadLeaderboard, 30000);
});

/* ------------------------------
   Auto Scroll
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  const scrollEl = document.getElementById("leaderboard-wrapper");
  const autoScrollToggle = document.getElementById("autoScrollToggle");

  let autoScrollEnabled = true;
  let direction = 1;
  const speed = 0.3;

  autoScrollToggle.addEventListener("change", () => {
    autoScrollEnabled = autoScrollToggle.checked;
  });

  function loop() {
    if (autoScrollEnabled && scrollEl) {
      scrollEl.scrollTop += speed * direction;

      const max =
        scrollEl.scrollHeight - scrollEl.clientHeight;

      if (scrollEl.scrollTop >= max - 1) direction = -1;
      if (scrollEl.scrollTop <= 1) direction = 1;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});



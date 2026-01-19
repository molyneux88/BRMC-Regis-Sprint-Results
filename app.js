const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";
const EXAGGERATION = 5.5;
const ANIMATION_DURATION = 10000; // ms
const GAP_DISPLAY_MODE = "stacked"; // "separate" | "stacked"

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

function positionsChanged(data) {
  return data.some(
    row => previousPositions[row.car_number] !== row.position
  );
}

/* ------------------------------
   Main loader
--------------------------------*/
async function loadLeaderboard() {
  try {
    const response = await fetch(API_URL, { mode: "cors" });
    const rawData = await response.json();

    const data = rawData.filter(row => isValidPosition(row.position));
    const leaderboard = document.getElementById("leaderboard");
    if (!leaderboard) return;

    // -----------------------------
    // Identify class leaders
    const classLeaders = {};
    data.forEach(row => {
      if (!isWithdrawn(row)) {
        if (!classLeaders[row.class] || row.position < data.find(r => r.car_number === classLeaders[row.class])?.position) {
          classLeaders[row.class] = row.car_number;
        }
      }
    });

    /* ---------- First load ---------- */
    if (firstLoad) {
      leaderboard.innerHTML = "";

      data.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row overall-row";
        rowDiv.id = `car-${row.car_number}`;

        rowDiv.innerHTML = `
          <div></div>
          <div class="position">${row.position}<span class="arrow"></span></div>
          <div class="number">#${row.car_number}</div>
          <div class="class">${row.class ?? ""}</div>
          <div class="driver">
            ${row.driver}
            ${
              classLeaders[row.class] === row.car_number
                ? `<span class="class-leader-badge">Class ${row.class} Leader</span>`
                : ''
            }
          </div>
          <div class="car">${row.car}</div>
          <div class="lap">${formatLapSafe(row.best_lap)}</div>

          ${
            GAP_DISPLAY_MODE === "stacked"
              ? `
                <div class="gap gap-stack">
                  <span>${row.gap_to_first_display ?? "—"}</span>
                  <span class="gap-front">${row.gap_to_car_in_front_display ?? "—"}</span>
                </div>
              `
              : `
                <div class="gap">${row.gap_to_first_display ?? "—"}</div>
                <div class="gap-front-col">${row.gap_to_car_in_front_display ?? "—"}</div>
              `
          }
        `;

        if (isWithdrawn(row)) {
          rowDiv.classList.add("withdrawn");
          rowDiv.querySelector(".lap").textContent = "0:00.000";
          rowDiv.querySelectorAll(".gap, .gap-front, .gap-front-col").forEach(el => el && (el.textContent = "—"));
        }

        leaderboard.appendChild(rowDiv);
        previousPositions[row.car_number] = row.position;
      });

      const timeText = "Last updated: " + new Date().toLocaleTimeString();

      const desktopTime = document.getElementById("lastUpdated");
      if (desktopTime) desktopTime.textContent = timeText;

      const mobileTime = document.getElementById("lastUpdatedMobile");
      if (mobileTime) mobileTime.textContent = timeText;
      firstLoad = false;
      return;
    }

    /* ---------- Detect movement ---------- */
    const doFlip = positionsChanged(data);

    /* ---------- FLIP STEP 1: measure old ---------- */
    let firstRects = null;
    if (doFlip) {
      firstRects = {};
      [...leaderboard.children].forEach(row => {
        firstRects[row.id] = row.getBoundingClientRect();
      });
    }

    /* ---------- Update content ---------- */
    data.forEach(row => {
      const rowDiv = document.getElementById(`car-${row.car_number}`);
      if (!rowDiv) return;

      const arrow = rowDiv.querySelector(".arrow");

      if (isWithdrawn(row)) {
        rowDiv.classList.add("withdrawn");
        rowDiv.classList.remove("up", "down");
        arrow.textContent = "";
        arrow.classList.remove("up", "down");

        rowDiv.querySelector(".lap").textContent = "0:00.000";
        rowDiv.querySelectorAll(".gap, .gap-front, .gap-front-col").forEach(el => el && (el.textContent = "—"));

        previousPositions[row.car_number] = row.position;
        return;
      }

      rowDiv.classList.remove("withdrawn");

      rowDiv.querySelector(".position").childNodes[0].textContent = row.position;

      // Update driver and badge
      rowDiv.querySelector(".driver").innerHTML = `
        ${row.driver}
        ${
          classLeaders[row.class] === row.car_number
            ? `<span class="class-leader-badge">Class ${row.class} Leader</span>`
            : ''
        }
      `;

      rowDiv.querySelector(".car").textContent = row.car;
      rowDiv.querySelector(".lap").textContent = formatLapSafe(row.best_lap);

      rowDiv.querySelector(".gap") &&
        (rowDiv.querySelector(".gap").firstElementChild.textContent =
          row.gap_to_first_display ?? "—");

      rowDiv.querySelector(".gap-front") &&
        (rowDiv.querySelector(".gap-front").textContent =
          row.gap_to_car_in_front_display ?? "—");

      const oldPos = previousPositions[row.car_number];

      if (oldPos !== undefined) {
        if (row.position < oldPos) {
          rowDiv.classList.add("up");
          rowDiv.classList.remove("down");
          arrow.textContent = "↑";
          arrow.className = "arrow up";
        } else if (row.position > oldPos) {
          rowDiv.classList.add("down");
          rowDiv.classList.remove("up");
          arrow.textContent = "↓";
          arrow.className = "arrow down";
        }
      }

      previousPositions[row.car_number] = row.position;
    });

    /* ---------- Reorder DOM ONLY if needed ---------- */
    if (doFlip) {
      data.forEach(row => {
        const el = document.getElementById(`car-${row.car_number}`);
        if (el) leaderboard.appendChild(el);
      });

      /* ---------- FLIP STEP 2: measure new ---------- */
      const lastRects = {};
      [...leaderboard.children].forEach(row => {
        lastRects[row.id] = row.getBoundingClientRect();
      });

      /* ---------- FLIP STEP 3: invert ---------- */
      [...leaderboard.children].forEach(row => {
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
        [...leaderboard.children].forEach(row => {
          if (row.style.transform) {
            row.style.transition = `transform ${ANIMATION_DURATION}ms ease`;
            row.style.transform = "";
          }
        });
      });
    }

    const timeText = "Last updated: " + new Date().toLocaleTimeString();

    const desktopTime = document.getElementById("lastUpdated");
    if (desktopTime) desktopTime.textContent = timeText;

    const mobileTime = document.getElementById("lastUpdatedMobile");
    if (mobileTime) mobileTime.textContent = timeText;

  } catch (err) {
    console.error("Error loading leaderboard:", err);
  }
}

/* ------------------------------
   Polling
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  if (GAP_DISPLAY_MODE === "stacked") {
    document.body.classList.add("stacked-gaps");
  }

  loadLeaderboard();
  setInterval(loadLeaderboard, 30000);
});

/* ------------------------------
   Auto Scroll (with pauses)
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("leaderboard-wrapper");
  const toggle = document.getElementById("autoScrollToggle");

  if (!wrapper || !toggle) return;

  let direction = 1;
  const speed = 1;
  const interval = 20;
  const pauseTime = 5000;
  let paused = false;

  function pause() {
    paused = true;
    setTimeout(() => {
      paused = false;
      direction *= -1;
    }, pauseTime);
  }

  setInterval(() => {
    if (!toggle.checked || paused) return;

    wrapper.scrollTop += direction * speed;

    const max = wrapper.scrollHeight - wrapper.clientHeight;

    if (direction === 1 && wrapper.scrollTop >= max - 2) pause();
    if (direction === -1 && wrapper.scrollTop <= 2) pause();
  }, interval);
});

const burger = document.getElementById("burgerBtn");
const mobileNav = document.getElementById("mobileNav");
const closeBtn = document.getElementById("closeBurger");

// Toggle burger menu open
burger.addEventListener("click", () => {
  burger.classList.toggle("open");
  mobileNav.classList.toggle("open");
});

// Close button
closeBtn.addEventListener("click", () => {
  burger.classList.remove("open");
  mobileNav.classList.remove("open");
});

// Highlight active page
const currentPage = window.location.pathname.split("/").pop(); 
document.querySelectorAll(".header-nav a, .mobile-nav a").forEach(a => {
  if (a.getAttribute("href") === currentPage) {
    a.classList.add("active");
  } else {
    a.classList.remove("active");
  }
});

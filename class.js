const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";

;/* ------------------------------
   State
--------------------------------*/
let allData = [];
let currentClass = null;
let knownClasses = [];

let firstLoad = true;
let previousPositions = {};
let movedCars = new Set();
let lastPositionChangeTime = 0;

/* ------------------------------
   FLIP config (match app.js)
--------------------------------*/
const ANIMATION_DURATION = 2000;
const EXAGGERATION = 1;
const FLIP_IDLE_TIMEOUT = 1 * 60 * 1000;

/* ------------------------------
   Helpers (MATCH app.js)
--------------------------------*/
function isValidPosition(pos) {
  return Number.isFinite(pos) && pos > 0;
}

function isWithdrawn(row) {
  return (
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

function getRuns(row) {
  return [
    row.run_p_time,
    row.run_1_time,
    row.run_2_time,
    row.run_3_time
  ].filter(v => Number.isFinite(v));
}

function renderRun(value, best) {
  if (!Number.isFinite(value)) {
    return `<div class="run-time">—</div>`;
  }

  const slow = best !== null && value > best ? "slow" : "";
  return `<div class="run-time ${slow}">${formatLapSafe(value)}</div>`;
}

function renderSparkline(runs) {
  if (!runs.length) {
    return `<div class="sparkline"></div>`;
  }

  const best = Math.min(...runs);
  const worst = Math.max(...runs);
  const range = Math.max(worst - best, 0.001);

  const MIN = 6;
  const MAX = 24;

  return `
    <div class="sparkline">
      ${runs.map(v => {
        const ratio = (worst - v) / range; // faster = taller
        const height = MIN + ratio * (MAX - MIN);
        const cls = v === best ? "best" : "";
        return `<span class="${cls}" style="height:${height}px"></span>`;
      }).join("")}
    </div>
  `;
}

function isMobileView() {
  return window.innerWidth <= 768;
}

function positionsChanged(rows) {
  return rows.some(row => {
    const old = previousPositions[row.car_number];
    return old !== undefined && old !== row.class_position;
  });
}

/* ------------------------------
   Load + Poll
--------------------------------*/
async function loadClassData() {
  try {
    const response = await fetch(API_URL, { mode: "cors" });
    const rawData = await response.json();

    allData = rawData.filter(row => isValidPosition(row.position));

    syncClassDropdown(allData);
    renderClassLeaderboard();

  } catch (err) {
    console.error("Error loading class data:", err);
  }
}

/* ------------------------------
   Dropdown (stable)
--------------------------------*/
function syncClassDropdown(data) {
  const select = document.getElementById("classSelect");
  if (!select) return;

  const classes = [...new Set(data.map(r => r.class))]
    .filter(c => Number.isFinite(c))
    .sort((a, b) => a - b);

  if (!classes.length) return;
  if (JSON.stringify(classes) === JSON.stringify(knownClasses)) return;

  knownClasses = classes.slice();

  const previous = currentClass;
  select.innerHTML = "";

  classes.forEach(cls => {
    const option = document.createElement("option");
    option.value = cls;
    option.textContent = `Class ${cls}`;
    select.appendChild(option);
  });

  currentClass =
    previous !== null && classes.includes(Number(previous))
      ? previous
      : classes[0];

  select.value = currentClass;
  select.onchange = () => {
    currentClass = select.value;
    firstLoad = true;
    previousPositions = {};
    renderClassLeaderboard();
  };
}

/* ------------------------------
   Render leaderboard (FLIP)
--------------------------------*/
function renderClassLeaderboard() {

  if (currentClass === null) return;

  const mobile = isMobileView();
  const leaderboard = document.getElementById("leaderboard");
  if (!leaderboard) return;

  const rowsInClass = allData.filter(
    row => String(row.class) === String(currentClass)
  );

  const activeRows = rowsInClass
    .filter(row => !isWithdrawn(row))
    .sort((a, b) => a.class_position - b.class_position);

  const withdrawnRows = rowsInClass.filter(row => isWithdrawn(row));
  const classRows = [...activeRows, ...withdrawnRows];

  /* ---------- First load ---------- */
  if (firstLoad) {
    leaderboard.innerHTML = "";

    classRows.forEach(row => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "row class-row";
      rowDiv.id = `car-${row.car_number}`;
      
    const runs = [
      row.run_p_time,
      row.run_1_time,
      row.run_2_time,
      row.run_3_time
    ];

    const validRuns = runs.filter(v => Number.isFinite(v));
    const bestRun = validRuns.length ? Math.min(...validRuns) : null;

      rowDiv.innerHTML = mobile
        ? `
          <div class="position-combined">
            <div class="position-combined gap-stack">
              <span class="class-pos">${row.class_position}</span>
              <span class="overall-pos">${row.position}</span>
            </div>
            <span class="arrow"></span>
          </div>
          <div class="number">#${row.car_number}</div>
          <div class="driver">${row.driver}</div>
          <div class="lap">${formatLapSafe(row.best_lap)}</div>
          <div class="gap gap-stack">
            <span>${row.gap_to_first_in_class_display ?? "—"}</span>
            <span class="gap-front">${row.gap_to_car_in_front_in_class_display ?? "—"}</span>
          </div>
        `
        : `
          <div></div>
          <div class="position">${row.class_position} <span class="arrow"></span> </div>
          <div class="positionOverall">${row.position}</div>
          <div class="number">#${row.car_number}</div>
          <div class="driver">${row.driver}</div>
          <div class="car">${row.car}</div>
          
        ${renderRun(row.run_p_time, bestRun)}
        ${renderRun(row.run_1_time, bestRun)}
        ${renderRun(row.run_2_time, bestRun)}
        ${renderRun(row.run_3_time, bestRun)}

        ${renderSparkline(validRuns)}
          
          <div class="lap">${formatLapSafe(row.best_lap)}</div>
          <div class="gap gap-stack">
            <span>${row.gap_to_first_in_class_display ?? "—"}</span>
            <span class="gap-front">${row.gap_to_car_in_front_in_class_display ?? "—"}</span>
          </div>
        `;

      if (isWithdrawn(row)) {
        rowDiv.classList.add("withdrawn");
        rowDiv.querySelector(".lap").textContent = "0:00.000";
        rowDiv.querySelectorAll(".gap span").forEach(el => el.textContent = "—");
      }

      leaderboard.appendChild(rowDiv);
      previousPositions[row.car_number] = row.class_position;
    });

    updateTimestamps();
    firstLoad = false;
    return;
  }

  /* ---------- Detect movement ---------- */
  const now = Date.now();
  if (positionsChanged(classRows)) {
    lastPositionChangeTime = now;
  }

  const flipEnabled = (now - lastPositionChangeTime) < FLIP_IDLE_TIMEOUT;
  movedCars.clear();

  classRows.forEach(row => {
    const old = previousPositions[row.car_number];
    if (old !== undefined && row.class_position !== old) {
      movedCars.add(`car-${row.car_number}`);
    }
  });

  /* ---------- FLIP STEP 1: First rects ---------- */
  let firstRects = {};
  if (flipEnabled && movedCars.size) {
    const parentRect = leaderboard.getBoundingClientRect();
    [...leaderboard.children].forEach(el => {
      if (movedCars.has(el.id)) {
        const r = el.getBoundingClientRect();
        firstRects[el.id] = { top: r.top - parentRect.top };
      }
    });
  }

  /* ---------- Update content ---------- */
  classRows.forEach(row => {
    const rowDiv = document.getElementById(`car-${row.car_number}`);
    if (!rowDiv) return;

    const arrow = rowDiv.querySelector(".arrow");

    if (isWithdrawn(row)) {
      rowDiv.classList.add("withdrawn");
      rowDiv.classList.remove("up", "down");
      if (arrow) {
        arrow.textContent = "";
        arrow.classList.remove("up", "down");
      }
      rowDiv.querySelector(".lap").textContent = "0:00.000";
      rowDiv.querySelectorAll(".gap span").forEach(el => el.textContent = "—");
      previousPositions[row.car_number] = row.class_position;
      return;
    }

    rowDiv.classList.remove("withdrawn");

    // Update class position
    const classPosEl = rowDiv.querySelector(".class-pos");
    if (classPosEl) {
      classPosEl.textContent = row.class_position;
    }

    // Update overall position
    const overallPosEl = rowDiv.querySelector(".overall-pos");
    if (overallPosEl) {
      overallPosEl.textContent = row.position;
    }

    rowDiv.querySelector(".lap").textContent =
      formatLapSafe(row.best_lap);

    rowDiv.querySelector(".gap span").textContent =
      row.gap_to_first_in_class_display ?? "—";

    const gf = rowDiv.querySelector(".gap-front");
    if (gf) gf.textContent =
      row.gap_to_car_in_front_in_class_display ?? "—";

    // 🔼🔽 Arrow + row colour logic (MATCH app.js)
    const oldPos = previousPositions[row.car_number];
    if (oldPos !== undefined && arrow) {
      if (row.class_position < oldPos) {
        rowDiv.classList.add("up");
        rowDiv.classList.remove("down");
        arrow.textContent = "↑";
        arrow.className = "arrow up";
      } else if (row.class_position > oldPos) {
        rowDiv.classList.add("down");
        rowDiv.classList.remove("up");
        arrow.textContent = "↓";
        arrow.className = "arrow down";
      }
    }

    previousPositions[row.car_number] = row.class_position;
  });

  /* ---------- Reset FLIP if idle ---------- */
  if (!flipEnabled) {
    [...leaderboard.children].forEach(row => {
      row.style.transition = "";
      row.style.transform = "";

      // 🔥 RESET MOVEMENT STATE
      row.classList.remove("up", "down");

      const arrow = row.querySelector(".arrow");
      if (arrow) {
        arrow.textContent = "";
        arrow.classList.remove("up", "down");
      }
    });
  }

  /* ---------- Reorder DOM ---------- */
  if (flipEnabled && movedCars.size) {

    classRows.forEach(row => {
      const el = document.getElementById(`car-${row.car_number}`);
      if (el) leaderboard.appendChild(el);
    });

    /* ---------- FLIP STEP 2: Last rects ---------- */
    const lastRects = {};
    const parentRect = leaderboard.getBoundingClientRect();

    [...leaderboard.children].forEach(el => {
      if (movedCars.has(el.id)) {
        const r = el.getBoundingClientRect();
        lastRects[el.id] = { top: r.top - parentRect.top };
      }
    });

    /* ---------- FLIP STEP 3 + 4 ---------- */
    [...leaderboard.children].forEach(el => {
      if (!movedCars.has(el.id)) return;
      const first = firstRects[el.id];
      const last = lastRects[el.id];
      if (!first || !last) return;

      const deltaY = first.top - last.top;
      if (deltaY !== 0) {
        el.style.transition = "none";
        el.style.transform = `translateY(${deltaY * EXAGGERATION}px)`;
        el.getBoundingClientRect();
      }
    });

    requestAnimationFrame(() => {
      [...leaderboard.children].forEach(el => {
        if (!movedCars.has(el.id)) return;
        el.style.transition = `transform ${ANIMATION_DURATION}ms ease`;
        el.style.transform = "";
      });
    });
  }

  updateTimestamps();
}

/* ------------------------------
   Timestamps
--------------------------------*/
function updateTimestamps() {
  const timeText = "Last updated: " + new Date().toLocaleTimeString();

    const desktopTime = document.getElementById("lastUpdated");
    if (desktopTime) desktopTime.textContent = timeText;

    const mobileTime = document.getElementById("lastUpdatedMobile");
    if (mobileTime) mobileTime.textContent = timeText;

}

/* ------------------------------
   Init + Resize
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  loadClassData();
  setInterval(loadClassData, 30000);
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

//rebuild the table for mobile/desktop:
window.addEventListener("resize", () => {
  firstLoad = true;
  previousPositions = {};
  renderClassLeaderboard();
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


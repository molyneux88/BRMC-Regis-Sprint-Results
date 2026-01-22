const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";

let allData = [];
let currentClass = null;
let knownClasses = [];

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


/* ------------------------------
   Load + Poll
--------------------------------*/
async function loadClassData() {
  try {
    const response = await fetch(API_URL, { mode: "cors" });
    const rawData = await response.json();

    allData = rawData.filter(row => isValidPosition(row.position));

    syncClassDropdown(allData);

    // ✅ ALWAYS render after data load
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

  // Prevent rebuild if unchanged
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

  // ✅ Default to lowest class on first load
  if (previous !== null && classes.includes(Number(previous))) {
    currentClass = previous;
  } else {
    currentClass = classes[0];
  }

  select.value = currentClass;

  select.onchange = () => {
    currentClass = select.value;
    renderClassLeaderboard();
  };
}

/* ------------------------------
   Render leaderboard
--------------------------------*/
function renderClassLeaderboard() {

  const mobile = isMobileView();

  const leaderboard = document.getElementById("leaderboard");
  if (!leaderboard || currentClass === null) return;

  leaderboard.innerHTML = "";

    const rowsInClass = allData.filter(
    row => String(row.class) === String(currentClass)
    );

    const activeRows = rowsInClass
    .filter(row => !isWithdrawn(row))
    .sort((a, b) => a.class_position - b.class_position);

    const withdrawnRows = rowsInClass.filter(row => isWithdrawn(row));

    const classRows = [...activeRows, ...withdrawnRows];


  classRows.forEach(row => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "row class-row";

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
            <span class="class-pos">${row.class_position}</span>
            <span class="pos-sep"> / </span>
            <span class="overall-pos">${row.position}</span>
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
        <div class="position">${row.class_position}</div>
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
  });

  const timeText = "Last updated: " + new Date().toLocaleTimeString();

  const desktopTime = document.getElementById("lastUpdated");
  if (desktopTime) desktopTime.textContent = timeText;

  const mobileTime = document.getElementById("lastUpdatedMobile");
  if (mobileTime) mobileTime.textContent = timeText;
}

/* ------------------------------
   Init
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
  Object.keys(previousPositions).forEach(k => delete previousPositions[k]);
  loadLeaderboard();
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

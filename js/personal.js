const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";

import { getSelectedYear, onYearChange } from "./state.js";

let allData = [];
let currentDriver = null;

/* ------------------------------
   View Toggling
--------------------------------*/
function toggleViewMode() {
  const year = getSelectedYear();

  const yearView = document.getElementById("personalYearView");
  const allTimeView = document.getElementById("personalAllTimeView");

  if (!yearView || !allTimeView) return;

  if (year === "all") {
    yearView.style.display = "none";
    allTimeView.style.display = "block";
  } else {
    yearView.style.display = "block";
    allTimeView.style.display = "none";
  }
}

/* ------------------------------
   Helpers
--------------------------------*/
function formatLapSafe(value) {
  if (!Number.isFinite(value)) return "—";
  const min = Math.floor(value / 60);
  const sec = (value % 60).toFixed(3);
  return `${min}:${sec.padStart(6, "0")}`;
}

function isMobileView() {
  return window.innerWidth <= 768;
}

function isClassLeader(row, allRows) {
  if (!row || !Number.isFinite(row.class)) return false;

  const classRows = allRows.filter(r =>
    String(r.class) === String(row.class) &&
    Number.isFinite(r.class_position) &&
    r.class_position > 0 &&
    Number.isFinite(r.best_lap)
  );

  if (!classRows.length) return false;

  const leader = classRows.reduce((best, r) =>
    r.class_position < best.class_position ? r : best,
    classRows[0]
  );

  return leader.driver === row.driver;
}

function updateLapAnimation(bestLap) {
  if (!Number.isFinite(bestLap) || bestLap <= 0) return;

  // Find the active SVG (desktop OR mobile)
  const svg = isMobileView()
    ? document.querySelector(".mobile-track .track-svg")
    : document.querySelector(".desktop-only .track-svg");

  if (!svg) return;

  const dot = svg.querySelector("#lapDot");
  const anim = svg.querySelector("animateMotion");

  if (!dot || !anim) return;

  dot.style.display = "block";
  anim.setAttribute("dur", `${bestLap}s`);
}

/* ------------------------------
   Load Data
--------------------------------*/
async function loadPersonalData() {

  let rawData;

  const selectedYear = getSelectedYear();

  if (selectedYear === "live") {
    const response = await fetch(API_URL, { mode: "cors" });
    rawData = await response.json();
  } else {
    const yearFile = `assets/results${selectedYear}.json`;
    const response = await fetch(yearFile);
    rawData = await response.json();
  }

  allData = rawData
    .filter(r => r.driver)
    .sort((a, b) => a.driver.localeCompare(b.driver));

  buildDropdown();

  if (!currentDriver && allData.length) {
    currentDriver = allData[0].driver;
  }
}

/* ------------------------------
   Dropdown
--------------------------------*/
function buildDropdown() {
  const selects = [
    document.getElementById("competitorSelect"),
    document.getElementById("competitorSelectAllTime")
  ].filter(Boolean);

  if (!selects.length) return;

  const names = [...new Set(allData.map(r => r.driver))]
    .sort((a, b) => a.localeCompare(b));

  if (!names.length) return;

  // Ensure valid driver
  if (!currentDriver || !names.includes(currentDriver)) {
    currentDriver = names[0];
  }

  selects.forEach(select => {
    select.innerHTML = "";

    names.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });

    select.value = currentDriver;

    select.onchange = () => {
      currentDriver = select.value;

      if (getSelectedYear() === "all") {
        renderAllTimePlaceholder();
      } else {
        renderPersonal();
      }
    };
  });

  // 🔥 Render AFTER dropdowns exist
  if (getSelectedYear() === "all") {
    renderAllTimePlaceholder();
  } else {
    renderPersonal();
  }
}

/* ------------------------------
   Render
--------------------------------*/
function renderPersonal() {

  if (getSelectedYear() === "all") {
    return;
  }

  const container = isMobileView()
    ? document.getElementById("personalDetailsMobile")
    : document.getElementById("personalDetails");

  if (!container) return;

  const row = allData.find(r => r.driver === currentDriver);
  if (!row) return;

  const mobile = isMobileView();

  container.innerHTML = mobile
  ? `
    <div class="driver-summary">
      <div class="driver-top">
        <div class="driver-name">
          #${row.car_number} ${row.driver}
        </div>

        
      </div>

      <div class="driver-meta">
        <span class="car-no">Class ${row.class}</span>
        <span class="class">${row.car}</span>
      </div>

      <div class="positions">
          <span>Class Pos: <strong>${row.class_position}</strong></span>
          <span>Overall Pos: <strong>${row.position}</strong></span>
        </div>

      <div class="runs">
        <div><label>P</label><span>${formatLapSafe(row.run_p_time)}</span></div>
        <div><label>R1</label><span>${formatLapSafe(row.run_1_time)}</span></div>
        <div><label>R2</label><span>${formatLapSafe(row.run_2_time)}</span></div>
        <div><label>R3</label><span>${formatLapSafe(row.run_3_time)}</span></div>
      </div>
      <div class="runs">
        <div class="best">
          <label>Best</label>
          <span>${formatLapSafe(row.best_lap)}</span>
        </div>
      </div>
    </div>
  `
  :   
  `
  <div class="driver-summary">
    <div class="driver-top">
      <h2 class="driver-name">#${row.car_number} ${row.driver} 
      ${
        isClassLeader(row, allData)
          ? `<span class="class-leader-badge">Class ${row.class} Leader</span>`
          : ""
      }</h2>

      <div class="positions">
        <span>Class Position:<strong>${row.class_position}</strong></span>
        <span>Overall Position:<strong>${row.position}</strong></span>
      </div>
    </div>

    <div class="driver-meta">
      <span class="car-no">Class ${row.class}</span>
      <span class="class">${row.car}</span>
    </div>
  </div>

  <div class="runs">
    <div><label>Practice</label><span>${formatLapSafe(row.run_p_time)}</span></div>
    <div><label>Run 1</label><span>${formatLapSafe(row.run_1_time)}</span></div>
    <div><label>Run 2</label><span>${formatLapSafe(row.run_2_time)}</span></div>
    <div><label>Run 3</label><span>${formatLapSafe(row.run_3_time)}</span></div>
    <div class="best">
      <label>Best (${row.best_run ?? ""})</label>
      <span>${formatLapSafe(row.best_lap)}</span>
    </div>
  </div>
`;

  updateLapAnimation(row.best_lap);
  updateTimestamps();
}

/* ------------------------------
   Init
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  toggleViewMode();
  loadPersonalData();
  setInterval(() => {
    if (getSelectedYear() === "live") {
      loadPersonalData();
    }
  }, 30000);
});


/* ------------------------------
   Timestamps
--------------------------------*/
function updateTimestamps() {
  const selectedYear = getSelectedYear();

  const timeText = selectedYear === "live"
    ? "Live • " + new Date().toLocaleTimeString()
    : `Viewing ${selectedYear} Results`;

  const desktopTime = document.getElementById("lastUpdated");
  if (desktopTime) desktopTime.textContent = timeText;
}

// 🔥 Listen for year changes from header
onYearChange(() => {
  toggleViewMode();

  currentDriver = null;
  loadPersonalData(); // ✅ ALWAYS load data
});

function renderAllTimePlaceholder() {
  const name = currentDriver || "Select driver";

  document.getElementById("stat-total-laps").textContent = "—";
  document.getElementById("stat-fastest-lap").textContent = "—";
  document.getElementById("stat-average-lap").textContent = "—";
  document.getElementById("stat-cars-driven").textContent = "—";
}
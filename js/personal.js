const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";

import { getSelectedYear, onYearChange } from "./state.js";

let allData = [];
let currentDriver = null;
let selectedYearPills = new Set();

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
  const selectedYear = getSelectedYear();

  let rawData;

  if (selectedYear === "all") {
    rawData = await loadAllTimeData();
  } else if (selectedYear === "live") {
    const response = await fetch(API_URL, { mode: "cors" });
    rawData = await response.json();
  } else {
    const response = await fetch(`assets/results${selectedYear}.json`);
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
      selectedYearPills.clear();

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
onYearChange(async () => {
  toggleViewMode();
  currentDriver = null;
  await loadPersonalData();
});

function renderAllTimePlaceholder() {
  const container = document.getElementById("allTimeExtra");
  if (!container || !currentDriver) return;

  const mobile = isMobileView();

  const { years, cars } = getDriverHistory(currentDriver);

  const yearPills = years.map(year => `
    <span 
      class="year-pill ${selectedYearPills.has(year) ? "active" : ""}" 
      data-year="${year}">
      ${year}
    </span>
  `).join("");

  const carsList = cars.map(c => `
    <div class="car-item">
      ${c.range}: ${c.car} (${c.carYear}) • Class ${c.class}
    </div>
  `).join("");

  container.innerHTML = mobile
    ? `
      <div class="personal-leaderboard">

        <!-- DRIVER -->
        <div class="driver-summary">
          <div class="driver-top">
            <h2>${currentDriver || "Select a Driver"}</h2>
          </div>

          <!-- YEARS -->
          <div class="alltime-block">
            <strong>Years Entered</strong>
            <div class="years-list">
            ${yearPills}
            </div>

            ${
              selectedYearPills.size > 0
                 ? `<div class="clear-wrapper">
                    <button id="clearYearPills" class="clear-btn">Clear</button>
                  </div>`
                : ""
            }

          </div>

          <!-- CARS -->
          <div class="alltime-block">
            <strong>Cars Driven</strong>
            <div class="cars-list">
              ${carsList}
            </div>
          </div>
        </div>

        <!-- STATS -->
        <div class="runs alltime-runs">
          <div>
            <label>Fastest Lap</label>
            <span>--:--.---</span>
            <small class="stat-sub">(----)</small>
          </div>

          <div>
            <label>Average Lap</label>
            <span>--:--.---</span>
          </div>

          <div>
            <label>Total Laps</label>
            <span>---</span>
          </div>
        </div>

      </div>
    `
    : `
      <div class="personal-leaderboard">

        <!-- DRIVER -->
        <div class="driver-summary">
          <div class="driver-top">
            <h2>${currentDriver || "Select a Driver"}</h2>
          </div>

          <!-- DESKTOP SIDE BY SIDE -->
          <div class="driver-meta alltime-meta">
            <div>
              <strong>Years Entered</strong>
              <div class="years-list">
              ${yearPills}
              </div>

              ${
                selectedYearPills.size > 0
                  ? `<div class="clear-wrapper">
                      <button id="clearYearPills" class="clear-btn">Clear</button>
                    </div>`
                  : ""
              } 

            </div>

            <div>
              <strong>Cars Driven</strong>
              <div class="cars-list">
              ${carsList}
              </div>
            </div>
          </div>
        </div>

        <!-- STATS -->
        <div class="runs alltime-runs">
          <div>
            <label>Fastest Lap</label>
            <span>--:--.---</span>
            <small class="stat-sub">(----)</small>
          </div>

          <div>
            <label>Average Lap</label>
            <span>--:--.---</span>
          </div>

          <div>
            <label>Total Laps</label>
            <span>---</span>
          </div>
        </div>

      </div>
    `;
}

async function loadAllTimeData() {
  const years = ["2026", "2025", "2024", "2023", "2022", "2019"];

  let combined = [];

  for (const year of years) {
    try {
      let data;

      if (year === "2026") {
        const res = await fetch(API_URL, { mode: "cors" });
        data = await res.json();
      } else {
        const res = await fetch(`assets/results${year}.json`);
        data = await res.json();
      }

      // Tag each row with its year
      data.forEach(r => {
        r._year = year;
      });

      combined = combined.concat(data);

    } catch (err) {
      console.warn(`Failed loading ${year}`, err);
    }
  }

  return combined
    .filter(r => r.driver)
    .sort((a, b) => a.driver.localeCompare(b.driver));
}

function getDriverHistory(driverName) {
  const rows = allData.filter(r => r.driver === driverName);

  // ---------- YEARS ----------
  const years = [...new Set(rows.map(r => r._year))]
    .sort((a, b) => b.localeCompare(a));

  // ---------- GROUP CARS ----------
  const carGroups = new Map();

  rows.forEach(r => {
    const key = `${r.car}|${r.class || "na"}`;

    if (!carGroups.has(key)) {
      carGroups.set(key, {
        car: r.car || "Unknown",
        class: Number.isFinite(r.class) ? r.class : "n/a",
        years: new Set()
      });
    }

    carGroups.get(key).years.add(Number(r._year));
  });

  // ---------- BUILD RANGES ----------
  const cars = [];

  carGroups.forEach(group => {
    const sortedYears = [...group.years].sort((a, b) => a - b);

    let start = sortedYears[0];
    let prev = sortedYears[0];

    for (let i = 1; i < sortedYears.length; i++) {
      const year = sortedYears[i];

      if (year === prev + 1) {
        prev = year;
      } else {
        cars.push({
          range: start === prev ? `${start}` : `${start} - ${prev}`,
          car: group.car,
          class: group.class
        });

        start = year;
        prev = year;
      }
    }

    // push final range
    cars.push({
      range: start === prev ? `${start}` : `${start} - ${prev}`,
      car: group.car,
      class: group.class
    });
  });

  // sort newest first
  cars.sort((a, b) => {
    const getStart = str => Number(str.split(" - ")[0]);
    return getStart(b.range) - getStart(a.range);
  });

  return { years, cars };
}

function wireYearPills() {
  document.querySelectorAll(".year-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const year = pill.dataset.year;

      if (selectedYearPills.has(year)) {
        selectedYearPills.delete(year);
      } else {
        selectedYearPills.add(year);
      }

      renderAllTimePlaceholder(); // re-render UI
    });
  });

  const clearBtn = document.getElementById("clearYearPills");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      selectedYearPills.clear();
      renderAllTimePlaceholder();
    });
  }
}
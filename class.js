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
  return !Number.isFinite(row.best_lap);
}

function formatLapSafe(value) {
  if (!Number.isFinite(value)) return "0:00.000";

  const min = Math.floor(value / 60);
  const sec = (value % 60).toFixed(3);

  return `${min}:${sec.padStart(6, "0")}`;
}

/* ------------------------------
   Load + poll
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
   Dropdown (stable, non-resetting)
--------------------------------*/
function syncClassDropdown(data) {
  const select = document.getElementById("classSelect");
  if (!select) return;

  const classes = [...new Set(data.map(row => row.class))]
    .filter(c => c !== null && c !== undefined)
    .sort((a, b) => a - b);

  // Only rebuild if classes actually changed
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

  if (previous && classes.includes(Number(previous))) {
    select.value = previous;
    currentClass = previous;
  } else {
    currentClass = classes[0];
    select.value = currentClass;
  }

  select.onchange = () => {
    currentClass = select.value;
    renderClassLeaderboard();
  };
}

/* ------------------------------
   Render leaderboard
--------------------------------*/
function renderClassLeaderboard() {
  const leaderboard = document.getElementById("leaderboard");
  if (!leaderboard || !currentClass) return;

  leaderboard.innerHTML = "";

  const classRows = allData
    .filter(row => String(row.class) === String(currentClass))
    .sort((a, b) => {
      const aWithdrawn = isWithdrawn(a);
      const bWithdrawn = isWithdrawn(b);

      // ✅ Valid runners first
      if (aWithdrawn && !bWithdrawn) return 1;
      if (!aWithdrawn && bWithdrawn) return -1;

      return a.class_position - b.class_position;
    });

  classRows.forEach(row => {
    const withdrawn = isWithdrawn(row);

    const rowDiv = document.createElement("div");
    rowDiv.className = "row";
    rowDiv.id = `class-car-${row.car_number}`;

    rowDiv.innerHTML = `
      <div></div>
      <div class="position">${withdrawn ? "—" : row.class_position}</div>
      <div class="positionOverall">${withdrawn ? "—" : row.position}</div>
      <div class="number">#${row.car_number}</div>
      <div class="driver">${row.driver}</div>
      <div class="car">${row.car}</div>
      <div class="lap">${withdrawn ? "0:00.000" : formatLapSafe(row.best_lap)}</div>
      <div class="gap gap-stack">
        <span>${withdrawn ? "—" : (row.gap_to_first_in_class_display ?? "—")}</span>
        <span class="gap-front">${withdrawn ? "—" : (row.gap_to_car_in_front_in_class_display ?? "—")}</span>
      </div>
    `;

    if (withdrawn) {
      rowDiv.classList.add("withdrawn");
    }

    leaderboard.appendChild(rowDiv);
  });

  document.getElementById("lastUpdated").textContent =
    "Last updated: " + new Date().toLocaleTimeString();
}

/* ------------------------------
   Boot
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  loadClassData();
  setInterval(loadClassData, 30000);
});

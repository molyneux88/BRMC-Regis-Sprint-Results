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
    rowDiv.className = "row";

    rowDiv.innerHTML = `
      <div></div>
      <div class="position">${row.class_position}</div>
      <div class="positionOverall">${row.position}</div>
      <div class="number">#${row.car_number}</div>
      <div class="driver">${row.driver}</div>
      <div class="car">${row.car}</div>
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

  document.getElementById("lastUpdated").textContent =
    "Last updated: " + new Date().toLocaleTimeString();
}

/* ------------------------------
   Init
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  loadClassData();
  setInterval(loadClassData, 30000);
});

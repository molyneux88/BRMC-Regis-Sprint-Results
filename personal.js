const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";

let allData = [];
let currentDriver = null;

/* ------------------------------
   Helpers
--------------------------------*/
function formatLapSafe(value) {
  if (!Number.isFinite(value)) return "—";
  const min = Math.floor(value / 60);
  const sec = (value % 60).toFixed(3);
  return `${min}:${sec.padStart(6, "0")}`;
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
    r.class_position < best.class_position ? r : best
  );

  return leader.driver === row.driver;
}

function updateLapAnimation(bestLap) {
  const dot = document.getElementById("lapDot");
  if (!dot) return;

  const anim = dot.querySelector("animateMotion");
  if (!anim) return;

  if (!Number.isFinite(bestLap) || bestLap <= 0) {
    dot.style.display = "none";
    return;
  }

  dot.style.display = "block";
  anim.setAttribute("dur", `${bestLap}s`);
}

/* ------------------------------
   Load Data
--------------------------------*/
async function loadPersonalData() {
  const res = await fetch(API_URL, { mode: "cors" });
  const data = await res.json();

  allData = data
    .filter(r => r.driver)
    .sort((a, b) => a.driver.localeCompare(b.driver));

  buildDropdown();

  if (!currentDriver && allData.length) {
    currentDriver = allData[0].driver;
  }

  renderPersonal();
}

/* ------------------------------
   Dropdown
--------------------------------*/
function buildDropdown() {
  const select = document.getElementById("competitorSelect");
  if (!select) return;

  select.innerHTML = "";

  const names = [...new Set(allData.map(r => r.driver))];

  if (!names.length) return;

  names.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  // ✅ Default to first driver on initial load
  if (!currentDriver || !names.includes(currentDriver)) {
    currentDriver = names[0];
  }

  // ✅ Ensure the dropdown actually displays it
  select.value = currentDriver;

  // ✅ Render immediately on load
  renderPersonal();

  select.onchange = () => {
    currentDriver = select.value;
    renderPersonal();
  };
}

/* ------------------------------
   Render
--------------------------------*/
function renderPersonal() {
  const container = document.getElementById("personalDetails");
  const row = allData.find(r => r.driver === currentDriver);
  if (!row) return;

  container.innerHTML = `
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


  document.getElementById("lastUpdated").textContent =
    "Last updated: " + new Date().toLocaleTimeString();

  updateLapAnimation(row.best_lap);
}

/* ------------------------------
   Init
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  loadPersonalData();
  setInterval(loadPersonalData, 30000);
});

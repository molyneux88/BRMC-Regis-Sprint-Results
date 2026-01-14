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
  select.innerHTML = "";

  const names = [...new Set(allData.map(r => r.driver))];

  names.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  select.value = currentDriver;

  select.onchange = () => {
    currentDriver = select.value;
    renderPersonal();
  };
}

/* ------------------------------
   Render Sparkline
--------------------------------*/

function renderSparkline(values, bestIndex) {
  if (!values.length) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);

  return `
    <div class="sparkline">
      ${values.map((v, i) => {
        const pct = max === min ? 1 : (max - v) / (max - min);
        const height = 20 + pct * 30;

        return `
          <span
            class="${i === bestIndex ? "best" : ""}"
            style="height:${height}px"
            title="${formatLapSafe(v)}"
          ></span>
        `;
      }).join("")}
    </div>
  `;
}


/* ------------------------------
   Render
--------------------------------*/
function renderPersonal() {
  const container = document.getElementById("personalDetails");
  const row = allData.find(r => r.driver === currentDriver);
  if (!row) return;

  const runTimes = [
    row.run_1_time,
    row.run_2_time,
    row.run_3_time
  ].filter(v => Number.isFinite(v));

  const bestIndex = runTimes.findIndex(v => v === row.best_lap);

  container.innerHTML = `
    <div class="personal-header-row">
      <div>No</div>
      <div>Driver</div>
      <div>Car</div>
      <div>Class</div>
      <div>Overall</div>
    </div>

    <div class="personal-info-row">
      <div>#${row.car_number}</div>
      <div>${row.driver}</div>
      <div>${row.car}</div>
      <div>${row.class} (P${row.class_position})</div>
      <div>P${row.position}</div>
    </div>

    <div class="personal-runs header">
      <div>Practice</div>
      <div>Run 1</div>
      <div>Run 2</div>
      <div>Run 3</div>
      <div>Best</div>
    </div>

    <div class="personal-runs values">
      <div>${formatLapSafe(row.run_p_time)}</div>
      <div>${formatLapSafe(row.run_1_time)}</div>
      <div>${formatLapSafe(row.run_2_time)}</div>
      <div>${formatLapSafe(row.run_3_time)}</div>
      <div>${formatLapSafe(row.best_lap)} (${row.best_run ?? ""})</div>
    </div>

    ${renderSparkline(runTimes, bestIndex)}
  `;
}


/* ------------------------------
   Init
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  loadPersonalData();
});

const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";

import { getSelectedYear, onYearChange } from "./state.js";

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
    const selectedYear = getSelectedYear();

    let rawData;

    if (selectedYear === "live") {
      const response = await fetch(API_URL, { mode: "cors" });
      rawData = await response.json();
    } else {
      const response = await fetch(`assets/results${selectedYear}.json`);
      rawData = await response.json();
    }

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
      // wrapper
      const wrapper = document.createElement("div");
      wrapper.className = "row-wrapper";
      wrapper.id = `car-${row.car_number}`;

      // actual row
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
            <div class="gap-stack">
              <span class="class-pos">${row.class_position}</span>
              <span class="overall-pos">${row.position}</span>
            </div>
            <span class="arrow"></span>
          </div>
          <div class="number">#${row.car_number}</div>
          <div class="driver">${row.driver}<span class="expand-caret">▾</span></div>
          <div class="lap">${formatLapSafe(row.best_lap)}</div>
          <div class="gap gap-stack">
            <span>${row.gap_to_first_in_class_display ?? "—"}</span>
            <span class="gap-front">${row.gap_to_car_in_front_in_class_display ?? "—"}</span>
          </div>
        `
        : `
          <div></div>
          <div class="position">${row.class_position} <span class="arrow"></span></div>
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

      wrapper.appendChild(rowDiv);

      // MOBILE expandable content
      if (mobile) {
        const expand = document.createElement("div");
        expand.className = "row-expand";
        expand.innerHTML = `
          <div class="expand-inner">
            <div class="expand-grid">
              <div class="expand-item">
                <span class="label">P</span>
                <span class="value practice-time">
                  ${Number.isFinite(row.run_p_time) ? formatLapSafe(row.run_p_time) : "—"}
                </span>
              </div>

              <div class="expand-item">
                <span class="label">R1</span>
                <span class="value run1-time">
                  ${Number.isFinite(row.run_1_time) ? formatLapSafe(row.run_1_time) : "—"}
                </span>
              </div>

              <div class="expand-item">
                <span class="label">R2</span>
                <span class="value run2-time">
                  ${Number.isFinite(row.run_2_time) ? formatLapSafe(row.run_2_time) : "—"}
                </span>
              </div>

              <div class="expand-item">
                <span class="label">R3</span>
                <span class="value run3-time">
                  ${Number.isFinite(row.run_3_time) ? formatLapSafe(row.run_3_time) : "—"}
                </span>
              </div>
            </div>
          </div>
        `;
        wrapper.appendChild(expand);

        // Then populate the values + best-run class immediately
          const runs = [
            { key: "run_p_time", cls: ".practice-time" },
            { key: "run_1_time", cls: ".run1-time" },
            { key: "run_2_time", cls: ".run2-time" },
            { key: "run_3_time", cls: ".run3-time" },
          ];

          const best = Math.min(
            ...runs.map(r => Number.isFinite(row[r.key]) ? row[r.key] : Infinity)
          );

          runs.forEach(r => {
            const el = expand.querySelector(r.cls);
            if (!el) return;

            el.textContent = Number.isFinite(row[r.key]) ? formatLapSafe(row[r.key]) : "—";

            if (row[r.key] === best) {
              el.parentElement.classList.add("best");
            }
          });

      }

      if (isWithdrawn(row)) {
        rowDiv.classList.add("withdrawn");
        rowDiv.querySelector(".lap").textContent = "0:00.000";
        rowDiv.querySelectorAll(".gap span").forEach(el => el.textContent = "—");
      }

      leaderboard.appendChild(wrapper);
      previousPositions[row.car_number] = row.class_position;
    });


    enableRowExpansion();
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
    const wrapper = document.getElementById(`car-${row.car_number}`);
    if (!wrapper) return;

    const rowDiv = wrapper.querySelector(".row");
    const arrow = rowDiv.querySelector(".arrow");

    // Update class position
    // Update class position (mobile + desktop)
    const classPosEl = rowDiv.querySelector(".class-pos");
    if (classPosEl) {
      // mobile
      classPosEl.textContent = row.class_position;
    } else {
      // desktop
      const posEl = rowDiv.querySelector(".position");
      if (posEl) {
        posEl.firstChild.textContent = `${row.class_position} `;
      }
    }

    // Update overall position
    const overallPosEl = rowDiv.querySelector(".overall-pos");
    if (overallPosEl) {
      overallPosEl.textContent = row.position;
    } else {
      // desktop
      const overallPosEl = rowDiv.querySelector(".positionOverall");
      if (overallPosEl) {
        overallPosEl.firstChild.textContent = `${row.position} `;
      }
    }

    // ----- Update DESKTOP sparkline -----
    if (!isMobileView()) {
      const sparklineEl = rowDiv.querySelector(".sparkline");

      if (sparklineEl) {
        const runs = [
          row.run_p_time,
          row.run_1_time,
          row.run_2_time,
          row.run_3_time
        ].filter(v => Number.isFinite(v));

        if (!runs.length) {
          sparklineEl.innerHTML = "";
        } else {
          const best = Math.min(...runs);
          const worst = Math.max(...runs);
          const range = Math.max(worst - best, 0.001);

          const MIN = 6;
          const MAX = 24;

          sparklineEl.innerHTML = runs.map(v => {
            const ratio = (worst - v) / range;
            const height = MIN + ratio * (MAX - MIN);
            const cls = v === best ? "best" : "";
            return `<span class="${cls}" style="height:${height}px"></span>`;
          }).join("");
        }
      }
    }
    
    rowDiv.querySelector(".lap").textContent = formatLapSafe(row.best_lap);

    rowDiv.querySelector(".gap span").textContent =
      row.gap_to_first_in_class_display ?? "—";

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

    const wrapperEl = document.getElementById(`car-${row.car_number}`);

    if (wrapperEl) {
      const updateRun = (cls, value) => {
        const el = wrapperEl.querySelector(cls);
        if (el) {
          el.textContent = Number.isFinite(value)
            ? formatLapSafe(value)
            : "—";
        }
      };

      updateRun(".practice-time", row.run_p_time);
      updateRun(".run1-time", row.run_1_time);
      updateRun(".run2-time", row.run_2_time);
      updateRun(".run3-time", row.run_3_time);
    }

    // ----- Update DESKTOP run columns -----
    const desktopRuns = rowDiv.querySelectorAll(".run-time");

    const runValues = [
      row.run_p_time,
      row.run_1_time,
      row.run_2_time,
      row.run_3_time
    ];

    const validRuns = runValues.filter(v => Number.isFinite(v));
    const bestRun = validRuns.length ? Math.min(...validRuns) : null;

    desktopRuns.forEach((el, i) => {
      const value = runValues[i];

      if (!Number.isFinite(value)) {
        el.textContent = "—";
        el.classList.remove("slow");
        return;
      }

      el.textContent = formatLapSafe(value);

      if (bestRun !== null && value > bestRun) {
        el.classList.add("slow");
      } else {
        el.classList.remove("slow");
      }
    });


    const runs = [
      { key: "run_p_time", cls: ".practice-time" },
      { key: "run_1_time", cls: ".run1-time" },
      { key: "run_2_time", cls: ".run2-time" },
      { key: "run_3_time", cls: ".run3-time" },
    ];

    const best = Math.min(
      ...runs.map(r => Number.isFinite(row[r.key]) ? row[r.key] : Infinity)
    );

    runs.forEach(r => {
      const el = wrapper.querySelector(r.cls)?.parentElement; // .expand-item
      if (!el) return;

      if (row[r.key] === best) {
        el.classList.add("best");
      } else {
        el.classList.remove("best");
      }
    });

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

 /* ---------- RESET IF IDLE ---------- */
  if (!flipEnabled) {
    [...leaderboard.children].forEach(w => {
      const row = w.querySelector(".row");
      row.style.transition = "";
      row.style.transform = "";
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
  const selectedYear = getSelectedYear();

  const timeText = selectedYear === "live"
    ? "Live • " + new Date().toLocaleTimeString()
    : `Viewing ${selectedYear} Results`;

  const desktopTime = document.getElementById("lastUpdated");
  if (desktopTime) desktopTime.textContent = timeText;
}

/* ------------------------------
   Init + Resize
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  loadClassData();
  setInterval(() => {
    if (getSelectedYear() === "live") {
      loadClassData();
    }
  }, 30000);

  onYearChange(() => {
  firstLoad = true;
  previousPositions = {};
  loadClassData();
});

});

//rebuild the table for mobile/desktop:
let resizeTimeout;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    firstLoad = true;
    previousPositions = {};
    loadClassData(); // 🔥 important
  }, 200);
});

function enableRowExpansion() {
  if (!isMobileView()) return;

  document.querySelectorAll(".row-wrapper").forEach(wrapper => {
    const row = wrapper.querySelector(".row");
    if (!row) return;

    row.addEventListener("click", () => {
      // Close others (optional but recommended)
      document.querySelectorAll(".row-wrapper.open").forEach(w => {
        if (w !== wrapper) w.classList.remove("open");
      });

      wrapper.classList.toggle("open");
    });
  });
}




const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";
const EXAGGERATION = 1;
const ANIMATION_DURATION = 2000; // ms
const GAP_DISPLAY_MODE = "stacked"; // "separate" | "stacked"
const FLIP_IDLE_TIMEOUT = 1 * 60 * 1000; // 5 minutes
let lastPositionChangeTime = Date.now();
const movedCars = new Set();
let selectedYear = "live";

let firstLoad = true;
const previousPositions = {};

/* ------------------------------
   Helpers
--------------------------------*/
function isValidPosition(pos) {
  return Number.isFinite(pos) && pos > 0;
}

function safeText(value) {
  return value !== null && value !== undefined && value !== ""
    ? value
    : null;
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

function isMobileView() {
  return window.innerWidth <= 768;
}

/* ------------------------------
   Main loader
--------------------------------*/
async function loadLeaderboard() {

  const isLive = selectedYear === "live";
  const mobile = isMobileView();

  try {
    let rawData;

    if (isLive) {
      // 🔹 Fetch live data
      const response = await fetch(API_URL, { mode: "cors" });
      rawData = await response.json();
    } else {
      // 🔹 Load historical JSON
      const yearFile = `assets/results${selectedYear}.json`;
      const response = await fetch(yearFile);
      rawData = await response.json();
    }

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

        // wrapper
        const wrapper = document.createElement("div");
        wrapper.className = "row-wrapper";
        wrapper.id = `car-${row.car_number}`;

        const rowDiv = document.createElement("div");
        rowDiv.className = "row overall-row";
        

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
            <div class="position">${row.position}<span class="arrow"></span></div>
            <div class="number">#${row.car_number}</div>
            <div class="driver">${row.driver}<span class="expand-caret">▾</span></div>
            <div class="lap">${formatLapSafe(row.best_lap)}</div>
            <div class="gap gap-stack">
              <span>${row.gap_to_first_display ?? "—"}</span>
              <span class="gap-front">${row.gap_to_car_in_front_display ?? "—"}</span>
            </div>
          `
          : `
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

            const validRuns = runs
              .map(r => row[r.key])
              .filter(v => Number.isFinite(v));

            const best = validRuns.length ? Math.min(...validRuns) : null;

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
          rowDiv.querySelectorAll(".lap, .gap, .gap-front, .gap-front-col").forEach(el => el && (el.textContent = "—"));
        }

        

        leaderboard.appendChild(wrapper);
        previousPositions[row.car_number] = row.position;
      });

      if (mobile) {
        enableRowExpansion();
      }

      const timeText = isLive
      ? "Live • " + new Date().toLocaleTimeString()
      : `Viewing ${selectedYear} Results`;

      const desktopTime = document.getElementById("lastUpdated");
      if (desktopTime) desktopTime.textContent = timeText;

      const mobileTime = document.getElementById("lastUpdatedMobile");
      if (mobileTime) mobileTime.textContent = timeText;
      firstLoad = false;
      return;
    }

    /* ---------- Detect movement and mark moved cars ---------- */
    const now = Date.now();
    const positionsMoved = positionsChanged(data);

    if (positionsMoved) {
      lastPositionChangeTime = now;
    }

    const flipEnabled = (now - lastPositionChangeTime) < FLIP_IDLE_TIMEOUT;

    /* ---------- Step 1: mark moved cars ---------- */
    movedCars.clear();
    data.forEach(row => {
      const oldPos = previousPositions[row.car_number];
      if (oldPos !== undefined && row.position !== oldPos) {
        movedCars.add(`car-${row.car_number}`);
      }
    });

    /* ---------- FLIP STEP 1: measure old positions for moved rows ---------- */
    let firstRects = {};
    if (movedCars.size && flipEnabled) {
      const parentRect = leaderboard.getBoundingClientRect();
      [...leaderboard.children].forEach(row => {
        if (movedCars.has(row.id)) {
          const r = row.getBoundingClientRect();
          firstRects[row.id] = { top: r.top - parentRect.top };
        }
      });
    }

    /* ---------- Update content (numbers, driver, badge, arrows) ---------- */
    data.forEach(row => {
      const wrapperEl = document.getElementById(`car-${row.car_number}`);
      if (!wrapperEl) return;

      const rowDiv = wrapperEl.querySelector(".row");
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

      // 🔄 Revive row if it was previously withdrawn
      rowDiv.classList.remove("withdrawn");

      // Restore normal text colouring
      rowDiv.querySelectorAll(
        ".driver, .lap, .gap, .gap-front, .gap-front-col, .number, .class, .car"
      ).forEach(el => {
        if (el) el.style.color = "";
      });

      // Ensure opacity is restored if used in withdrawn styling
      rowDiv.style.opacity = "";

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

      const runs = [
        { key: "run_p_time", cls: ".practice-time" },
        { key: "run_1_time", cls: ".run1-time" },
        { key: "run_2_time", cls: ".run2-time" },
        { key: "run_3_time", cls: ".run3-time" },
      ];

      const validRuns = runs
        .map(r => row[r.key])
        .filter(v => Number.isFinite(v));

      const best = validRuns.length ? Math.min(...validRuns) : null;

      runs.forEach(r => {
        const valueEl = wrapperEl.querySelector(r.cls);
        if (!valueEl || !valueEl.parentElement) return;

        const el = valueEl.parentElement; // .expand-item
        if (!el) return;

        if (best !== null && row[r.key] === best) {
          el.classList.add("best");
        } else {
          el.classList.remove("best");
        }
      });

      const posEl = rowDiv.querySelector(".position");
      if (posEl) {
        const textNode = Array.from(posEl.childNodes)
          .find(n => n.nodeType === Node.TEXT_NODE);
        if (textNode) {
          textNode.textContent = row.position;
        }
      }

      // Update driver and badge
      const driverEl = rowDiv.querySelector(".driver");
      driverEl.innerHTML = mobile
        ? `
          ${row.driver}
          <span class="expand-caret">▾</span>
        `
      : `
          ${row.driver}
          ${
            classLeaders[row.class] === row.car_number
              ? `<span class="class-leader-badge">Class ${row.class} Leader</span>`
              : ""
          }
        `;

      if (!mobile) {
        const carEl = rowDiv.querySelector(".car");
        if (carEl) carEl.textContent = row.car;
      }

      rowDiv.querySelector(".lap").textContent = formatLapSafe(row.best_lap);

      // ----- GAP UPDATE (robust, creates missing elements) -----
     // ----- GAP UPDATE (text-node safe) -----
      const gapToFirst = row.gap_to_first_display;
      const gapToFront = row.gap_to_car_in_front_display;

      let gapEl = rowDiv.querySelector(".gap");

      // Create if missing
      if (!gapEl) {
        gapEl = document.createElement("div");
        gapEl.className = GAP_DISPLAY_MODE === "stacked"
          ? "gap gap-stack"
          : "gap";
        rowDiv.appendChild(gapEl);
      }

      // 🔥 THIS IS THE KEY LINE — removes the text node "—"
      gapEl.textContent = "";
      gapEl.innerHTML = "";

      if (GAP_DISPLAY_MODE === "stacked") {
        if (gapToFirst) {
          gapEl.insertAdjacentHTML(
            "beforeend",
            `<span>${gapToFirst}</span>`
          );
        }

        if (gapToFront) {
          gapEl.insertAdjacentHTML(
            "beforeend",
            `<span class="gap-front">${gapToFront}</span>`
          );
        }

        // Fallback if both are empty
        if (!gapToFirst && !gapToFront) {
          gapEl.textContent = "—";
        }
      } else {
        gapEl.textContent = gapToFirst ?? "—";
      }


      // Update arrow classes
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

    /* ---------- Reset FLIP if idle ---------- */
    if (!flipEnabled) {
      [...leaderboard.children].forEach(wrapper => {
        wrapper.style.transition = "";
        wrapper.style.transform = "";

        const rowDiv = wrapper.querySelector(".row");
        if (!rowDiv) return;

        const arrow = rowDiv.querySelector(".arrow");

        // ✅ Remove movement classes from the ROW
        rowDiv.classList.remove("up", "down");

        // ✅ Reset arrow
        if (arrow) {
          arrow.textContent = "";
          arrow.classList.remove("up", "down");
        }
      });
    }


    /* ---------- Reorder DOM for FLIP ---------- */
    if (flipEnabled && movedCars.size) {
      data.forEach(row => {
        const el = document.getElementById(`car-${row.car_number}`);
        if (el) leaderboard.appendChild(el);
      });

      /* ---------- FLIP STEP 2: measure new positions ---------- */
      const lastRects = {};
      const parentRect2 = leaderboard.getBoundingClientRect();
      [...leaderboard.children].forEach(row => {
        if (movedCars.has(row.id)) {
          const r = row.getBoundingClientRect();
          lastRects[row.id] = { top: r.top - parentRect2.top };
        }
      });

      /* ---------- FLIP STEP 3: invert ---------- */
      [...leaderboard.children].forEach(row => {
        if (!movedCars.has(row.id)) return;
        const first = firstRects[row.id];
        const last = lastRects[row.id];
        if (!first || !last) return;

        const deltaY = first.top - last.top;
        if (deltaY !== 0) {
          row.style.transition = "none";
          row.style.transform = `translateY(${deltaY * EXAGGERATION}px)`;
          row.getBoundingClientRect(); // 🔑 force layout
        }
      });

      /* ---------- FLIP STEP 4: play ---------- */
      requestAnimationFrame(() => {
        [...leaderboard.children].forEach(row => {
          if (!movedCars.has(row.id)) return;
          row.style.transition = `transform ${ANIMATION_DURATION}ms ease`;
          row.style.transform = "";
        });
      });
    }

    const timeText = isLive
  ? "Live • " + new Date().toLocaleTimeString()
  : `Viewing ${selectedYear} Results`;

    const desktopTime = document.getElementById("lastUpdated");
    if (desktopTime) desktopTime.textContent = timeText;

    const mobileTime = document.getElementById("lastUpdatedMobile");
    if (mobileTime) mobileTime.textContent = timeText;

    const historicalHeader = document.getElementById("historicalHeader");
    if (historicalHeader) {
      if (selectedYear === "live") {
        historicalHeader.style.display = "none";
      } else {
        historicalHeader.style.display = "block";
        historicalHeader.textContent = `Viewing ${selectedYear} Results`;
      }
    }

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
  setInterval(() => {
    if (selectedYear === "live") {
      loadLeaderboard();
    }
  }, 30000);
});

  /* ------------------------------
    Auto Scroll (with pauses)
  --------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("leaderboard-wrapper");
  const toggle = document.getElementById("autoScrollToggle");
  const scrollBtn = document.getElementById("scrollToTop");

  if (!wrapper) return;

  /* ------------------------------
    Auto-scroll interval
  --------------------------------*/
  if (toggle) {
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

    // Stop auto-scroll on user interaction
    wrapper.addEventListener("wheel", () => { toggle.checked = false; }, { passive: true });
    wrapper.addEventListener("touchstart", () => { toggle.checked = false; }, { passive: true });
  }

  /* ------------------------------
    Scroll to top button
  --------------------------------*/
  if (scrollBtn) {
    const SHOW_AFTER = 200;

    wrapper.addEventListener("scroll", () => {
      if (wrapper.scrollTop > SHOW_AFTER) {
        scrollBtn.classList.add("visible");
      } else {
        scrollBtn.classList.remove("visible");
      }
    });

    scrollBtn.addEventListener("click", () => {
      if (toggle) toggle.checked = false; // stop auto-scroll
      wrapper.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

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


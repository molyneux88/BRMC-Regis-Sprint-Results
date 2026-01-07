const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/"; // deployed Worker
let firstLoad = true;
const previousPositions = {};
const EXAGGERATION = 1.5; // exaggerate vertical movement

// Format lap time as minutes:seconds.milliseconds
function formatLap(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(3);
  return `${min}:${sec.padStart(6, "0")}`;
}

async function loadLeaderboard() {
  console.log("Loading leaderboard…");

  try {
    const response = await fetch(API_URL, { mode: "cors" });
    const data = await response.json();

    const leaderboard = document.getElementById("leaderboard");
    if (!leaderboard) return console.error("#leaderboard not found");

    // --------- FIRST LOAD: render without animation ----------
    if (firstLoad) {
      leaderboard.innerHTML = "";

      data.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.id = `car-${row.car_number}`;

        rowDiv.innerHTML = `
          <div class="position">${row.position}<span class="arrow"></span></div>
          <div class="number">#${row.car_number}</div>
          <div class="driver">${row.driver}</div>
          <div class="car">${row.car}</div>
          <div class="lap">${formatLap(row.best_lap)}</div>
          <div class="gap">${row.gap_to_first_display}</div>
        `;

        leaderboard.appendChild(rowDiv);
        previousPositions[row.car_number] = row.position;
      });

      document.getElementById("lastUpdated").textContent =
        "Last updated: " + new Date().toLocaleTimeString();

      firstLoad = false;
      return;
    }

    // --------- SUBSEQUENT LOADS: FLIP animation ----------
    // 1️⃣ Measure current positions
    const firstRects = {};
    Array.from(leaderboard.children).forEach(row => {
      firstRects[row.id] = row.getBoundingClientRect();
    });

    // 2️⃣ Update rows
    data.forEach(row => {
      const id = `car-${row.car_number}`;
      let rowDiv = document.getElementById(id);

      if (!rowDiv) {
        rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.id = id;
        leaderboard.appendChild(rowDiv);
      }

      // Ensure arrow span exists
      let arrowSpan = rowDiv.querySelector(".arrow");
      if (!arrowSpan) {
        arrowSpan = document.createElement("span");
        arrowSpan.className = "arrow";
        rowDiv.querySelector(".position").appendChild(arrowSpan);
      }

      // Update row content
      rowDiv.querySelector(".position").childNodes[0].textContent = row.position;
      rowDiv.querySelector(".number").textContent = `#${row.car_number}`;
      rowDiv.querySelector(".driver").textContent = row.driver;
      rowDiv.querySelector(".car").textContent = row.car;
      rowDiv.querySelector(".lap").textContent = formatLap(row.best_lap);
      rowDiv.querySelector(".gap").textContent = row.gap_to_first_display;

      // Detect movement
      const oldPos = previousPositions[row.car_number];
      if (oldPos !== undefined) {
        if (row.position < oldPos) {
          rowDiv.classList.add("up");
          rowDiv.classList.remove("down");
          arrowSpan.textContent = "↑";
          arrowSpan.classList.add("up");
          arrowSpan.classList.remove("down");
        } else if (row.position > oldPos) {
          rowDiv.classList.add("down");
          rowDiv.classList.remove("up");
          arrowSpan.textContent = "↓";
          arrowSpan.classList.add("down");
          arrowSpan.classList.remove("up");
        } else {
          arrowSpan.textContent = "";
          rowDiv.classList.remove("up", "down");
        }

        // Keep highlight visible longer
        setTimeout(() => {
          rowDiv.classList.remove("up", "down");
        }, 2000);
      }

      previousPositions[row.car_number] = row.position;
    });

    // 3️⃣ Reorder DOM according to new positions
    data.forEach(row => {
      const rowDiv = document.getElementById(`car-${row.car_number}`);
      leaderboard.appendChild(rowDiv);
    });

    // 4️⃣ Measure new positions
    const lastRects = {};
    Array.from(leaderboard.children).forEach(row => {
      lastRects[row.id] = row.getBoundingClientRect();
    });

    // 5️⃣ Apply FLIP animation with slight exaggeration
    Array.from(leaderboard.children).forEach(row => {
      const first = firstRects[row.id];
      const last = lastRects[row.id];
      if (!first || !last) return;

      const deltaY = first.top - last.top;
      if (deltaY !== 0) {
        row.style.transform = `translateY(${deltaY * EXAGGERATION}px)`;
        row.style.transition = "none";

        requestAnimationFrame(() => {
          row.style.transform = "";
          row.style.transition = "transform 5s ease";
        });
      }
    });

    // 6️⃣ Update timestamp
    document.getElementById("lastUpdated").textContent =
      "Last updated: " + new Date().toLocaleTimeString();

  } catch (error) {
    console.error("Error loading leaderboard:", error);
  }
}

// Start polling after DOM ready
document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
  setInterval(loadLeaderboard, 30000);
});

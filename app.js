const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/"; // deployed Worker
const EXAGGERATION = 1.5; // exaggerate vertical movement
const ANIMATION_DURATION = 800; // ms
let firstLoad = true;
const previousPositions = {};

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

    // --------- FIRST LOAD ----------
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

    // --------- SUBSEQUENT LOADS ----------
    const firstRects = {};
    Array.from(leaderboard.children).forEach(row => {
      firstRects[row.id] = row.getBoundingClientRect();
    });

    // 1️⃣ Update row contents & highlights
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

      // Update text content
      rowDiv.querySelector(".position").childNodes[0].textContent = row.position;
      rowDiv.querySelector(".number").textContent = `#${row.car_number}`;
      rowDiv.querySelector(".driver").textContent = row.driver;
      rowDiv.querySelector(".car").textContent = row.car;
      rowDiv.querySelector(".lap").textContent = formatLap(row.best_lap);
      rowDiv.querySelector(".gap").textContent = row.gap_to_first_display;

      // Movement detection
      const oldPos = previousPositions[row.car_number];
      if (oldPos !== undefined) {
        const arrow = arrowSpan;

        // Apply highlight
        if (row.position < oldPos) {
        rowDiv.classList.add("up");
        rowDiv.classList.remove("down");
        arrowSpan.textContent = "↑";
        } else if (row.position > oldPos) {
        rowDiv.classList.add("down");
        rowDiv.classList.remove("up");
        arrowSpan.textContent = "↓";
        } else {
        arrowSpan.textContent = "";
        rowDiv.classList.remove("up", "down");
        }

        // Remove highlight after 2s
        setTimeout(() => {
        rowDiv.classList.remove("up", "down");
        }, 2000);

      }

      previousPositions[row.car_number] = row.position;
    });

    // 2️⃣ Measure final positions
    const lastRects = {};
    Array.from(leaderboard.children).forEach(row => {
      lastRects[row.id] = row.getBoundingClientRect();
    });

    // 3️⃣ Apply FLIP transforms
    Array.from(leaderboard.children).forEach(row => {
      const first = firstRects[row.id];
      const last = lastRects[row.id];
      if (!first || !last) return;

      const deltaY = first.top - last.top;
      if (deltaY !== 0) {
        row.style.transition = "none";
        row.style.transform = `translateY(${deltaY * EXAGGERATION}px)`;
      }
    });

    // 4️⃣ Trigger animation
    requestAnimationFrame(() => {
      Array.from(leaderboard.children).forEach(row => {
        if (row.style.transform) {
          row.style.transition = `transform ${ANIMATION_DURATION}ms ease`;
          row.style.transform = "";
        }
      });
    });

    // 5️⃣ Reorder DOM after animation completes
    setTimeout(() => {
      data.forEach(row => {
        const rowDiv = document.getElementById(`car-${row.car_number}`);
        leaderboard.appendChild(rowDiv);
      });
    }, ANIMATION_DURATION);

    // 6️⃣ Update timestamp
    document.getElementById("lastUpdated").textContent =
      "Last updated: " + new Date().toLocaleTimeString();

  } catch (error) {
    console.error("Error loading leaderboard:", error);
  }
}

// Start polling
document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
  setInterval(loadLeaderboard, 30000);
});

const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";
const EXAGGERATION = 5.5; // optional exaggeration for visibility
const ANIMATION_DURATION = 10000; // ms
let firstLoad = true;
const previousPositions = {};

function formatLap(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(3);
  return `${min}:${sec.padStart(6, "0")}`;
}

async function loadLeaderboard() {
  try {
    const response = await fetch(API_URL, { mode: "cors" });
    const data = await response.json();
    const leaderboard = document.getElementById("leaderboard");
    if (!leaderboard) return;

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

    // 1️⃣ Measure previous positions
    const firstRects = {};
    Array.from(leaderboard.children).forEach(row => {
      firstRects[row.id] = row.getBoundingClientRect();
    });

    // 2️⃣ Update text content and highlights/arrows
    data.forEach(row => {
      const rowDiv = document.getElementById(`car-${row.car_number}`);
      if (!rowDiv) return;

      let arrowSpan = rowDiv.querySelector(".arrow");
      if (!arrowSpan) {
        arrowSpan = document.createElement("span");
        arrowSpan.className = "arrow";
        rowDiv.querySelector(".position").appendChild(arrowSpan);
      }

      rowDiv.querySelector(".position").childNodes[0].textContent = row.position;
      rowDiv.querySelector(".number").textContent = `#${row.car_number}`;
      rowDiv.querySelector(".driver").textContent = row.driver;
      rowDiv.querySelector(".car").textContent = row.car;
      rowDiv.querySelector(".lap").textContent = formatLap(row.best_lap);
      rowDiv.querySelector(".gap").textContent = row.gap_to_first_display;

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
          rowDiv.classList.remove("up", "down");
          arrowSpan.textContent = "";
          arrowSpan.classList.remove("up", "down");
        }

        // Remove highlight after 2s
        setTimeout(() => {
          rowDiv.classList.remove("up", "down");
        }, 2000);
      }

      previousPositions[row.car_number] = row.position;
    });

    // 3️⃣ Pre-reorder DOM to new positions
    data.forEach(row => {
      const rowDiv = document.getElementById(`car-${row.car_number}`);
      leaderboard.appendChild(rowDiv); // appendChild moves to correct order
    });

    // 4️⃣ Measure new positions after reorder
    const lastRects = {};
    Array.from(leaderboard.children).forEach(row => {
      lastRects[row.id] = row.getBoundingClientRect();
    });

    // 5️⃣ Apply transform to offset back to old visual position
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

    // 6️⃣ Animate transform back to 0
    requestAnimationFrame(() => {
      Array.from(leaderboard.children).forEach(row => {
        if (row.style.transform) {
          row.style.transition = `transform ${ANIMATION_DURATION}ms ease`;
          row.style.transform = "";
        }
      });
    });

    // 7️⃣ Update timestamp
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

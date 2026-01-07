const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";
const EXAGGERATION = 1.5; 
const ANIMATION_DURATION = 800; // ms
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
      // Initial render
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

    // 1️⃣ Measure initial positions
    const firstRects = {};
    Array.from(leaderboard.children).forEach(row => {
      firstRects[row.id] = row.getBoundingClientRect();
    });

    // 2️⃣ Update content and apply highlights/arrows (do not reorder DOM)
    data.forEach(row => {
      const rowDiv = document.getElementById(`car-${row.car_number}`);
      if (!rowDiv) return;

      // Ensure arrow span exists
      let arrowSpan = rowDiv.querySelector(".arrow");
      if (!arrowSpan) {
        arrowSpan = document.createElement("span");
        arrowSpan.className = "arrow";
        rowDiv.querySelector(".position").appendChild(arrowSpan);
      }

      // Update text
      rowDiv.querySelector(".position").childNodes[0].textContent = row.position;
      rowDiv.querySelector(".number").textContent = `#${row.car_number}`;
      rowDiv.querySelector(".driver").textContent = row.driver;
      rowDiv.querySelector(".car").textContent = row.car;
      rowDiv.querySelector(".lap").textContent = formatLap(row.best_lap);
      rowDiv.querySelector(".gap").textContent = row.gap_to_first_display;

      // Apply highlight & arrow based on movement
      const oldPos = previousPositions[row.car_number];
      const arrow = arrowSpan;

      if (oldPos !== undefined) {
        if (row.position < oldPos) {
          rowDiv.classList.add("up");
          rowDiv.classList.remove("down");
          arrow.textContent = "↑";
          arrow.classList.add("up");
          arrow.classList.remove("down");
        } else if (row.position > oldPos) {
          rowDiv.classList.add("down");
          rowDiv.classList.remove("up");
          arrow.textContent = "↓";
          arrow.classList.add("down");
          arrow.classList.remove("up");
        } else {
          rowDiv.classList.remove("up", "down");
          arrow.textContent = "";
          arrow.classList.remove("up", "down");
        }

        // Remove highlight after 2s
        setTimeout(() => {
          rowDiv.classList.remove("up", "down");
        }, 2000);
      }

      previousPositions[row.car_number] = row.position;
    });

    // 3️⃣ Measure final positions
    const lastRects = {};
    Array.from(leaderboard.children).forEach(row => {
      lastRects[row.id] = row.getBoundingClientRect();
    });

    // 4️⃣ Apply FLIP transforms
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

    // 5️⃣ Animate transforms
    requestAnimationFrame(() => {
      Array.from(leaderboard.children).forEach(row => {
        if (row.style.transform) {
          row.style.transition = `transform ${ANIMATION_DURATION}ms ease`;
          row.style.transform = "";
        }
      });
    });

    // 6️⃣ Reorder DOM after animation
    setTimeout(() => {
      data.forEach(row => {
        const rowDiv = document.getElementById(`car-${row.car_number}`);
        leaderboard.appendChild(rowDiv);
      });
    }, ANIMATION_DURATION);

    // 7️⃣ Update timestamp
    document.getElementById("lastUpdated").textContent =
      "Last updated: " + new Date().toLocaleTimeString();

  } catch (error) {
    console.error("Error loading leaderboard:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
  setInterval(loadLeaderboard, 30000);
});

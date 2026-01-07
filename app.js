const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";

const previousPositions = {};

async function loadLeaderboard() {
  try {
    const response = await fetch(API_URL, { mode: "cors" });
    const data = await response.json();

    const leaderboard = document.getElementById("leaderboard");

    data.forEach(row => {
      const id = row.car_number;
      const newPos = row.position;
      const oldPos = previousPositions[id];

      let rowDiv = document.getElementById(`car-${id}`);

      if (!rowDiv) {
        // First time this car appears
        rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.id = `car-${id}`;

        rowDiv.innerHTML = `
          <div class="position">${row.position}</div>
          <div class="number">#${row.car_number}</div>
          <div class="driver">${row.driver}</div>
          <div class="car">${row.car}</div>
          <div class="lap">${formatLap(row.best_lap)}</div>
          <div class="gap">${row.gap_to_first_display}</div>
        `;

        leaderboard.appendChild(rowDiv);
      } else {
        // Update existing row content
        rowDiv.querySelector(".position").textContent = row.position;
        rowDiv.querySelector(".lap").textContent = formatLap(row.best_lap);
        rowDiv.querySelector(".gap").textContent = row.gap_to_first_display;
      }

      // Position change detection
      if (oldPos !== undefined) {
        if (newPos < oldPos) {
          rowDiv.classList.add("up");
        } else if (newPos > oldPos) {
          rowDiv.classList.add("down");
        }

        // Remove highlight after animation
        setTimeout(() => {
          rowDiv.classList.remove("up", "down");
        }, 800);
      }

      previousPositions[id] = newPos;
    });

    // Reorder DOM to match new positions
    data.forEach(row => {
      const rowDiv = document.getElementById(`car-${row.car_number}`);
      leaderboard.appendChild(rowDiv);
    });

  } catch (error) {
    console.error("Error loading leaderboard:", error);
  }
}


function formatLap(seconds) {
  if (seconds === null || seconds === undefined || seconds === "") {
    return "—";
  }
  return Number(seconds).toFixed(2);
}

loadLeaderboard();
setInterval(loadLeaderboard, 30000);

const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";

const previousPositions = {};

async function loadLeaderboard() {
  try {
    const response = await fetch(API_URL, { mode: "cors" });
    const data = await response.json();

    const leaderboard = document.getElementById("leaderboard");

    // 1️⃣ Measure current positions
    const firstRects = {};
    Array.from(leaderboard.children).forEach(row => {
      firstRects[row.id] = row.getBoundingClientRect();
    });

    // 2️⃣ Create/update rows WITHOUT reordering yet
    data.forEach(row => {
      const id = `car-${row.car_number}`;
      let rowDiv = document.getElementById(id);

      if (!rowDiv) {
        rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.id = id;

        rowDiv.innerHTML = `
          <div class="position"></div>
          <div class="number"></div>
          <div class="driver"></div>
          <div class="car"></div>
          <div class="lap"></div>
          <div class="gap"></div>
        `;

        leaderboard.appendChild(rowDiv);
      }

      rowDiv.querySelector(".position").textContent = row.position;
      rowDiv.querySelector(".number").textContent = `#${row.car_number}`;
      rowDiv.querySelector(".driver").textContent = row.driver;
      rowDiv.querySelector(".car").textContent = row.car;
      rowDiv.querySelector(".lap").textContent = formatLap(row.best_lap);
      rowDiv.querySelector(".gap").textContent = row.gap_to_first_display;

      // Position change colouring
      const oldPos = previousPositions[row.car_number];
      if (oldPos !== undefined) {
        if (row.position < oldPos) rowDiv.classList.add("up");
        if (row.position > oldPos) rowDiv.classList.add("down");

        setTimeout(() => {
          rowDiv.classList.remove("up", "down");
        }, 800);
      }

      previousPositions[row.car_number] = row.position;
    });

    // 3️⃣ Reorder DOM to new positions
    data.forEach(row => {
      const rowDiv = document.getElementById(`car-${row.car_number}`);
      leaderboard.appendChild(rowDiv);
    });

    // 4️⃣ Measure new positions
    const lastRects = {};
    Array.from(leaderboard.children).forEach(row => {
      lastRects[row.id] = row.getBoundingClientRect();
    });

    // 5️⃣ Apply FLIP animation
    Array.from(leaderboard.children).forEach(row => {
      const first = firstRects[row.id];
      const last = lastRects[row.id];
      if (!first || !last) return;

      const deltaY = first.top - last.top;

      if (deltaY !== 0) {
        row.style.transform = `translateY(${deltaY}px)`;
        row.style.transition = "none";

        requestAnimationFrame(() => {
          row.style.transform = "";
          row.style.transition = "transform 0.4s ease";
        });
      }
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

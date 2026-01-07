const API_URL = "https://lap-times-proxy.molyneux-88.workers.dev/";

console.log("Loading leaderboard…");

let firstLoad = true;
const previousPositions = {};

async function loadLeaderboard() {
  console.log("Loading leaderboard…");

  try {
    const response = await fetch(API_URL, { mode: "cors" });
    const data = await response.json();

    const leaderboard = document.getElementById("leaderboard");

    // FIRST LOAD — simple render, no animation
    if (firstLoad) {
      leaderboard.innerHTML = "";

      data.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.id = `car-${row.car_number}`;

        rowDiv.innerHTML = `
          <div class="position">${row.position}</div>
          <div class="number">#${row.car_number}</div>
          <div class="driver">${row.driver}</div>
          <div class="car">${row.car}</div>
          <div class="lap">${formatLap(row.best_lap)}</div>
          <div class="gap">${row.gap_to_first_display}</div>
        `;

        leaderboard.appendChild(rowDiv);
        previousPositions[row.car_number] = row.position;
      });

      // Update timestamp
      document.getElementById("lastUpdated").textContent =
        "Last updated: " + new Date().toLocaleTimeString();

      firstLoad = false;
      return;
    }

    // ---------- SUBSEQUENT LOADS (FLIP) ----------

    // 1️⃣ Measure current positions
    const firstRects = {};
    Array.from(leaderboard.children).forEach(row => {
      firstRects[row.id] = row.getBoundingClientRect();
    });

    // 2️⃣ Update / create rows
    data.forEach(row => {
      const id = `car-${row.car_number}`;
      let rowDiv = document.getElementById(id);

      if (!rowDiv) {
        rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.id = id;
        leaderboard.appendChild(rowDiv);
      }

      rowDiv.innerHTML = `
        <div class="position">${row.position}</div>
        <div class="number">#${row.car_number}</div>
        <div class="driver">${row.driver}</div>
        <div class="car">${row.car}</div>
        <div class="lap">${formatLap(row.best_lap)}</div>
        <div class="gap">${row.gap_to_first_display}</div>
      `;

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

    // 3️⃣ Reorder DOM
    data.forEach(row => {
      const rowDiv = document.getElementById(`car-${row.car_number}`);
      leaderboard.appendChild(rowDiv);
    });

    // 4️⃣ Measure new positions
    const lastRects = {};
    Array.from(leaderboard.children).forEach(row => {
      lastRects[row.id] = row.getBoundingClientRect();
    });

    // 5️⃣ FLIP animation
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

    // Update timestamp
    document.getElementById("lastUpdated").textContent =
      "Last updated: " + new Date().toLocaleTimeString();

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

document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
  setInterval(loadLeaderboard, 30000);
});


const API_URL = "https://script.google.com/macros/s/AKfycbxa5GitlumgE44NiBazqNRGdHBfZwRSjmdOurxN1rO1qOBiLlJrwbbCZpWRQayY_B_LQw/exec";

async function loadLeaderboard() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    const leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = "";

    console.log("RAW DATA:", data);
data.forEach(row => {
  console.log("ROW KEYS:", Object.keys(row));
      const div = document.createElement("div");
      div.className = "row";

      div.innerHTML = `
        <div class="position">${row["Position"]}</div>
        <div class="number">#${row["Car Number"]}</div>
        <div class="driver">${row["Driver"]}</div>
        <div class="car">${row["Car"]}</div>
        <div class="lap">${formatLap(row["Best Lap"])}</div>
        <div class="gap">${row["Gap to First — DISPLAY"]}</div>
      `;

      leaderboard.appendChild(div);
    });

    document.getElementById("lastUpdated").textContent =
      "Last updated: " + new Date().toLocaleTimeString();

  } catch (error) {
    console.error("Error loading leaderboard:", error);
  }
}

function formatLap(seconds) {
  // If you later switch to mm:ss.xxx, this is where it happens
  return Number(seconds).toFixed(2);
}

loadLeaderboard();
setInterval(loadLeaderboard, 30000);

async function loadLeaderboard() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    const leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = "";

    data.forEach(row => {
      const div = document.createElement("div");
      div.className = "row";

      div.innerHTML = `
        <div class="position">${row.position}</div>
        <div class="number">#${row.number}</div>
        <div class="driver">${row.driver}</div>
        <div class="lap">${row.best_lap}</div>
        <div class="gap">${row.gap}</div>
      `;

      leaderboard.appendChild(div);
    });

    document.getElementById("lastUpdated").textContent =
      "Last updated: " + new Date().toLocaleTimeString();

  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// Initial load
loadLeaderboard();

// Refresh every 30 seconds
setInterval(loadLeaderboard, 30000);

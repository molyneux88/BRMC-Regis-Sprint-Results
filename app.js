const API_URL = "https://lap-times-proxy.yourname.workers.dev";

async function loadLeaderboard() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    const leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = "";

    data.forEach(row => {
      // Skip withdrawn cars if you want later:
      // if (row.withdrawn_check === "WITHDRAWN") return;

      const div = document.createElement("div");
      div.className = "row";

      div.innerHTML = `
        <div class="position">${row.position}</div>
        <div class="number">#${row.car_number}</div>
        <div class="driver">${row.driver}</div>
        <div class="car">${row.car}</div>
        <div class="lap">${formatLap(row.best_lap)}</div>
        <div class="gap">${row.gap_to_first_display}</div>
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
  if (seconds === null || seconds === undefined || seconds === "") {
    return "—";
  }
  return Number(seconds).toFixed(2);
}

loadLeaderboard();
setInterval(loadLeaderboard, 30000);

import { getSelectedYear, setSelectedYear, onYearChange } from "./state.js";

/* ==============================
   HISTORIC YEAR DROPDOWN HANDLE
================================ */

function handleYearChange(newYear) {
  setSelectedYear(newYear);
}


/* ==============================
   HEADER MODULE
================================ */

function renderHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;

  // ✅ DEFINE PAGE FIRST
  const page =
    document.body.dataset.page ||
    location.pathname.split("/").pop().replace(".html", "") ||
    "overall";

  header.className = "site-header centered-layout";

  header.innerHTML = `
    <!-- Desktop nav -->
    <header class="header-left desktop-only">
      <nav class="header-nav">
        <a href="index.html" class="nav-link" data-page="overall">Overall</a>
        <a href="class.html" class="nav-link" data-page="class">Class</a>
        <a href="personal.html" class="nav-link" data-page="personal">Personal</a>
      </nav>

      <!-- Desktop Dropdown (now BELOW nav) -->
      <div class="year-selector-container">
        <select id="yearSelectDesktop">
          <option value="live">2026 (Live)</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
          <option value="2021" disabled>2021</option>
          <option value="2020" disabled>2020</option>
          <option value="2019">2019</option>
        </select>
      </div>
    </header>

    <!-- Burger (mobile only) -->
    <button class="burger mobile-only" id="burgerBtn">
      <span class="burger-bar top"></span>
      <span class="burger-bar middle"></span>
      <span class="burger-bar bottom"></span>
    </button>

    <!-- Center branding -->
    <div class="header-center">
      <img src="assets/BRMC Logo.avif" alt="BRMC Crest" class="header-logo large">
      <h1>2026 Regis Sprint<br>at Goodwood</h1>
    </div>

    <!-- Right controls -->
    <div class="header-right">

      <div class="desktop-only">
        ${page === "overall" ? `
          <label class="toggle">
            <input type="checkbox" id="autoScrollToggle">
            <span class="slider"></span>
            <span class="label-text">Auto Scroll</span>
          </label>
        ` : ""}
      </div>

      <div id="lastUpdated">Waiting for data…</div>

      <div class="mobile-only header-right-padding"></div>
    </div>

    <!-- Mobile nav -->
    <nav class="mobile-nav mobile-only" id="mobileNav">
      <button class="close-menu" id="closeBurger">×</button>
      <a href="index.html" class="mobile-link" data-page="overall">Overall</a>
      <a href="class.html" class="mobile-link" data-page="class">Class</a>
      <a href="personal.html" class="mobile-link" data-page="personal">Personal</a>

      <!-- Mobile Dropdown (own section below buttons) -->
      <div class="mobile-only year-selector-container">
        <select id="yearSelectMobile">
          <option value="live">2026 (Live)</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
          <option value="2021" disabled>2021</option>
          <option value="2020" disabled>2020</option>
          <option value="2019">2019</option>
        </select>
      </div>
    </nav>
  `;

    // 🔥 Add status bar container (below header)
  let statusBar = document.getElementById("statusBar");

  if (!statusBar) {
    statusBar = document.createElement("div");
    statusBar.id = "statusBar";
    document.body.insertBefore(statusBar, document.body.children[1]);
  }

  const yearSelectIds = ['yearSelectDesktop', 'yearSelectMobile'];

  yearSelectIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", (e) => {
        handleYearChange(e.target.value);
      });
    }
  });

  // Sync initial value
  const currentYear = getSelectedYear();

  document.querySelectorAll("#yearSelectDesktop, #yearSelectMobile")
    .forEach(el => {
      if (el) el.value = currentYear;
    });

  highlightActiveNav(page);
  wireBurgerMenu();
  updateStatusBar();
  
}

onYearChange((year) => {
    // Sync ALL dropdowns
    document.querySelectorAll("#yearSelectDesktop, #yearSelectMobile, #yearSelectStatus")
      .forEach(el => {
        if (el) el.value = year;
      });

    updateStatusBar();
  });


/* ==============================
   STATUS BAR 
================================ */
function updateStatusBar() {
  const statusBar = document.getElementById("statusBar");
  if (!statusBar) return;

  const selectedYear = getSelectedYear();
  const isLive = selectedYear === "live";
  const isMobile = window.innerWidth <= 768;

  // ❌ DESKTOP + LIVE → NO BAR AT ALL
  if (isLive && !isMobile) {
    statusBar.style.display = "none";
    return;
  }

  // ✅ SHOW BAR OTHERWISE
  statusBar.style.display = "block";

  if (isLive) {
    // MOBILE LIVE ONLY
    statusBar.className = "status-bar live";
    statusBar.innerHTML = `
      <span>Live • ${new Date().toLocaleTimeString()}</span>
    `;
    return;
  }

  // 🔥 HISTORICAL (mobile + desktop)
  statusBar.className = "status-bar historical";

  statusBar.innerHTML = `
    <div class="status-inner">
      <span class="status-text">⚠ VIEWING ${selectedYear} HISTORICAL DATA</span>
      ${
        isMobile
          ? `
        <div class="year-selector-container">
          <select id="yearSelectStatus">
            <option value="live">2026 (Live)</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021" disabled>2021</option>
            <option value="2020" disabled>2020</option>
            <option value="2019">2019</option>
          </select>
        </div>
      `
          : ""
      }
    </div>
  `;

  // Sync dropdown if mobile
  const select = document.getElementById("yearSelectStatus");
  if (select) {
    select.value = selectedYear;

    select.addEventListener("change", (e) => {
      handleYearChange(e.target.value);
    });
  }
}

/* ==============================
   ACTIVE NAV HIGHLIGHT
================================ */
function highlightActiveNav(page) {
  document.querySelectorAll("[data-page]").forEach(link => {
    link.classList.toggle("active", link.dataset.page === page);
  });
}

/* ==============================
   BURGER MENU
================================ */
function wireBurgerMenu() {
  const burger = document.getElementById("burgerBtn");
  const mobileNav = document.getElementById("mobileNav");
  const closeBtn = document.getElementById("closeBurger");

  if (!burger || !mobileNav) return;

  burger.addEventListener("click", () => {
    mobileNav.classList.add("open");
    burger.classList.add("hidden"); // instant
  });

  closeBtn.addEventListener("click", () => {
    mobileNav.classList.remove("open");
    burger.classList.remove("hidden");
  });

  mobileNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("open");
      burger.classList.remove("hidden");
    });
  });
}



/* ==============================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", renderHeader);

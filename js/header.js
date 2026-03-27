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
    <nav class="header-nav desktop-only">
      <a href="index.html" class="nav-link" data-page="overall">Overall</a>
      <a href="class.html" class="nav-link" data-page="class">Class</a>
      <a href="personal.html" class="nav-link" data-page="personal">Personal</a>
    </nav>

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
    </nav>
  `;

  highlightActiveNav(page);
  wireBurgerMenu();
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

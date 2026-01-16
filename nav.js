(function () {
  const page = location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".nav-link").forEach(link => {
    if (link.getAttribute("href") === page) {
      link.classList.add("active");
    }
  });
})();

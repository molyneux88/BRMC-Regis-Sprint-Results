/* ==============================
   GLOBAL STATE (Single Source of Truth)
================================ */

let selectedYear = localStorage.getItem("selectedYear") || "live";

const listeners = new Set();

/* ------------------------------
   Get
--------------------------------*/
export function getSelectedYear() {
  return selectedYear;
}

/* ------------------------------
   Set
--------------------------------*/
export function setSelectedYear(year) {
  if (selectedYear === year) return;

  selectedYear = year;
  localStorage.setItem("selectedYear", year);

  // 🔥 Notify ALL listeners (all pages)
  listeners.forEach(cb => cb(year));
}

/* ------------------------------
   Subscribe
--------------------------------*/
export function onYearChange(callback) {
  listeners.add(callback);

  // return unsubscribe (nice for cleanup later)
  return () => listeners.delete(callback);
}
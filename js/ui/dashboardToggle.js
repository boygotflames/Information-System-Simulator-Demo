const OPEN_CLASS = "dashboard-open";

export function initDashboardToggle() {
  const body = document.body;
  const toggleBtn = document.getElementById("dashboardToggleBtn");
  const closeBtn = document.getElementById("dashboardCloseBtn");
  const panel = document.getElementById("dashboardPanel");
  const scrim = document.getElementById("dashboardScrim");

  const setOpen = (isOpen) => {
    body.classList.toggle(OPEN_CLASS, isOpen);

    if (toggleBtn) {
      toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    if (panel) {
      panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }
  };

  toggleBtn?.addEventListener("click", () => {
    const isOpen = !body.classList.contains(OPEN_CLASS);
    setOpen(isOpen);
  });

  closeBtn?.addEventListener("click", () => setOpen(false));
  scrim?.addEventListener("click", () => setOpen(false));

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  setOpen(false);
}
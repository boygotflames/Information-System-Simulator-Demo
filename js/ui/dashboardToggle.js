const OPEN_CLASS = "dashboard-open";

export function initDashboardToggle() {
  const body = document.body;
  const toggleBtn = document.getElementById("dashboardToggleBtn");
  const closeBtn = document.getElementById("dashboardCloseBtn");
  const panel = document.getElementById("dashboardPanel");

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
    setOpen(!body.classList.contains(OPEN_CLASS));
  });

  closeBtn?.addEventListener("click", () => setOpen(false));

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  setOpen(false);
}

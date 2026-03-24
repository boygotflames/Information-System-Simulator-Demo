const OPEN_CLASS = "dashboard-open";
const CONTEXT_COLLAPSED_CLASS = "context-rail-collapsed";

export function initDashboardToggle() {
  const body = document.body;
  const toggleBtn = document.getElementById("dashboardToggleBtn");
  const closeBtn = document.getElementById("dashboardCloseBtn");
  const panel = document.getElementById("dashboardPanel");
  const contextRail = document.getElementById("contextRail");
  const contextToggleBtn = document.getElementById("contextRailToggleBtn");
  const contextIcon = contextToggleBtn?.querySelector("[data-context-icon]");

  const setOpen = (isOpen) => {
    body.classList.toggle(OPEN_CLASS, isOpen);

    if (toggleBtn) {
      toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    if (panel) {
      panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }
  };

  const setContextCollapsed = (isCollapsed) => {
    body.classList.toggle(CONTEXT_COLLAPSED_CLASS, isCollapsed);

    if (contextRail) {
      contextRail.setAttribute("aria-hidden", isCollapsed ? "true" : "false");
    }

    if (contextToggleBtn) {
      contextToggleBtn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      contextToggleBtn.setAttribute(
        "aria-label",
        isCollapsed ? "Show context rail" : "Hide context rail"
      );
    }

    if (contextIcon) {
      contextIcon.textContent = isCollapsed ? "›" : "‹";
    }
  };

  toggleBtn?.addEventListener("click", () => {
    setOpen(!body.classList.contains(OPEN_CLASS));
  });

  closeBtn?.addEventListener("click", () => setOpen(false));
  contextToggleBtn?.addEventListener("click", () => {
    setContextCollapsed(!body.classList.contains(CONTEXT_COLLAPSED_CLASS));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  setOpen(false);
  setContextCollapsed(false);
}

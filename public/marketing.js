(function initialiseMarketingPage() {
  "use strict";
  const isDirectFile = window.location.protocol === "file:";
  document.querySelectorAll(".workforce-link").forEach((link) => {
    link.setAttribute("href", `${isDirectFile ? "./index.html" : "/"}${link.dataset.routeHash || ""}`);
  });
  document.querySelectorAll(".billing-link").forEach((link) => {
    link.setAttribute("href", `${isDirectFile ? "./billing.html" : "/billing"}${link.dataset.routeHash || ""}`);
  });
  document.querySelectorAll(".client-login").forEach((link) => link.setAttribute("href", isDirectFile ? "./login.html" : "/login"));

  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const closeMenu = () => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    mobileMenu.hidden = true;
    document.body.classList.remove("menu-open");
  };
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      const shouldOpen = menuToggle.getAttribute("aria-expanded") !== "true";
      menuToggle.setAttribute("aria-expanded", String(shouldOpen));
      menuToggle.setAttribute("aria-label", shouldOpen ? "Close navigation" : "Open navigation");
      mobileMenu.hidden = !shouldOpen;
      document.body.classList.toggle("menu-open", shouldOpen);
      if (shouldOpen) mobileMenu.querySelector("a")?.focus();
    });
    mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !mobileMenu.hidden) { closeMenu(); menuToggle.focus(); } });
    window.matchMedia("(min-width: 1081px)").addEventListener("change", (event) => { if (event.matches) closeMenu(); });
  }

  const tabs = Array.from(document.querySelectorAll("[data-product-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-product-panel]"));
  const selectTab = (tab, focus = false) => {
    tabs.forEach((candidate) => { const selected = candidate === tab; candidate.setAttribute("aria-selected", String(selected)); candidate.tabIndex = selected ? 0 : -1; });
    panels.forEach((panel) => { const selected = panel.dataset.productPanel === tab.dataset.productTab; panel.hidden = !selected; panel.classList.toggle("active", selected); });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      selectTab(tabs[nextIndex], true);
    });
  });

  document.querySelectorAll("[data-accordion] button").forEach((button) => button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    const answer = document.getElementById(button.getAttribute("aria-controls"));
    button.setAttribute("aria-expanded", String(!expanded));
    if (answer) answer.hidden = expanded;
  }));

  document.querySelectorAll("[data-placeholder-link]").forEach((link) => link.addEventListener("click", (event) => event.preventDefault()));
  document.querySelectorAll("[data-year]").forEach((element) => { element.textContent = String(new Date().getFullYear()); });
  if (!isDirectFile && "serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(console.error));
})();

function bindMainViewLinks(scope = document) {
  const bindingRoot = document.documentElement;
  if (String(document.body?.dataset?.page || "").trim() !== "home") return;
  if (bindingRoot?.dataset?.mainViewLinksBound === "true") return;

  scope.addEventListener("click", (event) => {
    const link = event.target.closest("[data-main-view-link]");
    if (!link) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const view = String(link.dataset.mainViewLink || "").trim();
    if (!view) return;

    event.preventDefault();
    event.stopPropagation();

    const target = `more.html?view=${encodeURIComponent(view)}`;
    if (typeof window.loadPage === "function") {
      window.loadPage(target);
      return;
    }

    window.location.href = target;
  }, true);

  if (bindingRoot) {
    bindingRoot.dataset.mainViewLinksBound = "true";
  }
}

window.initMainPage = bindMainViewLinks;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => bindMainViewLinks(), { once: true });
} else {
  bindMainViewLinks();
}

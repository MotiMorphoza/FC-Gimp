(function () {
  const VIEW_KEY = "view";
  const VIEW_HOME = "home";
  const VIEW_MORPHOZA = "morphoza";
  const VIEW_HUMAN_WRITES = "human-writes";

  function readRequestedView() {
    try {
      const url = new URL(window.location.href);
      const view = url.searchParams.get(VIEW_KEY);
      if (view === VIEW_MORPHOZA || view === VIEW_HUMAN_WRITES) {
        return view;
      }
      const hash = String(url.hash || "").replace(/^#/, "").trim().toLowerCase();
      if (hash === VIEW_MORPHOZA || hash === VIEW_HUMAN_WRITES) {
        return hash;
      }
      return VIEW_HOME;
    } catch {
      return VIEW_HOME;
    }
  }

  function persistRequestedView(view) {
    try {
      const url = new URL(window.location.href);
      if (!view || view === VIEW_HOME) {
        url.searchParams.delete(VIEW_KEY);
      } else {
        url.searchParams.set(VIEW_KEY, view);
      }
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Ignore history API blockers.
    }
  }

  function setMoreMode(root, mode) {
    root.classList.toggle("is-human-writes-active", mode === VIEW_HUMAN_WRITES);
  }

  async function initializeMorphoza(root) {
    if (window.MorphozaModule && typeof window.MorphozaModule.init === "function") {
      await window.MorphozaModule.init(root);
    }
  }

  async function showMorphoza(root, options = {}) {
    root.querySelector("[data-more-home]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-human-writes-view]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-morphoza-view]")?.removeAttribute("hidden");
    setMoreMode(root, VIEW_MORPHOZA);
    persistRequestedView(VIEW_MORPHOZA);

    if (window.MorphozaModule && typeof window.MorphozaModule.show === "function") {
      await window.MorphozaModule.show(options);
    }
  }

  async function showHome(root) {
    root.querySelector("[data-more-home]")?.removeAttribute("hidden");
    root.querySelector("[data-morphoza-view]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-human-writes-view]")?.setAttribute("hidden", "hidden");
    setMoreMode(root, VIEW_HOME);
    persistRequestedView(VIEW_HOME);

    if (window.MorphozaModule && typeof window.MorphozaModule.activateHome === "function") {
      await window.MorphozaModule.activateHome();
    }
  }

  async function showHumanWrites(root, options = {}) {
    const resetToStart = options.resetToStart === true;

    root.querySelector("[data-more-home]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-morphoza-view]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-human-writes-view]")?.removeAttribute("hidden");
    setMoreMode(root, VIEW_HUMAN_WRITES);
    persistRequestedView(VIEW_HUMAN_WRITES);

    if (window.MorphozaModule && typeof window.MorphozaModule.hide === "function") {
      await window.MorphozaModule.hide({ resumeHome: false, resetPlayer: true });
    }

    if (typeof window.initHumanWrites === "function") {
      await window.initHumanWrites({ resetToStart });
    }
  }

  function bindEvents(root) {
    if (root.dataset.moreBound === "true") return;
    root.dataset.moreBound = "true";

    root.addEventListener("click", (event) => {
      const wallCell = event.target.closest(".more-video-wall-cell");
      if (wallCell) {
        const videoId = typeof wallCell.dataset.videoId === "string" ? wallCell.dataset.videoId.trim() : "";
        const index = Number(wallCell.dataset.videoIndex);
        void showMorphoza(root, {
          startVideoId: videoId || undefined,
          startIndex: Number.isInteger(index) ? index : undefined
        });
        return;
      }

      const openTile = event.target.closest("[data-more-open='morphoza']");
      if (openTile) {
        void showMorphoza(root, { resetToStart: false });
        return;
      }

      const openHumanWrites = event.target.closest("[data-more-open='human-writes']");
      if (openHumanWrites) {
        void showHumanWrites(root, { resetToStart: true });
      }
    });

    root.addEventListener("keydown", (event) => {
      const openTile = event.target.closest("[data-more-open='morphoza']");
      if (openTile && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        void showMorphoza(root, { resetToStart: false });
        return;
      }

      const openHumanWrites = event.target.closest("[data-more-open='human-writes']");
      if (openHumanWrites && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        void showHumanWrites(root, { resetToStart: true });
      }
    });
  }

  window.initMorePage = async function initMorePage() {
    if (document.body.dataset.page !== "more") {
      if (window.MorphozaModule && typeof window.MorphozaModule.hide === "function") {
        await window.MorphozaModule.hide({ resumeHome: false, resetPlayer: true });
      }
      return;
    }

    const root = document.querySelector(".more-pane");
    if (!root) return;

    bindEvents(root);
    await initializeMorphoza(root);

    const requestedView = readRequestedView();
    if (requestedView === VIEW_HUMAN_WRITES) {
      await showHumanWrites(root, { resetToStart: false });
      return;
    }

    if (requestedView === VIEW_MORPHOZA) {
      await showMorphoza(root, { resetToStart: false });
      return;
    }

    await showHome(root);
  };
})();

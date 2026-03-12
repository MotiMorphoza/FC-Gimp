(function () {
  let videos = [];

  const VIEW_KEY = "view";
  const VIEW_HOME = "home";
  const VIEW_MORPHOZA = "morphoza";
  const VIEW_HUMAN_WRITES = "human-writes";

  const state = {
    activeIndex: 0,
    playerIndex: null,
    preloaded: new Set(),
    wallSlots: [],
    wallTimer: null,
    videosLoaded: false,
    videosPromise: null,
    moveTimer: null,
    mobileInlineIndex: null
  };

  function getGeneratedDataUrl() {
    const version = window.__BUILD_VERSION__ || Date.now();
    return `data/morphoza-videos.generated.json?v=${version}`;
  }

  function readRequestedView() {
    try {
      const url = new URL(window.location.href);
      const view = url.searchParams.get(VIEW_KEY);
      if (view === VIEW_MORPHOZA || view === VIEW_HUMAN_WRITES) {
        return view;
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

  function getCircularOffset(index, activeIndex, total) {
    let offset = index - activeIndex;
    const midpoint = total / 2;

    if (offset > midpoint) offset -= total;
    if (offset < -midpoint) offset += total;

    return offset;
  }

  function getSlotStyle(offset, isMobile) {
    const desktop = {
      0: { x: "0px", y: "-24px", scale: 1.35, opacity: 1, brightness: 1, blur: 0, rotate: "0deg", z: 6 },
      1: { x: "260px", y: "34px", scale: 0.92, opacity: 0.92, brightness: 0.84, blur: 1, rotate: "-18deg", z: 4 },
      2: { x: "470px", y: "82px", scale: 0.76, opacity: 0.68, brightness: 0.72, blur: 2, rotate: "-18deg", z: 2 },
      [-1]: { x: "-260px", y: "34px", scale: 0.92, opacity: 0.92, brightness: 0.84, blur: 1, rotate: "18deg", z: 4 },
      [-2]: { x: "-470px", y: "82px", scale: 0.76, opacity: 0.68, brightness: 0.72, blur: 2, rotate: "18deg", z: 2 }
    };

    const mobile = {
      0: { x: "0px", y: "-10px", scale: 1.08, opacity: 1, brightness: 1, blur: 0, rotate: "0deg", z: 6 },
      1: { x: "88px", y: "18px", scale: 0.78, opacity: 0.84, brightness: 0.82, blur: 1, rotate: "-10deg", z: 4 },
      2: { x: "144px", y: "42px", scale: 0.58, opacity: 0.24, brightness: 0.66, blur: 2, rotate: "-10deg", z: 2 },
      [-1]: { x: "-88px", y: "18px", scale: 0.78, opacity: 0.84, brightness: 0.82, blur: 1, rotate: "10deg", z: 4 },
      [-2]: { x: "-144px", y: "42px", scale: 0.58, opacity: 0.24, brightness: 0.66, blur: 2, rotate: "10deg", z: 2 }
    };

    const presets = isMobile ? mobile : desktop;
    return presets[offset] || { x: "0px", y: "120px", scale: 0.5, opacity: 0, brightness: 0.5, blur: 2, rotate: "0deg", z: 0 };
  }

  function getThumbUrl(videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  function getEmbedUrl(videoId) {
    return `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`;
  }

  function isMobileMorphoza() {
    return window.matchMedia("(max-width: 900px)").matches;
  }

  function preloadThumb(videoId) {
    if (!videoId || state.preloaded.has(videoId)) return;
    const image = new Image();
    image.src = getThumbUrl(videoId);
    state.preloaded.add(videoId);
  }

  function preloadVisibleThumbs() {
    if (!videos.length) return;

    [0, -1, 1, -2, 2].forEach((delta) => {
      const index = (state.activeIndex + delta + videos.length) % videos.length;
      preloadThumb(videos[index] && videos[index].id);
    });
  }

  function renderItems(root) {
    const track = root.querySelector("[data-morphoza-track]");
    if (!track) return;

    if (!videos.length) {
      track.innerHTML = "";
      return;
    }

    track.innerHTML = videos.map((video, index) => `
      <article class="morphoza-item" data-video-index="${index}">
        <button class="morphoza-item-button" type="button" aria-label="${video.title}">
          <div class="morphoza-item-figure">
            <img src="${getThumbUrl(video.id)}" alt="${video.title}" loading="lazy" decoding="async">
          </div>
          <p class="morphoza-item-title">${video.title}</p>
        </button>
      </article>
    `).join("");
  }

  function updateCarousel(root) {
    const items = root.querySelectorAll(".morphoza-item");
    if (!items.length || !videos.length) return;

    const isMobile = isMobileMorphoza();
    const carousel = root.querySelector(".morphoza-carousel");

    if (carousel) {
      carousel.style.setProperty("--bg-shift", `${-state.activeIndex * 30}px`);
    }

    items.forEach((item, index) => {
      const offset = getCircularOffset(index, state.activeIndex, items.length);
      const slot = getSlotStyle(offset, isMobile);
      const isActive = offset === 0;

      item.style.setProperty("--item-x", slot.x);
      item.style.setProperty("--item-y", slot.y);
      item.style.setProperty("--item-scale", String(slot.scale));
      item.style.setProperty("--item-opacity", String(slot.opacity));
      item.style.setProperty("--item-brightness", String(slot.brightness));
      item.style.setProperty("--item-blur", `${slot.blur}px`);
      item.style.setProperty("--item-rotate", slot.rotate);
      item.style.setProperty("--item-z", String(slot.z));
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-hidden", Math.abs(offset) > 2 ? "true" : "false");
      item.querySelector(".morphoza-item-button")?.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    preloadVisibleThumbs();
  }

  function assignWallCell(cell, videoIndex) {
    const image = cell.querySelector("[data-wall-image]");
    const video = videos[videoIndex];
    if (!image || !video) return;

    cell.dataset.videoIndex = String(videoIndex);
    cell.setAttribute("aria-label", `Open Moti Morphoza video gallery from ${video.title}`);
    image.src = getThumbUrl(video.id);
    image.alt = video.title;
    preloadThumb(video.id);
  }

  function initWall(root) {
    const cells = Array.from(root.querySelectorAll(".more-video-wall-cell"));
    if (!cells.length || !videos.length) return;

    state.wallSlots = cells.map((_, index) => index % videos.length);
    cells.forEach((cell, index) => {
      assignWallCell(cell, state.wallSlots[index]);
    });
  }

  function rotateWall(root) {
    const cells = Array.from(root.querySelectorAll(".more-video-wall-cell"));
    if (!cells.length || videos.length <= cells.length) return;

    const slotIndex = Math.floor(Math.random() * cells.length);
    const cell = cells[slotIndex];
    const image = cell.querySelector("[data-wall-image]");
    if (!image) return;

    const used = new Set(state.wallSlots);
    const candidates = videos
      .map((_, index) => index)
      .filter((index) => !used.has(index) || index === state.wallSlots[slotIndex]);

    if (!candidates.length) return;

    let nextIndex = candidates[Math.floor(Math.random() * candidates.length)];
    if (nextIndex === state.wallSlots[slotIndex] && candidates.length > 1) {
      nextIndex = candidates.find((index) => index !== state.wallSlots[slotIndex]) ?? nextIndex;
    }
    if (nextIndex === state.wallSlots[slotIndex]) return;

    image.classList.add("is-swapping");
    preloadThumb(videos[nextIndex] && videos[nextIndex].id);

    window.setTimeout(() => {
      state.wallSlots[slotIndex] = nextIndex;
      assignWallCell(cell, nextIndex);
      requestAnimationFrame(() => {
        image.classList.remove("is-swapping");
      });
    }, 260);
  }

  function startWallRotation(root) {
    stopWallRotation();
    if (!videos.length) return;

    initWall(root);
    state.wallTimer = window.setInterval(() => {
      if (document.body.dataset.page !== "more") return;
      const currentRoot = document.querySelector(".more-pane");
      if (!currentRoot) return;
      rotateWall(currentRoot);
    }, 2000);
  }

  function stopWallRotation() {
    if (state.wallTimer) {
      window.clearInterval(state.wallTimer);
      state.wallTimer = null;
    }
  }

  function resetPlayer(root) {
    const frame = root.querySelector("[data-morphoza-iframe]");
    if (frame) {
      const nextFrame = frame.cloneNode(false);
      nextFrame.title = frame.title || "Moti Morphoza video player";
      nextFrame.setAttribute("data-morphoza-iframe", "");
      nextFrame.loading = "lazy";
      nextFrame.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
      nextFrame.allowFullscreen = true;
      frame.replaceWith(nextFrame);
    }
    state.playerIndex = null;
    state.mobileInlineIndex = null;
  }

  function setMoreMode(root, mode) {
    root.classList.toggle("is-human-writes-active", mode === VIEW_HUMAN_WRITES);
  }

  function showGallery(root) {
    root.querySelector("[data-more-home]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-human-writes-view]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-morphoza-view]")?.removeAttribute("hidden");
    root.querySelector("[data-morphoza-carousel-view]")?.removeAttribute("hidden");
    root.querySelector("[data-morphoza-player-view]")?.setAttribute("hidden", "hidden");
    setMoreMode(root, VIEW_MORPHOZA);
    persistRequestedView(VIEW_MORPHOZA);
    resetPlayer(root);
    renderItems(root);
    updateCarousel(root);
    void loadVideos(root);
  }

  function showHome(root) {
    root.querySelector("[data-more-home]")?.removeAttribute("hidden");
    root.querySelector("[data-morphoza-view]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-human-writes-view]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-morphoza-carousel-view]")?.removeAttribute("hidden");
    root.querySelector("[data-morphoza-player-view]")?.setAttribute("hidden", "hidden");
    setMoreMode(root, VIEW_HOME);
    persistRequestedView(VIEW_HOME);
    resetPlayer(root);
    void loadVideos(root);
  }

  function showHumanWrites(root, options = {}) {
    const resetToStart = options.resetToStart === true;

    root.querySelector("[data-more-home]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-morphoza-view]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-human-writes-view]")?.removeAttribute("hidden");
    setMoreMode(root, VIEW_HUMAN_WRITES);
    persistRequestedView(VIEW_HUMAN_WRITES);
    stopWallRotation();
    if (typeof window.initHumanWrites === "function") {
      window.initHumanWrites({ resetToStart });
    }
  }

  function showPlayer(root, index) {
    const frame = root.querySelector("[data-morphoza-iframe]");
    const video = videos[index];
    if (!video || !frame) return;

    state.playerIndex = index;
    root.querySelector("[data-morphoza-carousel-view]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-morphoza-player-view]")?.removeAttribute("hidden");
    frame.src = getEmbedUrl(video.id);
  }

  function showInlineMobilePlayer(root, index) {
    const video = videos[index];
    if (!video) return;

    renderItems(root);
    state.activeIndex = index;
    state.playerIndex = index;
    state.mobileInlineIndex = index;
    updateCarousel(root);

    const selector = ".morphoza-item[data-video-index=\"" + index + "\"]";
    const item = root.querySelector(selector);
    const figure = item?.querySelector(".morphoza-item-figure");
    if (!item || !figure) return;

    const iframe = document.createElement("iframe");
    iframe.src = getEmbedUrl(video.id);
    iframe.title = video.title || "Moti Morphoza video player";
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;

    figure.replaceChildren(iframe);
    item.classList.add("is-inline-player");
    item.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function move(root, direction) {
    if (!videos.length) return;

    const carousel = root.querySelector(".morphoza-carousel");
    if (carousel) {
      carousel.classList.add("moving");
      if (state.moveTimer) {
        window.clearTimeout(state.moveTimer);
      }
      state.moveTimer = window.setTimeout(() => {
        carousel.classList.remove("moving");
        state.moveTimer = null;
      }, 450);
    }

    state.activeIndex = (state.activeIndex + direction + videos.length) % videos.length;
    updateCarousel(root);
  }

  function bindMotiTile(root) {
    const tile = root.querySelector("[data-more-open='morphoza']");
    if (!tile || tile.dataset.tileBound === "true") return;

    tile.dataset.tileBound = "true";

    tile.addEventListener("click", (event) => {
      const wallCell = event.target.closest(".more-video-wall-cell");
      const index = wallCell ? Number(wallCell.dataset.videoIndex) : Number.NaN;
      if (Number.isInteger(index)) {
        state.activeIndex = index;
      }
      showGallery(root);
    });

    tile.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      showGallery(root);
    });
  }

  function bindEvents(root) {
    if (root.dataset.moreBound === "true") return;
    root.dataset.moreBound = "true";

    root.addEventListener("pointermove", (event) => {
      const button = event.target.closest(".morphoza-item-button");
      if (!button) return;

      const rect = button.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const moveX = ((x - 0.5) * 10).toFixed(2);
      const moveY = ((y - 0.5) * 10).toFixed(2);
      const item = button.closest(".morphoza-item");
      item?.style.setProperty("--thumb-scale", item.classList.contains("is-active") ? "1.03" : "1.06");
      item?.style.setProperty("--thumb-x", `${moveX}px`);
      item?.style.setProperty("--thumb-y", `${moveY}px`);
    });

    root.addEventListener("pointerout", (event) => {
      const button = event.target.closest?.(".morphoza-item-button");
      if (!button) return;
      if (button.contains(event.relatedTarget)) return;
      const item = button.closest(".morphoza-item");
      if (!item) return;
      item.style.removeProperty("--thumb-scale");
      item.style.removeProperty("--thumb-x");
      item.style.removeProperty("--thumb-y");
    });

    root.addEventListener("click", (event) => {
      const wallCell = event.target.closest(".more-video-wall-cell");
      if (wallCell) {
        const index = Number(wallCell.dataset.videoIndex);
        if (Number.isInteger(index)) {
          state.activeIndex = index;
        }
        showGallery(root);
        return;
      }

      const openTile = event.target.closest("[data-more-open='morphoza']");
      if (openTile) {
        showGallery(root);
        return;
      }

      const openHumanWrites = event.target.closest("[data-more-open='human-writes']");
      if (openHumanWrites) {
        showHumanWrites(root, { resetToStart: true });
        return;
      }

      const humanWritesBack = event.target.closest("[data-human-writes-back]");
      if (humanWritesBack) {
        showHome(root);
        return;
      }

      const nav = event.target.closest("[data-morphoza-nav]");
      if (nav) {
        move(root, nav.dataset.morphozaNav === "next" ? 1 : -1);
        return;
      }

      const back = event.target.closest("[data-morphoza-back]");
      if (back) {
        showGallery(root);
        return;
      }

      const item = event.target.closest(".morphoza-item");
      if (!item) return;

      const index = Number(item.dataset.videoIndex);
      if (!Number.isInteger(index)) return;

      const isMobileList = isMobileMorphoza();
      if (isMobileList) {
        showInlineMobilePlayer(root, index);
      } else if (index === state.activeIndex) {
        state.activeIndex = index;
        updateCarousel(root);
        showPlayer(root, index);
      } else {
        state.activeIndex = index;
        updateCarousel(root);
      }
    });

    root.addEventListener("keydown", (event) => {
      const openTile = event.target.closest("[data-more-open='morphoza']");
      if (openTile && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        showGallery(root);
        return;
      }

      const openHumanWrites = event.target.closest("[data-more-open='human-writes']");
      if (openHumanWrites && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        showHumanWrites(root, { resetToStart: true });
        return;
      }

      const view = root.querySelector("[data-morphoza-view]");
      if (!view || view.hidden) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(root, 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(root, -1);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (!root.querySelector("[data-morphoza-player-view]")?.hidden) {
          showGallery(root);
        }
      }
    });

    if (!window.__MORE_RESIZE_BOUND__) {
      window.__MORE_RESIZE_BOUND__ = true;
      window.addEventListener("resize", () => {
        if (document.body.dataset.page !== "more") return;
        const currentRoot = document.querySelector(".more-pane");
        if (currentRoot) updateCarousel(currentRoot);
      });
    }
  }

  async function loadVideos(root) {
    if (!state.videosPromise) {
      state.videosPromise = fetch(getGeneratedDataUrl(), { credentials: "same-origin" })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((payload) => {
          videos = Array.isArray(payload)
            ? payload
                .filter((entry) => entry && typeof entry.id === "string" && entry.id.trim())
                .map((entry) => ({
                  id: entry.id.trim(),
                  title: typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : "Video"
                }))
            : [];
          state.videosLoaded = true;
          return videos;
        })
        .catch(() => {
          videos = [];
          state.videosLoaded = true;
          return videos;
        });
    }

    await state.videosPromise;

    if (!root?.isConnected || !videos.length) return videos;

    if (state.activeIndex >= videos.length) {
      state.activeIndex = 0;
    }

    renderItems(root);
    startWallRotation(root);
    updateCarousel(root);
    if (isMobileMorphoza() && Number.isInteger(state.mobileInlineIndex) && videos[state.mobileInlineIndex]) {
      showInlineMobilePlayer(root, state.mobileInlineIndex);
    }
    return videos;
  }

  window.initMorePage = function initMorePage() {
    if (document.body.dataset.page !== "more") {
      stopWallRotation();
      return;
    }

    const root = document.querySelector(".more-pane");
    if (!root) return;

    bindMotiTile(root);
    bindEvents(root);

    const requestedView = readRequestedView();
    if (requestedView === VIEW_HUMAN_WRITES) {
      showHumanWrites(root, { resetToStart: false });
      return;
    }

    if (requestedView === VIEW_MORPHOZA) {
      showGallery(root);
      return;
    }

    showHome(root);
  };
})();

(function () {
  const videos = [
    { id: "eh7V9ZzCO4g", title: "Morphoza Window 01" },
    { id: "kKb6r5kS-Ds", title: "Morphoza Window 02" },
    { id: "4DhDvD3OI1I", title: "Morphoza Window 03" },
    { id: "jiH3dJ7Xmxs", title: "Morphoza Window 04" },
    { id: "mLwruD9gxN8", title: "Morphoza Window 05" },
    { id: "U1SxF5vO1lk", title: "Morphoza Window 06" },
    { id: "iTZSUXB1EZA", title: "Morphoza Window 07" },
    { id: "nGn0Div6-v0", title: "Morphoza Window 08" }
  ];

  const state = {
    activeIndex: 0,
    playerIndex: null,
    preloaded: new Set(),
    wallSlots: [],
    wallTimer: null
  };

  function getCircularOffset(index, activeIndex, total) {
    let offset = index - activeIndex;
    const midpoint = total / 2;

    if (offset > midpoint) offset -= total;
    if (offset < -midpoint) offset += total;

    return offset;
  }

  function getSlotStyle(offset, isMobile) {
    const desktop = {
      0: { x: "0px", y: "-24px", scale: 1.35, opacity: 1, brightness: 1.08, z: 6 },
      1: { x: "260px", y: "34px", scale: 0.92, opacity: 0.92, brightness: 0.84, z: 4 },
      2: { x: "470px", y: "82px", scale: 0.76, opacity: 0.68, brightness: 0.72, z: 2 },
      [-1]: { x: "-260px", y: "34px", scale: 0.92, opacity: 0.92, brightness: 0.84, z: 4 },
      [-2]: { x: "-470px", y: "82px", scale: 0.76, opacity: 0.68, brightness: 0.72, z: 2 }
    };

    const mobile = {
      0: { x: "0px", y: "-16px", scale: 1.18, opacity: 1, brightness: 1.05, z: 6 },
      1: { x: "130px", y: "34px", scale: 0.82, opacity: 0.88, brightness: 0.82, z: 4 },
      2: { x: "220px", y: "72px", scale: 0.66, opacity: 0.5, brightness: 0.68, z: 2 },
      [-1]: { x: "-130px", y: "34px", scale: 0.82, opacity: 0.88, brightness: 0.82, z: 4 },
      [-2]: { x: "-220px", y: "72px", scale: 0.66, opacity: 0.5, brightness: 0.68, z: 2 }
    };

    const presets = isMobile ? mobile : desktop;
    return presets[offset] || { x: "0px", y: "120px", scale: 0.5, opacity: 0, brightness: 0.5, z: 0 };
  }

  function getThumbUrl(videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  function getEmbedUrl(videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  function preloadThumb(videoId) {
    if (!videoId || state.preloaded.has(videoId)) return;
    const image = new Image();
    image.src = getThumbUrl(videoId);
    state.preloaded.add(videoId);
  }

  function preloadVisibleThumbs() {
    [0, -1, 1, -2, 2].forEach((delta) => {
      const index = (state.activeIndex + delta + videos.length) % videos.length;
      preloadThumb(videos[index] && videos[index].id);
    });
  }

  function renderItems(root) {
    const track = root.querySelector("[data-morphoza-track]");
    if (!track) return;

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
    if (!items.length) return;

    const isMobile = window.matchMedia("(max-width: 900px)").matches;

    items.forEach((item, index) => {
      const offset = getCircularOffset(index, state.activeIndex, items.length);
      const slot = getSlotStyle(offset, isMobile);
      const isActive = offset === 0;

      item.style.setProperty("--item-x", slot.x);
      item.style.setProperty("--item-y", slot.y);
      item.style.setProperty("--item-scale", String(slot.scale));
      item.style.setProperty("--item-opacity", String(slot.opacity));
      item.style.setProperty("--item-brightness", String(slot.brightness));
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
    if (!cells.length) return;

    if (!state.wallSlots.length) {
      state.wallSlots = cells.map((_, index) => index % videos.length);
    }

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
    initWall(root);
    state.wallTimer = window.setInterval(() => {
      if (document.body.dataset.page !== "more") return;
      const currentRoot = document.querySelector(".more-pane");
      if (!currentRoot) return;
      rotateWall(currentRoot);
    }, 4000);
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
      frame.src = "about:blank";
      frame.removeAttribute("src");
    }
    state.playerIndex = null;
  }

  function showGallery(root) {

    root.querySelector("[data-more-home]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-morphoza-view]")?.removeAttribute("hidden");
    root.querySelector("[data-morphoza-carousel-view]")?.removeAttribute("hidden");
    root.querySelector("[data-morphoza-player-view]")?.setAttribute("hidden", "hidden");
    resetPlayer(root);
    updateCarousel(root);
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

  function move(root, direction) {
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

      if (index === state.activeIndex) {
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

  window.initMorePage = function initMorePage() {
    if (document.body.dataset.page !== "more") {
      stopWallRotation();
      return;
    }

    const root = document.querySelector(".more-pane");
    if (!root) return;

    renderItems(root);
    initWall(root);
    startWallRotation(root);
    bindMotiTile(root);
    bindEvents(root);
    root.querySelector("[data-more-home]")?.removeAttribute("hidden");
    root.querySelector("[data-morphoza-view]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-morphoza-carousel-view]")?.removeAttribute("hidden");
    root.querySelector("[data-morphoza-player-view]")?.setAttribute("hidden", "hidden");
    resetPlayer(root);
  };
})();

(function () {
  const PAGE_ID = "more";
  const TEMPLATE_URL = "morphoza.html";
  const MOBILE_QUERY = "(max-width: 900px)";
  const RAILS = [
    { key: "justMe", title: "Just Me", legacyKeys: ["me"] },
    { key: "cooperation", title: "Cooperation" },
    { key: "mine", title: "Mine" },
    { key: "looooong", title: "Looooong", legacyKeys: ["long"] }
  ];
  const RAIL_KEYS = RAILS.map((rail) => rail.key);
  const RAIL_CONFIG = Object.fromEntries(RAILS.map((rail) => [rail.key, rail]));
  const DEFAULT_ACTIVE_RAIL = "justMe";

  function createRailState() {
    return Object.fromEntries(RAIL_KEYS.map((railKey) => [railKey, { videos: [], activeIndex: 0 }]));
  }

  const state = {
    pane: null,
    shell: null,
    host: null,
    root: null,
    refs: {},
    rails: createRailState(),
    allVideos: [],
    activeRailKey: DEFAULT_ACTIVE_RAIL,
    player: null,
    inlinePlayer: null,
    preloaded: new Set(),
    wallSlots: [],
    wallTimer: null,
    videosPromise: null,
    templatePromise: null,
    moveTimers: Object.create(null),
    initPromise: null,
    globalListenersBound: false,
    railPositionsInitialized: false
  };

  function versionQuery() {
    const version = window.__BUILD_VERSION__ || "";
    return version ? `?v=${encodeURIComponent(version)}` : "";
  }

  function getGeneratedDataUrl() {
    return `data/morphoza-videos.generated.json${versionQuery()}`;
  }

  function isMobileMorphoza() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function isTypingTarget(target) {
    return target instanceof Element && Boolean(
      target.closest("input, textarea, select, [contenteditable='true']")
    );
  }

  function sanitizeGeneratedEntries(entries) {
    if (!Array.isArray(entries)) return [];

    return entries
      .map((entry) => {
        if (typeof entry === "string") {
          const id = entry.trim();
          return id ? { id, title: "Video" } : null;
        }

        if (!entry || typeof entry !== "object") return null;

        const id = typeof entry.id === "string" ? entry.id.trim() : "";
        if (!id) return null;

        const title = typeof entry.title === "string" && entry.title.trim()
          ? entry.title.trim()
          : "Video";

        return { id, title };
      })
      .filter(Boolean);
  }

  function getRailPayloadEntries(payload, railKey) {
    if (!payload || typeof payload !== "object") return [];

    const candidates = [railKey, ...(RAIL_CONFIG[railKey]?.legacyKeys || [])];
    for (const candidateKey of candidates) {
      if (Array.isArray(payload[candidateKey])) {
        return payload[candidateKey];
      }
    }

    return [];
  }

  function getRailTitle(railKey) {
    return RAIL_CONFIG[railKey]?.title || railKey;
  }

  function mergeUniqueVideos(videosByRail) {
    const seen = new Set();
    const merged = [];

    RAIL_KEYS.forEach((railKey) => {
      videosByRail[railKey].forEach((video) => {
        if (seen.has(video.id)) return;
        seen.add(video.id);
        merged.push(video);
      });
    });

    return merged;
  }

  function getRailVideos(railKey) {
    return state.rails[railKey]?.videos || [];
  }

  function getFirstAvailableRailKey() {
    return RAIL_KEYS.find((railKey) => getRailVideos(railKey).length > 0) || DEFAULT_ACTIVE_RAIL;
  }

  function normalizeIndex(index, total) {
    if (!total) return 0;
    const numericIndex = Number(index);
    if (!Number.isInteger(numericIndex)) return 0;
    return ((numericIndex % total) + total) % total;
  }

  function ensureRailPositions(options = {}) {
    const reset = options.reset === true;

    RAIL_KEYS.forEach((railKey) => {
      const rail = state.rails[railKey];
      const total = rail.videos.length;

      if (!total) {
        rail.activeIndex = 0;
        return;
      }

      if (reset || !Number.isInteger(rail.activeIndex) || rail.activeIndex < 0 || rail.activeIndex >= total) {
        rail.activeIndex = 0;
      }
    });

    const fallbackRailKey = getFirstAvailableRailKey();
    if (!RAIL_KEYS.includes(state.activeRailKey) || !getRailVideos(state.activeRailKey).length) {
      state.activeRailKey = fallbackRailKey;
    }
  }

  function findVideoLocation(videoId) {
    const targetId = String(videoId || "").trim();
    if (!targetId) return null;

    for (const railKey of RAIL_KEYS) {
      const index = getRailVideos(railKey).findIndex((video) => video.id === targetId);
      if (index >= 0) {
        return { railKey, index };
      }
    }

    return null;
  }

  async function fetchTemplateMarkup() {
    if (!state.templatePromise) {
      state.templatePromise = fetch(TEMPLATE_URL, { credentials: "same-origin" })
        .then((response) => {
          if (!response.ok) throw new Error(`Morphoza template HTTP ${response.status}`);
          return response.text();
        })
        .then((html) => {
          const parsed = new DOMParser().parseFromString(html, "text/html");
          const template = parsed.querySelector("template[data-morphoza-template]");
          if (!template) {
            throw new Error("Morphoza template missing");
          }
          return template.innerHTML;
        });
    }

    return state.templatePromise;
  }

  async function fetchVideos() {
    if (!state.videosPromise) {
      state.videosPromise = fetch(getGeneratedDataUrl(), { credentials: "same-origin" })
        .then((response) => {
          if (!response.ok) throw new Error(`Morphoza data HTTP ${response.status}`);
          return response.json();
        })
        .then((payload) => {
          const railsPayload = Array.isArray(payload)
            ? { justMe: payload }
            : (payload && typeof payload === "object" ? payload : {});

          const normalized = Object.fromEntries(
            RAIL_KEYS.map((railKey) => [railKey, sanitizeGeneratedEntries(getRailPayloadEntries(railsPayload, railKey))])
          );

          RAIL_KEYS.forEach((railKey) => {
            state.rails[railKey].videos = normalized[railKey];
          });
          state.allVideos = mergeUniqueVideos(normalized);

          return state.rails;
        })
        .catch(() => {
          state.rails = createRailState();
          state.allVideos = [];
          return state.rails;
        });
    }

    return state.videosPromise;
  }

  function getThumbUrl(videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  function getEmbedUrl(videoId) {
    return `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`;
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
    return presets[offset] || {
      x: "0px",
      y: "120px",
      scale: 0.5,
      opacity: 0,
      brightness: 0.5,
      blur: 2,
      rotate: "0deg",
      z: 0
    };
  }

  function preloadThumb(videoId) {
    if (!videoId || state.preloaded.has(videoId)) return;
    const image = new Image();
    image.src = getThumbUrl(videoId);
    state.preloaded.add(videoId);
  }

  function preloadVisibleThumbs(railKey) {
    const videos = getRailVideos(railKey);
    const rail = state.rails[railKey];
    if (!videos.length || !rail) return;

    [0, -1, 1, -2, 2].forEach((delta) => {
      const index = (rail.activeIndex + delta + videos.length) % videos.length;
      preloadThumb(videos[index] && videos[index].id);
    });
  }

  function getRailRefs(railKey) {
    return state.refs.rails ? state.refs.rails[railKey] : null;
  }

  function getRailItems(railKey) {
    const railRefs = getRailRefs(railKey);
    return railRefs?.track ? Array.from(railRefs.track.querySelectorAll(".morphoza-item")) : [];
  }

  function enforceRailOrder() {
    const carouselView = state.refs.carouselView;
    if (!carouselView || !state.refs.rails) return;

    RAIL_KEYS.forEach((railKey) => {
      const rail = state.refs.rails[railKey]?.rail;
      if (rail) {
        carouselView.appendChild(rail);
      }
    });
  }

  function captureRefs() {
    state.refs = {
      carouselView: state.root.querySelector("[data-morphoza-carousel-view]"),
      playerView: state.root.querySelector("[data-morphoza-player-view]"),
      iframe: state.root.querySelector("[data-morphoza-iframe]"),
      rails: {}
    };

    RAIL_KEYS.forEach((railKey) => {
      const rail = state.root.querySelector(`[data-morphoza-rail='${railKey}']`);
      state.refs.rails[railKey] = {
        rail,
        shell: rail?.querySelector(".morphoza-carousel-shell") || null,
        carousel: state.root.querySelector(`[data-morphoza-carousel='${railKey}']`),
        track: state.root.querySelector(`[data-morphoza-track='${railKey}']`),
        navPrev: rail?.querySelector("[data-morphoza-nav='prev']") || null,
        navNext: rail?.querySelector("[data-morphoza-nav='next']") || null
      };
    });

    const required = ["carouselView", "playerView", "iframe"];
    for (const name of required) {
      if (!state.refs[name]) {
        throw new Error(`Morphoza reference missing: ${name}`);
      }
    }

    RAIL_KEYS.forEach((railKey) => {
      const railRefs = state.refs.rails[railKey];
      if (!railRefs?.rail || !railRefs.shell || !railRefs.carousel || !railRefs.track) {
        throw new Error(`Morphoza rail reference missing: ${railKey}`);
      }
    });
  }

  function createEmptyRailMarkup(railKey) {
    const title = getRailTitle(railKey);
    return `
      <div class="morphoza-empty-state" role="note" aria-label="${title} rail is empty">
        <p class="morphoza-empty-copy">${title} is ready for its first video.</p>
      </div>
    `;
  }

  function createItemMarkup(video, index, railKey) {
    return `
      <article class="morphoza-item" data-video-index="${index}" data-rail-key="${railKey}" data-video-id="${video.id}">
        <button class="morphoza-item-button" type="button" aria-label="${video.title}">
          <div class="morphoza-item-figure">
            <img src="${getThumbUrl(video.id)}" alt="${video.title}" loading="lazy" decoding="async">
          </div>
          <p class="morphoza-item-title">${video.title}</p>
        </button>
      </article>
    `;
  }

  function renderItems() {
    enforceRailOrder();

    RAIL_KEYS.forEach((railKey) => {
      const railRefs = getRailRefs(railKey);
      const videos = getRailVideos(railKey);
      if (!railRefs?.track || !railRefs?.rail || !railRefs?.shell) return;

      railRefs.rail.hidden = false;
      railRefs.shell.classList.toggle("is-empty", !videos.length);
      [railRefs.navPrev, railRefs.navNext].forEach((button) => {
        if (!button) return;
        button.disabled = !videos.length;
        button.hidden = !videos.length;
        button.setAttribute("aria-hidden", !videos.length ? "true" : "false");
      });

      if (!videos.length) {
        railRefs.track.innerHTML = createEmptyRailMarkup(railKey);
        railRefs.carousel.style.setProperty("--bg-shift", "0px");
        return;
      }

      railRefs.track.innerHTML = videos.map((video, index) => createItemMarkup(video, index, railKey)).join("");
    });
  }

  function updateCarousel(railKey) {
    const railState = state.rails[railKey];
    const railRefs = getRailRefs(railKey);
    const videos = getRailVideos(railKey);
    const items = getRailItems(railKey);

    if (!railState || !railRefs?.carousel || !items.length || !videos.length) return;

    const isMobile = isMobileMorphoza();
    railState.activeIndex = normalizeIndex(railState.activeIndex, videos.length);
    railRefs.carousel.style.setProperty("--bg-shift", `${-railState.activeIndex * 30}px`);

    items.forEach((item, index) => {
      const offset = getCircularOffset(index, railState.activeIndex, items.length);
      const slot = getSlotStyle(offset, isMobile);
      const isActive = offset === 0;
      const button = item.querySelector(".morphoza-item-button");

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
      button?.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    preloadVisibleThumbs(railKey);
  }

  function updateAllCarousels() {
    RAIL_KEYS.forEach(updateCarousel);
  }

  function resetPlayer() {
    const frame = state.refs.iframe;
    if (frame) {
      const nextFrame = frame.cloneNode(false);
      nextFrame.title = frame.title || "Moti Morphoza video player";
      nextFrame.setAttribute("data-morphoza-iframe", "");
      nextFrame.loading = "lazy";
      nextFrame.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
      nextFrame.allowFullscreen = true;
      frame.replaceWith(nextFrame);
      state.refs.iframe = nextFrame;
    }

    state.player = null;
    state.inlinePlayer = null;
  }

  function resetGalleryScroll() {
    [state.pane, state.root, state.shell, state.refs.carouselView].forEach((element) => {
      if (!element) return;

      if (typeof element.scrollTo === "function") {
        element.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

      element.scrollTop = 0;
      element.scrollLeft = 0;
    });
  }

  function scrollRailIntoView(railKey, options = {}) {
    const rail = getRailRefs(railKey)?.rail;
    if (!rail || rail.hidden) return;

    rail.scrollIntoView({
      behavior: options.behavior || "auto",
      block: options.block || "start"
    });
  }

  function showGalleryView() {
    state.refs.carouselView?.removeAttribute("hidden");
    state.refs.playerView?.setAttribute("hidden", "hidden");
  }

  function showPlayer(railKey, index) {
    const video = getRailVideos(railKey)[index];
    if (!video || !state.refs.iframe) return;

    state.activeRailKey = railKey;
    state.player = { railKey, index };
    state.inlinePlayer = null;
    state.refs.carouselView?.setAttribute("hidden", "hidden");
    state.refs.playerView?.removeAttribute("hidden");
    state.refs.iframe.src = getEmbedUrl(video.id);
  }

  function showInlineMobilePlayer(railKey, index, options = {}) {
    const video = getRailVideos(railKey)[index];
    const railRefs = getRailRefs(railKey);
    if (!video || !railRefs?.track) return;

    state.activeRailKey = railKey;
    state.rails[railKey].activeIndex = index;
    state.player = { railKey, index };
    state.inlinePlayer = { railKey, index };

    renderItems();
    updateAllCarousels();

    const item = railRefs.track.querySelector(`.morphoza-item[data-video-index='${index}']`);
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

    if (options.scrollIntoView !== false) {
      item.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function move(railKey, direction) {
    const railState = state.rails[railKey];
    const railRefs = getRailRefs(railKey);
    const videos = getRailVideos(railKey);
    if (!railState || !railRefs?.carousel || !videos.length || !state.root) return;

    state.activeRailKey = railKey;
    railRefs.carousel.classList.add("moving");

    if (state.moveTimers[railKey]) {
      window.clearTimeout(state.moveTimers[railKey]);
    }

    state.moveTimers[railKey] = window.setTimeout(() => {
      railRefs.carousel.classList.remove("moving");
      state.moveTimers[railKey] = null;
    }, 450);

    railState.activeIndex = (railState.activeIndex + direction + videos.length) % videos.length;
    updateCarousel(railKey);
  }

  function assignWallCell(cell, videoIndex) {
    const image = cell.querySelector("[data-wall-image]");
    const video = state.allVideos[videoIndex];
    if (!image || !video) return;

    cell.dataset.videoIndex = String(videoIndex);
    cell.dataset.videoId = video.id;
    cell.setAttribute("aria-label", `Open Moti Morphoza video gallery from ${video.title}`);
    image.src = getThumbUrl(video.id);
    image.alt = video.title;
    preloadThumb(video.id);
  }

  function initWall() {
    const cells = state.pane ? Array.from(state.pane.querySelectorAll(".more-video-wall-cell")) : [];
    if (!cells.length || !state.allVideos.length) return;

    state.wallSlots = cells.map((_, index) => index % state.allVideos.length);
    cells.forEach((cell, index) => {
      assignWallCell(cell, state.wallSlots[index]);
    });
  }

  function rotateWall() {
    const cells = state.pane ? Array.from(state.pane.querySelectorAll(".more-video-wall-cell")) : [];
    if (!cells.length || state.allVideos.length <= cells.length) return;

    const slotIndex = Math.floor(Math.random() * cells.length);
    const cell = cells[slotIndex];
    const image = cell.querySelector("[data-wall-image]");
    if (!image) return;

    const used = new Set(state.wallSlots);
    const candidates = state.allVideos
      .map((_, index) => index)
      .filter((index) => !used.has(index) || index === state.wallSlots[slotIndex]);

    if (!candidates.length) return;

    let nextIndex = candidates[Math.floor(Math.random() * candidates.length)];
    if (nextIndex === state.wallSlots[slotIndex] && candidates.length > 1) {
      nextIndex = candidates.find((index) => index !== state.wallSlots[slotIndex]) ?? nextIndex;
    }
    if (nextIndex === state.wallSlots[slotIndex]) return;

    image.classList.add("is-swapping");
    preloadThumb(state.allVideos[nextIndex] && state.allVideos[nextIndex].id);

    window.setTimeout(() => {
      state.wallSlots[slotIndex] = nextIndex;
      assignWallCell(cell, nextIndex);
      requestAnimationFrame(() => {
        image.classList.remove("is-swapping");
      });
    }, 260);
  }

  function stopWallRotation() {
    if (state.wallTimer) {
      window.clearInterval(state.wallTimer);
      state.wallTimer = null;
    }
  }

  function startWallRotation() {
    stopWallRotation();
    if (!state.allVideos.length) return;

    initWall();
    state.wallTimer = window.setInterval(() => {
      if (document.body.dataset.page !== PAGE_ID) return;
      if (!state.pane || !state.pane.isConnected) return;
      rotateWall();
    }, 2000);
  }

  function handlePointerMove(event) {
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
  }

  function handlePointerOut(event) {
    const button = event.target.closest?.(".morphoza-item-button");
    if (!button) return;
    if (button.contains(event.relatedTarget)) return;

    const item = button.closest(".morphoza-item");
    if (!item) return;
    item.style.removeProperty("--thumb-scale");
    item.style.removeProperty("--thumb-x");
    item.style.removeProperty("--thumb-y");
  }

  function handleModuleClick(event) {
    const nav = event.target.closest("[data-morphoza-nav]");
    if (nav) {
      const rail = nav.closest("[data-morphoza-rail]");
      const railKey = rail?.dataset.morphozaRail;
      if (RAIL_KEYS.includes(railKey)) {
        move(railKey, nav.dataset.morphozaNav === "next" ? 1 : -1);
      }
      return;
    }

    const back = event.target.closest("[data-morphoza-back]");
    if (back) {
      showGalleryView();
      resetPlayer();
      renderItems();
      updateAllCarousels();
      return;
    }

    const item = event.target.closest(".morphoza-item");
    if (!item) return;

    const rail = item.closest("[data-morphoza-rail]");
    const railKey = rail?.dataset.morphozaRail;
    const index = Number(item.dataset.videoIndex);

    if (!RAIL_KEYS.includes(railKey) || !Number.isInteger(index)) return;

    state.activeRailKey = railKey;

    if (isMobileMorphoza()) {
      showInlineMobilePlayer(railKey, index);
      return;
    }

    if (index === state.rails[railKey].activeIndex) {
      state.rails[railKey].activeIndex = index;
      updateCarousel(railKey);
      showPlayer(railKey, index);
      return;
    }

    state.rails[railKey].activeIndex = index;
    updateCarousel(railKey);
  }

  function handleKeydown(event) {
    if (document.body.dataset.page !== PAGE_ID) return;
    if (!state.shell || state.shell.hidden || !state.root || !state.root.isConnected) return;
    if (isTypingTarget(event.target)) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(state.activeRailKey, 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(state.activeRailKey, -1);
      return;
    }

    if (event.key === "Escape") {
      if (state.refs.playerView && !state.refs.playerView.hidden) {
        event.preventDefault();
        showGalleryView();
        resetPlayer();
        renderItems();
        updateAllCarousels();
      }
    }
  }

  function handleResize() {
    if (document.body.dataset.page !== PAGE_ID || !state.root || !state.root.isConnected) return;
    if (!state.shell || state.shell.hidden) return;

    const wasPlayerVisible = Boolean(state.refs.playerView && !state.refs.playerView.hidden);
    const currentPlayer = state.player;
    const currentInline = state.inlinePlayer;

    renderItems();
    updateAllCarousels();

    if (isMobileMorphoza()) {
      if (currentInline && RAIL_KEYS.includes(currentInline.railKey) && Number.isInteger(currentInline.index) && getRailVideos(currentInline.railKey)[currentInline.index]) {
        showInlineMobilePlayer(currentInline.railKey, currentInline.index, { scrollIntoView: false });
        return;
      }

      if (wasPlayerVisible && currentPlayer && RAIL_KEYS.includes(currentPlayer.railKey) && Number.isInteger(currentPlayer.index) && getRailVideos(currentPlayer.railKey)[currentPlayer.index]) {
        showGalleryView();
        showInlineMobilePlayer(currentPlayer.railKey, currentPlayer.index, { scrollIntoView: false });
      }
      return;
    }

    if (currentInline) {
      state.inlinePlayer = null;
    }
  }

  function bindEvents() {
    if (!state.root || state.root.dataset.morphozaBound === "true") return;

    state.root.dataset.morphozaBound = "true";
    state.root.addEventListener("pointermove", handlePointerMove);
    state.root.addEventListener("pointerout", handlePointerOut);
    state.root.addEventListener("click", handleModuleClick);

    if (!state.globalListenersBound) {
      state.globalListenersBound = true;
      window.addEventListener("keydown", handleKeydown);
      window.addEventListener("resize", handleResize);
    }
  }

  function showError(message) {
    if (!state.host) return;

    state.host.innerHTML = `
      <section class="morphoza-view" aria-label="Moti Morphoza unavailable">
        <div class="morphoza-header">
          <h1 class="morphoza-title">MOTI MORPHOZA</h1>
        </div>
        <div class="morphoza-player-view">
          <button class="morphoza-back" type="button" disabled>MODULE STATUS</button>
          <div class="morphoza-player-frame" style="display:grid;place-items:center;padding:1.5rem;color:#fff;box-sizing:border-box;">
            <p>${String(message || "Unable to load Morphoza module.")}</p>
          </div>
        </div>
      </section>
    `;
    state.root = state.host.querySelector("[data-morphoza-module]") || state.host.querySelector(".morphoza-view");
  }

  async function mountModule() {
    if (!state.host) return;
    if (state.root && state.root.isConnected && state.host.contains(state.root)) {
      captureRefs();
      bindEvents();
      return;
    }

    const markup = await fetchTemplateMarkup();
    state.host.innerHTML = markup;
    state.root = state.host.querySelector("[data-morphoza-module]");
    if (!state.root) {
      throw new Error("Morphoza mount failed");
    }

    captureRefs();
    bindEvents();
  }

  async function init(pane) {
    if (document.body.dataset.page !== PAGE_ID) return;

    const nextPane = pane || state.pane || document.querySelector(".more-pane");
    if (!nextPane) return;

    state.pane = nextPane;
    state.shell = nextPane.querySelector("[data-morphoza-view]");
    state.host = nextPane.querySelector("[data-morphoza-mount]");

    if (!state.shell || !state.host) {
      return;
    }

    if (state.initPromise) {
      return state.initPromise;
    }

    state.initPromise = (async () => {
      try {
        await mountModule();
        await fetchVideos();
        if (!state.railPositionsInitialized) {
          ensureRailPositions({ reset: true });
          state.railPositionsInitialized = true;
        } else {
          ensureRailPositions();
        }
        renderItems();
        updateAllCarousels();
        initWall();
      } catch (error) {
        showError(error instanceof Error ? error.message : "Unable to load Morphoza module.");
      } finally {
        state.initPromise = null;
      }
    })();

    return state.initPromise;
  }

  async function show(options = {}) {
    await init();
    if (!state.root) return;

    stopWallRotation();

    if (options.resetToStart === true) {
      ensureRailPositions({ reset: true });
    } else {
      ensureRailPositions();
    }

    let targetRailKey = null;
    const location = findVideoLocation(options.startVideoId);
    if (location) {
      state.rails[location.railKey].activeIndex = location.index;
      state.activeRailKey = location.railKey;
      targetRailKey = location.railKey;
    } else {
      const defaultRailKey = getFirstAvailableRailKey();
      if (Number.isInteger(options.startIndex) && options.startIndex >= 0 && options.startIndex < getRailVideos(defaultRailKey).length) {
        state.rails[defaultRailKey].activeIndex = normalizeIndex(options.startIndex, getRailVideos(defaultRailKey).length);
        state.activeRailKey = defaultRailKey;
        targetRailKey = defaultRailKey;
      }
    }

    showGalleryView();
    resetPlayer();
    renderItems();
    updateAllCarousels();
    resetGalleryScroll();
    if (targetRailKey && targetRailKey !== DEFAULT_ACTIVE_RAIL) {
      requestAnimationFrame(() => {
        scrollRailIntoView(targetRailKey);
      });
    }
  }

  async function activateHome() {
    await init();
    if (!state.root) return;

    showGalleryView();
    resetPlayer();
    renderItems();
    updateAllCarousels();
    startWallRotation();
  }

  async function hide(options = {}) {
    if (!state.root) return;

    stopWallRotation();

    if (options.resetPlayer !== false) {
      showGalleryView();
      resetPlayer();
      renderItems();
      updateAllCarousels();
    }

    if (options.resumeHome) {
      startWallRotation();
    }
  }

  window.MorphozaModule = {
    init,
    show,
    hide,
    activateHome
  };
})();

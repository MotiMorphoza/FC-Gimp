/* =========================
   SIDEBAR LOADER
========================= */

async function loadSidebar() {
  const placeholder = document.querySelector("[data-sidebar]");
  if (!placeholder) return;

  try {
    const res = await fetch("/MotoSynteza/partials/sidebar.html", {
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error("Sidebar load failed");

    const html = await res.text();
    placeholder.innerHTML = html;

    const toggle = placeholder.querySelector(".menu-toggle");
    const menu = placeholder.querySelector(".menu");

    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        menu.classList.toggle("open");
      });
    }
  } catch (err) {
    console.error("Sidebar error:", err);
  }
}

/* =========================
   PROJECT LOADER (JSON)
========================= */

function getSlugFromURL(url = window.location.href) {
  const parsed = new URL(url, window.location.origin);
  const fromQuery = parsed.searchParams.get("project");
  if (fromQuery) return fromQuery;

  const parts = parsed.pathname.split("/").filter(Boolean);
  const projectsIndex = parts.indexOf("projects");

  if (projectsIndex !== -1 && parts[projectsIndex + 1]) {
    return decodeURIComponent(parts[projectsIndex + 1]);
  }

  return "";
}

function removeSlideIndicator() {
  if (window.__PROJECT_COUNTER_CLEANUP__) {
    window.__PROJECT_COUNTER_CLEANUP__();
    window.__PROJECT_COUNTER_CLEANUP__ = null;
  }

  const indicator = document.getElementById("slideIndicator");
  if (indicator) indicator.remove();
}

/* =========================
   LIGHTBOX STATE
   Tracks the current image list and index for prev/next navigation.
   Reset each time a gallery image is clicked.
========================= */

const _lightboxState = {
  images: [],   // array of <img> elements from the active project gallery
  index:  0,    // index of the currently displayed image
};

/**
 * Open the lightbox showing the image at `index` within `images`.
 */
function openLightbox(images, index) {
  _lightboxState.images = images;
  _lightboxState.index  = Math.max(0, Math.min(index, images.length - 1));

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox?.querySelector("img");
  if (!lightbox || !lightboxImg) return;

  lightboxImg.src = _lightboxState.images[_lightboxState.index].src;
  lightbox.classList.add("active");
}

/**
 * Move forwards (+1) or backwards (-1) in the current image list.
 * Wraps around at both ends.
 */
function navigateLightbox(delta) {
  const { images } = _lightboxState;
  if (!images.length) return;

  _lightboxState.index =
    (_lightboxState.index + delta + images.length) % images.length;

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox?.querySelector("img");
  if (lightboxImg) lightboxImg.src = images[_lightboxState.index].src;
}

/* =========================
   LIGHTBOX BINDING
========================= */

function bindProjectLightbox() {
  const lightbox    = document.getElementById("lightbox");
  const lightboxImg = lightbox?.querySelector("img");
  if (!lightbox || !lightboxImg) return;

  // ── Core close / button binding (runs once per lightbox element) ──────────
  if (!lightbox.dataset.bound) {
    const closeBtn = lightbox.querySelector(".lightbox-close");

    // Click on backdrop closes; click on the image itself does NOT close
    // (to avoid accidental close while tapping arrows on mobile)
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.classList.remove("active");
    });

    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      lightbox.classList.remove("active");
    });

    // ── Navigation arrows ──────────────────────────────────────────────────
    const prevBtn = document.createElement("button");
    prevBtn.className        = "lightbox-nav lightbox-nav--prev";
    prevBtn.setAttribute("aria-label", "Previous image");
    prevBtn.innerHTML        = "&#8592;";   // ←
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigateLightbox(-1);
    });

    const nextBtn = document.createElement("button");
    nextBtn.className        = "lightbox-nav lightbox-nav--next";
    nextBtn.setAttribute("aria-label", "Next image");
    nextBtn.innerHTML        = "&#8594;";   // →
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigateLightbox(+1);
    });

    lightbox.appendChild(prevBtn);
    lightbox.appendChild(nextBtn);

    // ── Swipe support (mobile) ─────────────────────────────────────────────
    let _touchStartX = null;
    lightbox.addEventListener("touchstart", (e) => {
      _touchStartX = e.touches[0].clientX;
    }, { passive: true });

    lightbox.addEventListener("touchend", (e) => {
      if (_touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - _touchStartX;
      _touchStartX = null;
      if (Math.abs(dx) < 40) return;   // ignore small drags
      navigateLightbox(dx < 0 ? +1 : -1);
    }, { passive: true });

    lightbox.dataset.bound = "true";
  }

  // ── Keyboard listener (runs once for the document lifetime) ───────────────
  if (!window.__lightboxKeyBound) {
    window.__lightboxKeyBound = true;

    document.addEventListener("keydown", (e) => {
      const lightboxActive = document.getElementById("lightbox");
      if (!lightboxActive?.classList.contains("active")) return;

      if (e.key === "ArrowRight") { e.preventDefault(); navigateLightbox(+1); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); navigateLightbox(-1); }
      if (e.key === "Escape")     {
        e.preventDefault();
        lightboxActive.classList.remove("active");
      }
    });
  }

  // ── Gallery click delegation (runs once per document; page-guarded) ───────
  if (!document.body.dataset.lightboxDelegated) {
    document.addEventListener("click", (e) => {
      if (document.body.dataset.page !== "project") return;

      const clickedImage = e.target.closest(".project-gallery img");
      if (!clickedImage) return;

      // Collect the current project's gallery images fresh on each click
      const galleryImages = [
        ...document.querySelectorAll(".project-gallery img"),
      ];
      const clickedIndex  = galleryImages.indexOf(clickedImage);

      openLightbox(galleryImages, clickedIndex >= 0 ? clickedIndex : 0);
    });

    document.body.dataset.lightboxDelegated = "true";
  }
}

function ensureSlideIndicator() {
  let indicator = document.getElementById("slideIndicator");

  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id        = "slideIndicator";
    indicator.className = "slide-indicator";
    document.body.appendChild(indicator);
  }

  return indicator;
}

function configureProjectSlideIndicator(images) {
  const indicator = ensureSlideIndicator();
  const total     = images.length;

  if (window.__PROJECT_COUNTER_CLEANUP__) {
    window.__PROJECT_COUNTER_CLEANUP__();
    window.__PROJECT_COUNTER_CLEANUP__ = null;
  }

  if (total <= 1) {
    indicator.textContent = "";
    indicator.classList.remove("is-visible");
    return;
  }

  const updateIndicator = (index) => {
    const safeIndex = Math.max(1, Math.min(total, index));
    indicator.textContent = `${safeIndex} / ${total}`;
    indicator.classList.add("is-visible");
  };

  const pane = document.querySelector(".content-pane");
  const scrollRoot =
    pane && pane.scrollHeight > pane.clientHeight + 1 ? pane : null;
  const getBounds = scrollRoot
    ? () => scrollRoot.getBoundingClientRect()
    : () => ({ top: 0, bottom: window.innerHeight });

  let ticking = false;

  const updateByScroll = () => {
    ticking = false;

    const bounds         = getBounds();
    const viewportCenter = bounds.top + (bounds.bottom - bounds.top) / 2;

    let closestIndex    = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    images.forEach((img, index) => {
      const rect      = img.getBoundingClientRect();
      const imgCenter = rect.top + rect.height / 2;
      const distance  = Math.abs(imgCenter - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex    = index;
      }
    });

    updateIndicator(closestIndex + 1);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateByScroll);
  };

  const target = scrollRoot || window;
  target.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  updateIndicator(1);

  window.__PROJECT_COUNTER_CLEANUP__ = () => {
    target.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}

async function initProjectPage() {
  if (document.body.dataset.page !== "project") {
    if (window.__PROJECT_COUNTER_CLEANUP__) {
      window.__PROJECT_COUNTER_CLEANUP__();
      window.__PROJECT_COUNTER_CLEANUP__ = null;
    }
    removeSlideIndicator();
    return;
  }

  const gallery = document.querySelector(".project-gallery");
  if (!gallery) { removeSlideIndicator(); return; }

  gallery.innerHTML = "";

  const projectSlug = getSlugFromURL();
  if (projectSlug) document.body.dataset.project = projectSlug;
  if (!projectSlug) { removeSlideIndicator(); return; }

  try {
    const version = window.__BUILD_VERSION__ || Date.now();
    const res = await fetch(
      `projects/${projectSlug}/project.json?v=${version}`,
      { credentials: "same-origin" }
    );
    if (!res.ok) throw new Error("Project JSON not found");
    const data = await res.json();

    const prefix =
      typeof data.codePrefix === "string" && data.codePrefix.trim()
        ? data.codePrefix.trim().toUpperCase()
        : projectSlug.split("-").map((s) => s[0]?.toUpperCase()).join("");

    // ── CRITICAL FIX: descending codes to match shop-index-generator ──
    // image[0]  → PREFIX-025   (total - 0)
    // image[24] → PREFIX-001   (total - 24)
    const total    = data.images.length;
    const padWidth = Math.max(3, String(total).length);

    data.images.forEach((imgData, index) => {
      const figure        = document.createElement("figure");
      figure.className    = "project-figure";

      const caption       = document.createElement("div");
      caption.className   = "project-caption";
      caption.textContent = imgData.caption || "";

      const img       = document.createElement("img");
      img.src         = `projects/${projectSlug}/${imgData.src}`;
      img.loading     = "lazy";
      img.decode?.().then(() => img.classList.add("is-visible"))
                   .catch(() => img.classList.add("is-visible"));

      const number  = String(total - index).padStart(padWidth, "0");
      const code    = `${prefix}-${number}`;

      const codeTag         = document.createElement("span");
      codeTag.className     = "image-code";
      codeTag.textContent   = code;

      figure.appendChild(img);
      figure.appendChild(codeTag);
      figure.appendChild(caption);
      gallery.appendChild(figure);
    });
  } catch (err) {
    console.error(err);
  }

  const images = [...document.querySelectorAll(".project-gallery img")];
  if (!images.length) { removeSlideIndicator(); return; }

  configureProjectSlideIndicator(images);
  enableForwardPreload(images, projectSlug);
  enableDecodeFade(images);
  bindProjectLightbox();
}

function runProjectsInit() {
  if (typeof window.initProjectsPage === "function") {
    window.initProjectsPage();
  }
}

function runSlideshowInit() {
  if (typeof window.initSlideshow === "function") {
    window.initSlideshow();
  }
}

function ensureFadeOverlay() {
  let fade = document.getElementById("pageFade");

  if (!fade) {
    fade    = document.createElement("div");
    fade.id = "pageFade";
    document.body.appendChild(fade);
  }

  return fade;
}

async function ensurePageStyles(doc) {
  const links = [...doc.querySelectorAll('link[rel="stylesheet"][href]')]
    .map((link) => link.getAttribute("href"))
    .filter(Boolean);

  for (const href of links) {
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) continue;

    await new Promise((resolve) => {
      const link  = document.createElement("link");
      link.rel    = "stylesheet";
      link.href   = href;
      link.onload  = resolve;
      link.onerror = resolve;   // non-blocking on error
      document.head.appendChild(link);
    });
  }
}

async function ensurePageScripts(doc) {
  const scripts = [...doc.querySelectorAll("script[src]")]
    .map((script) => script.getAttribute("src"))
    .filter(Boolean)
    .filter((src) => !src.includes("layout.js"));

  for (const src of scripts) {
    if (document.querySelector(`script[src="${src}"]`)) continue;

    await new Promise((resolve, reject) => {
      const script    = document.createElement("script");
      script.src      = src;
      script.onload   = resolve;
      script.onerror  = reject;
      document.body.appendChild(script);
    });
  }
}

function syncBodyState(doc, url) {
  if (!doc?.body) return;

  document.body.className = doc.body.className;

  const { page } = doc.body.dataset;

  if (page) {
    document.body.dataset.page = page;
  } else {
    delete document.body.dataset.page;
  }

  const slug = getSlugFromURL(url || window.location.href);
  if (slug) {
    document.body.dataset.project = slug;
  } else {
    delete document.body.dataset.project;
  }
}

function syncOptionalShellElements(doc) {
  const optionalSelectors = ["#lightbox", "#slideIndicator"];

  optionalSelectors.forEach((selector) => {
    const incoming = doc.querySelector(selector);
    const current  = document.querySelector(selector);

    if (incoming && current) {
      current.replaceWith(incoming.cloneNode(true));
      return;
    }

    if (incoming && !current) {
      document.body.appendChild(incoming.cloneNode(true));
      return;
    }

    if (!incoming && current && selector === "#slideIndicator") {
      current.remove();
    }
  });
}

async function loadPage(url, push = true) {
  const fade = ensureFadeOverlay();

  try {
    fade.classList.add("active");
    await new Promise((r) => setTimeout(r, 300));

    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("PJAX fetch failed");

    const html   = await res.text();
    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, "text/html");

    const newContent     = doc.querySelector(".content-pane");
    const currentContent = document.querySelector(".content-pane");
    const newSidebar     = doc.querySelector("[data-sidebar]");
    const currentSidebar = document.querySelector("[data-sidebar]");

    if (!newContent || !currentContent || !newSidebar || !currentSidebar) {
      throw new Error("PJAX shell missing");
    }

    syncBodyState(doc, url);
    currentSidebar.replaceWith(newSidebar);
    currentContent.replaceWith(newContent);
    syncOptionalShellElements(doc);

    const landingOverlay = document.getElementById("landing-overlay");
    if (landingOverlay && doc.getElementById("landing-overlay") === null) {
      landingOverlay.remove();
    }

    if (doc.title) document.title = doc.title;
    if (push) history.pushState({}, "", url);

    await ensurePageStyles(doc);    // ← inject any new CSS before scripts run
    await ensurePageScripts(doc);
    await initPage();

    await new Promise((r) => setTimeout(r, 50));
    fade.classList.remove("active");
  } catch (err) {
    window.location.href = url;
  }
}

function initFullscreenLightboxSync() {
  if (window.__FULLSCREEN_LIGHTBOX_SYNC_READY__) return;
  window.__FULLSCREEN_LIGHTBOX_SYNC_READY__ = true;

  document.addEventListener("fullscreenchange", () => {
    bindProjectLightbox();
  });
}

function initPjaxNavigation() {
  if (window.__PJAX_READY__) return;
  window.__PJAX_READY__ = true;

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    if (link.id === "enterBtn") return;
    if (link.target === "_blank") return;
    if (link.hasAttribute("download")) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const rawHref = link.getAttribute("href");
    if (!rawHref || rawHref.startsWith("#")) return;

    const url = new URL(link.href, window.location.href);

    if (url.origin !== location.origin) return;
    if (
      url.pathname === location.pathname &&
      url.search   === location.search
    ) return;

    e.preventDefault();
    loadPage(`${url.pathname}${url.search}${url.hash}`);
  });

  window.addEventListener("popstate", () => {
    loadPage(
      `${location.pathname}${location.search}${location.hash}`,
      false
    );
  });
}

async function initPage() {
  ensureFadeOverlay();
  await loadSidebar();
  runProjectsInit();
  await initProjectPage();
  runSlideshowInit();
  runShopInit();
  initFullscreenLightboxSync();
  initPjaxNavigation();
}

function enableForwardPreload(images, projectSlug) {
  if (!images.length) return;

  const preloaded = new Set();

  const preloadImage = (index) => {
    if (index >= images.length) return;
    if (preloaded.has(index)) return;

    const src = images[index].getAttribute("src");
    if (!src) return;

    const img = new Image();
    img.src   = src;

    preloaded.add(index);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const currentIndex = images.indexOf(entry.target);
        if (currentIndex === -1) return;

        preloadImage(currentIndex + 1);
        preloadImage(currentIndex + 2);
      });
    },
    {
      root:       null,
      rootMargin: "777px 0px",
      threshold:  0.1,
    }
  );

  images.forEach((img) => observer.observe(img));
}

function enableDecodeFade(images) {
  images.forEach((img) => {
    if (img.complete) {
      img.classList.add("is-ready");
      return;
    }

    img.addEventListener("load", async () => {
      try {
        if (img.decode) await img.decode();
      } catch (e) {}
      img.classList.add("is-ready");
    });
  });
}

function runShopInit() {
  if (typeof window.initShopPage === "function") {
    window.initShopPage();
  }
}

window.loadPage = loadPage;
document.addEventListener("DOMContentLoaded", initPage);

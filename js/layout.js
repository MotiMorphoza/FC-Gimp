







/* ==============================
   layout.js  â€“  MotoSynteza (v4)
   ============================== */

/* ========================= 
     SIDEBAR LOADER 
 ========================= */

async function loadSidebar() {
  const placeholder = document.querySelector("[data-sidebar]");
  if (!placeholder) return;

  try {
    const res = await fetch("partials/sidebar.html", {
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error("Sidebar load failed");

    const html = await res.text();
    placeholder.innerHTML = html;

    const toggle = placeholder.querySelector(".menu-toggle");
    const menu   = placeholder.querySelector(".menu");

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
  const parsed      = new URL(url, window.location.origin);
  const fromQuery   = parsed.searchParams.get("project");
  if (fromQuery) return fromQuery;

  const parts        = parsed.pathname.split("/").filter(Boolean);
  const projectsIndex = parts.indexOf("projects");

  if (projectsIndex !== -1 && parts[projectsIndex + 1]) {
    return decodeURIComponent(parts[projectsIndex + 1]);
  }

  return "";
}

/* =========================
   LIGHTBOX STATE
========================= */

const _lightboxState = {
  images: [],
  index:  0,
};

function openLightbox(images, index) {
  _lightboxState.images = images;
  _lightboxState.index  = Math.max(0, Math.min(index, images.length - 1));

  const lightbox    = document.getElementById("lightbox");
  const lightboxImg = lightbox?.querySelector("img");
  if (!lightbox || !lightboxImg) return;

  lightboxImg.src = _lightboxState.images[_lightboxState.index].src;
  lightbox.classList.add("active");

  // Update data-single so nav arrows hide on single-image sets
  lightbox.dataset.single = images.length <= 1 ? "true" : "false";
}

function navigateLightbox(delta) {
  const { images } = _lightboxState;
  if (!images.length) return;

  _lightboxState.index =
    (_lightboxState.index + delta + images.length) % images.length;

  const lightbox    = document.getElementById("lightbox");
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

  if (!lightbox.dataset.bound) {
    const closeBtn = lightbox.querySelector(".lightbox-close");

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.classList.remove("active");
    });

    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      lightbox.classList.remove("active");
    });

    const prevBtn = document.createElement("button");
    prevBtn.className = "lightbox-nav lightbox-nav--prev";
    prevBtn.setAttribute("aria-label", "Previous image");
    prevBtn.innerHTML = "&#8592;";
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigateLightbox(-1);
    });

    const nextBtn = document.createElement("button");
    nextBtn.className = "lightbox-nav lightbox-nav--next";
    nextBtn.setAttribute("aria-label", "Next image");
    nextBtn.innerHTML = "&#8594;";
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigateLightbox(+1);
    });

    lightbox.appendChild(prevBtn);
    lightbox.appendChild(nextBtn);

    let _touchStartX = null;
    lightbox.addEventListener("touchstart", (e) => {
      _touchStartX = e.touches[0].clientX;
    }, { passive: true });

    lightbox.addEventListener("touchend", (e) => {
      if (_touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - _touchStartX;
      _touchStartX = null;
      if (Math.abs(dx) < 40) return;
      navigateLightbox(dx < 0 ? +1 : -1);
    }, { passive: true });

    lightbox.dataset.bound = "true";
  }

  if (!window.__lightboxKeyBound) {
    window.__lightboxKeyBound = true;

    document.addEventListener("keydown", (e) => {
      const lb = document.getElementById("lightbox");
      if (!lb?.classList.contains("active")) return;

      if (e.key === "ArrowRight") { e.preventDefault(); navigateLightbox(+1); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); navigateLightbox(-1); }
      if (e.key === "Escape")     {
        e.preventDefault();
        lb.classList.remove("active");
      }
    });
  }

  if (!document.body.dataset.lightboxDelegated) {
    document.addEventListener("click", (e) => {
      if (document.body.dataset.page !== "project") return;

      // Don't open lightbox if the click came from the protect overlay
      const overlay = e.target.closest(".img-protect-overlay");
      if (overlay) return;

      const clickedImage = e.target.closest(".project-gallery img");
      if (!clickedImage) return;

      const galleryImages = [...document.querySelectorAll(".project-gallery img")];
      const clickedIndex  = galleryImages.indexOf(clickedImage);

      openLightbox(galleryImages, clickedIndex >= 0 ? clickedIndex : 0);
    });

    document.body.dataset.lightboxDelegated = "true";
  }
}

/* =========================
   IMAGE PROTECTION
   â€“ Right-click disabled on gallery/lightbox images
   â€“ Drag disabled
   â€“ Toast on contextmenu
   â€“ Transparent overlay per figure (mobile long-press reduction)
   â€“ PJAX-safe: listeners attached once, globally
========================= */

function initImageProtection() {
  if (window.__IMAGE_PROTECTION_READY__) return;
  window.__IMAGE_PROTECTION_READY__ = true;

  /* â”€â”€ Toast element â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  let toastEl = document.getElementById("ms-img-toast");
  if (!toastEl) {
    toastEl           = document.createElement("div");
    toastEl.id        = "ms-img-toast";
    toastEl.className = "ms-img-toast";
    toastEl.setAttribute("aria-hidden", "true");
    toastEl.textContent = "MotoSynteza \u2014 Art at the Speed of Light";
    document.body.appendChild(toastEl);
  }

  let toastTimer = null;
  function showToast() {
    clearTimeout(toastTimer);
    toastEl.classList.add("is-visible");
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2200);
  }

  /* â”€â”€ Right-click / contextmenu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  document.addEventListener("contextmenu", (e) => {
    const img = e.target.closest(".project-gallery img, .lightbox img");
    if (!img) return;
    e.preventDefault();
    showToast();
  });

  /* â”€â”€ Drag prevention â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  document.addEventListener("dragstart", (e) => {
    const img = e.target.closest(".project-gallery img, .lightbox img");
    if (!img) return;
    e.preventDefault();
  });
}

/**
 * Add transparent protection overlays to every .project-figure inside `gallery`.
 * The overlays use pointer-events: none so lightbox clicks pass through.
 * They are primarily for mobile long-press mitigation via CSS touch-callout.
 * Safe to call multiple times (skips already-protected figures).
 */
function addImageProtectionOverlays(gallery) {
  gallery.querySelectorAll(".project-figure").forEach((fig) => {
    if (fig.querySelector(".img-protect-overlay")) return;

    const overlay           = document.createElement("div");
    overlay.className       = "img-protect-overlay";
    overlay.setAttribute("aria-hidden", "true");
    fig.appendChild(overlay);
  });
}

/* =========================
   FLOATING PROJECT TITLE
   â€“ Fixed element positioned in the top gap area
   â€“ Visible after the first image's centre scrolls out of view
   â€“ Cleaned up on navigation away from project page
========================= */

function initFloatingTitle(title, images) {
  /* Ensure element exists in body */
  let titleEl = document.getElementById("project-floating-title");
  if (!titleEl) {
    titleEl           = document.createElement("div");
    titleEl.id        = "project-floating-title";
    titleEl.className = "project-floating-title";
    document.body.appendChild(titleEl);
  }

  titleEl.textContent = title || "";
  titleEl.classList.remove("is-visible");

  /* Disconnect any previous observer */
  if (window.__FLOATING_TITLE_CLEANUP__) {
    window.__FLOATING_TITLE_CLEANUP__();
    window.__FLOATING_TITLE_CLEANUP__ = null;
  }

  if (!images.length) return;

  const firstImg = images[0];
  const pane     = document.querySelector(".content-pane");

  /*
   * On mobile (â‰¤700px), the body/page scrolls â€” .content-pane has height:auto
   * and is not the real scroll container. Using it as IntersectionObserver root
   * means the observer never fires correctly on mobile.
   * Use null (viewport) on mobile, the pane on desktop where pane clips/scrolls.
   */
  const isMobile    = () => window.matchMedia("(max-width: 700px)").matches;
  const observerRoot = isMobile() ? null : (pane || null);

  /*
   * Show the title once less than 50 % of the first image is visible.
   * Threshold 0.5 fires when exactly half the image crosses the root boundary.
   */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const lightboxOpen = document.getElementById("lightbox")?.classList.contains("active");
        if (lightboxOpen) {
          titleEl.classList.remove("is-visible");
          return;
        }
        if (entry.intersectionRatio < 0.5) {
          titleEl.classList.add("is-visible");
        } else {
          titleEl.classList.remove("is-visible");
        }
      });
    },
    {
      root:      observerRoot,
      threshold: [0.5],
    }
  );

  observer.observe(firstImg);

  window.__FLOATING_TITLE_CLEANUP__ = () => {
    observer.disconnect();
    titleEl.classList.remove("is-visible");
  };
}

/* =========================
   NEXT PROJECT SECTION
   â€“ Appended to .project-content below the gallery
   â€“ Uses window.__PROJECTS__ manifest; wraps last â†’ first
   â€“ Navigates via PJAX (window.loadPage)
========================= */

function appendNextProject(contentEl, currentSlug) {
  const manifest = window.__PROJECTS__;
  if (!Array.isArray(manifest) || manifest.length < 2) return;

  const currentIdx = manifest.findIndex((p) => p.slug === currentSlug);
  if (currentIdx === -1) return;

  const nextIdx  = (currentIdx + 1) % manifest.length;
  const next     = manifest[nextIdx];
  if (!next?.slug) return;

  /* Avoid duplicates (PJAX re-init) */
  const existing = contentEl.querySelector(".next-project-section");
  if (existing) existing.remove();

  const section  = document.createElement("div");
  section.className = "next-project-section";

  const label    = document.createElement("div");
  label.className  = "next-project-label";
  label.textContent = "Next Project";
  section.appendChild(label);

  const href   = `project.html?project=${encodeURIComponent(next.slug)}`;
  const link   = document.createElement("a");
  link.href     = href;
  link.className = "next-project-link";

  const grid   = document.createElement("div");
  grid.className = "next-project-grid";
const img = document.createElement("img");
img.className = "next-project-media";
img.alt = next.title || "";
img.loading = "lazy";
img.decoding = "async";

if (next.cover) {
  img.src = `projects/${next.slug}/${next.cover}`;
} else {
  img.classList.add("placeholder");
}

img.onerror = () => {
  img.classList.add("placeholder");
  img.removeAttribute("src");
};

grid.appendChild(img);

/* activate image fade like project covers */
enableDecodeFade([img]);

  const text   = document.createElement("div");
  text.className = "next-project-text";

  const h3     = document.createElement("h3");
  h3.textContent = next.title || "";
  text.appendChild(h3);

  if (next.description) {
    const p    = document.createElement("p");
    p.appendChild(document.createTextNode(next.description + " "));
    const enter = document.createElement("span");
    enter.className = "enter";
    enter.textContent = "ENTER \u2192";
    p.appendChild(enter);
    text.appendChild(p);
  }

  grid.appendChild(text);
  link.appendChild(grid);
  section.appendChild(link);
  contentEl.appendChild(section);
}

/* =========================
   PROJECT PAGE INIT
========================= */

async function initProjectPage() {
  /* â”€â”€ Not a project page â†’ clean up transient elements â”€â”€â”€â”€â”€â”€ */
  if (document.body.dataset.page !== "project") {
    if (window.__FLOATING_TITLE_CLEANUP__) {
      window.__FLOATING_TITLE_CLEANUP__();
      window.__FLOATING_TITLE_CLEANUP__ = null;
    }
    return;
  }

  const gallery = document.querySelector(".project-gallery");
  if (!gallery) return;

  gallery.innerHTML = "";

  const projectSlug = getSlugFromURL();
  if (projectSlug) document.body.dataset.project = projectSlug;
  if (!projectSlug) return;

  /* â”€â”€ Ensure projects manifest is available â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ *
   * When project.html is loaded directly (not via PJAX from    *
   * projects.html), window.__PROJECTS__ may be undefined if     *
   * projects-manifest.js was not yet executed. Fetch it now.   */
  if (!Array.isArray(window.__PROJECTS__)) {
    try {
      const version = window.__BUILD_VERSION__ || Date.now();
      const res = await fetch(
        `js/projects-manifest.js?v=${version}`,
        { credentials: "same-origin" }
      );
      if (res.ok) {
        const scriptText = await res.text();
        // Execute the manifest script in the global scope
        // eslint-disable-next-line no-new-func
        new Function(scriptText)();
      }
    } catch (_e) {
      // Manifest not critical for project display; Next Project just won't appear
    }
  }

  let projectTitle = "";

  try {
    const version = window.__BUILD_VERSION__ || Date.now();
    const res = await fetch(
      `projects/${projectSlug}/project.json?v=${version}`,
      { credentials: "same-origin" }
    );
    if (!res.ok) throw new Error("Project JSON not found");
    const data = await res.json();

    projectTitle = data.title || "";

    const prefix =
      typeof data.codePrefix === "string" && data.codePrefix.trim()
        ? data.codePrefix.trim().toUpperCase()
        : projectSlug.split("-").map((s) => s[0]?.toUpperCase()).join("");

    const total    = data.images.length;
    const padWidth = Math.max(3, String(total).length);

    data.images.forEach((imgData, index) => {
      const figure      = document.createElement("figure");
      figure.className  = "project-figure";

      const caption         = document.createElement("div");
      caption.className     = "project-caption";
      caption.textContent   = imgData.caption || "";

      const imageWrap = document.createElement("div");
      imageWrap.className = "project-image-wrapper";

      const img       = document.createElement("img");
      img.src         = `projects/${projectSlug}/${imgData.src}`;
      img.alt         = imgData.caption || `${projectTitle} â€“ image ${index + 1}`;
      img.loading     = index === 0 ? "eager" : "lazy";
      if (index === 0) img.setAttribute("fetchpriority", "high");
      img.decoding    = "async";
      img.decode?.().then(() => img.classList.add("is-visible"))
                   .catch(() => img.classList.add("is-visible"));

      const number   = String(total - index).padStart(padWidth, "0");
      const code     = `${prefix}-${number}`;

      const codeTag        = document.createElement("div");
      codeTag.className    = "image-code project-image-code";
      codeTag.dataset.code = code;
      codeTag.appendChild(document.createTextNode(code));

      const addHint = document.createElement("span");
      addHint.className = "add-to-cart-hint";
      addHint.textContent = "ADD TO CART";
      codeTag.appendChild(addHint);

      codeTag.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const addToCart = window.motoAddToCartByCode;
        if (typeof addToCart !== "function") return;

        const result = addToCart(codeTag.dataset.code);
        if (!result?.ok) return;

        codeTag.classList.add("added");
        setTimeout(() => codeTag.classList.remove("added"), 800);
      });

      imageWrap.appendChild(codeTag);
      imageWrap.appendChild(img);

      figure.appendChild(imageWrap);
      figure.appendChild(caption);
      gallery.appendChild(figure);
    });
  } catch (err) {
    console.error(err);
    const errEl       = document.createElement("div");
    errEl.className   = "project-load-error";
    errEl.setAttribute("role", "alert");
    errEl.innerHTML   =
      "<p>This project could not be loaded.</p>" +
      "<p>Please <button class=\"project-reload-btn\" onclick=\"window.location.reload()\">reload the page</button> or return to <a href=\"projects.html\">Projects</a>.</p>";
    gallery.appendChild(errEl);
  }

  const images = [...document.querySelectorAll(".project-gallery img")];
  if (!images.length) return;

  /* â”€â”€ Transparent protection overlays â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  addImageProtectionOverlays(gallery);

  /* â”€â”€ Floating project title â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  initFloatingTitle(projectTitle, images);

  /* â”€â”€ Next project section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const contentEl = document.querySelector(".project-content");
  if (contentEl) appendNextProject(contentEl, projectSlug);

  enableForwardPreload(images, projectSlug);
  enableDecodeFade(images);
  bindProjectLightbox();
}

/* =========================
   SUPPORT RUNNERS
========================= */

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

function runShopInit() {
  if (typeof window.initShopPage === "function") {
    window.initShopPage();
  }
}

/* =========================
   PJAX INFRASTRUCTURE
========================= */

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
      const link   = document.createElement("link");
      link.rel     = "stylesheet";
      link.href    = href;
      link.onload  = resolve;
      link.onerror = resolve;
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
      const script   = document.createElement("script");
      script.src     = src;
      script.onload  = resolve;
      script.onerror = reject;
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
  // Only sync #lightbox; slide indicator has been removed entirely
  const optionalSelectors = ["#lightbox"];

  optionalSelectors.forEach((selector) => {
    const incoming = doc.querySelector(selector);
    const current  = document.querySelector(selector);

    if (incoming && current) {
      current.replaceWith(incoming.cloneNode(true));
      return;
    }

    if (incoming && !current) {
      document.body.appendChild(incoming.cloneNode(true));
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

    await ensurePageStyles(doc);
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
  initImageProtection();    // global once; PJAX-safe
  runProjectsInit();
  await initProjectPage();
  runSlideshowInit();
  runShopInit();
  initFullscreenLightboxSync();
  initPjaxNavigation();
}

/* =========================
   PRELOAD + DECODE FADE
========================= */

function enableForwardPreload(images, projectSlug) {
  if (!images.length) return;

  const preloaded = new Set();

  const preloadImage = (index) => {
    if (index >= images.length) return;
    if (preloaded.has(index)) return;

    const src = images[index].getAttribute("src");
    if (!src) return;

    const img = new Image();
    img.decoding = "async";
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

/* =========================
   ENTRY POINT
========================= */

window.loadPage = loadPage;
document.addEventListener("DOMContentLoaded", initPage);













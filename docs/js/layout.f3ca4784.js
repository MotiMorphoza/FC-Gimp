/* =========================
   SIDEBAR LOADER
========================= */

async function loadSidebar() {
  const placeholder = document.querySelector("[data-sidebar]");
  if (!placeholder) return;

  try {
    const res = await fetch("/MotoSynteza/partials/sidebar.html", { credentials: "same-origin" });
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

async function initProjectPage() {
  const gallery = document.querySelector(".project-gallery");
  if (!gallery) return;

  gallery.innerHTML = "";

  const projectSlug = document.body.dataset.project;
  if (!projectSlug) return;

  try {
    const res = await fetch(`projects/${projectSlug}/project.json`, { credentials: "same-origin" });
    if (!res.ok) throw new Error("Project JSON not found");

    const data = await res.json();

    data.images.forEach((imgData) => {
      const figure = document.createElement("figure");
      figure.className = "project-figure";

      const caption = document.createElement("div");
      caption.className = "project-caption";
      caption.textContent = imgData.caption || "";

      const img = document.createElement("img");
      img.src = `projects/${projectSlug}/${imgData.src}`;
      img.loading = "lazy";

      figure.appendChild(caption);
      figure.appendChild(img);
      gallery.appendChild(figure);
    });
  } catch (err) {
    console.error(err);
  }

  const images = [...document.querySelectorAll(".project-gallery img")];
  if (!images.length) return;

  const indicator = document.getElementById("slideIndicator");
  if (indicator) {
    indicator.textContent = `1 / ${images.length}`;
  }

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox?.querySelector("img");
  const closeBtn = lightbox?.querySelector(".lightbox-close");

  if (lightbox && lightboxImg) {
    images.forEach((img) => {
      img.addEventListener("click", () => {
        lightboxImg.src = img.src;
        lightbox.classList.add("active");
      });
    });

    lightbox.addEventListener("click", () => {
      lightbox.classList.remove("active");
    });

    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      lightbox.classList.remove("active");
    });
  }
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
    fade = document.createElement("div");
    fade.id = "pageFade";
    document.body.appendChild(fade);
  }

  return fade;
}

async function ensurePageScripts(doc) {
  const scripts = [...doc.querySelectorAll("script[src]")]
    .map((script) => script.getAttribute("src"))
    .filter(Boolean)
    .filter((src) => !src.includes("layout.js"));

  for (const src of scripts) {
    if (document.querySelector(`script[src="${src}"]`)) continue;

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
}

function syncBodyState(doc) {
  if (!doc?.body) return;

  document.body.className = doc.body.className;

  const { page, project } = doc.body.dataset;

  if (page) {
    document.body.dataset.page = page;
  } else {
    delete document.body.dataset.page;
  }

  if (project) {
    document.body.dataset.project = project;
  } else {
    delete document.body.dataset.project;
  }
}

async function loadPage(url, push = true) {
  const fade = ensureFadeOverlay();

  try {
    fade.classList.add("active");
    await new Promise((r) => setTimeout(r, 300));

    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("PJAX fetch failed");

    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const newContent = doc.querySelector(".content-pane");
    const currentContent = document.querySelector(".content-pane");
    const newSidebar = doc.querySelector("[data-sidebar]");
    const currentSidebar = document.querySelector("[data-sidebar]");

    if (!newContent || !currentContent || !newSidebar || !currentSidebar) {
      throw new Error("PJAX shell missing");
    }

    syncBodyState(doc);
    currentSidebar.replaceWith(newSidebar);
    currentContent.replaceWith(newContent);

    const landingOverlay = document.getElementById("landing-overlay");
    if (landingOverlay && doc.getElementById("landing-overlay") === null) {
      landingOverlay.remove();
    }

    if (doc.title) document.title = doc.title;
    if (push) history.pushState({}, "", url);

    await ensurePageScripts(doc);
    await initPage();

    await new Promise((r) => setTimeout(r, 50));
    fade.classList.remove("active");
  } catch (err) {
    window.location.href = url;
  }
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
    if (url.pathname === location.pathname && url.search === location.search) return;

    e.preventDefault();
    loadPage(`${url.pathname}${url.search}${url.hash}`);
  });

  window.addEventListener("popstate", () => {
    loadPage(`${location.pathname}${location.search}${location.hash}`, false);
  });
}

async function initPage() {
  ensureFadeOverlay();
  await loadSidebar();
  runProjectsInit();
  await initProjectPage();
  runSlideshowInit();
  initPjaxNavigation();
}

window.loadPage = loadPage;
document.addEventListener("DOMContentLoaded", initPage);

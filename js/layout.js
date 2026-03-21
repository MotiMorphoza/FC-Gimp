







/* ==============================
   layout.js  –  MotoSynteza (v4)
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
    const menu = placeholder.querySelector(".menu");
    const fullscreenButtons = placeholder.querySelectorAll("[data-fullscreen-toggle]");

    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        menu.classList.toggle("open");
      });
    }

    fullscreenButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        await toggleFullscreenMode();
        menu?.classList.remove("open");
      });
    });

    bindSidebarSearch(placeholder);
    syncActiveSidebarLink(placeholder);
    syncSidebarSearchState(placeholder);
    updateFullscreenToggleState(placeholder);
  } catch (err) {
    console.error("Sidebar error:", err);
  }
}

function getSearchQueryFromLocation() {
  const url = new URL(window.location.href);
  return url.searchParams.get("q") || "";
}

function setSidebarSearchValue(value, scope = document) {
  const normalized = String(value || "");
  const inputs = scope.querySelectorAll("[data-sidebar-search-input]");

  inputs.forEach((input) => {
    if (input.value !== normalized) {
      input.value = normalized;
    }
  });
}

function buildSearchPageUrl(query = "") {
  const url = new URL("search.html", window.location.href);
  const normalized = String(query || "").trim();

  if (normalized) {
    url.searchParams.set("q", normalized);
  } else {
    url.searchParams.delete("q");
  }

  url.searchParams.delete("tag");

  return `${url.pathname}${url.search}${url.hash}`;
}

function syncSidebarSearchState(scope = document) {
  const isSearchPage =
    String(document.body?.dataset?.page || "").trim() === "search" ||
    /\/search\.html$/i.test(window.location.pathname);

  scope.querySelectorAll("[data-sidebar-search-trigger]").forEach((button) => {
    button.dataset.active = isSearchPage ? "true" : "false";
  });

  setSidebarSearchValue(getSearchQueryFromLocation(), scope);
}

function navigateToSearchPage(query = "", menu = null) {
  const target = buildSearchPageUrl(query);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const isSearchPage = String(document.body?.dataset?.page || "").trim() === "search";

  menu?.classList.remove("open");

  if (isSearchPage && typeof window.updateSearchPageQuery === "function") {
    window.updateSearchPageQuery(query);
    return;
  }

  if (target === current) {
    if (typeof window.initSearchPage === "function") {
      window.initSearchPage();
    }
    return;
  }

  if (typeof window.loadPage === "function") {
    loadPage(target);
    return;
  }

  window.location.href = target;
}

function bindSidebarSearch(scope = document) {
  if (scope.dataset.sidebarSearchBound === "true") return;

  const menu = scope.querySelector(".menu");
  const forms = scope.querySelectorAll("[data-sidebar-search-form]");
  const buttons = scope.querySelectorAll("[data-sidebar-search-trigger]");
  const inputs = scope.querySelectorAll("[data-sidebar-search-input]");

  const getQuery = () => scope.querySelector("[data-sidebar-search-input]")?.value || "";
  const isSearchPage = () => String(document.body?.dataset?.page || "").trim() === "search";

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      setSidebarSearchValue(input.value, scope);

      if (isSearchPage() && typeof window.scheduleSearchPageQueryUpdate === "function") {
        window.scheduleSearchPageQueryUpdate(input.value);
      }
    });
  });

  forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      navigateToSearchPage(getQuery(), menu);
    });
  });

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      navigateToSearchPage(getQuery(), menu);
    });
  });

  scope.dataset.sidebarSearchBound = "true";
}

function getActiveNavKey() {
  const page = document.body?.dataset?.page?.trim();
  if (page) {
    if (page === "landing") return "home";
    if (page === "project") return "projects";
    if (page === "search") return "";
    return page;
  }

  const pathname = window.location.pathname.toLowerCase();
  const fileName = pathname.split("/").pop() || "";

  if (!fileName || fileName === "index.html" || fileName === "main.html") return "home";
  if (fileName === "project.html" || fileName.startsWith("project-") || pathname.includes("/projects/")) return "projects";
  if (fileName === "projects.html") return "projects";
  if (fileName === "search.html") return "";
  if (fileName === "about.html") return "about";
  if (fileName === "shop.html") return "shop";
  if (fileName === "more.html") return "more";

  return "";
}

function syncActiveSidebarLink(scope = document) {
  const activeNavKey = getActiveNavKey();
  const links = scope.querySelectorAll(".menu a[data-nav]");

  links.forEach((link) => {
    if (link.dataset.nav === activeNavKey) {
      link.setAttribute("aria-current", "page");
      return;
    }

    link.removeAttribute("aria-current");
  });
}

function updateFullscreenToggleState(scope = document) {
  const buttons = scope.querySelectorAll("[data-fullscreen-toggle]");
  const isFullscreen = Boolean(document.fullscreenElement);

  buttons.forEach((button) => {
    button.textContent = isFullscreen ? "Exit Full Screen" : "Full Screen";
    button.setAttribute("aria-label", isFullscreen ? "Exit full screen" : "Enter full screen");
  });
}

async function toggleFullscreenMode() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  } catch {
      // Ignore browsers that reject fullscreen.
  }
}
/* =========================
   PROJECT LOADER (JSON)
========================= */

function getSlugFromURL(url = window.location.href) {
  const parsed      = new URL(url, window.location.origin);
  const fromQuery   = parsed.searchParams.get("project");
  if (fromQuery) return fromQuery;

  const fileName = parsed.pathname.split("/").pop() || "";
  const staticMatch = fileName.match(/^project-(.+)\.html$/i);
  if (staticMatch?.[1]) {
    return decodeURIComponent(staticMatch[1]);
  }

  const parts        = parsed.pathname.split("/").filter(Boolean);
  const projectsIndex = parts.indexOf("projects");

  if (projectsIndex !== -1 && parts[projectsIndex + 1]) {
    return decodeURIComponent(parts[projectsIndex + 1]);
  }

  return "";
}

function getProjectImageAlt(projectTitle, imgData, index, semanticMeta = null) {
  const explicitAlt = typeof imgData?.alt === "string" ? imgData.alt.trim() : "";
  if (explicitAlt) return explicitAlt;

  const semanticAlt = typeof semanticMeta?.finalAlt === "string" ? semanticMeta.finalAlt.trim() : "";
  if (semanticAlt) return semanticAlt;

  return `${projectTitle} - image ${index + 1}`;
}

const PROJECT_SEMANTIC_VISUAL_HINTS = [
  "bench", "bird", "blur", "bottle", "building", "cat", "chair", "chimney", "coat",
  "cross", "cyclist", "dog", "duck", "egg", "face", "flag", "flower", "glove", "hand",
  "mask", "nun", "panel", "phone", "pigeon", "reflection", "shadow", "sign", "silhouette",
  "smoke", "snow", "statue", "stroller", "tram", "tree", "umbrella", "vendor", "window"
];

const PROJECT_GENERIC_VISUAL_TERMS = new Set([
  "architecture", "city", "color", "daylight", "daytime", "people", "park",
  "street", "urban", "water edge", "winter"
]);

const PROJECT_MOTIF_LABELS = new Map([
  ["bird", "Birds"],
  ["bike", "Bicycles"],
  ["bottle", "Bottles"],
  ["cat", "Cats"],
  ["chair", "Chairs"],
  ["chimney", "Chimneys"],
  ["cross", "Crosses"],
  ["dog", "Dogs"],
  ["duck", "Birds"],
  ["egg", "Broken eggs"],
  ["flag", "Flags"],
  ["flower", "Flowers"],
  ["glove", "Discarded objects"],
  ["hand", "Hands"],
  ["mask", "Masks"],
  ["phone", "Phones"],
  ["pigeon", "Birds"],
  ["reflection", "Reflections"],
  ["shadow", "Shadows"],
  ["sign", "Signs"],
  ["snow", "Snow"],
  ["statue", "Statues"],
  ["stroller", "Strollers"],
  ["tram", "Trams"],
  ["tree", "Trees"],
  ["umbrella", "Umbrellas"],
  ["window", "Windows"]
]);

const PROJECT_CONCEPT_REWRITES = new Map([
  ["alienation", "holding distance and human detachment in view"],
  ["authority", "testing how power appears in public space"],
  ["connection", "searching for brief links between separate lives"],
  ["everyday symbolism", "letting ordinary scenes lean toward symbol"],
  ["humor", "finding wit in the smallest urban collisions"],
  ["loneliness", "holding solitude against the public scene"],
  ["movement", "letting motion unsettle the scene"],
  ["nature", "letting nature interrupt the built world"],
  ["observation", "staying with distance, watching, and pause"],
  ["poetic", "keeping a poetic drift inside the image"],
  ["public space", "treating public space as a charged stage"],
  ["reflection", "letting doubled views disturb the surface"],
  ["reflections", "letting doubled views disturb the surface"],
  ["solitude", "holding solitude against the public scene"],
  ["surreal", "nudging the ordinary toward the surreal"],
  ["surveillance", "keeping watchfulness inside the picture"],
  ["time", "turning small moments into a study of passing time"],
  ["urban absurdity", "finding absurdity inside ordinary public space"],
  ["urban nature", "letting nature press back into the city"],
  ["vulnerability", "keeping fragility close to the frame"]
]);

const PROJECT_CONCEPT_LABELS = new Map([
  ["alienation", "urban detachment"],
  ["authority", "public power"],
  ["beauty", "everyday beauty"],
  ["connection", "human connection"],
  ["daily life", "daily life"],
  ["everyday symbolism", "everyday symbolism"],
  ["freedom", "small freedoms"],
  ["humor", "urban humor"],
  ["identity", "shifting identity"],
  ["loneliness", "urban loneliness"],
  ["modern life", "modern life"],
  ["movement", "restless motion"],
  ["nature", "nature in the city"],
  ["observation", "watchful observation"],
  ["ordinary life", "ordinary public life"],
  ["pattern", "visual repetition"],
  ["poetic", "poetic drift"],
  ["politics", "civic tension"],
  ["public space", "public space"],
  ["rain", "weather-soaked streets"],
  ["reflection", "reflections"],
  ["reflections", "reflections"],
  ["society", "social order"],
  ["solitude", "public solitude"],
  ["surreal", "surreal street moments"],
  ["surveillance", "watchfulness"],
  ["technology", "daily technology"],
  ["time", "passing time"],
  ["urban absurdity", "urban absurdity"],
  ["urban nature", "urban nature"],
  ["vulnerability", "small fragility"]
]);

const PROJECT_TONE_LABELS = new Map([
  ["alienation", "detached"],
  ["authority", "tense"],
  ["beauty", "lyrical"],
  ["connection", "tender"],
  ["humor", "wry"],
  ["loneliness", "quiet"],
  ["movement", "restless"],
  ["nature", "calm"],
  ["observation", "watchful"],
  ["poetic", "poetic"],
  ["politics", "charged"],
  ["public space", "watchful"],
  ["rain", "muted"],
  ["reflection", "reflective"],
  ["reflections", "reflective"],
  ["solitude", "quiet"],
  ["surreal", "offbeat"],
  ["surveillance", "uneasy"],
  ["time", "contemplative"],
  ["urban absurdity", "offbeat"],
  ["vulnerability", "fragile"]
]);

function uniqueProjectStrings(items = []) {
  return [...new Set(
    items
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  )];
}

function normalizeProjectTerm(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeProjectStem(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "");
}

function capitalizeProjectText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ensureProjectSentence(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function countProjectTerm(map, value, weight = 1) {
  const normalized = normalizeProjectTerm(value);
  if (!normalized) return;
  map.set(normalized, (map.get(normalized) || 0) + weight);
}

function sortedProjectTerms(map) {
  return [...map.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function isLiteralProjectPrimary(term) {
  const normalized = normalizeProjectTerm(term);
  if (!normalized || normalized.includes(" versus ") || normalized.includes(" vs ")) return false;
  return PROJECT_SEMANTIC_VISUAL_HINTS.some((hint) => normalized.includes(hint));
}

function getLiteralProjectPrimary(meta = {}) {
  return uniqueProjectStrings((meta.primary || []).filter((term) => isLiteralProjectPrimary(term)));
}

function humanizeProjectMotif(term) {
  const normalized = normalizeProjectTerm(term);
  return PROJECT_MOTIF_LABELS.get(normalized) || capitalizeProjectText(term);
}

function isWeakProjectMotif(term) {
  const normalized = normalizeProjectTerm(term);
  return !normalized || PROJECT_GENERIC_VISUAL_TERMS.has(normalized) || PROJECT_CONCEPT_LABELS.has(normalized);
}

function rewriteProjectConcept(term) {
  const raw = String(term || "").trim();
  const normalized = normalizeProjectTerm(raw);
  if (!normalized) return "";

  const versusMatch = normalized.match(/^(.+?)\s+versus\s+(.+)$/i) || normalized.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (versusMatch) {
    return `holding ${versusMatch[1]} and ${versusMatch[2]} in the same frame`;
  }

  if (PROJECT_CONCEPT_REWRITES.has(normalized)) {
    return PROJECT_CONCEPT_REWRITES.get(normalized);
  }

  if (normalized.includes("absurd")) return "finding absurdity inside the everyday scene";
  if (normalized.includes("symbol")) return "letting ordinary details carry symbolic weight";
  if (normalized.includes("surveillance")) return "keeping watchfulness inside the image";
  if (normalized.includes("solitude") || normalized.includes("loneliness")) return "holding solitude against the public scene";
  if (normalized.includes("nature")) return "letting nature interrupt the built world";
  if (normalized.includes("movement")) return "letting motion unsettle the scene";
  if (normalized.includes("reflection")) return "letting doubled views disturb the surface";

  return "";
}

function countProjectWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function hasProjectTerms(meta = {}, terms = []) {
  const haystack = uniqueProjectStrings([
    ...(meta.primary || []),
    ...(meta.objects || []),
    ...(meta.environment || []),
    ...(meta.mood || []),
    ...(meta.themes || []),
    ...(meta.tension || [])
  ]).map((item) => normalizeProjectTerm(item));

  return terms.some((term) => haystack.includes(normalizeProjectTerm(term)));
}

function getProjectConceptLabel(term) {
  const normalized = normalizeProjectTerm(term);
  if (!normalized) return "";
  if (PROJECT_CONCEPT_LABELS.has(normalized)) return PROJECT_CONCEPT_LABELS.get(normalized);
  if (normalized.includes("loneliness") || normalized.includes("solitude")) return "urban loneliness";
  if (normalized.includes("reflection")) return "reflections";
  if (normalized.includes("surveillance")) return "watchfulness";
  if (normalized.includes("nature")) return "urban nature";
  if (normalized.includes("movement")) return "restless motion";
  if (normalized.includes("absurd")) return "urban absurdity";
  return normalized;
}

function getProjectToneLabel(term) {
  const normalized = normalizeProjectTerm(term);
  if (!normalized) return "";
  if (PROJECT_TONE_LABELS.has(normalized)) return PROJECT_TONE_LABELS.get(normalized);
  if (normalized.includes("loneliness") || normalized.includes("solitude")) return "quiet";
  if (normalized.includes("surveillance")) return "uneasy";
  if (normalized.includes("reflection")) return "reflective";
  if (normalized.includes("humor") || normalized.includes("absurd")) return "offbeat";
  return "";
}

function buildProjectIntentQualifier(meta = {}) {
  const urbanish = hasProjectTerms(meta, [
    "city", "street", "urban", "building", "window", "public space", "public square", "tram"
  ]);

  if (hasProjectTerms(meta, ["loneliness", "solitude", "alienation"])) {
    return urbanish ? "urban loneliness scene" : "quiet solitude scene";
  }

  if (hasProjectTerms(meta, ["observation", "surveillance"])) {
    return urbanish ? "street observation scene" : "watchful scene";
  }

  if (hasProjectTerms(meta, ["reflection", "reflections"])) {
    return urbanish ? "reflective city scene" : "reflective scene";
  }

  if (hasProjectTerms(meta, ["authority", "politics", "public space", "society"])) {
    return "public tension scene";
  }

  if (hasProjectTerms(meta, ["surreal", "urban absurdity", "everyday symbolism"])) {
    return urbanish ? "surreal street scene" : "offbeat scene";
  }

  if (hasProjectTerms(meta, ["nature", "urban nature", "freedom"])) {
    return urbanish ? "urban nature scene" : "quiet nature scene";
  }

  if (hasProjectTerms(meta, ["movement", "time"])) {
    return urbanish ? "fleeting city scene" : "moment-in-passing scene";
  }

  if (hasProjectTerms(meta, ["rain"])) {
    return "rainy street scene";
  }

  return "";
}

function appendProjectIntentQualifier(baseSentence, qualifier) {
  const base = String(baseSentence || "").trim().replace(/[.!?]+$/g, "");
  const suffix = String(qualifier || "").trim();
  if (!base || !suffix) return ensureProjectSentence(baseSentence);

  const combined = `${base}, ${suffix}`;
  if (countProjectWords(combined) > 18) {
    return ensureProjectSentence(base);
  }

  return ensureProjectSentence(combined);
}

function buildProjectRelatedAnchorText(title = "", sharedMotif = "", sharedConcept = "") {
  const conceptLabel = getProjectConceptLabel(sharedConcept);
  if (conceptLabel) {
    return `${conceptLabel.replace(/\b\w/g, (char) => char.toUpperCase())} series – ${title}`;
  }

  if (sharedMotif) {
    return `${humanizeProjectMotif(sharedMotif)} series – ${title}`;
  }

  return `Related gallery – ${title}`;
}

function buildProjectAltFallback(projectTitle, semanticMeta = {}, index = 0) {
  const primary = getLiteralProjectPrimary(semanticMeta)[0] || "";
  const objects = uniqueProjectStrings(semanticMeta.objects || []).filter((term) => !PROJECT_GENERIC_VISUAL_TERMS.has(normalizeProjectTerm(term)));
  const environment = uniqueProjectStrings(semanticMeta.environment || []).filter((term) => !PROJECT_GENERIC_VISUAL_TERMS.has(normalizeProjectTerm(term)));
  const colors = uniqueProjectStrings(semanticMeta.colors || []);
  const lighting = uniqueProjectStrings(semanticMeta.lighting || []);
  const qualifier = buildProjectIntentQualifier(semanticMeta);

  const subject = primary || (objects.length >= 2 ? `${objects[0]} and ${objects[1]}` : objects[0]) || "";
  const env = environment[0] || "";
  const color = colors[0] || "";
  const light = lighting[0] || "";

  if (subject && env && light) return appendProjectIntentQualifier(`${capitalizeProjectText(subject)} in ${env} under ${light}`, qualifier);
  if (subject && env && color) return appendProjectIntentQualifier(`${capitalizeProjectText(subject)} in ${color} tones against ${env}`, qualifier);
  if (subject && env) return appendProjectIntentQualifier(`${capitalizeProjectText(subject)} in ${env}`, qualifier);
  if (subject && light) return appendProjectIntentQualifier(`${capitalizeProjectText(subject)} in ${light}`, qualifier);
  if (subject) return appendProjectIntentQualifier(`${capitalizeProjectText(subject)} photographed in the gallery`, qualifier);

  return `${projectTitle} - image ${index + 1}`;
}

async function loadImageSearchDataset() {
  if (window.__IMAGE_SEARCH_DATASET__) return window.__IMAGE_SEARCH_DATASET__;
  if (window.__IMAGE_SEARCH_DATASET_PROMISE__) return window.__IMAGE_SEARCH_DATASET_PROMISE__;

  const version = window.__BUILD_VERSION__ || Date.now();
  const candidates = [
    `data/images-search.generated.json?v=${version}`,
    `data/images.json?v=${version}`
  ];

  window.__IMAGE_SEARCH_DATASET_PROMISE__ = (async () => {
    for (const url of candidates) {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) continue;
        const data = await res.json();
        if (!Array.isArray(data)) continue;
        window.__IMAGE_SEARCH_DATASET__ = data;
        return data;
      } catch (_error) {
        // Try the next candidate.
      }
    }

    window.__IMAGE_SEARCH_DATASET__ = [];
    return [];
  })();

  return window.__IMAGE_SEARCH_DATASET_PROMISE__;
}

function buildProjectSemanticState(projectData, dataset = []) {
  const bySrc = new Map();
  const entries = [];
  const byId = new Map();

  dataset.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    if (entry.id) byId.set(entry.id, entry);
    if (entry.projectSlug !== projectData.slug) return;
    bySrc.set(normalizeProjectStem(entry.src), entry);
    entries.push(entry);
  });

  const imageMetaBySrc = new Map();

  projectData.images.forEach((image, index) => {
    const semanticMeta = bySrc.get(normalizeProjectStem(image.src)) || {};
    const finalAlt = String(image.alt || "").trim() || buildProjectAltFallback(projectData.title, semanticMeta, index);

    imageMetaBySrc.set(normalizeProjectStem(image.src), {
      finalAlt,
      entry: semanticMeta
    });
  });

  const motifCounts = new Map();
  const conceptCounts = new Map();
  entries.forEach((entry) => {
    getLiteralProjectPrimary(entry).forEach((term) => countProjectTerm(motifCounts, term, 3));
    (entry.objects || []).forEach((term) => countProjectTerm(motifCounts, term, 4));
    (entry.environment || [])
      .filter((term) => !PROJECT_GENERIC_VISUAL_TERMS.has(normalizeProjectTerm(term)))
      .forEach((term) => {
        countProjectTerm(motifCounts, term, 1);
      });
    (entry.tension || []).forEach((term) => countProjectTerm(conceptCounts, term, 4));
    (entry.themes || []).forEach((term) => countProjectTerm(conceptCounts, term, 2));
    (entry.mood || []).forEach((term) => countProjectTerm(conceptCounts, term, 1));
  });

  const topMotif = sortedProjectTerms(motifCounts).find(([term]) => !isWeakProjectMotif(term))?.[0] || "";
  const topConceptTerm = sortedProjectTerms(conceptCounts).map(([term]) => term).find(Boolean) || "";
  const topConcept = rewriteProjectConcept(topConceptTerm);
  const topConceptLabel = getProjectConceptLabel(topConceptTerm);
  const leadSeed = String(projectData.slug || projectData.title || "").length % 3;
  let lead = "";

  if (topMotif && topConcept) {
    const motifLabel = humanizeProjectMotif(topMotif);
    if (leadSeed === 0) lead = ensureProjectSentence(`${motifLabel} return throughout the gallery, ${topConcept}`);
    else if (leadSeed === 1) lead = ensureProjectSentence(`${motifLabel} thread through these images, ${topConcept}`);
    else lead = ensureProjectSentence(`${motifLabel} give the sequence its pulse, ${topConcept}`);
  } else if (topMotif) {
    const motifLabel = humanizeProjectMotif(topMotif);
    if (leadSeed === 0) lead = ensureProjectSentence(`${motifLabel} return as a quiet visual thread through the gallery`);
    else if (leadSeed === 1) lead = ensureProjectSentence(`${motifLabel} keep the gallery grounded in a steady visual rhythm`);
    else lead = ensureProjectSentence(`${motifLabel} give the gallery a recurring visual anchor`);
  } else if (topConceptLabel) {
    if (leadSeed === 0) lead = ensureProjectSentence(`The gallery moves gently through scenes of ${topConceptLabel}`);
    else if (leadSeed === 1) lead = ensureProjectSentence(`The sequence stays close to moments of ${topConceptLabel}`);
    else lead = ensureProjectSentence(`The gallery keeps its attention on small signs of ${topConceptLabel}`);
  }

  const galleryLookup = new Map((window.__PROJECTS__ || []).map((project) => [project.slug, project]));
  const relatedWeights = new Map();

  entries.forEach((entry) => {
    (entry.related || []).forEach((relatedId) => {
      const relatedEntry = byId.get(relatedId) || dataset.find((item) => item?.id === relatedId);
      if (!relatedEntry || relatedEntry.projectSlug === projectData.slug) return;
      if (!galleryLookup.has(relatedEntry.projectSlug)) return;
      relatedWeights.set(
        relatedEntry.projectSlug,
        (relatedWeights.get(relatedEntry.projectSlug) || 0) + 1
      );
    });
  });

  const relatedLinks = [...relatedWeights.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([slug]) => {
      const targetProject = galleryLookup.get(slug);
      const targetEntries = dataset.filter((item) => item?.projectSlug === slug);
      const sharedMotifSet = new Set(
        entries.flatMap((entry) => uniqueProjectStrings([...(entry.objects || []), ...getLiteralProjectPrimary(entry)]))
          .map(normalizeProjectTerm)
          .filter((term) => term && !isWeakProjectMotif(term))
      );
      const sharedMotif = targetEntries
        .flatMap((entry) => uniqueProjectStrings([...(entry.objects || []), ...getLiteralProjectPrimary(entry)]))
        .find((term) => !isWeakProjectMotif(term) && sharedMotifSet.has(normalizeProjectTerm(term)));
      const sharedConceptSet = new Set(
        entries.flatMap((entry) => [...(entry.tension || []), ...(entry.themes || [])]).map(normalizeProjectTerm)
      );
      const sharedConceptRaw = targetEntries
        .flatMap((entry) => [...(entry.tension || []), ...(entry.themes || [])])
        .find((term) => sharedConceptSet.has(normalizeProjectTerm(term)));
      const sharedConcept = String(sharedConceptRaw || "").trim();

      let context = "A nearby gallery with a related visual tension.";
      if (sharedMotif && sharedConcept) {
        context = ensureProjectSentence(`Another gallery where ${humanizeProjectMotif(sharedMotif).toLowerCase()} carry a similar ${getProjectConceptLabel(sharedConcept)} charge`);
      } else if (sharedMotif) {
        context = ensureProjectSentence(`Another gallery shaped by ${humanizeProjectMotif(sharedMotif).toLowerCase()}`);
      } else if (sharedConcept) {
        context = ensureProjectSentence(`Another gallery drawn toward ${getProjectConceptLabel(sharedConcept)}`);
      }

      return {
        slug,
        title: targetProject?.title || slug,
        href: `project-${encodeURIComponent(slug)}.html`,
        anchorText: buildProjectRelatedAnchorText(targetProject?.title || slug, sharedMotif, sharedConcept),
        context
      };
    });

  return {
    lead,
    relatedLinks,
    imageMetaBySrc
  };
}

function renderProjectContext(contextEl, projectData) {
  if (!contextEl) return;
  contextEl.innerHTML = "";

  const title = document.createElement("h1");
  title.className = "project-context-title";
  title.textContent = projectData.title || "";
  contextEl.appendChild(title);
}

function renderProjectCaption(captionEl, text = "") {
  captionEl.innerHTML = "";
  const normalized = String(text || "").trim();
  if (!normalized) return;

  const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    captionEl.textContent = normalized;
    return;
  }

  lines.forEach((lineText, lineIndex) => {
    const p = document.createElement("p");
    p.className = lineIndex > 0 ? "project-caption-line project-caption-line--enter" : "project-caption-line";
    p.textContent = lineText;
    captionEl.appendChild(p);
  });
}

function createProjectFigure(projectData, imgData, index, semanticMeta = null) {
  const total = projectData.images.length;
  const prefix =
    typeof projectData.codePrefix === "string" && projectData.codePrefix.trim()
      ? projectData.codePrefix.trim().toUpperCase()
      : projectData.slug.split("-").map((segment) => segment[0]?.toUpperCase()).join("");
  const padWidth = Math.max(3, String(total).length);
  const number = String(total - index).padStart(padWidth, "0");
  const code = `${prefix}-${number}`;

  const figure = document.createElement("figure");
  figure.className = "project-figure";

  const imageWrap = document.createElement("div");
  imageWrap.className = "project-image-wrapper";

  const codeTag = document.createElement("div");
  codeTag.className = "image-code project-image-code";
  codeTag.dataset.code = code;
  codeTag.appendChild(document.createTextNode(code));

  const addHint = document.createElement("span");
  addHint.className = "add-to-cart-hint";
  addHint.textContent = "ADD TO CART";
  codeTag.appendChild(addHint);

  const img = document.createElement("img");
  img.src = `projects/${projectData.slug}/${imgData.src}`;
  img.alt = getProjectImageAlt(projectData.title, imgData, index, semanticMeta);
  img.loading = index === 0 ? "eager" : "lazy";
  if (index === 0) img.setAttribute("fetchpriority", "high");
  img.decoding = "async";

  const caption = document.createElement("figcaption");
  caption.className = "project-caption";
  const captionText = String(imgData.caption || "").trim();
  renderProjectCaption(caption, captionText);

  imageWrap.appendChild(codeTag);
  imageWrap.appendChild(img);

  figure.appendChild(imageWrap);
  figure.appendChild(caption);

  return figure;
}

function renderProjectGallery(gallery, projectData, semanticState = null) {
  if (!gallery) return;
  gallery.innerHTML = "";

  projectData.images.forEach((imgData, index) => {
    const semanticMeta = semanticState?.imageMetaBySrc?.get(normalizeProjectStem(imgData.src)) || null;
    gallery.appendChild(createProjectFigure(projectData, imgData, index, semanticMeta));
  });
}

function renderProjectRelatedLinks(relatedEl, relatedLinks = []) {
  if (!relatedEl) return;
  relatedEl.innerHTML = "";

  if (!relatedLinks.length) return;

  const label = document.createElement("p");
  label.className = "project-related-label";
  label.textContent = "Related Galleries";
  relatedEl.appendChild(label);

  relatedLinks.forEach((linkData) => {
    const link = document.createElement("a");
    link.className = "project-related-link";
    link.href = linkData.href;

    const title = document.createElement("span");
    title.className = "project-related-title";
    title.textContent = linkData.anchorText || linkData.title;

    const copy = document.createElement("span");
    copy.className = "project-related-copy";
    copy.textContent = linkData.context;

    link.appendChild(title);
    link.appendChild(copy);
    relatedEl.appendChild(link);
  });
}

function bindProjectCodeTags(gallery) {
  gallery.querySelectorAll(".project-image-code").forEach((codeTag) => {
    if (codeTag.dataset.bound === "true") return;

    codeTag.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const addToCart = window.motoAddToCartByCode;
      if (typeof addToCart !== "function") return;

      const thumb = codeTag
        .closest(".project-image-wrapper")
        ?.querySelector("img")
        ?.getAttribute("src") || "";
      const result = addToCart(codeTag.dataset.code, {
        sizeIdx: window.DEFAULT_SIZE_IDX,
        qty: 1,
        thumbnailUrl: thumb
      });
      if (!result?.ok) return;

      codeTag.classList.add("added");
      setTimeout(() => codeTag.classList.remove("added"), 800);
      showAddedToCartToast();
    });

    codeTag.dataset.bound = "true";
  });
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
  lightboxImg.alt = _lightboxState.images[_lightboxState.index].alt || "";
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
  if (lightboxImg) {
    lightboxImg.src = images[_lightboxState.index].src;
    lightboxImg.alt = images[_lightboxState.index].alt || "";
  }
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
   – Right-click disabled on gallery/lightbox images
   – Drag disabled
   – Toast on contextmenu
   – Transparent overlay per figure (mobile long-press reduction)
   – PJAX-safe: listeners attached once, globally
========================= */

function initImageProtection() {
  if (window.__IMAGE_PROTECTION_READY__) return;
  window.__IMAGE_PROTECTION_READY__ = true;

  /* ── Toast element ──────────────────────────────────────── */
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

  /* ── Right-click / contextmenu ──────────────────────────── */
  document.addEventListener("contextmenu", (e) => {
    const img = e.target.closest(".project-gallery img, .lightbox img");
    if (!img) return;
    e.preventDefault();
    showToast();
  });

  /* ── Drag prevention ────────────────────────────────────── */
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

function getCartCount() {
  try {
    const raw = localStorage.getItem("moto_cart_v2");
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return 0;
    return parsed.reduce((sum, item) => sum + Math.max(0, Number(item?.qty) || 0), 0);
  } catch (_e) {
    return 0;
  }
}

function shouldShowFloatingCartIndicator() {
  const page = String(document.body?.dataset?.page || "").toLowerCase();
  return page === "project" || page === "shop";
}

function updateFloatingCartIndicator() {
  const indicator = document.getElementById("floating-cart-indicator");
  if (!indicator) return;
  const allowed = shouldShowFloatingCartIndicator();
  indicator.hidden = !allowed;
  indicator.setAttribute("aria-hidden", allowed ? "false" : "true");
  if (!allowed) return;
  const count = getCartCount();
  indicator.textContent = `\u{1F6D2} ${count}`;
}

function ensureFloatingCartIndicator() {
  let indicator = document.getElementById("floating-cart-indicator");
  if (!indicator) {
    indicator = document.createElement("button");
    indicator.id = "floating-cart-indicator";
    indicator.className = "floating-cart-indicator";
    indicator.type = "button";
    indicator.setAttribute("aria-label", "Open cart");
    indicator.addEventListener("click", () => {
      if (typeof window.loadPage === "function") {
        window.loadPage("shop.html");
      } else {
        window.location.href = "shop.html";
      }
    });
    document.body.appendChild(indicator);
  }

  if (!window.__FLOATING_CART_BOUND__) {
    window.__FLOATING_CART_BOUND__ = true;
    window.addEventListener("storage", (e) => {
      if (!e || e.key === "moto_cart_v2") updateFloatingCartIndicator();
    });
    window.addEventListener("moto:cart-updated", () => updateFloatingCartIndicator());
  }

  updateFloatingCartIndicator();
}

function showAddedToCartToast() {
  let toast = document.getElementById("cart-add-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cart-add-toast";
    toast.className = "cart-add-toast";
    toast.textContent = "Added to cart";
    document.body.appendChild(toast);
  }
  toast.classList.add("is-visible");
  clearTimeout(window.__cartAddToastTimer);
  window.__cartAddToastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1000);
}

/* =========================
   FLOATING PROJECT TITLE
   – Fixed element positioned in the top gap area
   – Visible after the first image's centre scrolls out of view
   – Cleaned up on navigation away from project page
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
   * On mobile (≤700px), the body/page scrolls — .content-pane has height:auto
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
   – Appended to .project-content below the gallery
   – Uses window.__PROJECTS__ manifest; wraps last → first
   – Navigates via PJAX (window.loadPage)
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

  const href   = `project-${encodeURIComponent(next.slug)}.html`;
  const link   = document.createElement("a");
  link.href     = href;
  link.className = "next-project-link";

  const grid   = document.createElement("div");
  grid.className = "next-project-grid";
const img = document.createElement("img");
img.className = "next-project-media";
img.alt = next.coverAlt || next.title || "";
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
  if (document.body.dataset.page !== "project") {
    if (window.__FLOATING_TITLE_CLEANUP__) {
      window.__FLOATING_TITLE_CLEANUP__();
      window.__FLOATING_TITLE_CLEANUP__ = null;
    }
    return;
  }

  const contentEl = document.querySelector(".project-content");
  const contextEl = document.querySelector(".project-context");
  const gallery = document.querySelector(".project-gallery");
  const relatedEl = document.querySelector(".project-related-links");
  if (!gallery || !contentEl) return;

  const projectSlug = getSlugFromURL();
  if (projectSlug) document.body.dataset.project = projectSlug;
  if (!projectSlug) return;

  if (!Array.isArray(window.__PROJECTS__)) {
    try {
      const version = window.__BUILD_VERSION__ || Date.now();
      const res = await fetch(`js/projects-manifest.js?v=${version}`, {
        credentials: "same-origin"
      });
      if (res.ok) {
        const scriptText = await res.text();
        new Function(scriptText)();
      }
    } catch (_e) {
      // Manifest is optional for rendering. Only next/related navigation degrades.
    }
  }

  let projectTitle = contextEl?.querySelector(".project-context-title")?.textContent?.trim() || "";
  const hasSeededGallery = gallery.querySelector(".project-figure") !== null;
  const hasSeededContext = Boolean(contextEl?.children.length);

  if (!hasSeededGallery || !hasSeededContext) {
    try {
      const version = window.__BUILD_VERSION__ || Date.now();
      const [projectRes, dataset] = await Promise.all([
        fetch(`projects/${projectSlug}/project.json?v=${version}`, {
          credentials: "same-origin"
        }),
        loadImageSearchDataset()
      ]);

      if (!projectRes.ok) throw new Error("Project JSON not found");
      const data = await projectRes.json();
      data.slug = projectSlug;
      projectTitle = data.title || projectTitle;

      const semanticState = buildProjectSemanticState(data, dataset);

      renderProjectContext(contextEl, data);
      renderProjectGallery(gallery, data, semanticState);
      renderProjectRelatedLinks(relatedEl, semanticState.relatedLinks);
    } catch (err) {
      console.error(err);
      gallery.innerHTML = "";
      const errEl = document.createElement("div");
      errEl.className = "project-load-error";
      errEl.setAttribute("role", "alert");
      errEl.innerHTML =
        "<p>This project could not be loaded.</p>" +
        "<p>Please <button class=\"project-reload-btn\" onclick=\"window.location.reload()\">reload the page</button> or return to <a href=\"projects.html\">Projects</a>.</p>";
      gallery.appendChild(errEl);
    }
  }

  const images = [...document.querySelectorAll(".project-gallery img")];
  if (!images.length) return;

  addImageProtectionOverlays(gallery);
  bindProjectCodeTags(gallery);
  initFloatingTitle(projectTitle, images);
  appendNextProject(contentEl, projectSlug);
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

function runSearchInit() {
  if (typeof window.initSearchPage === "function") {
    window.initSearchPage();
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

function runMorphozaInit() {
  if (typeof window.initMorphozaPage === "function") {
    window.initMorphozaPage();
  }
}

function runHumanWritesStandaloneInit() {
  if (typeof window.initHumanWritesPage === "function") {
    window.initHumanWritesPage();
  }
}

function runMoreInit() {
  if (typeof window.initMorePage === "function") {
    window.initMorePage();
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
      return;
    }

    if (!incoming && current) {
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
    updateFullscreenToggleState(document);
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
  ensureFloatingCartIndicator();
  initImageProtection();    // global once; PJAX-safe
  runProjectsInit();
  runSearchInit();
  await initProjectPage();
  runSlideshowInit();
  runShopInit();
  runMorphozaInit();
  runHumanWritesStandaloneInit();
  runMoreInit();
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
window.setSidebarSearchValue = setSidebarSearchValue;
document.addEventListener("DOMContentLoaded", initPage);















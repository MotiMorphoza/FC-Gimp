const SEARCH_ARRAY_FIELDS = [
  "primary",
  "secondary",
  "noise",
  "objects",
  "environment",
  "style",
  "composition",
  "lighting",
  "colors",
  "mood",
  "themes",
  "symbols",
  "texture",
  "motion",
  "tone",
  "relations",
  "tension",
  "reading",
  "negative",
  "related"
];

const SEARCH_STRING_FIELDS = ["density", "pov", "manipulation", "alt", "caption", "projectTitle", "projectDescription"];
const FIELD_WEIGHTS = {
  primary: 5,
  secondary: 3,
  noise: 1
};

const SEARCH_STATE = {
  loadPromise: null,
  images: [],
  index: [],
  currentQuery: "",
  debounceTimer: null
};

function getTagHelpers() {
  return window.MotoSearchTags || {
    normalizeTerm: (value) => String(value || "").toLowerCase().trim(),
    stemTerm: (value) => String(value || "").toLowerCase().trim(),
    parseQuery: (query) => ({
      raw: query,
      normalized: String(query || "").trim().toLowerCase(),
      positive: [],
      negative: []
    })
  };
}

function normalizeArray(values) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
}

function normalizeImage(image, index) {
  const projectSlug = String(image?.projectSlug || "").trim();
  const src = String(image?.src || "").trim();
  const normalized = {
    id: String(image?.id || `img-${index + 1}`),
    projectSlug,
    projectTitle: String(image?.projectTitle || "").trim(),
    projectDescription: String(image?.projectDescription || "").trim(),
    projectUrl: String(image?.projectUrl || `project-${encodeURIComponent(projectSlug)}.html`).trim(),
    imageUrl: String(image?.imageUrl || (projectSlug && src ? `projects/${projectSlug}/${src}` : "")).trim(),
    src,
    alt: String(image?.alt || "").trim(),
    caption: String(image?.caption || "").trim(),
    projectIndex: Number.isFinite(image?.projectIndex) ? Number(image.projectIndex) : index,
    imageIndex: Number.isFinite(image?.imageIndex) ? Number(image.imageIndex) : index,
    intensity: image?.intensity && typeof image.intensity === "object" && !Array.isArray(image.intensity)
      ? { ...image.intensity }
      : {},
    score: image?.score && typeof image.score === "object" && !Array.isArray(image.score)
      ? { ...image.score }
      : {},
    density: String(image?.density || "").trim(),
    pov: String(image?.pov || "").trim(),
    manipulation: String(image?.manipulation || "").trim()
  };

  SEARCH_ARRAY_FIELDS.forEach((field) => {
    normalized[field] = normalizeArray(image?.[field]);
  });

  return normalized;
}

function createKeyTags(image) {
  return [...new Set([
    ...image.primary,
    ...image.objects,
    ...image.mood,
    ...image.themes,
    ...image.colors,
    ...image.secondary
  ])].slice(0, 6);
}

function indexImage(image, order) {
  const { normalizeTerm, stemTerm } = getTagHelpers();
  const fields = {};

  SEARCH_ARRAY_FIELDS.forEach((field) => {
    fields[field] = image[field]
      .map((value) => normalizeTerm(value))
      .filter(Boolean);
  });

  SEARCH_STRING_FIELDS.forEach((field) => {
    const normalized = normalizeTerm(image[field]);
    fields[field] = normalized ? [normalized] : [];
  });

  if (image.intensity && typeof image.intensity === "object") {
    fields.intensity = Object.entries(image.intensity)
      .map(([key, value]) => normalizeTerm(`${key} ${value}`))
      .filter(Boolean);
  } else {
    fields.intensity = [];
  }

  const searchableFieldNames = Object.keys(fields).filter((field) => field !== "negative");
  const allValues = searchableFieldNames.flatMap((field) => fields[field] || []);

  return {
    image,
    order,
    fields,
    allValues,
    stemmedValues: allValues.map((value) => stemTerm(value)),
    keyTags: createKeyTags(image)
  };
}

async function fetchSearchDataset() {
  const version = window.__BUILD_VERSION__ ? `?v=${encodeURIComponent(window.__BUILD_VERSION__)}` : "";
  const sources = [
    `data/images-search.generated.json${version}`,
    `data/images.json${version}`
  ];

  let lastError = null;

  for (const source of sources) {
    try {
      const response = await fetch(source, { credentials: "same-origin" });
      if (!response.ok) {
        lastError = new Error(`${source} returned HTTP ${response.status}`);
        continue;
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) {
        lastError = new Error(`${source} did not return an array`);
        continue;
      }

      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Image search dataset could not be loaded");
}

async function loadSearchIndex() {
  if (SEARCH_STATE.loadPromise) return SEARCH_STATE.loadPromise;

  SEARCH_STATE.loadPromise = (async () => {
    const payload = await fetchSearchDataset();
    SEARCH_STATE.images = payload.map((image, index) => normalizeImage(image, index));
    SEARCH_STATE.index = SEARCH_STATE.images.map((image, index) => indexImage(image, index));
    return SEARCH_STATE.index;
  })();

  return SEARCH_STATE.loadPromise;
}

function readSearchStateFromUrl() {
  const url = new URL(window.location.href);
  return {
    query: url.searchParams.get("q") || ""
  };
}

function writeSearchStateToUrl(state) {
  const url = new URL(window.location.href);
  const query = String(state?.query || "").trim();

  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }

  url.searchParams.delete("tag");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function matchValue(value, stemmedValue, variants, canonical) {
  return variants.some((variant) => {
    if (!variant) return false;
    return value === variant ||
      value.includes(variant) ||
      stemmedValue === variant ||
      stemmedValue.includes(variant) ||
      value.includes(canonical);
  });
}

function getPremiumBoost(indexedImage) {
  const score = indexedImage?.image?.score;
  if (!score || typeof score !== "object") return 0;

  const impact = Number(score.impact) || 0;
  const originality = Number(score.originality) || 0;
  const emotion = Number(score.emotion) || 0;
  if (!impact && !originality && !emotion) return 0;

  const weightedAverage = ((impact * 0.35) + (originality * 0.35) + (emotion * 0.3)) / 10;
  return weightedAverage * 1.5;
}

function scoreField(indexedImage, fieldName, termGroup) {
  const values = indexedImage.fields[fieldName] || [];
  if (!values.length) return { matched: false, score: 0 };

  const { stemTerm } = getTagHelpers();
  let score = 0;
  let matched = false;

  values.forEach((value) => {
    const stemmedValue = stemTerm(value);
    if (!matchValue(value, stemmedValue, termGroup.variants, termGroup.canonical)) return;

    matched = true;
    score += FIELD_WEIGHTS[fieldName] || 2;
  });

  return { matched, score };
}

function isNegativeMatch(indexedImage, termGroup) {
  const explicitNegative = (indexedImage.fields.negative || []).some((value) =>
    matchValue(value, getTagHelpers().stemTerm(value), termGroup.variants, termGroup.canonical)
  );

  if (explicitNegative) return true;

  return indexedImage.allValues.some((value, valueIndex) =>
    matchValue(value, indexedImage.stemmedValues[valueIndex], termGroup.variants, termGroup.canonical)
  );
}

function scoreImage(indexedImage, parsedQuery) {
  if (!parsedQuery.normalized) {
    return {
      matched: true,
      score: 0,
      matchCount: 0
    };
  }

  if (parsedQuery.negative.some((termGroup) => isNegativeMatch(indexedImage, termGroup))) {
    return {
      matched: false,
      score: -Infinity,
      matchCount: 0
    };
  }

  let score = 0;
  let matchCount = 0;

  for (const termGroup of parsedQuery.positive) {
    let termMatched = false;
    let termScore = 0;

    Object.keys(indexedImage.fields).forEach((fieldName) => {
      if (fieldName === "negative") return;
      const fieldResult = scoreField(indexedImage, fieldName, termGroup);
      if (!fieldResult.matched) return;
      termMatched = true;
      termScore += fieldResult.score;
    });

    if (!termMatched) {
      return {
        matched: false,
        score: 0,
        matchCount
      };
    }

    score += termScore;
    matchCount += 1;
  }

  if (parsedQuery.positive.length > 1 && matchCount === parsedQuery.positive.length) {
    score += parsedQuery.positive.length * 2;
  }

  score += getPremiumBoost(indexedImage);

  return {
    matched: true,
    score,
    matchCount
  };
}

function searchImages(indexedImages, query) {
  const { parseQuery } = getTagHelpers();
  const parsedQuery = parseQuery(query);

  if (!parsedQuery.normalized) {
    return {
      parsedQuery,
      mode: "all",
      results: [...indexedImages].sort((left, right) =>
        left.image.projectIndex - right.image.projectIndex ||
        left.image.imageIndex - right.image.imageIndex
      )
    };
  }

  if (!parsedQuery.positive.length && parsedQuery.negative.length) {
    const negativeMatches = indexedImages
      .filter((indexedImage) => !parsedQuery.negative.some((termGroup) => isNegativeMatch(indexedImage, termGroup)))
      .sort((left, right) =>
        left.image.projectIndex - right.image.projectIndex ||
        left.image.imageIndex - right.image.imageIndex
      );

    return {
      parsedQuery,
      mode: "negative",
      results: negativeMatches
    };
  }

  const andMatches = indexedImages
    .map((indexedImage) => {
      const result = scoreImage(indexedImage, parsedQuery);
      return { indexedImage, ...result };
    })
    .filter((result) => result.matched && result.score > 0)
    .sort((left, right) =>
      right.score - left.score ||
      left.indexedImage.image.projectIndex - right.indexedImage.image.projectIndex ||
      left.indexedImage.image.imageIndex - right.indexedImage.image.imageIndex
    )
    .map((result) => ({ ...result.indexedImage, _score: result.score }));

  if (andMatches.length) {
    return {
      parsedQuery,
      mode: "and",
      results: andMatches
    };
  }

  if (parsedQuery.positive.length <= 1) {
    return {
      parsedQuery,
      mode: "and",
      results: []
    };
  }

  const orMatches = indexedImages
    .map((indexedImage) => {
      if (parsedQuery.negative.some((termGroup) => isNegativeMatch(indexedImage, termGroup))) {
        return null;
      }

      let score = 0;
      let matchedTerms = 0;

      parsedQuery.positive.forEach((termGroup) => {
        let termMatched = false;
        Object.keys(indexedImage.fields).forEach((fieldName) => {
          if (fieldName === "negative") return;
          const fieldResult = scoreField(indexedImage, fieldName, termGroup);
          if (!fieldResult.matched) return;
          termMatched = true;
          score += fieldResult.score;
        });

        if (termMatched) matchedTerms += 1;
      });

      if (!matchedTerms || !score) return null;

      return {
        ...indexedImage,
        _score: score + matchedTerms
      };
    })
    .filter(Boolean)
    .sort((left, right) =>
      right._score - left._score ||
      left.image.projectIndex - right.image.projectIndex ||
      left.image.imageIndex - right.image.imageIndex
    );

  return {
    parsedQuery,
    mode: "or",
    results: orMatches
  };
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
      } catch (_error) {}
      img.classList.add("is-ready");
    }, { once: true });
  });
}

function createTagPill(text) {
  const pill = document.createElement("span");
  pill.className = "search-result-tag";
  pill.textContent = text;
  return pill;
}

function createSearchResultCard(indexedImage, index) {
  const { image, keyTags } = indexedImage;
  const card = document.createElement("article");
  card.className = `search-result-card search-result-card--tone-${(index % 3) + 1}`;

  const link = document.createElement("a");
  link.className = "search-result-link";
  link.href = image.projectUrl || `project-${encodeURIComponent(image.projectSlug)}.html`;

  const mediaWrap = document.createElement("div");
  mediaWrap.className = "search-result-media-wrap";

  const media = document.createElement("img");
  media.className = "search-result-media";
  media.alt = image.alt || image.projectTitle || "MotoSynteza search result image";
  media.loading = index < 8 ? "eager" : "lazy";
  if (index < 4) media.setAttribute("fetchpriority", "high");
  media.decoding = "async";
  media.src = image.imageUrl;
  mediaWrap.appendChild(media);

  if (keyTags.length) {
    const overlay = document.createElement("div");
    overlay.className = "search-result-tags";
    keyTags.forEach((tag) => overlay.appendChild(createTagPill(tag)));
    mediaWrap.appendChild(overlay);
  }

  const copy = document.createElement("div");
  copy.className = "search-result-copy";

  const meta = document.createElement("p");
  meta.className = "search-result-meta";
  meta.textContent = image.projectTitle || image.projectSlug;

  const title = document.createElement("h2");
  title.textContent = image.alt || image.projectTitle || "Untitled image";

  const desc = document.createElement("p");
  desc.textContent = image.reading[0] || image.caption || image.projectDescription || "Open the gallery to explore the full visual context.";

  const enter = document.createElement("span");
  enter.className = "search-result-enter";
  enter.textContent = "Open gallery →";

  copy.appendChild(meta);
  copy.appendChild(title);
  copy.appendChild(desc);
  copy.appendChild(enter);

  link.appendChild(mediaWrap);
  link.appendChild(copy);
  card.appendChild(link);

  return card;
}

function renderEmptyState(resultsEl, query) {
  const empty = document.createElement("section");
  empty.className = "search-empty-state";

  const title = document.createElement("h2");
  title.textContent = query
    ? `No images matched "${query}".`
    : "No images are available right now.";

  const copy = document.createElement("p");
  copy.textContent = query
    ? "Try broader terms, or remove a negative phrase like no people."
    : "Use the sidebar search to explore objects, moods, symbols, and styles.";

  empty.appendChild(title);
  empty.appendChild(copy);
  resultsEl.appendChild(empty);
}

function renderResults(resultsEl, results, query) {
  resultsEl.innerHTML = "";

  if (!results.length) {
    renderEmptyState(resultsEl, query);
    return;
  }

  const fragment = document.createDocumentFragment();
  results.forEach((indexedImage, index) => {
    fragment.appendChild(createSearchResultCard(indexedImage, index));
  });

  resultsEl.appendChild(fragment);
  enableDecodeFade([...resultsEl.querySelectorAll(".search-result-media")]);
}

function updateResultsSummary(summaryEl, resultState, totalCount) {
  const query = resultState.parsedQuery.raw.trim();

  if (!query) {
    summaryEl.textContent = `Showing all ${totalCount} images. Use the sidebar to search by object, mood, color, symbol, or absence.`;
    return;
  }

  if (!resultState.results.length) {
    summaryEl.textContent = `No image matched "${query}". Try fewer words or remove a negative phrase.`;
    return;
  }

  const label = resultState.results.length === 1 ? "image" : "images";
  if (resultState.mode === "or") {
    summaryEl.textContent = `${resultState.results.length} ${label} loosely matched "${query}" through partial semantic overlap.`;
    return;
  }

  if (resultState.mode === "negative") {
    summaryEl.textContent = `${resultState.results.length} ${label} matched the absence filter "${query}".`;
    return;
  }

  summaryEl.textContent = `${resultState.results.length} ${label} matched "${query}" across the visual index.`;
}

async function renderSearch(query) {
  const summaryEl = document.getElementById("search-results-summary");
  const resultsEl = document.getElementById("search-results");
  if (!summaryEl || !resultsEl) return;

  const indexedImages = await loadSearchIndex();
  const resultState = searchImages(indexedImages, query);

  SEARCH_STATE.currentQuery = query;
  renderResults(resultsEl, resultState.results, query);
  updateResultsSummary(summaryEl, resultState, indexedImages.length);
  writeSearchStateToUrl({ query });

  if (typeof window.setSidebarSearchValue === "function") {
    window.setSidebarSearchValue(query);
  }
}

function scheduleSearchPageQueryUpdate(query) {
  clearTimeout(SEARCH_STATE.debounceTimer);
  SEARCH_STATE.debounceTimer = window.setTimeout(() => {
    void renderSearch(query);
  }, 250);
}

function updateSearchPageQuery(query) {
  clearTimeout(SEARCH_STATE.debounceTimer);
  void renderSearch(query);
}

async function initSearchPage() {
  if (document.body.dataset.page !== "search") return;

  const summaryEl = document.getElementById("search-results-summary");
  const resultsEl = document.getElementById("search-results");
  if (!summaryEl || !resultsEl) return;

  try {
    const state = readSearchStateFromUrl();
    await renderSearch(state.query.trim());
  } catch (error) {
    console.error(error);
    resultsEl.innerHTML = "";
    renderEmptyState(resultsEl, "");
    summaryEl.textContent = "The image index could not be loaded right now.";
  }
}

window.initSearchPage = initSearchPage;
window.scheduleSearchPageQueryUpdate = scheduleSearchPageQueryUpdate;
window.updateSearchPageQuery = updateSearchPageQuery;

document.addEventListener("DOMContentLoaded", initSearchPage);

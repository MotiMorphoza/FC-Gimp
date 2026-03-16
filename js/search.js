function normalizeProject(project, index) {
  const tags = Array.isArray(project?.tags)
    ? [...new Set(project.tags.map((tag) => String(tag || "").trim()).filter(Boolean))]
    : [];

  const titleText = String(project?.title || "").trim().toLowerCase();
  const descriptionText = String(project?.description || "").trim().toLowerCase();
  const tagsLower = tags.map((tag) => tag.toLowerCase());

  return {
    ...project,
    tags,
    tagsLower,
    _index: index,
    titleText,
    descriptionText,
    searchText: [titleText, descriptionText, tagsLower.join(" ")].join(" ").trim()
  };
}

function readSearchStateFromUrl() {
  const url = new URL(window.location.href);
  return {
    query: url.searchParams.get("q") || ""
  };
}

function writeSearchStateToUrl(state) {
  const url = new URL(window.location.href);
  const query = state.query.trim();

  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }

  url.searchParams.delete("tag");

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function tokenizeQuery(query) {
  return [...new Set(String(query || "").toLowerCase().split(/\s+/).map((term) => term.trim()).filter(Boolean))];
}

function scoreProject(project, normalizedQuery, terms) {
  if (!normalizedQuery) return 0;

  let score = 0;

  if (project.titleText === normalizedQuery) {
    score += 240;
  } else if (project.titleText.includes(normalizedQuery)) {
    score += 160;
  }

  if (project.descriptionText.includes(normalizedQuery)) {
    score += 52;
  }

  if (project.tagsLower.includes(normalizedQuery)) {
    score += 132;
  }

  if (project.searchText.includes(normalizedQuery)) {
    score += 20;
  }

  terms.forEach((term) => {
    if (project.titleText.includes(term)) score += 46;
    if (project.descriptionText.includes(term)) score += 14;

    project.tagsLower.forEach((tag) => {
      if (tag === term) {
        score += 38;
        return;
      }

      if (tag.includes(term)) {
        score += 22;
      }
    });
  });

  return score;
}

function filterProjects(projects, state) {
  const normalizedQuery = state.query.trim().toLowerCase();
  if (!normalizedQuery) return [...projects];

  const terms = tokenizeQuery(normalizedQuery);

  return projects
    .map((project) => ({
      project,
      score: scoreProject(project, normalizedQuery, terms)
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.project._index - right.project._index)
    .map(({ project }) => project);
}

function createSearchResultCard(project, index) {
  const card = document.createElement("article");
  card.className = `search-result-card search-result-card--tone-${(index % 3) + 1}`;

  const link = document.createElement("a");
  link.className = "search-result-link";
  link.href = `project-${encodeURIComponent(project.slug)}.html`;

  const mediaWrap = document.createElement("div");
  mediaWrap.className = "search-result-media-wrap";

  const media = document.createElement("img");
  media.className = "search-result-media";
  media.alt = `${project.title} cover image`;
  media.loading = index === 0 ? "eager" : "lazy";
  if (index === 0) media.setAttribute("fetchpriority", "high");
  media.decoding = "async";

  if (project.cover) {
    media.src = `projects/${project.slug}/${project.cover}`;
  }

  media.onerror = () => {
    media.removeAttribute("src");
  };

  mediaWrap.appendChild(media);

  const copy = document.createElement("div");
  copy.className = "search-result-copy";

  const meta = document.createElement("p");
  meta.className = "search-result-meta";
  meta.textContent = `${project.imageCount || 0} images`;

  const title = document.createElement("h2");
  title.textContent = project.title;

  const desc = document.createElement("p");
  desc.textContent = project.description || "Open the gallery to explore the full series.";

  const enter = document.createElement("span");
  enter.className = "search-result-enter";
  enter.textContent = "Open gallery \u2192";

  copy.appendChild(meta);
  copy.appendChild(title);
  copy.appendChild(desc);
  copy.appendChild(enter);

  link.appendChild(mediaWrap);
  link.appendChild(copy);
  card.appendChild(link);

  return card;
}

function enableDecodeFade(images) {
  images.forEach((img) => {
    if (img.complete) {
      img.classList.add("is-ready");
      return;
    }

    img.addEventListener("load", async () => {
      try {
        if (img.decode) {
          await img.decode();
        }
      } catch (_error) {}

      img.classList.add("is-ready");
    });
  });
}

function renderEmptyState(resultsEl, query) {
  const empty = document.createElement("section");
  empty.className = "search-empty-state";

  const title = document.createElement("h2");
  title.textContent = query ? `No galleries matched "${query}".` : "No galleries are available right now.";

  const copy = document.createElement("p");
  copy.textContent = query
    ? "Try a broader word from the sidebar search."
    : "Use the sidebar search to look through the available galleries.";

  empty.appendChild(title);
  empty.appendChild(copy);
  resultsEl.appendChild(empty);
}

function renderResults(resultsEl, projects, query) {
  resultsEl.innerHTML = "";

  if (!projects.length) {
    renderEmptyState(resultsEl, query);
    return;
  }

  projects.forEach((project, index) => {
    resultsEl.appendChild(createSearchResultCard(project, index));
  });

  enableDecodeFade([...resultsEl.querySelectorAll(".search-result-media")]);
}

function updateResultsSummary(summaryEl, visibleCount, totalCount, state) {
  const query = state.query.trim();

  if (!query) {
    summaryEl.textContent = `Showing all ${totalCount} galleries. Use the sidebar search to narrow the selection.`;
    return;
  }

  if (!visibleCount) {
    summaryEl.textContent = `No galleries matched "${query}". Update the term in the sidebar search and try again.`;
    return;
  }

  const label = visibleCount === 1 ? "gallery" : "galleries";
  summaryEl.textContent = `${visibleCount} ${label} matched "${query}".`;
}

function initSearchPage() {
  const summaryEl = document.getElementById("search-results-summary");
  const resultsEl = document.getElementById("search-results");

  if (!summaryEl || !resultsEl) return;

  const manifest = window.__PROJECTS__;

  if (!Array.isArray(manifest) || !manifest.length) {
    console.warn("Projects manifest is missing or empty.");
    return;
  }

  const projects = manifest
    .filter((project) => project?.slug && project?.title)
    .map((project, index) => normalizeProject(project, index));
  const state = readSearchStateFromUrl();
  const visibleProjects = filterProjects(projects, state);

  renderResults(resultsEl, visibleProjects, state.query.trim());
  updateResultsSummary(summaryEl, visibleProjects.length, projects.length, state);
  writeSearchStateToUrl(state);

  if (typeof window.setSidebarSearchValue === "function") {
    window.setSidebarSearchValue(state.query);
  }
}

window.initSearchPage = initSearchPage;
document.addEventListener("DOMContentLoaded", initSearchPage);

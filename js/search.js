const ALL_TOPICS_LABEL = "All topics";

function normalizeProject(project) {
  const tags = Array.isArray(project?.tags)
    ? [...new Set(project.tags.map((tag) => String(tag || "").trim()).filter(Boolean))]
    : [];

  return {
    ...project,
    tags,
    searchText: [
      project?.title || "",
      project?.description || "",
      tags.join(" ")
    ].join(" ").toLowerCase()
  };
}

function collectTopics(projects) {
  const counts = new Map();

  projects.forEach((project) => {
    project.tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .map(([tag, count]) => ({ tag, count }));
}

function readSearchStateFromUrl() {
  const url = new URL(window.location.href);
  return {
    query: url.searchParams.get("q") || "",
    activeTag: url.searchParams.get("tag") || ""
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

  if (state.activeTag) {
    url.searchParams.set("tag", state.activeTag);
  } else {
    url.searchParams.delete("tag");
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function filterProjects(projects, state) {
  const query = state.query.trim().toLowerCase();

  return projects.filter((project) => {
    const matchesQuery = !query || project.searchText.includes(query);
    const matchesTag = !state.activeTag || project.tags.includes(state.activeTag);
    return matchesQuery && matchesTag;
  });
}

function renderTopicFilters(chipsEl, topics, state, onSelect) {
  chipsEl.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "search-chip" + (state.activeTag ? "" : " is-active");
  allButton.textContent = ALL_TOPICS_LABEL;
  allButton.setAttribute("aria-pressed", state.activeTag ? "false" : "true");
  allButton.addEventListener("click", () => onSelect(""));
  chipsEl.appendChild(allButton);

  topics.forEach(({ tag, count }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-chip" + (state.activeTag === tag ? " is-active" : "");
    button.textContent = `${tag} (${count})`;
    button.setAttribute("aria-pressed", state.activeTag === tag ? "true" : "false");
    button.addEventListener("click", () => onSelect(state.activeTag === tag ? "" : tag));
    chipsEl.appendChild(button);
  });
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

function renderResults(resultsEl, projects) {
  resultsEl.innerHTML = "";

  if (!projects.length) {
    const empty = document.createElement("section");
    empty.className = "search-empty-state";
    empty.innerHTML = [
      "<h2>No galleries matched that search.</h2>",
      "<p>Try a broader word like urban, faith, birds, nature, or clear the active filter.</p>"
    ].join("");
    resultsEl.appendChild(empty);
    return;
  }

  projects.forEach((project, index) => {
    resultsEl.appendChild(createSearchResultCard(project, index));
  });

  enableDecodeFade([...resultsEl.querySelectorAll(".search-result-media")]);
}

function updateResultsSummary(summaryEl, clearButton, visibleCount, totalCount, state) {
  const parts = [`${visibleCount} of ${totalCount} galleries`];

  if (state.activeTag) parts.push(`topic: ${state.activeTag}`);
  if (state.query.trim()) parts.push(`search: "${state.query.trim()}"`);

  summaryEl.textContent = parts.join("  |  ");
  clearButton.hidden = !state.activeTag && !state.query.trim();
}

function initSearchPage() {
  const input = document.getElementById("search-page-input");
  const chipsEl = document.getElementById("search-filter-chips");
  const summaryEl = document.getElementById("search-results-summary");
  const resultsEl = document.getElementById("search-results");
  const clearButton = document.getElementById("search-clear-button");

  if (!input || !chipsEl || !summaryEl || !resultsEl || !clearButton) return;

  const manifest = window.__PROJECTS__;

  if (!Array.isArray(manifest) || !manifest.length) {
    console.warn("Projects manifest is missing or empty.");
    return;
  }

  const projects = manifest
    .filter((project) => project?.slug && project?.title)
    .map(normalizeProject);
  const topics = collectTopics(projects);
  const state = readSearchStateFromUrl();

  if (state.activeTag && !topics.some((topic) => topic.tag === state.activeTag)) {
    state.activeTag = "";
  }

  const render = () => {
    const visibleProjects = filterProjects(projects, state);
    input.value = state.query;
    renderTopicFilters(chipsEl, topics, state, (tag) => {
      state.activeTag = tag;
      render();
    });
    renderResults(resultsEl, visibleProjects);
    updateResultsSummary(summaryEl, clearButton, visibleProjects.length, projects.length, state);
    writeSearchStateToUrl(state);

    if (typeof window.setSidebarSearchValue === "function") {
      window.setSidebarSearchValue(state.query);
    }
  };

  if (input.dataset.searchBound !== "true") {
    input.addEventListener("input", (event) => {
      state.query = event.target.value || "";
      render();
    });

    clearButton.addEventListener("click", () => {
      state.query = "";
      state.activeTag = "";
      render();
    });

    input.dataset.searchBound = "true";
  }

  render();
}

window.initSearchPage = initSearchPage;
document.addEventListener("DOMContentLoaded", initSearchPage);

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

function createTagList(tags) {
  if (!tags.length) return null;

  const list = document.createElement("ul");
  list.className = "project-tags";
  list.setAttribute("aria-label", "Gallery topics");

  tags.forEach((tag) => {
    const item = document.createElement("li");
    item.className = "project-tag";
    item.textContent = tag;
    list.appendChild(item);
  });

  return list;
}

function createProjectSection(project, index) {
  const section = document.createElement("section");
  section.className =
    "project-item " +
    (index % 2 === 0 ? "bg-1" : "bg-2") +
    (index % 2 === 1 ? " reverse" : "");

  const grid = document.createElement("div");
  grid.className = "project-grid";

  const href = `project.html?project=${encodeURIComponent(project.slug)}`;

  const link = document.createElement("a");
  link.href = href;
  link.className = "project-link";

  const media = document.createElement("img");
  media.className = "project-media";
  media.alt = project.title;
  media.loading = index === 0 ? "eager" : "lazy";
  if (index === 0) media.setAttribute("fetchpriority", "high");
  media.decoding = "async";

  if (project.cover) {
    media.src = `projects/${project.slug}/${project.cover}`;
  } else {
    media.classList.add("placeholder");
  }

  media.onerror = () => {
    media.classList.add("placeholder");
    media.removeAttribute("src");
  };

  link.appendChild(media);

  const textLink = document.createElement("a");
  textLink.href = href;
  textLink.className = "project-text";

  const h2 = document.createElement("h2");
  h2.textContent = project.title;
  textLink.appendChild(h2);

  const tagList = createTagList(project.tags);
  if (tagList) {
    textLink.appendChild(tagList);
  }

  const p = document.createElement("p");
  if (project.description) {
    p.appendChild(document.createTextNode(project.description + " "));
  }

  const enter = document.createElement("span");
  enter.className = "enter";
  enter.textContent = "ENTER \u2192";
  p.appendChild(enter);
  textLink.appendChild(p);

  if (index % 2 === 0) {
    grid.appendChild(link);
    grid.appendChild(textLink);
  } else {
    grid.appendChild(textLink);
    grid.appendChild(link);
  }

  section.appendChild(grid);
  return section;
}

function renderProjects(listEl, projects) {
  listEl.innerHTML = "";

  if (!projects.length) {
    const empty = document.createElement("section");
    empty.className = "projects-empty-state";
    empty.innerHTML = [
      "<h2>No galleries matched that search.</h2>",
      "<p>Try a broader word like <strong>urban</strong>, <strong>faith</strong>, <strong>birds</strong>, or clear the active filter.</p>"
    ].join("");
    listEl.appendChild(empty);
    return;
  }

  projects.forEach((project, index) => {
    listEl.appendChild(createProjectSection(project, index));

    if (index < projects.length - 1) {
      const sep = document.createElement("div");
      sep.className = "separator";
      listEl.appendChild(sep);
    }
  });

  const covers = [...listEl.querySelectorAll(".project-media")];
  enableProjectsForwardPreload(covers);
  enableDecodeFade(covers);
}

function renderTopicFilters(chipsEl, topics, state, onSelect) {
  chipsEl.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "projects-chip" + (state.activeTag ? "" : " is-active");
  allButton.textContent = ALL_TOPICS_LABEL;
  allButton.setAttribute("aria-pressed", state.activeTag ? "false" : "true");
  allButton.addEventListener("click", () => onSelect(""));
  chipsEl.appendChild(allButton);

  topics.forEach(({ tag, count }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "projects-chip" + (state.activeTag === tag ? " is-active" : "");
    button.textContent = `${tag} (${count})`;
    button.setAttribute("aria-pressed", state.activeTag === tag ? "true" : "false");
    button.addEventListener("click", () => onSelect(state.activeTag === tag ? "" : tag));
    chipsEl.appendChild(button);
  });
}

function filterProjects(projects, state) {
  const query = state.query.trim().toLowerCase();

  return projects.filter((project) => {
    const matchesQuery = !query || project.searchText.includes(query);
    const matchesTag = !state.activeTag || project.tags.includes(state.activeTag);
    return matchesQuery && matchesTag;
  });
}

function updateResultsSummary(summaryEl, clearButton, visibleCount, totalCount, state) {
  const parts = [`${visibleCount} of ${totalCount} galleries`];

  if (state.activeTag) parts.push(`topic: ${state.activeTag}`);
  if (state.query.trim()) parts.push(`search: "${state.query.trim()}"`);

  summaryEl.textContent = parts.join("  |  ");
  clearButton.hidden = !state.activeTag && !state.query.trim();
}

function initProjectsPage() {
  const listEl = document.getElementById("projects-list");
  const searchInput = document.getElementById("projects-search");
  const chipsEl = document.getElementById("projects-filter-chips");
  const summaryEl = document.getElementById("projects-results-summary");
  const clearButton = document.getElementById("projects-clear-search");

  if (!listEl || listEl.dataset.initialized === "true") return;

  const manifest = window.__PROJECTS__;

  if (!Array.isArray(manifest) || manifest.length === 0) {
    console.warn("Projects manifest is missing or empty.");
    return;
  }

  const projects = manifest
    .filter((project) => project?.slug && project?.title)
    .map(normalizeProject);
  const topics = collectTopics(projects);
  const state = {
    query: "",
    activeTag: ""
  };

  const render = () => {
    const visibleProjects = filterProjects(projects, state);
    renderProjects(listEl, visibleProjects);
    renderTopicFilters(chipsEl, topics, state, (tag) => {
      state.activeTag = tag;
      render();
    });
    updateResultsSummary(summaryEl, clearButton, visibleProjects.length, projects.length, state);
  };

  searchInput?.addEventListener("input", (event) => {
    state.query = event.target.value || "";
    render();
  });

  clearButton?.addEventListener("click", () => {
    state.query = "";
    state.activeTag = "";
    if (searchInput) searchInput.value = "";
    render();
  });

  listEl.dataset.initialized = "true";
  render();
}

function enableProjectsForwardPreload(images) {
  if (!images.length) return;

  const preloaded = new Set();

  const preloadImage = (index) => {
    if (index >= images.length) return;
    if (preloaded.has(index)) return;

    const src = images[index].getAttribute("src");
    if (!src) return;

    const img = new Image();
    img.decoding = "async";
    img.src = src;

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
      rootMargin: "777px 0px",
      threshold: 0.1,
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
        if (img.decode) {
          await img.decode();
        }
      } catch (e) {}

      img.classList.add("is-ready");
    });
  });
}

window.initProjectsPage = initProjectsPage;
document.addEventListener("DOMContentLoaded", initProjectsPage);

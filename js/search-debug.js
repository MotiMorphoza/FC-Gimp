async function loadGoldenQueries() {
  try {
    const response = await fetch("data/search-golden-queries.json", { credentials: "same-origin" });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  } catch (_error) {
    return [];
  }
}

function createGoldenChip(query, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "search-debug-chip";
  button.textContent = query;
  button.addEventListener("click", () => onSelect(query));
  return button;
}

function renderGoldenQueries(container, queries, onSelect) {
  container.innerHTML = "";
  queries.forEach((query) => container.appendChild(createGoldenChip(query, onSelect)));
}

function renderTermBreakdown(term) {
  const wrap = document.createElement("div");
  wrap.className = "search-debug-term";

  const head = document.createElement("div");
  head.className = "search-debug-kv";
  [
    `token: ${term.token}`,
    `kind: ${term.kind}`,
    `score: ${Number(term.score || 0).toFixed(2)}`,
    term.queryClass ? `class: ${term.queryClass}` : "",
    term.precisionProfile ? `policy: ${term.precisionProfile}` : ""
  ].filter(Boolean).forEach((item) => {
    const chip = document.createElement("span");
    chip.textContent = item;
    head.appendChild(chip);
  });

  wrap.appendChild(head);

  if (Array.isArray(term.fields) && term.fields.length) {
    const list = document.createElement("div");
    list.className = "search-debug-list";
    term.fields.forEach((field) => {
      const row = document.createElement("div");
      row.className = "search-debug-row";
      row.innerHTML = `<strong>${field.field}</strong><span class="search-debug-muted">score ${Number(field.score || 0).toFixed(2)}</span><code>${JSON.stringify(field.matches || field.direct || [])}</code>`;
      list.appendChild(row);
    });
    wrap.appendChild(list);
  }

  if (term.visual) {
    const row = document.createElement("div");
    row.className = "search-debug-row";
    row.innerHTML = `<strong>visual</strong><code>${JSON.stringify(term.visual)}</code>`;
    wrap.appendChild(row);
  }

  return wrap;
}

function createResultCard(result, index) {
  const card = document.createElement("article");
  card.className = "search-debug-card";

  const debug = result._debug || { score: 0, terms: [], bonus: { multi: 0, premium: 0 } };

  const head = document.createElement("div");
  head.className = "search-debug-card-head";
  head.innerHTML = `
    <div>
      <p class="search-debug-card-meta">${index + 1}. ${result.image.projectTitle || result.image.projectSlug}</p>
      <h2 class="search-debug-card-title">${result.image.alt || result.image.projectTitle || "Untitled image"}</h2>
    </div>
    <div class="search-debug-score">
      <span class="search-debug-muted">Total score</span>
      <strong>${Number(debug.score || result._score || 0).toFixed(2)}</strong>
      <span class="search-debug-muted">multi ${Number(debug.bonus?.multi || 0).toFixed(2)} / premium ${Number(debug.bonus?.premium || 0).toFixed(2)}</span>
    </div>
  `;

  const grid = document.createElement("div");
  grid.className = "search-debug-grid";

  const termsPanel = document.createElement("section");
  termsPanel.className = "search-debug-panel";
  termsPanel.innerHTML = "<h3>Matched Terms</h3>";
  const termList = document.createElement("div");
  termList.className = "search-debug-term-list";
  (debug.terms || []).forEach((term) => termList.appendChild(renderTermBreakdown(term)));
  if (!termList.children.length) {
    const empty = document.createElement("p");
    empty.className = "search-debug-muted";
    empty.textContent = "No term breakdown available.";
    termList.appendChild(empty);
  }
  termsPanel.appendChild(termList);

  const visualPanel = document.createElement("section");
  visualPanel.className = "search-debug-panel";
  visualPanel.innerHTML = "<h3>Visual Profile</h3>";
  const visualRow = document.createElement("div");
  visualRow.className = "search-debug-row";
  visualRow.innerHTML = `<code>${JSON.stringify(result.image.visual || {}, null, 2)}</code>`;
  visualPanel.appendChild(visualRow);

  const semanticPanel = document.createElement("section");
  semanticPanel.className = "search-debug-panel";
  semanticPanel.innerHTML = "<h3>Semantic Fields</h3>";
  const semanticList = document.createElement("div");
  semanticList.className = "search-debug-list";
  ["primary", "objects", "mood", "tone", "themes", "relations", "tension", "reading"].forEach((field) => {
    const values = result.image[field] || [];
    if (!values.length) return;
    const row = document.createElement("div");
    row.className = "search-debug-row";
    row.innerHTML = `<strong>${field}</strong><code>${JSON.stringify(values)}</code>`;
    semanticList.appendChild(row);
  });
  if (!semanticList.children.length) {
    const empty = document.createElement("p");
    empty.className = "search-debug-muted";
    empty.textContent = "No semantic fields on this result.";
    semanticList.appendChild(empty);
  }
  semanticPanel.appendChild(semanticList);

  grid.appendChild(termsPanel);
  grid.appendChild(visualPanel);
  grid.appendChild(semanticPanel);

  card.appendChild(head);
  card.appendChild(grid);

  return card;
}

function renderDebugResults(container, state) {
  container.innerHTML = "";
  (state.results || []).slice(0, 25).forEach((result, index) => {
    container.appendChild(createResultCard(result, index));
  });
}

async function runSearchDebug(query) {
  const runtime = window.MotoSearchRuntime;
  if (!runtime) return;

  const summary = document.getElementById("search-debug-summary");
  const resultsEl = document.getElementById("search-debug-results");
  const indexedImages = await runtime.loadSearchIndex();
  const state = runtime.searchImagesDetailed(indexedImages, query);
  const buckets = state.parsedQuery?.intentBuckets || {};
  const dominant = state.parsedQuery?.dominantIntent || "conceptual";

  summary.textContent = `${state.results.length} results | mode: ${state.mode} | dominant intent: ${dominant} | buckets: ${JSON.stringify(buckets)}`;
  renderDebugResults(resultsEl, state);

  const url = new URL(window.location.href);
  if (query) url.searchParams.set("q", query);
  else url.searchParams.delete("q");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

async function initSearchDebugPage() {
  if (document.body.dataset.page !== "search-debug") return;

  const input = document.getElementById("search-debug-input");
  const runButton = document.getElementById("search-debug-run");
  const goldenContainer = document.getElementById("search-debug-golden-list");
  if (!input || !runButton || !goldenContainer) return;

  const url = new URL(window.location.href);
  const initialQuery = url.searchParams.get("q") || "";
  input.value = initialQuery;

  const run = () => runSearchDebug(input.value.trim());
  runButton.addEventListener("click", run);
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    run();
  });

  const goldenQueries = await loadGoldenQueries();
  renderGoldenQueries(goldenContainer, goldenQueries, (query) => {
    input.value = query;
    void runSearchDebug(query);
  });

  await run();
}

document.addEventListener("DOMContentLoaded", initSearchDebugPage);

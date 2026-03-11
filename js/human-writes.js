(function () {
  const PAGE_ID = "more";
  const MOBILE_QUERY = "(max-width: 980px)";
  const TEMPLATE_URL = "human-writes.html";
  const TEXT_SOURCE_CANDIDATES = [
    () => `data/human-writes-texts.txt${versionQuery()}`,
    () => `TEXTS.txt${versionQuery()}`
  ];

  const ENTRY_DECOR = {
    "en-1": { layout: "text", image: "images/more/human-writes.gif" },
    "en-2": { layout: "image-split", image: "images/more/human-writes.gif" },
    "en-3": { layout: "image-top", image: "images/more/human-writes.png" },
    "he-1": { layout: "text", image: "images/more/human-writes.png" },
    "he-2": { layout: "image-top", image: "images/more/human-writes.gif" },
    "he-3": { layout: "image-split", image: "images/more/human-writes.png" },
    "es-1": { layout: "image-top", image: "images/more/human-writes.gif" },
    "es-2": { layout: "text", image: "images/more/human-writes.png" },
    "es-3": { layout: "image-split", image: "images/more/human-writes.gif" }
  };

  const state = {
    mount: null,
    root: null,
    refs: {},
    entries: [],
    pages: [],
    pageIndexByEntry: new Map(),
    preloadedImages: new Set(),
    isMobile: false,
    currentSpread: 0,
    currentPage: 0,
    resizeTimer: null,
    audioCtx: null,
    touchStartX: null,
    touchStartY: null,
    buildToken: 0,
    initPromise: null,
    globalListenersBound: false
  };

  function versionQuery() {
    const version = window.__BUILD_VERSION__ || "";
    return version ? `?v=${encodeURIComponent(version)}` : "";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function maybeDecodeMojibake(line) {
    if (!/[\u00C3\u00D7\u00D6]/.test(line)) return line;

    try {
      const bytes = Uint8Array.from(Array.from(line, (char) => char.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder("utf-8").decode(bytes);
      const originalScore = (line.match(/[\u0590-\u05FF\u00E1\u00E9\u00ED\u00F3\u00FA\u00F1\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1]/g) || []).length;
      const decodedScore = (decoded.match(/[\u0590-\u05FF\u00E1\u00E9\u00ED\u00F3\u00FA\u00F1\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1]/g) || []).length;
      return decodedScore > originalScore ? decoded : line;
    } catch {
      return line;
    }
  }

  function normalizeRawText(raw) {
    return raw
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => maybeDecodeMojibake(line))
      .join("\n");
  }

  function detectLanguage(line) {
    const normalized = line.trim().toLowerCase();
    if (/^english\s+texts?$/.test(normalized)) return "en";
    if (/^hebrew\s+texts?$/.test(normalized)) return "he";
    if (/^spanish\s+texts?$/.test(normalized)) return "es";
    return null;
  }

  function isSeparator(line) {
    return /^\*{3,}\s*$/.test(line.trim());
  }

  function isUnderline(line) {
    return /^[-=]{3,}\s*$/.test(line.trim());
  }

  function nextNonEmpty(lines, from) {
    for (let index = from; index < lines.length; index += 1) {
      if (lines[index].trim()) return index;
    }
    return -1;
  }

  function isTitleStart(lines, index) {
    const line = (lines[index] || "").trim();
    if (!line || isSeparator(line)) return false;
    const underlineIndex = nextNonEmpty(lines, index + 1);
    if (underlineIndex === -1) return false;
    return isUnderline(lines[underlineIndex]);
  }

  function compactBody(lines) {
    const output = [];
    let blank = false;

    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+$/g, "");
      if (!line.trim()) {
        if (!blank && output.length) output.push("");
        blank = true;
      } else {
        output.push(line);
        blank = false;
      }
    }

    while (output.length && !output[0].trim()) output.shift();
    while (output.length && !output[output.length - 1].trim()) output.pop();
    return output.join("\n");
  }

  function slugKey(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9\u0590-\u05ff]+/g, "") || "text";
  }

  function buildEntryId(language, title, order) {
    return `${language}-${slugKey(title)}-${order}`;
  }

  function parseTextEntries(raw) {
    const lines = normalizeRawText(raw).split("\n");
    const entries = [];
    const orders = { en: 0, he: 0, es: 0 };
    let language = null;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] || "";
      const detectedLanguage = detectLanguage(line);
      if (detectedLanguage) {
        language = detectedLanguage;
        continue;
      }

      if (!language || !line.trim() || isSeparator(line) || !isTitleStart(lines, index)) {
        continue;
      }

      const title = line.trim();
      const bodyLines = [];
      index = nextNonEmpty(lines, index + 1);

      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const candidate = lines[cursor] || "";
        if (detectLanguage(candidate) || isSeparator(candidate) || isTitleStart(lines, cursor)) {
          index = cursor - 1;
          break;
        }
        bodyLines.push(candidate);
        if (cursor === lines.length - 1) {
          index = cursor;
        }
      }

      const body = compactBody(bodyLines);
      if (!body) continue;

      orders[language] += 1;
      entries.push({
        id: buildEntryId(language, title, orders[language]),
        title,
        language,
        order: orders[language],
        body
      });
    }

    return entries;
  }

  function decorateEntries(entries) {
    return entries.map((entry) => {
      const decor = ENTRY_DECOR[`${entry.language}-${entry.order}`] || ENTRY_DECOR[slugKey(entry.title)] || {};
      return {
        ...entry,
        image: decor.image || "",
        layout: decor.layout || "text"
      };
    });
  }

  async function fetchTemplateMarkup() {
    const response = await fetch(TEMPLATE_URL, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Template HTTP ${response.status}`);

    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const template = parsed.querySelector("template[data-hw-template]");
    if (!template) throw new Error("Human Writes template missing");
    return template.innerHTML;
  }

  async function fetchTextSource() {
    for (const getUrl of TEXT_SOURCE_CANDIDATES) {
      try {
        const response = await fetch(getUrl(), { credentials: "same-origin" });
        if (response.ok) {
          return response.text();
        }
      } catch {
        // Try the next candidate before falling back.
      }
    }

    return getFallbackRawText();
  }

  function getFallbackRawText() {
    return [
      "English texts",
      "***************",
      "",
      "KIND",
      "------",
      "The content source is missing. Drop data/human-writes-texts.txt into the project to restore the full notebook.",
      "",
      "HEBREW TEXTS",
      "**********************",
      "",
      "Hebrew Placeholder",
      "-----------",
      "The source text is currently missing, but the reverse-reading notebook flow remains active.",
      "",
      "Spanish texts",
      "**************",
      "",
      "El Viaje",
      "----------",
      "El archivo fuente falta en el proyecto por ahora."
    ].join("\n");
  }

  function resetMountState() {
    state.mount = null;
    state.root = null;
    state.refs = {};
    state.pages = [];
    state.pageIndexByEntry = new Map();
    state.preloadedImages.clear();
    state.touchStartX = null;
    state.touchStartY = null;
    state.currentSpread = 0;
    state.currentPage = 0;
  }

  function captureRefs() {
    state.refs = {
      stage: state.root.querySelector("[data-hw-stage]"),
      book: state.root.querySelector("[data-hw-book]"),
      left: state.root.querySelector('[data-hw-page="left"]'),
      right: state.root.querySelector('[data-hw-page="right"]'),
      single: state.root.querySelector('[data-hw-page="single"]'),
      prev: state.root.querySelector('[data-hw-nav="prev"]'),
      next: state.root.querySelector('[data-hw-nav="next"]'),
      contents: state.root.querySelector("[data-hw-contents]"),
      live: state.root.querySelector("[data-hw-live]"),
      measure: state.root.querySelector("[data-hw-measure]")
    };

    const requiredRefs = [
      "stage",
      "book",
      "left",
      "right",
      "single",
      "prev",
      "next",
      "contents",
      "live",
      "measure"
    ];

    for (const refName of requiredRefs) {
      if (!state.refs[refName]) {
        throw new Error(`Human Writes reference missing: ${refName}`);
      }
    }
  }

  function splitBodyIntoBlocks(body) {
    return body.split(/\n{3,}/).map((block) => block.trim()).filter(Boolean);
  }

  function splitOversizedBlock(block) {
    const lines = block.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1) {
      const pieces = [];
      let current = [];
      let score = 0;

      for (const line of lines) {
        const nextScore = score + line.length + 8;
        if (nextScore > 180 && current.length) {
          pieces.push(current.join("\n"));
          current = [line];
          score = line.length;
        } else {
          current.push(line);
          score = nextScore;
        }
      }

      if (current.length) pieces.push(current.join("\n"));
      return pieces;
    }

    const words = block.split(/\s+/).filter(Boolean);
    if (words.length <= 1) return [block];

    const pieces = [];
    let current = [];
    let score = 0;

    for (const word of words) {
      const nextScore = score + word.length + 1;
      if (nextScore > 120 && current.length) {
        pieces.push(current.join(" "));
        current = [word];
        score = word.length;
      } else {
        current.push(word);
        score = nextScore;
      }
    }

    if (current.length) pieces.push(current.join(" "));
    return pieces;
  }

  function renderTextBlocks(blocks) {
    return blocks
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function renderPageHeading(page) {
    if (page.part > 1) {
      return `<h3>${escapeHtml(page.title)} - ${page.part}/${page.totalParts}</h3>`;
    }
    return `<h2>${escapeHtml(page.title)}</h2>`;
  }

  function renderTextFlow(page) {
    if (page.layout === "quote") {
      const [leadBlock, ...restBlocks] = page.blocks;
      return [
        renderPageHeading(page),
        `<blockquote>${escapeHtml(leadBlock || "").replace(/\n/g, "<br>")}</blockquote>`,
        restBlocks.length ? renderTextBlocks(restBlocks) : ""
      ].join("");
    }

    return `${renderPageHeading(page)}${renderTextBlocks(page.blocks)}`;
  }

  function renderTocSections(sections) {
    const items = sections.flatMap((section) => section.items);
    return `
      <ul class="hw-toc-list">
        ${items.map((item) => `
          <li>
            <button class="hw-toc-button" type="button" data-hw-jump="${item.pageIndex}">
              <span>${escapeHtml(item.title)}</span>
            </button>
          </li>
        `).join("")}
      </ul>
    `;
  }

  function renderPageArticle(page) {
    if (!page) {
      return `
        <article class="hw-page-article">
          <p class="hw-running-head"></p>
          <div class="hw-page-body"></div>
          <footer class="hw-page-footer"></footer>
        </article>
      `;
    }

    if (page.kind === "cover") {
      return `
        <article class="hw-page-article">
          <p class="hw-running-head">Human Writes</p>
          <div class="hw-page-body hw-page-body--cover">
            <img class="hw-cover-image" src="${escapeHtml(page.image)}" alt="Human Writes cover" loading="lazy" decoding="async">
            <div class="hw-cover-copy">
              <h2>${escapeHtml(page.title)}</h2>
              <p>${escapeHtml(page.subtitle)}</p>
            </div>
          </div>
          <footer class="hw-page-footer">
                        <span class="hw-page-count">${page.pageNumber}</span>
          </footer>
        </article>
      `;
    }

    if (page.kind === "intro") {
      return `
        <article class="hw-page-article">
          <p class="hw-running-head">Human Writes</p>
          <div class="hw-page-body hw-page-body--intro">
            <h2>${escapeHtml(page.title)}</h2>
            <p>${escapeHtml(page.body)}</p>
          </div>
          <footer class="hw-page-footer">
                        <span class="hw-page-count">${page.pageNumber}</span>
          </footer>
        </article>
      `;
    }

    if (page.kind === "toc") {
      const rtlClass = page.language === "he" ? " hw-page-body--rtl" : "";
      return `
        <article class="hw-page-article">
          <p class="hw-running-head">Human Writes</p>
          <div class="hw-page-body hw-page-body--toc${rtlClass}">
            <h2>${escapeHtml(page.title)}</h2>
            ${renderTocSections(page.sections)}
          </div>
          <footer class="hw-page-footer">
                        <span class="hw-page-count">${page.pageNumber}</span>
          </footer>
        </article>
      `;
    }

    if (page.kind === "divider") {
      return `
        <article class="hw-page-article">
          <p class="hw-running-head">Human Writes</p>
          <div class="hw-page-body hw-page-body--quote">
            <blockquote>${escapeHtml(page.quote)}</blockquote>
          </div>
          <footer class="hw-page-footer">
                        <span class="hw-page-count">${page.pageNumber}</span>
          </footer>
        </article>
      `;
    }

    const rtlClass = page.language === "he" ? " hw-page-body--rtl" : "";
    const layout = page.layout || "text";
    if (layout === "full-image" && page.image) {
      return `
        <article class="hw-page-article">
          <p class="hw-running-head">Human Writes</p>
          <div class="hw-page-body hw-page-body--full-image${rtlClass}">
            <div class="hw-full-image-figure">
              <img class="hw-inline-image" src="${escapeHtml(page.image)}" alt="${escapeHtml(page.title)}" loading="lazy" decoding="async">
              <div class="hw-full-image-caption">
                ${renderTextFlow(page)}
              </div>
            </div>
          </div>
          <footer class="hw-page-footer">
                        <span class="hw-page-count">${page.pageNumber}</span>
          </footer>
        </article>
      `;
    }

    if (layout === "image-top" && page.image) {
      return `
        <article class="hw-page-article">
          <p class="hw-running-head">Human Writes</p>
          <div class="hw-page-body hw-page-body--image-top${rtlClass}">
            <img class="hw-inline-image" src="${escapeHtml(page.image)}" alt="${escapeHtml(page.title)}" loading="lazy" decoding="async">
            <div class="hw-text-flow">${renderTextFlow(page)}</div>
          </div>
          <footer class="hw-page-footer">
                        <span class="hw-page-count">${page.pageNumber}</span>
          </footer>
        </article>
      `;
    }

    if (layout === "image-split" && page.image) {
      return `
        <article class="hw-page-article">
          <p class="hw-running-head">Human Writes</p>
          <div class="hw-page-body hw-page-body--image-split${rtlClass}">
            <img class="hw-inline-image" src="${escapeHtml(page.image)}" alt="${escapeHtml(page.title)}" loading="lazy" decoding="async">
            <div class="hw-text-flow">${renderTextFlow(page)}</div>
          </div>
          <footer class="hw-page-footer">
                        <span class="hw-page-count">${page.pageNumber}</span>
          </footer>
        </article>
      `;
    }

    if (layout === "quote") {
      return `
        <article class="hw-page-article">
          <p class="hw-running-head">Human Writes</p>
          <div class="hw-page-body hw-page-body--quote${rtlClass}">
            <div class="hw-text-flow">${renderTextFlow(page)}</div>
          </div>
          <footer class="hw-page-footer">
                        <span class="hw-page-count">${page.pageNumber}</span>
          </footer>
        </article>
      `;
    }

    return `
      <article class="hw-page-article">
        <p class="hw-running-head">Human Writes</p>
        <div class="hw-page-body hw-page-body--text${rtlClass}">
          <div class="hw-text-flow">${renderTextFlow(page)}</div>
        </div>
        <footer class="hw-page-footer">
                    <span class="hw-page-count">${page.pageNumber}</span>
        </footer>
      </article>
    `;
  }

  function getLanguageLabel(language) {
    if (language === "he") return "Hebrew";
    if (language === "es") return "Spanish";
    return "English";
  }

  function syncResponsiveState() {
    state.isMobile = window.matchMedia(MOBILE_QUERY).matches;
  }

  function getReferencePageElement() {
    return state.isMobile ? state.refs.single : state.refs.left;
  }

  function syncMeasureBox() {
    const reference = getReferencePageElement();
    if (!reference || !state.refs.measure) return;

    const rect = reference.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width || reference.clientWidth || 420));
    const height = Math.max(420, Math.round(rect.height || reference.clientHeight || 620));

    state.refs.measure.style.width = `${width}px`;
    state.refs.measure.style.height = `${height}px`;
  }

  function pageFits(entry, blocks, layout) {
    const page = {
      kind: "text",
      title: entry.title,
      runningTitle: entry.title,
      language: entry.language,
      languageLabel: getLanguageLabel(entry.language),
      layout,
      image: entry.image,
      blocks,
      part: 1,
      totalParts: 1,
      pageNumber: 999
    };

    state.refs.measure.innerHTML = renderPageArticle(page);
    const article = state.refs.measure.firstElementChild;
    if (!article) return false;
    return article.scrollHeight <= state.refs.measure.clientHeight + 1;
  }

  function fitBlockCount(entry, blocks, startIndex, layout) {
    const remaining = blocks.length - startIndex;
    if (remaining <= 0) return 0;

    let low = 1;
    let high = remaining;
    let best = 0;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const slice = blocks.slice(startIndex, startIndex + middle);
      if (pageFits(entry, slice, layout)) {
        best = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    return best;
  }

  function paginateEntry(entry) {
    const blocks = splitBodyIntoBlocks(entry.body);
    const pages = [];
    let startIndex = 0;

    while (startIndex < blocks.length) {
      const layout = startIndex === 0 ? entry.layout : "text";
      let fitCount = fitBlockCount(entry, blocks, startIndex, layout);

      if (fitCount === 0) {
        const splitBlocks = splitOversizedBlock(blocks[startIndex]);
        if (splitBlocks.length === 1) {
          fitCount = 1;
        } else {
          blocks.splice(startIndex, 1, ...splitBlocks);
          continue;
        }
      }

      pages.push({
        kind: "text",
        key: `text:${entry.id}:${startIndex}`,
        entryId: entry.id,
        title: entry.title,
        runningTitle: entry.title,
        language: entry.language,
        languageLabel: getLanguageLabel(entry.language),
        direction: entry.language === "he" ? -1 : 1,
        layout,
        image: entry.image,
        blocks: blocks.slice(startIndex, startIndex + fitCount),
        startIndex
      });

      startIndex += fitCount;
    }

    const totalParts = pages.length;
    pages.forEach((page, index) => {
      page.part = index + 1;
      page.totalParts = totalParts;
    });

    return pages;
  }

  function createTocPageConfig() {
    return {
      left: {
        kind: "toc",
        key: "toc-ltr",
        title: "Contents",
        runningTitle: "Human Writes",
        language: "en",
        languageLabel: "Contents",
        direction: 1,
        sections: [
          { heading: "", items: [] },
          { heading: "", items: [] }
        ]
      },
      right: {
        kind: "toc",
        key: "toc-he",
        title: "Contents",
        runningTitle: "Human Writes",
        language: "he",
        languageLabel: "Contents",
        direction: 1,
        sections: [
          { heading: "", items: [] }
        ]
      }
    };
  }
  function buildBookPages(entries) {
    const pages = [
      {
        kind: "cover",
        key: "cover",
        title: "Human Writes",
        subtitle: "Three languages. One notebook. Two reading directions.",
        runningTitle: "Human Writes",
        language: "en",
        languageLabel: "Cover",
        direction: 1,
        image: "images/more/human-writes.png"
      },
      {
        kind: "intro",
        key: "intro",
        title: "Welcome",
        runningTitle: "Human Writes",
        language: "en",
        languageLabel: "Introduction",
        direction: 1,
        body: "A spiral notebook for English, Hebrew and Spanish texts. English and Spanish begin at the front. Hebrew starts from the back, and page direction reverses once you arrive there."
      }
    ];

    const toc = createTocPageConfig();
    const pageIndexByEntry = new Map();
    const tocSectionsByLanguage = {
      en: toc.left.sections[0],
      es: toc.left.sections[1],
      he: toc.right.sections[0]
    };

    pages.push(toc.left, toc.right);

    const ltrEntries = entries
      .filter((entry) => entry.language === "en" || entry.language === "es")
      .sort((left, right) => {
        if (left.language !== right.language) return left.language.localeCompare(right.language);
        return left.order - right.order;
      });

    for (const entry of ltrEntries) {
      const entryPages = paginateEntry(entry);
      if (!entryPages.length) continue;

      pageIndexByEntry.set(entry.id, pages.length);
      tocSectionsByLanguage[entry.language].items.push({
        title: entry.title,
        pageIndex: pages.length
      });
      pages.push(...entryPages);
    }

    if (pages.length % 2 !== 0) {
      pages.push({
        kind: "divider",
        key: "divider",
        title: "Divider",
        runningTitle: "Turn the notebook",
        language: "en",
        languageLabel: "Direction shift",
        direction: 1,
        quote: "Hebrew texts begin from the back of the notebook.",
        image: ""
      });
    }

    const hebrewEntries = entries
      .filter((entry) => entry.language === "he")
      .sort((left, right) => left.order - right.order);

    for (let entryIndex = hebrewEntries.length - 1; entryIndex >= 0; entryIndex -= 1) {
      const entry = hebrewEntries[entryIndex];
      const entryPages = paginateEntry(entry);
      if (!entryPages.length) continue;

      for (let pageIndex = entryPages.length - 1; pageIndex >= 0; pageIndex -= 1) {
        const page = entryPages[pageIndex];
        if (page.part === 1) {
          pageIndexByEntry.set(entry.id, pages.length);
          tocSectionsByLanguage.he.items.push({
            title: entry.title,
            pageIndex: pages.length
          });
        }
        pages.push(page);
      }
    }

    tocSectionsByLanguage.he.items.reverse();

    pages.forEach((page, index) => {
      page.pageNumber = index + 1;
    });

    return { pages, pageIndexByEntry };
  }

  function getCurrentPageIndex() {
    return state.isMobile ? state.currentPage : state.currentSpread * 2;
  }

  function getCurrentVisiblePages() {
    if (state.isMobile) {
      return [state.pages[state.currentPage]].filter(Boolean);
    }

    const leftIndex = state.currentSpread * 2;
    return [state.pages[leftIndex], state.pages[leftIndex + 1]].filter(Boolean);
  }

  function getCurrentDirection() {
    const visiblePages = getCurrentVisiblePages();
    const focusPage = visiblePages[visiblePages.length - 1] || state.pages[0];
    return focusPage && typeof focusPage.direction === "number" ? focusPage.direction : 1;
  }

  function clampPosition() {
    if (state.isMobile) {
      state.currentPage = Math.max(0, Math.min(state.currentPage, state.pages.length - 1));
      return;
    }

    const maxSpread = Math.max(0, Math.ceil(state.pages.length / 2) - 1);
    state.currentSpread = Math.max(0, Math.min(state.currentSpread, maxSpread));
  }

  function updateNavState() {
    if (!state.refs.prev || !state.refs.next) return;

    const direction = getCurrentDirection();
    state.refs.prev.classList.toggle("is-forward", direction < 0);
    state.refs.next.classList.toggle("is-forward", direction > 0);

    if (state.isMobile) {
      const prevPage = state.currentPage - direction;
      const nextPage = state.currentPage + direction;
      state.refs.prev.disabled = prevPage < 0 || prevPage >= state.pages.length;
      state.refs.next.disabled = nextPage < 0 || nextPage >= state.pages.length;
      return;
    }

    const maxSpread = Math.max(0, Math.ceil(state.pages.length / 2) - 1);
    const prevSpread = state.currentSpread - direction;
    const nextSpread = state.currentSpread + direction;
    state.refs.prev.disabled = prevSpread < 0 || prevSpread > maxSpread;
    state.refs.next.disabled = nextSpread < 0 || nextSpread > maxSpread;
  }

  function preloadImageSource(src) {
    if (!src || state.preloadedImages.has(src)) return;
    const image = new Image();
    image.src = src;
    state.preloadedImages.add(src);
  }

  function preloadNearbyImages() {
    const startIndex = getCurrentPageIndex();
    const indexes = [startIndex - 2, startIndex - 1, startIndex + 1, startIndex + 2];

    indexes.forEach((index) => {
      const page = state.pages[index];
      if (page && page.image) {
        preloadImageSource(page.image);
      }
    });
  }

  function updateStatus() {
    const visiblePages = getCurrentVisiblePages();
    if (!visiblePages.length) return;

    const focusPage = visiblePages[visiblePages.length - 1];
    state.refs.live.textContent = `Human Writes page ${focusPage.pageNumber}`;
  }

  function render() {
    if (!state.root || !state.pages.length) return;

    clampPosition();

    if (state.isMobile) {
      state.refs.single.innerHTML = renderPageArticle(state.pages[state.currentPage]);
      state.refs.left.innerHTML = "";
      state.refs.right.innerHTML = "";
    } else {
      const leftIndex = state.currentSpread * 2;
      state.refs.left.innerHTML = renderPageArticle(state.pages[leftIndex]);
      state.refs.right.innerHTML = renderPageArticle(state.pages[leftIndex + 1]);
      state.refs.single.innerHTML = "";
    }

    updateNavState();
    updateStatus();
    preloadNearbyImages();
  }

  function playFlipSound() {
    try {
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      const context = state.audioCtx;
      const time = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(720, time);
      oscillator.frequency.exponentialRampToValueAtTime(310, time + 0.08);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.02, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.09);
    } catch {
      // Ignore browsers that block sound without a gesture.
    }
  }

  function animateFlip() {
    if (!state.root) return;

    state.root.classList.remove("is-flipping");
    requestAnimationFrame(() => {
      if (!state.root) return;
      state.root.classList.add("is-flipping");
      window.setTimeout(() => {
        if (state.root) {
          state.root.classList.remove("is-flipping");
        }
      }, 280);
    });
  }

  function move(stepKind) {
    if (!state.pages.length) return;

    const direction = getCurrentDirection();
    state.refs.prev.classList.toggle("is-forward", direction < 0);
    state.refs.next.classList.toggle("is-forward", direction > 0);
    const step = stepKind === "next" ? direction : -direction;

    if (state.isMobile) {
      const nextPage = state.currentPage + step;
      if (nextPage < 0 || nextPage >= state.pages.length) return;
      state.currentPage = nextPage;
    } else {
      const maxSpread = Math.max(0, Math.ceil(state.pages.length / 2) - 1);
      const nextSpread = state.currentSpread + step;
      if (nextSpread < 0 || nextSpread > maxSpread) return;
      state.currentSpread = nextSpread;
    }

    render();
    animateFlip();
    playFlipSound();
  }

  function goToPage(targetIndex) {
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= state.pages.length) return;

    let changed = false;

    if (state.isMobile) {
      changed = state.currentPage !== targetIndex;
      state.currentPage = targetIndex;
    } else {
      const targetSpread = Math.floor(targetIndex / 2);
      changed = state.currentSpread !== targetSpread;
      state.currentSpread = targetSpread;
    }

    if (!changed) return;

    render();
    animateFlip();
    playFlipSound();
  }

  function getContentsPageIndex() {
    const tocIndex = state.pages.findIndex((page) => page && page.key === "toc-ltr");
    return tocIndex >= 0 ? tocIndex : 0;
  }

  function repaginate(preserveKey) {
    syncResponsiveState();
    syncMeasureBox();

    const built = buildBookPages(state.entries);
    state.pages = built.pages;
    state.pageIndexByEntry = built.pageIndexByEntry;

    if (preserveKey) {
      const nextIndex = state.pages.findIndex((page) => page.key === preserveKey || page.entryId === preserveKey);
      if (nextIndex >= 0) {
        if (state.isMobile) {
          state.currentPage = nextIndex;
        } else {
          state.currentSpread = Math.floor(nextIndex / 2);
        }
      }
    }

    render();
  }

  function getCurrentPreserveKey() {
    const currentPage = state.pages[getCurrentPageIndex()];
    return currentPage ? (currentPage.key || currentPage.entryId || "cover") : "cover";
  }

  function onResize() {
    if (!state.root || !state.root.isConnected || document.body.dataset.page !== PAGE_ID) return;

    const preserveKey = getCurrentPreserveKey();
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(() => {
      repaginate(preserveKey);
    }, 120);
  }

  function handleClick(event) {
    const nav = event.target.closest("[data-hw-nav]");
    if (nav) {
      move(nav.dataset.hwNav === "next" ? "next" : "prev");
      return;
    }

    if (event.target.closest("[data-hw-contents]")) {
      goToPage(getContentsPageIndex());
      return;
    }

    const jump = event.target.closest("[data-hw-jump]");
    if (jump) {
      goToPage(Number(jump.dataset.hwJump));
    }
  }

  function isTypingTarget(target) {
    return target instanceof Element && Boolean(
      target.closest("input, textarea, select, [contenteditable='true']")
    );
  }

  function handleKeydown(event) {
    if (document.body.dataset.page !== PAGE_ID || !state.root || !state.root.isConnected) return;
    if (isTypingTarget(event.target)) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move("prev");
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      move("next");
      return;
    }

    if (event.key.toLowerCase() === "c") {
      event.preventDefault();
      goToPage(getContentsPageIndex());
    }
  }

  function handleTouchStart(event) {
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;

    state.touchStartX = touch.clientX;
    state.touchStartY = touch.clientY;
  }

  function handleTouchEnd(event) {
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch || state.touchStartX == null || state.touchStartY == null) return;

    const dx = touch.clientX - state.touchStartX;
    const dy = touch.clientY - state.touchStartY;
    state.touchStartX = null;
    state.touchStartY = null;

    if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy)) return;
    move(dx < 0 ? "next" : "prev");
  }

  function bindEvents() {
    if (!state.root || state.root.dataset.hwBound === "true") return;

    state.root.dataset.hwBound = "true";
    state.root.addEventListener("click", handleClick);
    state.refs.book.addEventListener("touchstart", handleTouchStart, { passive: true });
    state.refs.book.addEventListener("touchend", handleTouchEnd, { passive: true });

    if (!state.globalListenersBound) {
      state.globalListenersBound = true;
      window.addEventListener("keydown", handleKeydown);
      window.addEventListener("resize", onResize);
    }
  }

  function showError(message) {
    if (!state.mount) return;

    state.mount.innerHTML = `
      <section class="hw-module" aria-label="Human Writes notebook unavailable">
        <div class="hw-toolbar-copy">
          <p class="hw-eyebrow">Notebook Module</p>
          <h1 class="hw-title">Human Writes</h1>
        </div>
        <div class="hw-book">
          <div class="hw-page hw-page--single" style="display:block; margin:0;">
            <article class="hw-page-article">
              <p class="hw-running-head">Module status</p>
              <div class="hw-page-body hw-page-body--intro">
                <h2>Unable to load the notebook</h2>
                <p>${escapeHtml(message)}</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    `;
  }

  function afterLayout() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  async function mountHumanWrites(mount) {
    const token = ++state.buildToken;
    const [templateMarkup, rawText] = await Promise.all([
      fetchTemplateMarkup(),
      fetchTextSource()
    ]);

    if (token !== state.buildToken || document.body.dataset.page !== PAGE_ID || !mount.isConnected) {
      return;
    }

    const entries = decorateEntries(parseTextEntries(rawText));
    if (!entries.length) {
      throw new Error("No Human Writes texts were found.");
    }

    mount.innerHTML = templateMarkup;
    state.mount = mount;
    state.root = mount.querySelector("[data-hw-module]");
    if (!state.root) throw new Error("Human Writes mount failed");

    captureRefs();
    state.entries = entries;
    syncResponsiveState();
    bindEvents();

    await afterLayout();
    repaginate("cover");
  }

  async function initializeHumanWrites() {
    if (document.body.dataset.page !== PAGE_ID) {
      resetMountState();
      return;
    }

    const mount = document.querySelector("[data-human-writes-mount]");
    if (!mount) {
      resetMountState();
      return;
    }

    if (mount.closest("[hidden]")) {
      return;
    }

    if (mount === state.mount && state.root && state.root.isConnected) {
      captureRefs();
      bindEvents();
      syncResponsiveState();
      syncMeasureBox();
      render();
      return;
    }

    if (state.initPromise) {
      return state.initPromise;
    }

    state.initPromise = (async () => {
      try {
        resetMountState();
        state.mount = mount;
        await mountHumanWrites(mount);
      } catch (error) {
        showError(error instanceof Error ? error.message : "Unknown Human Writes error");
      } finally {
        state.initPromise = null;
      }
    })();

    return state.initPromise;
  }

  window.initHumanWrites = initializeHumanWrites;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void initializeHumanWrites();
    }, { once: true });
  } else {
    void initializeHumanWrites();
  }
})();



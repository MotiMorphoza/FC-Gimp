(function () {
  const PAGE_ID = "more";
  const MOBILE_QUERY = "(max-width: 980px)";
  const TEMPLATE_URL = "human-writes.html";
  const COVER_IMAGE = "data/hw/pics/human-writes-notebook.png";
  const GENERATED_CONTENT_URL = () => `data/hw/generated/human-writes.generated.json${versionQuery()}`;
  const SWIPE_HINT_STORAGE_KEY = "hwSwipeHintSeen";
  const PAGE_INDEX_STORAGE_KEY = "hwCurrentPageIndex";

  const OPENING_SPREAD = {
    coverImage: COVER_IMAGE,
    coverTitle: "CAKE EAT EASY..",
    coverSubtitle: "LIFE is what happens before we die.\n(Confuse Use)",
    introTitle: "Welcome",
    introBody: "You are going to read\na piece of my mind.\nIt's not about peace\nI hope you don't mind."
  };

  const LAYOUT_CODE_MAP = {
    "01": "text",
    "02": "image-top",
    "03": "image-split",
    "04": "quote",
    "05": "full-image"
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
    swipeHintDismissed: false,
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

  function slugKey(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9\u0590-\u05ff]+/g, "") || "text";
  }

  function normalizeLayoutCode(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d+$/.test(raw)) return raw.padStart(2, "0");
    return raw;
  }

  function normalizeGeneratedEntries(items) {
    if (!Array.isArray(items)) {
      throw new Error("Human Writes generated payload must be an array.");
    }

    const orders = { en: 0, he: 0, es: 0 };
    const normalized = [];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        throw new Error("Human Writes generated entry is invalid.");
      }

      const language = String(item.lang || "").trim().toLowerCase();
      if (!(language in orders)) {
        throw new Error(`Unknown language in generated entry: ${language}`);
      }

      const layoutCode = normalizeLayoutCode(item.layout);
      const layout = LAYOUT_CODE_MAP[layoutCode];
      if (!layout) {
        throw new Error(`Unknown layout code in generated entry: ${layoutCode}`);
      }

      const hidden = item.hidden === true || String(item.hidden || "").trim().toLowerCase() === "true";
      if (hidden) continue;

      orders[language] += 1;
      const title = typeof item.title === "string" ? item.title : "";
      const body = typeof item.body === "string" ? item.body.replace(/\r\n/g, "\n") : "";
      const imageName = typeof item.image === "string" ? item.image.trim() : "";

      normalized.push({
        id: `${language}-${slugKey(title || `entry-${orders[language]}`)}-${orders[language]}`,
        title,
        language,
        order: orders[language],
        body,
        image: imageName ? `data/hw/pics/${imageName}` : "",
        layout
      });
    }

    return normalized;
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

  async function fetchGeneratedEntries() {
    const response = await fetch(GENERATED_CONTENT_URL(), { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`Generated content HTTP ${response.status}`);
    }

    const payload = await response.json();
    return normalizeGeneratedEntries(payload);
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
      mobilePrev: state.root.querySelector('[data-hw-mobile-nav="prev"]'),
      mobileNext: state.root.querySelector('[data-hw-mobile-nav="next"]'),
      mobileContents: state.root.querySelector('[data-hw-mobile-contents]'),
      swipeHint: state.root.querySelector('[data-hw-swipe-hint]'),
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
    return [String(body || "").replace(/\r\n/g, "\n")];
  }

  function renderRawText(text) {
    return `<pre class="hw-raw-text">${escapeHtml(text || "")}</pre>`;
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
        `<blockquote>${renderRawText(leadBlock || "")}</blockquote>`,
        restBlocks.length ? restBlocks.map((block) => renderRawText(block)).join("") : ""
      ].join("");
    }

    return `${renderPageHeading(page)}${page.blocks.map((block) => renderRawText(block)).join("")}`;
  }

  function renderTocSections(sections) {
    const groups = sections.filter((section) => Array.isArray(section.items) && section.items.length > 0);
    return `
      <div class="hw-toc-groups">
        ${groups.map((section, index) => `
          <div class="hw-toc-group">
            <ul class="hw-toc-list">
              ${section.items.map((item) => `
                <li>
                  <button class="hw-toc-button" type="button" data-hw-jump="${item.pageIndex}">
                    <span class="hw-toc-mark" aria-hidden="true"></span>
                    <span class="hw-toc-label">${escapeHtml(item.title)}</span>
                  </button>
                </li>
              `).join("")}
            </ul>
            ${index < groups.length - 1 ? '<div class="hw-toc-divider" aria-hidden="true"></div>' : ''}
          </div>
        `).join("")}
      </div>
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
              <p>${escapeHtml(page.subtitle).replace(/\n/g, "<br>")}</p>
            </div>
          </div>
        </article>
      `;
    }

    if (page.kind === "intro") {
      return `
        <article class="hw-page-article">
          <p class="hw-running-head">Human Writes</p>
          <div class="hw-page-body hw-page-body--intro">
            <h2>${escapeHtml(page.title)}</h2>
            <p>${escapeHtml(page.body).replace(/\n/g, "<br>")}</p>
          </div>
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
        </article>
      `;
    }

    return `
      <article class="hw-page-article">
        <p class="hw-running-head">Human Writes</p>
        <div class="hw-page-body hw-page-body--text${rtlClass}">
          <div class="hw-text-flow">${renderTextFlow(page)}</div>
        </div>
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

  function readSwipeHintPreference() {
    try {
      return window.localStorage.getItem(SWIPE_HINT_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function persistSwipeHintPreference() {
    try {
      window.localStorage.setItem(SWIPE_HINT_STORAGE_KEY, "1");
    } catch {
      // Ignore storage blockers.
    }
  }

  function readPersistedPageIndex() {
    try {
      const raw = window.localStorage.getItem(PAGE_INDEX_STORAGE_KEY);
      if (raw == null) return null;
      const parsed = Number.parseInt(raw, 10);
      return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
    } catch {
      return null;
    }
  }

  function persistPagePosition() {
    if (!state.pages.length) return;
    try {
      window.localStorage.setItem(PAGE_INDEX_STORAGE_KEY, String(getCurrentPageIndex()));
    } catch {
      // Ignore storage blockers.
    }
  }

  function updateSwipeHintState() {
    const hint = state.refs.swipeHint;
    if (!hint) return;

    const shouldShow = state.isMobile && !state.swipeHintDismissed;
    hint.hidden = !shouldShow;
    hint.classList.toggle("is-visible", shouldShow);
  }

  function dismissSwipeHint() {
    if (state.swipeHintDismissed) return;
    state.swipeHintDismissed = true;
    persistSwipeHintPreference();
    updateSwipeHintState();
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

  function paginateEntry(entry) {
    return [{
      kind: "text",
      key: `text:${entry.id}:0`,
      entryId: entry.id,
      title: entry.title,
      runningTitle: entry.title,
      language: entry.language,
      languageLabel: getLanguageLabel(entry.language),
      direction: entry.language === "he" ? -1 : 1,
      layout: entry.layout || "text",
      image: entry.image,
      blocks: splitBodyIntoBlocks(entry.body),
      startIndex: 0,
      part: 1,
      totalParts: 1
    }];
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
        title: "\u05EA\u05D5\u05DB\u05DF \u05E2\u05E0\u05D9\u05D9\u05E0\u05D9\u05DD",
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
        title: OPENING_SPREAD.coverTitle,
        subtitle: OPENING_SPREAD.coverSubtitle,
        runningTitle: "Human Writes",
        language: "en",
        languageLabel: "Cover",
        direction: 1,
        image: OPENING_SPREAD.coverImage
      },
      {
        kind: "intro",
        key: "intro",
        title: OPENING_SPREAD.introTitle,
        runningTitle: "Human Writes",
        language: "en",
        languageLabel: "Introduction",
        direction: 1,
        body: OPENING_SPREAD.introBody
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
    const prevIsForward = direction < 0;
    const nextIsForward = direction > 0;

    [state.refs.prev, state.refs.mobilePrev].forEach((button) => {
      if (button) button.classList.toggle("is-forward", prevIsForward);
    });

    [state.refs.next, state.refs.mobileNext].forEach((button) => {
      if (button) button.classList.toggle("is-forward", nextIsForward);
    });

    if (state.isMobile) {
      const disablePrev = state.currentPage <= 0;
      const disableNext = state.currentPage >= state.pages.length - 1;

      [state.refs.prev, state.refs.mobilePrev].forEach((button) => {
        if (button) button.disabled = disablePrev;
      });

      [state.refs.next, state.refs.mobileNext].forEach((button) => {
        if (button) button.disabled = disableNext;
      });

      updateSwipeHintState();
      return;
    }

    const maxSpread = Math.max(0, Math.ceil(state.pages.length / 2) - 1);
    const disablePrev = state.currentSpread <= 0;
    const disableNext = state.currentSpread >= maxSpread;

    [state.refs.prev, state.refs.mobilePrev].forEach((button) => {
      if (button) button.disabled = disablePrev;
    });

    [state.refs.next, state.refs.mobileNext].forEach((button) => {
      if (button) button.disabled = disableNext;
    });

    updateSwipeHintState();
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

  function isSingleWordWidow(element) {
    const node = element && element.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;

    const text = node.textContent || "";
    const lastMatch = /(\S+)\s*$/.exec(text);
    if (!lastMatch) return false;

    const trailingWhitespace = (text.match(/\s*$/) || [""])[0].length;
    const lastEnd = text.length - trailingWhitespace;
    const lastStart = lastEnd - lastMatch[1].length;
    if (lastStart <= 0) return false;

    const prefix = text.slice(0, lastStart).trimEnd();
    const prevMatch = /(\S+)\s*$/.exec(prefix);
    if (!prevMatch) return false;

    const prevEnd = prefix.length;
    const prevStart = prevEnd - prevMatch[1].length;

    const lastRange = document.createRange();
    lastRange.setStart(node, lastStart);
    lastRange.setEnd(node, lastEnd);
    const lastRect = lastRange.getBoundingClientRect();

    const prevRange = document.createRange();
    prevRange.setStart(node, prevStart);
    prevRange.setEnd(node, prevEnd);
    const prevRect = prevRange.getBoundingClientRect();

    if (!lastRect.height || !prevRect.height) return false;
    return Math.abs(lastRect.top - prevRect.top) > 1;
  }

  function refineMobileTextFlow() {
    if (!state.isMobile) return;
    const article = state.refs.single && state.refs.single.querySelector(".hw-page-article");
    if (!article) return;

    const rawBlocks = article.querySelectorAll(".hw-raw-text");
    rawBlocks.forEach((block) => {
      block.style.removeProperty("font-size");
      const base = parseFloat(window.getComputedStyle(block).fontSize || "14");
      if (!Number.isFinite(base)) return;

      const min = Math.max(11.4, base - 2);
      let nextSize = base;
      while (nextSize > min && isSingleWordWidow(block)) {
        nextSize -= 0.2;
        block.style.fontSize = `${nextSize.toFixed(2)}px`;
      }
    });
  }

  function resetVisiblePageScroll() {
    if (!state.isMobile) return;
    const body = state.refs.single && state.refs.single.querySelector(".hw-page-body");
    if (body) body.scrollTop = 0;
    if (state.refs.single) state.refs.single.scrollTop = 0;
    if (state.refs.book) state.refs.book.scrollTop = 0;
  }

  function render(options = {}) {
    const resetScroll = options.resetScroll === true;
    if (!state.root || !state.pages.length) return;

    clampPosition();

    if (state.isMobile) {
      state.refs.single.innerHTML = renderPageArticle(state.pages[state.currentPage]);
      state.refs.left.innerHTML = "";
      state.refs.right.innerHTML = "";
      refineMobileTextFlow();
    } else {
      const leftIndex = state.currentSpread * 2;
      state.refs.left.innerHTML = renderPageArticle(state.pages[leftIndex]);
      state.refs.right.innerHTML = renderPageArticle(state.pages[leftIndex + 1]);
      state.refs.single.innerHTML = "";
    }

    if (resetScroll) {
      resetVisiblePageScroll();
    }

    updateNavState();
    updateStatus();
    preloadNearbyImages();
    persistPagePosition();
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

    const step = stepKind === "next" ? 1 : -1;

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

    render({ resetScroll: true });
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

    render({ resetScroll: true });
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
    } else {
      const persistedIndex = readPersistedPageIndex();
      if (persistedIndex != null && persistedIndex < state.pages.length) {
        if (state.isMobile) {
          state.currentPage = persistedIndex;
        } else {
          state.currentSpread = Math.floor(persistedIndex / 2);
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
    const nav = event.target.closest("[data-hw-nav], [data-hw-mobile-nav]");
    if (nav) {
      const stepKind = nav.dataset.hwNav || nav.dataset.hwMobileNav;
      move(stepKind === "next" ? "next" : "prev");
      return;
    }

    if (event.target.closest("[data-hw-contents], [data-hw-mobile-contents]")) {
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
    dismissSwipeHint();
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
    const [templateMarkup, entries] = await Promise.all([
      fetchTemplateMarkup(),
      fetchGeneratedEntries()
    ]);

    if (token !== state.buildToken || document.body.dataset.page !== PAGE_ID || !mount.isConnected) {
      return;
    }

    if (!entries.length) {
      throw new Error("No visible Human Writes entries found in generated data.");
    }

    mount.innerHTML = templateMarkup;
    state.mount = mount;
    state.root = mount.querySelector("[data-hw-module]");
    if (!state.root) throw new Error("Human Writes mount failed");

    captureRefs();
    state.entries = entries;
    state.swipeHintDismissed = readSwipeHintPreference();
    syncResponsiveState();
    bindEvents();

    await afterLayout();
    repaginate();
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

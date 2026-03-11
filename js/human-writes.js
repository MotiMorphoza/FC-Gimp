(function () {
  const MOBILE_QUERY = "(max-width: 900px)";
  const LAYOUT_TYPES = ["text", "image-top", "image-split", "quote", "text"];

  const state = {
    entries: [],
    pages: [],
    pageIndexByEntry: new Map(),
    currentSpread: 0,
    currentPage: 0,
    isMobile: false,
    mount: null,
    root: null,
    refs: {},
    tocIndex: 2,
    hebrewStartIndex: -1,
    resizeTimer: null,
    touchStartX: null,
    touchStartY: null,
    audioCtx: null,
    buildToken: 0
  };

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugify(input) {
    return String(input)
      .toLowerCase()
      .replace(/[^a-z0-9\u0590-\u05ff]+/g, "-")
      .replace(/^-+|-+$/g, "") || "text";
  }

  function maybeDecodeMojibake(line) {
    if (!/[Ã×Ö]/.test(line)) return line;

    try {
      const bytes = Uint8Array.from(Array.from(line, (ch) => ch.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder("utf-8").decode(bytes);
      const originalScore = (line.match(/[\u0590-\u05FFáéíóúñÁÉÍÓÚÑ]/g) || []).length;
      const decodedScore = (decoded.match(/[\u0590-\u05FFáéíóúñÁÉÍÓÚÑ]/g) || []).length;
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
    const t = line.trim().toLowerCase();
    if (/^english\s+texts?$/.test(t)) return "en";
    if (/^hebrew\s+texts?$/.test(t)) return "he";
    if (/^spanish\s+texts?$/.test(t)) return "es";
    return null;
  }

  function isSeparator(line) {
    return /^\*{3,}\s*$/.test(line.trim());
  }

  function isUnderline(line) {
    return /^[-=]{3,}\s*$/.test(line.trim());
  }

  function nextNonEmpty(lines, from) {
    for (let i = from; i < lines.length; i += 1) {
      if (lines[i].trim()) return i;
    }
    return -1;
  }

  function isTitleStart(lines, index) {
    const line = lines[index]?.trim();
    if (!line) return false;
    if (isSeparator(line)) return false;

    const nextIndex = nextNonEmpty(lines, index + 1);
    if (nextIndex === -1) return false;
    return isUnderline(lines[nextIndex]);
  }

  function compactBody(lines) {
    const out = [];
    let blank = false;

    for (const raw of lines) {
      const line = raw.replace(/\s+$/g, "");
      if (!line.trim()) {
        if (!blank && out.length) out.push("");
        blank = true;
      } else {
        out.push(line);
        blank = false;
      }
    }

    while (out.length && !out[0].trim()) out.shift();
    while (out.length && !out[out.length - 1].trim()) out.pop();
    return out.join("\n");
  }

  function parseTextEntries(raw) {
    const lines = normalizeRawText(raw).split("\n");
    const entries = [];
    let language = null;
    let orderByLang = { en: 0, he: 0, es: 0 };

    for (let i = 0; i < lines.length; i += 1) {
      const current = lines[i] || "";
      const detected = detectLanguage(current);
      if (detected) {
        language = detected;
        continue;
      }

      if (!language || isSeparator(current) || !current.trim()) continue;
      if (!isTitleStart(lines, i)) continue;

      const title = (lines[i] || "").trim();
      const bodyLines = [];
      const titleUnderlineIndex = nextNonEmpty(lines, i + 1);
      i = titleUnderlineIndex;

      for (let j = i + 1; j < lines.length; j += 1) {
        const line = lines[j] || "";
        if (detectLanguage(line) || isSeparator(line) || isTitleStart(lines, j)) {
          i = j - 1;
          break;
        }

        bodyLines.push(line);
        if (j === lines.length - 1) i = j;
      }

      const body = compactBody(bodyLines);
      if (!body) continue;

      orderByLang = { ...orderByLang, [language]: orderByLang[language] + 1 };
      const order = orderByLang[language];
      const layout = LAYOUT_TYPES[(order - 1) % LAYOUT_TYPES.length];

      entries.push({
        id: `${language}-${slugify(title)}-${order}`,
        title,
        language,
        order,
        body,
        image: null,
        layout
      });
    }

    return entries;
  }

  function splitByScore(text, maxScore) {
    const blocks = text.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
    const pages = [];
    let current = [];
    let score = 0;

    function blockScore(block) {
      const lineBreaks = (block.match(/\n/g) || []).length;
      return block.length + lineBreaks * 24;
    }

    function splitOversized(block) {
      const words = block.split(/\s+/).filter(Boolean);
      const chunks = [];
      let chunk = [];
      let chunkScore = 0;

      for (const word of words) {
        const wordScore = word.length + 1;
        if (chunkScore + wordScore > maxScore && chunk.length) {
          chunks.push(chunk.join(" "));
          chunk = [word];
          chunkScore = wordScore;
        } else {
          chunk.push(word);
          chunkScore += wordScore;
        }
      }

      if (chunk.length) chunks.push(chunk.join(" "));
      return chunks;
    }

    for (const block of blocks) {
      const bScore = blockScore(block);
      if (bScore > maxScore) {
        const pieces = splitOversized(block);
        for (const piece of pieces) {
          if (score + piece.length > maxScore && current.length) {
            pages.push(current.join("\n\n"));
            current = [];
            score = 0;
          }
          current.push(piece);
          score += piece.length;
        }
        continue;
      }

      if (score + bScore > maxScore && current.length) {
        pages.push(current.join("\n\n"));
        current = [];
        score = 0;
      }

      current.push(block);
      score += bScore;
    }

    if (current.length) pages.push(current.join("\n\n"));
    return pages.length ? pages : [text];
  }

  function layoutForChunk(entry, chunkIndex) {
    if (chunkIndex > 0) return "text";
    return entry.layout || "text";
  }

  function buildPages(entries) {
    const pages = [];
    const pageIndexByEntry = new Map();

    pages.push({
      kind: "cover",
      title: "Human Writes",
      runningTitle: "Human Writes",
      pageNumber: 1,
      language: "en",
      image: "images/more/human-writes.png"
    });

    pages.push({
      kind: "intro",
      title: "Introduction",
      runningTitle: "Human Writes",
      pageNumber: 2,
      language: "en",
      intro: "Three languages. One notebook. Turn the pages naturally in English and Spanish, then from the back in Hebrew with reversed direction."
    });

    pages.push({
      kind: "toc-ltr",
      title: "Contents",
      runningTitle: "Contents",
      pageNumber: 3,
      language: "en"
    });

    pages.push({
      kind: "toc-he",
      title: "תוכן עניינים",
      runningTitle: "תוכן עניינים",
      pageNumber: 4,
      language: "he"
    });

    const maxScore = window.matchMedia(MOBILE_QUERY).matches ? 700 : 1150;

    const ltrEntries = entries
      .filter((entry) => entry.language === "en" || entry.language === "es")
      .sort((a, b) => {
        if (a.language !== b.language) return a.language.localeCompare(b.language);
        return a.order - b.order;
      });

    for (const entry of ltrEntries) {
      const chunks = splitByScore(entry.body, maxScore);
      chunks.forEach((chunk, index) => {
        const pageIndex = pages.length;
        if (index === 0) pageIndexByEntry.set(entry.id, pageIndex);
        pages.push({
          kind: "text",
          entryId: entry.id,
          title: entry.title,
          runningTitle: entry.title,
          language: entry.language,
          order: entry.order,
          part: index + 1,
          total: chunks.length,
          layout: layoutForChunk(entry, index),
          body: chunk,
          image: entry.image,
          pageNumber: pageIndex + 1
        });
      });
    }

    if (pages.length % 2 !== 0) {
      pages.push({
        kind: "divider",
        title: "",
        runningTitle: "",
        language: "en",
        quote: "Turn from the back for Hebrew texts.",
        pageNumber: pages.length + 1
      });
    }

    const hebrewStartIndex = pages.length;
    const heEntries = entries
      .filter((entry) => entry.language === "he")
      .sort((a, b) => a.order - b.order);

    for (let e = heEntries.length - 1; e >= 0; e -= 1) {
      const entry = heEntries[e];
      const chunks = splitByScore(entry.body, maxScore);
      for (let i = chunks.length - 1; i >= 0; i -= 1) {
        const pageIndex = pages.length;
        if (i === 0) pageIndexByEntry.set(entry.id, pageIndex);
        pages.push({
          kind: "text",
          entryId: entry.id,
          title: entry.title,
          runningTitle: entry.title,
          language: entry.language,
          order: entry.order,
          part: i + 1,
          total: chunks.length,
          layout: i === 0 ? layoutForChunk(entry, 0) : "text",
          body: chunks[i],
          image: entry.image,
          pageNumber: pageIndex + 1
        });
      }
    }

    return { pages, pageIndexByEntry, hebrewStartIndex };
  }

  function listFor(entries, language) {
    return entries
      .filter((entry) => entry.language === language)
      .sort((a, b) => a.order - b.order)
      .map((entry) => ({ id: entry.id, title: entry.title }));
  }

  function buildTocData(entries) {
    return {
      ltr: [...listFor(entries, "en"), ...listFor(entries, "es")],
      he: listFor(entries, "he")
    };
  }

  function renderParagraphs(text) {
    return text
      .split(/\n\n+/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function tocMarkup(items, pageMap, langCode) {
    const list = items
      .map((item) => {
        const target = pageMap.get(item.id);
        const safeTarget = Number.isInteger(target) ? target : 0;
        return `<li class="hw-toc-item"><button class="hw-toc-button" data-hw-jump="${safeTarget}" data-hw-lang="${langCode}" type="button">${escapeHtml(item.title)}</button></li>`;
      })
      .join("");
    return `<ul class="hw-toc-list">${list}</ul>`;
  }

  function pageMarkup(page, tocData) {
    if (!page) {
      return "<article class=\"hw-page-inner\"><header class=\"hw-running-head\"></header><div class=\"hw-content\"></div><footer class=\"hw-page-number\"></footer></article>";
    }

    if (page.kind === "cover") {
      return `<article class="hw-page-inner"><header class="hw-running-head">Human Writes</header><div class="hw-content hw-content--cover"><img class="hw-cover-image" src="${escapeHtml(page.image || "images/more/human-writes.png")}" alt="Human Writes cover" loading="lazy" decoding="async"><h2 class="hw-cover-title">Human Writes</h2></div><footer class="hw-page-number">${page.pageNumber}</footer></article>`;
    }

    if (page.kind === "intro") {
      return `<article class="hw-page-inner"><header class="hw-running-head">Human Writes</header><div class="hw-content hw-content--intro"><h2 class="hw-intro-title">Welcome</h2><p class="hw-intro-copy">${escapeHtml(page.intro || "")}</p></div><footer class="hw-page-number">${page.pageNumber}</footer></article>`;
    }

    if (page.kind === "toc-ltr") {
      return `<article class="hw-page-inner"><header class="hw-running-head">Contents</header><div class="hw-content hw-content--toc"><h2>Contents (EN + ES)</h2>${tocMarkup(tocData.ltr, state.pageIndexByEntry, "ltr")}</div><footer class="hw-page-number">${page.pageNumber}</footer></article>`;
    }

    if (page.kind === "toc-he") {
      return `<article class="hw-page-inner"><header class="hw-running-head">תוכן עניינים</header><div class="hw-content hw-content--toc hw-content--text he"><h2>תוכן עניינים</h2>${tocMarkup(tocData.he, state.pageIndexByEntry, "he")}</div><footer class="hw-page-number">${page.pageNumber}</footer></article>`;
    }

    if (page.kind === "divider") {
      return `<article class="hw-page-inner"><header class="hw-running-head">Human Writes</header><div class="hw-content hw-content--quote"><blockquote>${escapeHtml(page.quote || "")}</blockquote></div><footer class="hw-page-number">${page.pageNumber}</footer></article>`;
    }

    const rtlClass = page.language === "he" ? " he" : "";
    const header = escapeHtml(page.runningTitle || "Human Writes");
    const body = renderParagraphs(page.body || "");
    const fallbackImage = "images/more/human-writes.gif";
    const image = escapeHtml(page.image || fallbackImage);

    if (page.layout === "image-top") {
      return `<article class="hw-page-inner"><header class="hw-running-head">${header}</header><div class="hw-content hw-content--image-top${rtlClass}"><img class="hw-media" src="${image}" alt="${escapeHtml(page.title)}" loading="lazy" decoding="async"><div class="hw-content hw-content--text${rtlClass}">${body}</div></div><footer class="hw-page-number">${page.pageNumber}</footer></article>`;
    }

    if (page.layout === "image-split") {
      return `<article class="hw-page-inner"><header class="hw-running-head">${header}</header><div class="hw-content hw-content--image-split${rtlClass}"><img class="hw-media" src="${image}" alt="${escapeHtml(page.title)}" loading="lazy" decoding="async"><div class="hw-content hw-content--text${rtlClass}">${body}</div></div><footer class="hw-page-number">${page.pageNumber}</footer></article>`;
    }

    if (page.layout === "quote") {
      const quoteLine = page.body.split(/\n+/).find((line) => line.trim()) || page.title;
      return `<article class="hw-page-inner"><header class="hw-running-head">${header}</header><div class="hw-content hw-content--quote${rtlClass}"><blockquote>${escapeHtml(quoteLine)}</blockquote></div><footer class="hw-page-number">${page.pageNumber}</footer></article>`;
    }

    if (page.layout === "full-image") {
      return `<article class="hw-page-inner"><header class="hw-running-head">${header}</header><div class="hw-content hw-content--full-image"><img class="hw-media" src="${image}" alt="${escapeHtml(page.title)}" loading="lazy" decoding="async"></div><footer class="hw-page-number">${page.pageNumber}</footer></article>`;
    }

    return `<article class="hw-page-inner"><header class="hw-running-head">${header}</header><div class="hw-content hw-content--text${rtlClass}">${body}</div><footer class="hw-page-number">${page.pageNumber}</footer></article>`;
  }

  function currentDirection() {
    const focusIndex = state.isMobile
      ? state.currentPage
      : Math.min(state.pages.length - 1, state.currentSpread * 2 + 1);
    const focusPage = state.pages[focusIndex] || state.pages[state.currentSpread * 2];
    return focusPage && focusPage.language === "he" ? -1 : 1;
  }

  function maxSpread() {
    return Math.max(0, Math.ceil(state.pages.length / 2) - 1);
  }

  function updateNavState() {
    const prev = state.refs.prev;
    const next = state.refs.next;
    if (!prev || !next) return;

    const dir = currentDirection();
    if (state.isMobile) {
      prev.disabled = state.currentPage - dir < 0 || state.currentPage - dir >= state.pages.length;
      next.disabled = state.currentPage + dir < 0 || state.currentPage + dir >= state.pages.length;
      return;
    }

    prev.disabled = state.currentSpread - dir < 0 || state.currentSpread - dir > maxSpread();
    next.disabled = state.currentSpread + dir < 0 || state.currentSpread + dir > maxSpread();
  }

  function playFlipSound() {
    try {
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = state.audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.028, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore audio failures (autoplay or unsupported context).
    }
  }

  function preloadNearby() {
    const indexes = [];
    if (state.isMobile) {
      indexes.push(state.currentPage + 1, state.currentPage - 1, state.currentPage + 2);
    } else {
      const base = state.currentSpread * 2;
      indexes.push(base + 2, base + 3, base - 2, base - 1);
    }

    indexes.forEach((index) => {
      const page = state.pages[index];
      if (!page || !page.image) return;
      const img = new Image();
      img.src = page.image;
    });
  }

  function render() {
    const tocData = buildTocData(state.entries);
    const leftIndex = state.currentSpread * 2;
    const rightIndex = leftIndex + 1;

    if (state.isMobile) {
      state.refs.single.innerHTML = pageMarkup(state.pages[state.currentPage], tocData);
    } else {
      state.refs.left.innerHTML = pageMarkup(state.pages[leftIndex], tocData);
      state.refs.right.innerHTML = pageMarkup(state.pages[rightIndex], tocData);
    }

    state.refs.live.textContent = state.isMobile
      ? `Page ${state.currentPage + 1}`
      : `Pages ${leftIndex + 1}-${Math.min(rightIndex + 1, state.pages.length)}`;

    updateNavState();
    preloadNearby();
  }

  function flipAnimation() {
    state.root.classList.remove("hw-is-flipping");
    requestAnimationFrame(() => {
      state.root.classList.add("hw-is-flipping");
      window.setTimeout(() => state.root.classList.remove("hw-is-flipping"), 300);
    });
  }

  function goToIndex(targetPageIndex) {
    if (!Number.isInteger(targetPageIndex)) return;
    if (targetPageIndex < 0 || targetPageIndex >= state.pages.length) return;

    if (state.isMobile) {
      state.currentPage = targetPageIndex;
    } else {
      state.currentSpread = Math.floor(targetPageIndex / 2);
    }

    render();
    flipAnimation();
    playFlipSound();
  }

  function move(stepKind) {
    const dir = currentDirection();
    const step = stepKind === "next" ? dir : -dir;

    if (state.isMobile) {
      const nextPage = state.currentPage + step;
      if (nextPage < 0 || nextPage >= state.pages.length) return;
      state.currentPage = nextPage;
    } else {
      const nextSpread = state.currentSpread + step;
      if (nextSpread < 0 || nextSpread > maxSpread()) return;
      state.currentSpread = nextSpread;
    }

    render();
    flipAnimation();
    playFlipSound();
  }

  function handleClick(event) {
    const nav = event.target.closest("[data-hw-nav]");
    if (nav) {
      move(nav.dataset.hwNav === "next" ? "next" : "prev");
      return;
    }

    const contents = event.target.closest("[data-hw-contents]");
    if (contents) {
      goToIndex(state.tocIndex);
      return;
    }

    const jump = event.target.closest("[data-hw-jump]");
    if (jump) {
      const target = Number(jump.dataset.hwJump);
      if (Number.isInteger(target)) {
        goToIndex(target);
      }
    }
  }

  function handleKeydown(event) {
    if (!state.mount?.contains(document.activeElement) && !state.mount?.contains(event.target)) return;

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
      goToIndex(state.tocIndex);
    }
  }

  function handleTouchStart(event) {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    state.touchStartX = touch.clientX;
    state.touchStartY = touch.clientY;
  }

  function handleTouchEnd(event) {
    const touch = event.changedTouches?.[0];
    if (!touch || state.touchStartX == null || state.touchStartY == null) return;

    const dx = touch.clientX - state.touchStartX;
    const dy = touch.clientY - state.touchStartY;
    state.touchStartX = null;
    state.touchStartY = null;

    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
    move(dx < 0 ? "next" : "prev");
  }

  function syncResponsiveState() {
    state.isMobile = window.matchMedia(MOBILE_QUERY).matches;
    if (state.isMobile) {
      state.currentPage = state.currentSpread * 2;
    } else {
      state.currentSpread = Math.floor(state.currentPage / 2);
    }
  }

  async function loadTemplate() {
    const response = await fetch("human-writes.html", { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Template HTTP ${response.status}`);

    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const template = parsed.querySelector("template[data-hw-template]");

    if (template) {
      return template.innerHTML;
    }

    return parsed.body ? parsed.body.innerHTML : html;
  }

  async function loadRawTexts() {
    const version = encodeURIComponent(window.__BUILD_VERSION__ || "");
    const candidates = [
      `data/human-writes-texts.txt${version ? `?v=${version}` : ""}`,
      `TEXTS.txt${version ? `?v=${version}` : ""}`
    ];

    for (const url of candidates) {
      const response = await fetch(url, { credentials: "same-origin" });
      if (response.ok) return response.text();
    }

    return fallbackRawTexts();
  }

  function fallbackRawTexts() {
    return [
      "English texts",
      "***************",
      "",
      "KIND",
      "------",
      "The source text file is currently missing.",
      "Please add data/human-writes-texts.txt to restore full content.",
      "",
      "HEBREW TEXTS",
      "**********************",
      "",
      "הערה",
      "-----------",
      "קובץ הטקסט חסר כרגע בפרויקט.",
      "יש להוסיף data/human-writes-texts.txt כדי להציג את כל התכנים.",
      "",
      "Spanish texts",
      "**************",
      "",
      "Nota",
      "----------",
      "El archivo de textos no existe en el proyecto.",
      "Agrega data/human-writes-texts.txt para restaurar el contenido completo."
    ].join("\n");
  }

  function captureRefs(root) {
    state.refs = {
      left: root.querySelector('[data-hw-page="left"]'),
      right: root.querySelector('[data-hw-page="right"]'),
      single: root.querySelector('[data-hw-page="single"]'),
      prev: root.querySelector('[data-hw-nav="prev"]'),
      next: root.querySelector('[data-hw-nav="next"]'),
      contents: root.querySelector('[data-hw-contents]'),
      book: root.querySelector("[data-hw-book]"),
      live: root.querySelector("[data-hw-live]")
    };
  }

  function bindEvents() {
    state.root.addEventListener("click", handleClick);
    state.refs.book?.addEventListener("touchstart", handleTouchStart, { passive: true });
    state.refs.book?.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("resize", () => {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(() => {
        const wasMobile = state.isMobile;
        syncResponsiveState();
        if (wasMobile !== state.isMobile) render();
      }, 120);
    });
  }

  function getMoreRoot() {
    if (document.body.dataset.page !== "more") return null;
    return document.querySelector(".more-pane");
  }

  function showHumanWritesView() {
    const root = getMoreRoot();
    if (!root) return;

    root.querySelector("[data-more-home]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-morphoza-view]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-human-writes-view]")?.removeAttribute("hidden");

    if (!state.root) {
      void initializeHumanWrites();
    }
  }

  function showMoreHome() {
    const root = getMoreRoot();
    if (!root) return;

    root.querySelector("[data-human-writes-view]")?.setAttribute("hidden", "hidden");
    root.querySelector("[data-more-home]")?.removeAttribute("hidden");
  }

  function bindHostNavigation() {
    const root = getMoreRoot();
    if (!root || root.dataset.hwHostBound === "true") return;

    root.dataset.hwHostBound = "true";

    root.addEventListener("click", (event) => {
      const open = event.target.closest("[data-more-open='human-writes']");
      if (open) {
        showHumanWritesView();
        return;
      }

      const back = event.target.closest("[data-human-writes-back]");
      if (back) {
        showMoreHome();
      }
    });

    root.addEventListener("keydown", (event) => {
      const open = event.target.closest("[data-more-open='human-writes']");
      if (!open) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      showHumanWritesView();
    });
  }

  async function initializeHumanWrites() {
    const mount = document.querySelector("[data-human-writes-mount]");
    if (!mount) return;

    state.mount = mount;
    const token = ++state.buildToken;

    const [template, rawTexts] = await Promise.all([loadTemplate(), loadRawTexts()]);
    if (token !== state.buildToken) return;

    mount.innerHTML = template;
    state.root = mount.querySelector("[data-hw-module]");
    if (!state.root) return;

    captureRefs(state.root);
    state.entries = parseTextEntries(rawTexts);

    const built = buildPages(state.entries);
    state.pages = built.pages;
    state.pageIndexByEntry = built.pageIndexByEntry;
    state.hebrewStartIndex = built.hebrewStartIndex;

    syncResponsiveState();
    render();
    bindEvents();
  }

  window.initHumanWrites = function initHumanWrites() {
    bindHostNavigation();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindHostNavigation();
    }, { once: true });
  } else {
    bindHostNavigation();
  }
})();

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_REPORT = '.build-temp/registry-raw-review-all/raw-verification-review.json';
const DEFAULT_SELECTIONS = 'data/raw-review-all-selections.json';
const DEFAULT_REGISTRY = 'data/image-registry.json';
const DEFAULT_HTML = '.build-temp/registry-raw-review-all/unified-image-review.html';

function parseArgs(argv = []) {
  const args = {
    report: DEFAULT_REPORT,
    selections: DEFAULT_SELECTIONS,
    registry: DEFAULT_REGISTRY,
    html: DEFAULT_HTML
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--report') {
      args.report = argv[index + 1] ? String(argv[index + 1]) : args.report;
      index += 1;
      continue;
    }
    if (token === '--selections') {
      args.selections = argv[index + 1] ? String(argv[index + 1]) : args.selections;
      index += 1;
      continue;
    }
    if (token === '--registry') {
      args.registry = argv[index + 1] ? String(argv[index + 1]) : args.registry;
      index += 1;
      continue;
    }
    if (token === '--html') {
      args.html = argv[index + 1] ? String(argv[index + 1]) : args.html;
      index += 1;
    }
  }

  return args;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileUrlFromPath(filePath) {
  if (!filePath) return '';
  const normalized = path.resolve(filePath).replace(/\\/g, '/');
  return `file:///${encodeURI(normalized)}`;
}

function normalizePath(value = '') {
  return String(value || '').replace(/\\/g, '/').trim();
}

function containsCameraCode(value = '', cameraCode = '') {
  if (!value || !cameraCode) return false;
  return String(value).toUpperCase().includes(String(cameraCode).toUpperCase());
}

function padNumber(value, width = 3) {
  return String(value).padStart(width, '0');
}

function deriveSlotKey(siteRelativePath = '', projectSlug = '') {
  const filename = path.basename(String(siteRelativePath || '').trim());
  const stem = path.parse(filename).name;
  const slot = stem.split('__')[0] || stem;
  return `${String(projectSlug || '').trim()}::${slot}`;
}

function buildRegistryLookup(registry, archiveDir) {
  const byImageId = new Map();
  const bySlotKey = new Map();
  const sourceAssetMap = new Map(
    (Array.isArray(registry?.sourceAssets) ? registry.sourceAssets : [])
      .map((asset) => [String(asset?.sourceAssetId || '').trim(), asset])
  );

  for (const image of Array.isArray(registry?.images) ? registry.images : []) {
    const imageId = String(image?.imageId || '').trim();
    if (!imageId) continue;
    const placement = (Array.isArray(image?.placements) ? image.placements : [])[0] || null;
    const variant = (Array.isArray(image?.variants) ? image.variants : [])[0] || null;
    const sourceAssetId = String(image?.sourceAssetId || '').trim();
    const sourceAsset = sourceAssetMap.get(sourceAssetId) || null;
    const sourcePath = normalizePath(
      sourceAsset?.sourcePath ||
      image?.source?.sourcePath ||
      ''
    );
    const siteRelativePath = normalizePath(
      placement?.siteRelativePath ||
      variant?.filePath ||
      ''
    );
    const registryEntry = {
      registryStatus: String(image?.registryStatus || '').trim(),
      cameraCode: String(
        sourceAsset?.cameraCode ||
        image?.source?.cameraCode ||
        variant?.cameraCode ||
        ''
      ).trim(),
      projectSlug: String(placement?.projectSlug || '').trim(),
      siteRelativePath,
      siteFilename: String(
        placement?.currentFilename ||
        variant?.filename ||
        path.basename(siteRelativePath)
      ).trim(),
      absoluteSitePath: siteRelativePath ? path.resolve(process.cwd(), siteRelativePath) : '',
      sourcePath,
      sourceName: String(
        sourceAsset?.sourceName ||
        image?.source?.sourceName ||
        path.basename(sourcePath)
      ).trim(),
      absoluteSourcePath: sourcePath && archiveDir ? path.join(archiveDir, sourcePath) : '',
      jpegDate: String(
        image?.source?.dateTimeOriginal ||
        image?.source?.createDate ||
        ''
      ).trim(),
      placementCount: Array.isArray(image?.placements) ? image.placements.length : 0
    };
    byImageId.set(imageId, registryEntry);
    const slotKey = deriveSlotKey(registryEntry.siteRelativePath, registryEntry.projectSlug);
    if (slotKey && !bySlotKey.has(slotKey)) {
      bySlotKey.set(slotKey, registryEntry);
    }
  }

  return { byImageId, bySlotKey };
}

function mergeReportWithRegistry(entry, registryEntry) {
  if (!registryEntry) return entry;
  return {
    ...entry,
    registryStatus: registryEntry.registryStatus || entry.registryStatus,
    cameraCode: registryEntry.cameraCode || entry.cameraCode,
    projectSlug: registryEntry.projectSlug || entry.projectSlug,
    siteRelativePath: registryEntry.siteRelativePath || entry.siteRelativePath,
    siteFilename: registryEntry.siteFilename || entry.siteFilename,
    absoluteSitePath: registryEntry.absoluteSitePath || entry.absoluteSitePath,
    sourcePath: registryEntry.sourcePath || entry.sourcePath,
    sourceName: registryEntry.sourceName || entry.sourceName,
    absoluteSourcePath: registryEntry.absoluteSourcePath || entry.absoluteSourcePath,
    jpegDate: registryEntry.jpegDate || entry.jpegDate,
    placementCount: registryEntry.placementCount || entry.placementCount
  };
}

function renderPathLink(label, filePath) {
  if (!filePath) return `<span class="path-missing">${escapeHtml(label)}: missing</span>`;
  const href = fileUrlFromPath(filePath);
  return `<a class="path-link mono" href="${escapeHtml(href)}">${escapeHtml(label)}: ${escapeHtml(filePath)}</a>`;
}

function renderThumb(imagePath, altText, missingLabel) {
  if (imagePath && fs.existsSync(imagePath)) {
    return `<img src="${escapeHtml(fileUrlFromPath(imagePath))}" alt="${escapeHtml(altText)}" loading="lazy">`;
  }
  return `<div class="missing-thumb">${escapeHtml(missingLabel)}</div>`;
}

function determineRawState(entry, selection) {
  const rawCandidates = Array.isArray(entry.rawCandidates) ? entry.rawCandidates : [];
  if (selection && String(selection.choice || '').toUpperCase() === 'N') {
    return 'no-raw';
  }
  if (selection && /^[A-Z]$/i.test(String(selection.choice || ''))) {
    return 'approved';
  }
  if (rawCandidates.length === 0) return 'no-raw';
  if (rawCandidates.length > 1) return 'needs-choice';
  return 'approved';
}

function resolveSelectedRaw(entry, selection) {
  const rawCandidates = Array.isArray(entry.rawCandidates) ? entry.rawCandidates : [];
  if (selection && String(selection.choice || '').toUpperCase() === 'N') return null;
  if (selection && /^[A-Z]$/i.test(String(selection.choice || ''))) {
    const choice = String(selection.choice || '').toUpperCase();
    const candidateIndex = choice.charCodeAt(0) - 65;
    return rawCandidates[candidateIndex] || null;
  }
  if (rawCandidates.length === 1) return rawCandidates[0];
  return null;
}

function buildEntryModel(entry, index, selectionMap) {
  const reviewNumber = padNumber(index + 1);
  const selection = selectionMap.get(reviewNumber) || null;
  const sitePath = entry.absoluteSitePath || '';
  const jpegPath = entry.absoluteSourcePath || '';
  const rawState = determineRawState(entry, selection);
  const selectedRaw = resolveSelectedRaw(entry, selection);
  const cameraCode = String(entry.cameraCode || '').trim();
  const siteHasCode = containsCameraCode(entry.siteFilename || entry.siteRelativePath || '', cameraCode);
  const jpegHasCode = containsCameraCode(entry.sourceName || entry.sourcePath || '', cameraCode);
  const rawHasCode = selectedRaw ? containsCameraCode(selectedRaw.rawRelativePath || selectedRaw.rawPath || '', cameraCode) : false;
  const hasRawEverywhere = Boolean(cameraCode && siteHasCode && jpegHasCode && rawHasCode);
  const missingJpeg = !(jpegPath && fs.existsSync(jpegPath));

  let rawDecisionLabel = 'Pending';
  if (rawState === 'approved') {
    rawDecisionLabel = selection ? `Approved ${String(selection.choice || 'A').toUpperCase()}` : (selectedRaw ? 'Single RAW candidate' : 'Approved');
  } else if (rawState === 'needs-choice') {
    rawDecisionLabel = 'Needs RAW choice';
  } else if (rawState === 'no-raw') {
    rawDecisionLabel = selection ? 'No RAW match approved' : 'No RAW found';
  }

  const filters = ['all'];
  if (hasRawEverywhere) filters.push('all-codes');
  if (rawState === 'needs-choice') filters.push('needs-choice');
  if (rawState === 'no-raw') filters.push('no-raw');
  if (missingJpeg) filters.push('no-jpeg');

  return {
    ...entry,
    reviewNumber,
    selection,
    rawState,
    selectedRaw,
    hasRawEverywhere,
    missingJpeg,
    rawDecisionLabel,
    filters
  };
}

function renderRawCandidate(candidate, label, selected) {
  const thumb = candidate?.previewPath && fs.existsSync(candidate.previewPath)
    ? `<img src="${escapeHtml(fileUrlFromPath(candidate.previewPath))}" alt="${escapeHtml(candidate.rawRelativePath || candidate.rawPath || '')}" loading="lazy">`
    : '<div class="missing-thumb">No RAW preview</div>';

  return `
    <div class="raw-candidate${selected ? ' selected' : ''}">
      <div class="raw-label">${escapeHtml(label)}${selected ? ' selected' : ''}</div>
      <div class="raw-thumb">${thumb}</div>
      <div class="small mono">${escapeHtml(candidate.rawRelativePath || '')}</div>
      <div class="small">Type: ${escapeHtml(candidate.fileType || '')}</div>
      <div class="small">Date: ${escapeHtml(candidate.rawDate || '') || 'n/a'}</div>
      <div class="small">Score: ${escapeHtml(String(candidate.score ?? ''))}</div>
      ${renderPathLink('RAW', candidate.rawPath || '')}
    </div>
  `;
}

function renderRawPanel(entry) {
  const rawCandidates = Array.isArray(entry.rawCandidates) ? entry.rawCandidates : [];
  if (entry.rawState === 'approved' && entry.selectedRaw) {
    const label = entry.selection ? String(entry.selection.choice || 'A').toUpperCase() : 'A';
    return renderRawCandidate(entry.selectedRaw, label, true);
  }

  if (entry.rawState === 'no-raw') {
    return `<div class="decision empty">${escapeHtml(entry.rawDecisionLabel)}</div>`;
  }

  if (!rawCandidates.length) {
    return '<div class="decision empty">No RAW candidate found.</div>';
  }

  return rawCandidates.map((candidate, candidateIndex) =>
    renderRawCandidate(candidate, String.fromCharCode(65 + candidateIndex), false)
  ).join('');
}

function renderEntry(entry) {
  const siteThumb = renderThumb(entry.absoluteSitePath, entry.siteFilename || entry.siteRelativePath, 'Missing site file');
  const jpegThumb = renderThumb(entry.absoluteSourcePath, entry.sourceName || entry.sourcePath, 'Missing JPEG source');
  const badges = [];
  if (entry.hasRawEverywhere) badges.push('<span class="badge badge-good">Code in SITE / JPEG / RAW</span>');
  if (entry.rawState === 'needs-choice') badges.push('<span class="badge badge-warn">Needs RAW choice</span>');
  if (entry.rawState === 'no-raw') badges.push('<span class="badge badge-bad">No RAW</span>');
  if (entry.missingJpeg) badges.push('<span class="badge badge-bad">No JPEG source</span>');
  if (entry.registryStatus) badges.push(`<span class="badge">${escapeHtml(entry.registryStatus)}</span>`);

  return `
    <article class="card" data-filters="${escapeHtml(entry.filters.join(' '))}">
      <div class="card-top">
        <div>
          <div class="review-number">${escapeHtml(entry.reviewNumber)}</div>
          <div class="mono subtle">${escapeHtml(entry.projectSlug || '')}</div>
        </div>
        <div class="badges">${badges.join('')}</div>
      </div>
      <div class="path-stack">
        ${renderPathLink('SITE', entry.absoluteSitePath || '')}
        ${renderPathLink('JPEG', entry.absoluteSourcePath || '')}
        ${entry.selectedRaw ? renderPathLink('RAW', entry.selectedRaw.rawPath || '') : '<span class="path-missing">RAW: not resolved yet</span>'}
      </div>
      <div class="meta-row">
        <span><strong>Camera code:</strong> ${escapeHtml(entry.cameraCode || 'missing')}</span>
        <span><strong>RAW state:</strong> ${escapeHtml(entry.rawDecisionLabel)}</span>
        <span><strong>Candidates:</strong> ${escapeHtml(String((entry.rawCandidates || []).length))}</span>
      </div>
      <div class="card-grid">
        <section class="panel">
          <div class="panel-title">RAW</div>
          <div class="raw-list">${renderRawPanel(entry)}</div>
        </section>
        <section class="panel">
          <div class="panel-title">JPEG source</div>
          <div class="single-thumb">${jpegThumb}</div>
          <div class="small mono">${escapeHtml(entry.sourcePath || 'missing')}</div>
          <div class="small">Date: ${escapeHtml(entry.jpegDate || entry.jpegDateTimeOriginal || '') || 'n/a'}</div>
        </section>
        <section class="panel">
          <div class="panel-title">Site</div>
          <div class="single-thumb">${siteThumb}</div>
          <div class="small mono">${escapeHtml(entry.siteRelativePath || '')}</div>
          <div class="small">Filename: ${escapeHtml(entry.siteFilename || '')}</div>
        </section>
      </div>
    </article>
  `;
}

function renderFilterButton(id, label, count, active = false) {
  return `<button class="filter-btn${active ? ' active' : ''}" type="button" data-filter="${escapeHtml(id)}">${escapeHtml(label)} <span>${escapeHtml(String(count))}</span></button>`;
}

function buildSummary(models) {
  const countByFilter = {
    all: models.length,
    'all-codes': models.filter((item) => item.hasRawEverywhere).length,
    'needs-choice': models.filter((item) => item.rawState === 'needs-choice').length,
    'no-raw': models.filter((item) => item.rawState === 'no-raw').length,
    'no-jpeg': models.filter((item) => item.missingJpeg).length
  };

  return {
    countByFilter,
    withSelection: models.filter((item) => item.selection).length,
    withCameraCode: models.filter((item) => item.cameraCode).length
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = readJson(path.resolve(process.cwd(), args.report), { entries: [], summary: {} });
  const selections = readJson(path.resolve(process.cwd(), args.selections), []);
  const registry = readJson(path.resolve(process.cwd(), args.registry), { images: [], sourceAssets: [] });
  const selectionMap = new Map(
    (Array.isArray(selections) ? selections : []).map((entry) => [String(entry.reviewNumber || ''), entry])
  );
  const registryLookup = buildRegistryLookup(registry, report.archiveDir ? String(report.archiveDir) : '');
  const models = (Array.isArray(report.entries) ? report.entries : [])
    .map((entry) => {
      const imageId = String(entry.imageId || '').trim();
      const slotKey = deriveSlotKey(entry.siteRelativePath, entry.projectSlug);
      const registryEntry = registryLookup.byImageId.get(imageId) || registryLookup.bySlotKey.get(slotKey) || null;
      return mergeReportWithRegistry(entry, registryEntry);
    })
    .map((entry, index) => buildEntryModel(entry, index, selectionMap));
  const summary = buildSummary(models);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unified image review</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4eddf;
      --card: rgba(255,255,255,.9);
      --ink: #2d241d;
      --muted: #6d5c4d;
      --line: #d8c6ab;
      --accent: #8b4b1d;
      --good: #2d6a4f;
      --warn: #9a6700;
      --bad: #8c2f2f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background:
        radial-gradient(circle at top left, rgba(176,132,74,.15), transparent 30%),
        linear-gradient(180deg, #fbf7f0 0%, var(--bg) 100%);
      color: var(--ink);
    }
    main { max-width: 1680px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 10px; font-size: 42px; }
    p { margin: 0; color: var(--muted); font-size: 19px; line-height: 1.5; }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      margin: 24px 0 18px;
      padding: 16px;
      background: rgba(251,247,240,.94);
      backdrop-filter: blur(10px);
      border: 1px solid var(--line);
      border-radius: 20px;
      box-shadow: 0 12px 28px rgba(97, 73, 39, .10);
    }
    .filter-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }
    .filter-btn {
      border: 1px solid var(--line);
      background: #fff;
      color: var(--ink);
      border-radius: 999px;
      padding: 10px 14px;
      cursor: pointer;
      font: inherit;
      font-size: 15px;
    }
    .filter-btn span {
      display: inline-block;
      margin-inline-start: 8px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(139,75,29,.10);
      color: var(--accent);
      font-size: 13px;
      font-weight: 700;
    }
    .filter-btn.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .filter-btn.active span {
      background: rgba(255,255,255,.18);
      color: #fff;
    }
    .toolbar-meta {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      margin-top: 12px;
      color: var(--muted);
      font-size: 14px;
    }
    .cards { display: grid; gap: 18px; }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 24px;
      box-shadow: 0 10px 24px rgba(104,80,47,.08);
      padding: 18px;
    }
    .card.hidden { display: none; }
    .card-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .review-number { font-size: 34px; font-weight: 700; line-height: 1; }
    .subtle { color: var(--muted); margin-top: 6px; }
    .badges { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    .badge {
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(61,49,40,.09);
      color: var(--ink);
      font-size: 13px;
      font-weight: 700;
    }
    .badge-good { background: rgba(45,106,79,.13); color: var(--good); }
    .badge-warn { background: rgba(154,103,0,.13); color: var(--warn); }
    .badge-bad { background: rgba(140,47,47,.12); color: var(--bad); }
    .path-stack {
      display: grid;
      gap: 6px;
      margin-bottom: 12px;
    }
    .path-link, .path-missing {
      display: block;
      word-break: break-all;
      font-size: 13px;
    }
    .path-link { color: var(--accent); text-decoration: none; }
    .path-link:hover { text-decoration: underline; }
    .path-missing { color: var(--muted); }
    .meta-row {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      margin-bottom: 12px;
      color: var(--muted);
      font-size: 14px;
    }
    .card-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 12px;
      background: rgba(255,255,255,.72);
    }
    .panel-title {
      text-transform: uppercase;
      letter-spacing: .06em;
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 10px;
    }
    .raw-list { display: grid; gap: 12px; }
    .raw-candidate {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 10px;
      background: #fff;
    }
    .raw-candidate.selected {
      border-color: var(--good);
      box-shadow: 0 0 0 2px rgba(45,106,79,.14) inset;
    }
    .raw-label {
      display: inline-block;
      margin-bottom: 10px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #3d3128;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .raw-candidate.selected .raw-label { background: var(--good); }
    .raw-thumb, .single-thumb {
      min-height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    img {
      max-width: 100%;
      max-height: 340px;
      display: block;
      border-radius: 12px;
    }
    .missing-thumb, .decision.empty {
      border: 1px dashed var(--line);
      border-radius: 14px;
      padding: 20px;
      color: var(--muted);
      text-align: center;
      background: #fff;
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mono { font-family: "Courier New", monospace; }
    .small { font-size: 13px; color: var(--muted); line-height: 1.45; word-break: break-word; }
    @media (max-width: 1120px) {
      .card-grid { grid-template-columns: 1fr; }
      h1 { font-size: 34px; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Unified Image Review</h1>
    <p>One report for all images. Use the filter bar to switch between all entries, fully coded SITE / JPEG / RAW entries, unresolved RAW choice sets, items with no RAW, and items with no JPEG source.</p>
    <section class="toolbar">
      <div class="filter-row">
        ${renderFilterButton('all', 'All images', summary.countByFilter.all, true)}
        ${renderFilterButton('all-codes', 'Code in SITE / JPEG / RAW', summary.countByFilter['all-codes'])}
        ${renderFilterButton('needs-choice', 'Need RAW choice', summary.countByFilter['needs-choice'])}
        ${renderFilterButton('no-raw', 'No RAW found / approved', summary.countByFilter['no-raw'])}
        ${renderFilterButton('no-jpeg', 'No JPEG source', summary.countByFilter['no-jpeg'])}
      </div>
      <div class="toolbar-meta">
        <span>Total images: ${escapeHtml(String(summary.countByFilter.all))}</span>
        <span>Saved RAW decisions: ${escapeHtml(String(summary.withSelection))}</span>
        <span>Images with camera code: ${escapeHtml(String(summary.withCameraCode))}</span>
        <span id="visible-count">Showing: ${escapeHtml(String(summary.countByFilter.all))}</span>
      </div>
    </section>
    <section class="cards" id="cards">
      ${models.map((entry) => renderEntry(entry)).join('\n')}
    </section>
  </main>
  <script>
    const buttons = Array.from(document.querySelectorAll('.filter-btn'));
    const cards = Array.from(document.querySelectorAll('.card'));
    const visibleCount = document.getElementById('visible-count');

    function applyFilter(filterId) {
      let shown = 0;
      cards.forEach((card) => {
        const filters = new Set((card.dataset.filters || '').split(/\\s+/).filter(Boolean));
        const visible = filterId === 'all' || filters.has(filterId);
        card.classList.toggle('hidden', !visible);
        if (visible) shown += 1;
      });
      buttons.forEach((button) => button.classList.toggle('active', button.dataset.filter === filterId));
      visibleCount.textContent = 'Showing: ' + shown;
    }

    buttons.forEach((button) => {
      button.addEventListener('click', () => applyFilter(button.dataset.filter || 'all'));
    });
  </script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), args.html)), { recursive: true });
  fs.writeFileSync(path.resolve(process.cwd(), args.html), html, 'utf8');
  console.log('[unified-image-review] wrote ' + args.html);
}

main();

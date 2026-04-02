'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_REGISTRY = 'data/image-registry.json';
const DEFAULT_RECONCILE = '.build-temp/registry-reconcile-full.json';
const DEFAULT_OUTDIR = '.build-temp/registry-source-review';

function parseArgs(argv = []) {
  const args = {
    registry: DEFAULT_REGISTRY,
    reconcile: DEFAULT_RECONCILE,
    outdir: DEFAULT_OUTDIR
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--registry') {
      args.registry = argv[index + 1] ? String(argv[index + 1]) : args.registry;
      index += 1;
      continue;
    }

    if (token === '--reconcile') {
      args.reconcile = argv[index + 1] ? String(argv[index + 1]) : args.reconcile;
      index += 1;
      continue;
    }

    if (token === '--outdir') {
      args.outdir = argv[index + 1] ? String(argv[index + 1]) : args.outdir;
      index += 1;
    }
  }

  return args;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizePath(value = '') {
  return String(value || '').replace(/\\/g, '/').trim();
}

function sanitizeCameraCode(value = '') {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function csvEscape(value = '') {
  const stringValue = String(value ?? '');
  if (!/[",\n]/.test(stringValue)) return stringValue;
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function fileUrlFromPath(filePath) {
  const normalized = path.resolve(filePath).replace(/\\/g, '/');
  return `file:///${encodeURI(normalized)}`;
}

function stripExtension(filename = '') {
  return path.parse(String(filename || '')).name;
}

function hasDelimitedCameraCode(stem = '', cameraCode = '') {
  if (!stem || !cameraCode) return false;
  const escaped = cameraCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|[^A-Z0-9])${escaped}([A-Z]?)(?=$|[^A-Z0-9])`, 'i');
  return regex.test(stem);
}

function hasAnyCameraCode(stem = '', cameraCode = '') {
  if (!stem || !cameraCode) return false;
  return stem.toUpperCase().includes(cameraCode);
}

function buildSuggestedSourceFilename(sourceName = '', cameraCode = '') {
  const parsed = path.parse(String(sourceName || '').trim());
  const normalizedCode = sanitizeCameraCode(cameraCode);
  if (!parsed.base || !normalizedCode) return parsed.base || '';

  let stem = parsed.name;
  const escaped = normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const embeddedRegex = new RegExp(`${escaped}(?:([A-Z])(?=$|[^A-Z0-9]))?`, 'ig');
  let suffixLetter = '';

  stem = stem.replace(embeddedRegex, (_, maybeLetter) => {
    if (!suffixLetter && maybeLetter) suffixLetter = maybeLetter.toUpperCase();
    return ' ';
  });

  stem = stem
    .replace(/[_-]{2,}/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const insertion = suffixLetter ? `${normalizedCode} ${suffixLetter}` : normalizedCode;
  const withCode = stem ? `${stem} ${insertion}` : insertion;

  return `${withCode.replace(/\s{2,}/g, ' ').trim()}${parsed.ext}`;
}

function classifySourceName(sourceName = '', cameraCode = '') {
  const stem = stripExtension(sourceName).toUpperCase();
  const normalizedCode = sanitizeCameraCode(cameraCode);
  if (!normalizedCode) return 'no-code';
  if (hasDelimitedCameraCode(stem, normalizedCode)) return 'clean';
  if (hasAnyCameraCode(stem, normalizedCode)) return 'embedded';
  return 'missing';
}

function buildImageLookup(registry) {
  const byImageId = new Map();
  (registry?.images || []).forEach((image) => {
    const imageId = String(image?.imageId || '').trim();
    if (imageId) byImageId.set(imageId, image);
  });
  return byImageId;
}

function buildEntries(registry, archiveDir) {
  const imageLookup = buildImageLookup(registry);

  return (registry?.sourceAssets || [])
    .map((asset) => {
      const sourceAssetId = String(asset?.sourceAssetId || '').trim();
      const sourcePath = normalizePath(asset?.sourcePath || '');
      const sourceName = String(asset?.sourceName || path.basename(sourcePath)).trim();
      const cameraCode = sanitizeCameraCode(asset?.cameraCode || '');
      if (!sourceAssetId || !sourcePath || !cameraCode) return null;

      const linkedImageIds = Array.isArray(asset?.linkedImageIds) ? asset.linkedImageIds : [];
      const linkedImages = linkedImageIds
        .map((imageId) => imageLookup.get(String(imageId || '').trim()))
        .filter(Boolean);
      const placements = linkedImages.flatMap((image) => Array.isArray(image?.placements) ? image.placements : []);
      const registryStatuses = [...new Set(linkedImages.map((image) => String(image?.registryStatus || '').trim()).filter(Boolean))];
      const sourceNameStatus = classifySourceName(sourceName, cameraCode);
      const suggestedSourceName = sourceNameStatus === 'clean'
        ? sourceName
        : buildSuggestedSourceFilename(sourceName, cameraCode);

      return {
        sourceAssetId,
        sourcePath,
        sourceName,
        cameraCode,
        sourceNameStatus,
        suggestedSourceName,
        suggestedRelativePath: normalizePath(path.join(path.dirname(sourcePath), suggestedSourceName)),
        needsRename: suggestedSourceName !== sourceName,
        absoluteSourcePath: archiveDir ? path.join(archiveDir, sourcePath) : '',
        linkedImageIds,
        linkedProjects: [...new Set(placements.map((placement) => String(placement?.projectSlug || '').trim()).filter(Boolean))],
        linkedSitePaths: placements.map((placement) => normalizePath(placement?.siteRelativePath || '')).filter(Boolean),
        registryStatuses
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.needsRename !== right.needsRename) return left.needsRename ? -1 : 1;
      if (left.sourceNameStatus !== right.sourceNameStatus) return left.sourceNameStatus.localeCompare(right.sourceNameStatus);
      return left.sourcePath.localeCompare(right.sourcePath);
    });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function writeCsv(filePath, entries) {
  const header = [
    'reviewNumber',
    'sourceAssetId',
    'sourceNameStatus',
    'cameraCode',
    'sourcePath',
    'sourceName',
    'suggestedSourceName',
    'suggestedRelativePath',
    'linkedProjects',
    'linkedSitePaths',
    'registryStatuses'
  ];

  const rows = entries.map((entry, index) => [
    String(index + 1).padStart(3, '0'),
    entry.sourceAssetId,
    entry.sourceNameStatus,
    entry.cameraCode,
    entry.sourcePath,
    entry.sourceName,
    entry.suggestedSourceName,
    entry.suggestedRelativePath,
    entry.linkedProjects.join(' | '),
    entry.linkedSitePaths.join(' | '),
    entry.registryStatuses.join(' | ')
  ]);

  const content = [header, ...rows]
    .map((row) => row.map((value) => csvEscape(value)).join(','))
    .join('\n');

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content}\n`, 'utf8');
}

function renderEntry(entry, index) {
  const reviewNumber = String(index + 1).padStart(3, '0');
  const imageMarkup = entry.absoluteSourcePath && fs.existsSync(entry.absoluteSourcePath)
    ? `<img src="${escapeHtml(fileUrlFromPath(entry.absoluteSourcePath))}" alt="${escapeHtml(entry.sourceName)}" loading="lazy">`
    : '<div class="missing-thumb">Missing source file</div>';

  const linkedProjects = entry.linkedProjects.length ? entry.linkedProjects.join(', ') : 'n/a';
  const linkedSitePaths = entry.linkedSitePaths.length
    ? entry.linkedSitePaths.map((value) => `<div class="mono small">${escapeHtml(value)}</div>`).join('')
    : '<div class="mono small">n/a</div>';

  return `
    <article class="card">
      <div class="card-top">
        <div>
          <div class="review-number">${reviewNumber}</div>
          <div class="status-pill ${escapeHtml(entry.sourceNameStatus)}">${escapeHtml(entry.sourceNameStatus)}</div>
        </div>
        <div class="mono small">${escapeHtml(entry.sourceAssetId)}</div>
      </div>
      <div class="card-grid">
        <div class="thumb-wrap">
          ${imageMarkup}
        </div>
        <div class="meta">
          <div class="meta-row">
            <div class="label">Camera code</div>
            <div class="value mono">${escapeHtml(entry.cameraCode)}</div>
          </div>
          <div class="meta-row">
            <div class="label">Current source path</div>
            <div class="value mono">${escapeHtml(entry.sourcePath)}</div>
          </div>
          <div class="meta-row">
            <div class="label">Current source name</div>
            <div class="value mono">${escapeHtml(entry.sourceName)}</div>
          </div>
          <div class="meta-row">
            <div class="label">Suggested source name</div>
            <div class="value mono">${escapeHtml(entry.suggestedSourceName)}</div>
          </div>
          <div class="meta-row">
            <div class="label">Linked projects</div>
            <div class="value">${escapeHtml(linkedProjects)}</div>
          </div>
          <div class="meta-row">
            <div class="label">Linked site paths</div>
            <div class="value">${linkedSitePaths}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function writeHtml(filePath, summary, entries) {
  const body = entries.map((entry, index) => renderEntry(entry, index)).join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Source Archive Camera Code Review</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5eee2;
      --card: rgba(255,255,255,.86);
      --ink: #2e241c;
      --muted: #6e5b48;
      --line: #dcc6a9;
      --accent: #99511f;
      --clean: #477455;
      --embedded: #9f6a18;
      --missing: #8e2f2f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background:
        radial-gradient(circle at top left, rgba(186,144,83,.22), transparent 34%),
        linear-gradient(180deg, #f7f2e9 0%, var(--bg) 100%);
      color: var(--ink);
    }
    main { max-width: 1400px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 44px; }
    p { color: var(--muted); font-size: 20px; line-height: 1.45; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin: 24px 0 28px;
    }
    .summary-card, .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 26px;
      box-shadow: 0 12px 36px rgba(107, 80, 40, .12);
    }
    .summary-card { padding: 18px 22px; }
    .summary-card .label { color: var(--muted); text-transform: uppercase; letter-spacing: .06em; font-size: 14px; }
    .summary-card .value { font-size: 38px; font-weight: 700; margin-top: 6px; }
    .cards { display: grid; gap: 18px; }
    .card { padding: 18px; }
    .card-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .review-number { font-size: 38px; font-weight: 700; }
    .status-pill {
      display: inline-block;
      margin-top: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-size: 13px;
      font-weight: 700;
    }
    .status-pill.clean { background: var(--clean); }
    .status-pill.embedded { background: var(--embedded); }
    .status-pill.missing { background: var(--missing); }
    .card-grid {
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }
    .thumb-wrap {
      border: 1px solid var(--line);
      border-radius: 22px;
      background: #fff;
      padding: 12px;
      min-height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    img {
      max-width: 100%;
      max-height: 420px;
      border-radius: 16px;
      display: block;
    }
    .missing-thumb {
      color: var(--muted);
      font-size: 18px;
    }
    .meta { display: grid; gap: 12px; }
    .meta-row {
      background: rgba(240,231,218,.7);
      border-radius: 18px;
      padding: 12px 14px;
    }
    .label {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .05em;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .value { font-size: 22px; line-height: 1.35; }
    .mono { font-family: "Courier New", monospace; word-break: break-word; }
    .small { font-size: 14px; line-height: 1.45; }
    @media (max-width: 980px) {
      .card-grid { grid-template-columns: 1fr; }
      h1 { font-size: 34px; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Source Archive Camera Code Review</h1>
    <p>Review-only report for source archive filenames. This does not rename any archive file yet.</p>
    <section class="summary">
      <div class="summary-card"><div class="label">Total source assets with camera code</div><div class="value">${summary.total}</div></div>
      <div class="summary-card"><div class="label">Need rename</div><div class="value">${summary.needRename}</div></div>
      <div class="summary-card"><div class="label">Embedded code</div><div class="value">${summary.embedded}</div></div>
      <div class="summary-card"><div class="label">Missing code</div><div class="value">${summary.missing}</div></div>
      <div class="summary-card"><div class="label">Already clean</div><div class="value">${summary.clean}</div></div>
    </section>
    <section class="cards">
      ${body}
    </section>
  </main>
</body>
</html>`;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const registryPath = path.resolve(rootDir, args.registry);
  const reconcilePath = path.resolve(rootDir, args.reconcile);
  const outDir = path.resolve(rootDir, args.outdir);
  const registry = readJson(registryPath, { sourceAssets: [], images: [] });
  const reconcile = readJson(reconcilePath, {});
  const archiveDir = reconcile?.archiveDir ? path.resolve(String(reconcile.archiveDir)) : '';

  const entries = buildEntries(registry, archiveDir);
  const summary = {
    total: entries.length,
    needRename: entries.filter((entry) => entry.needsRename).length,
    embedded: entries.filter((entry) => entry.sourceNameStatus === 'embedded').length,
    missing: entries.filter((entry) => entry.sourceNameStatus === 'missing').length,
    clean: entries.filter((entry) => entry.sourceNameStatus === 'clean').length
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    archiveDir,
    summary,
    entries
  };

  writeJson(path.join(outDir, 'source-archive-review.json'), payload);
  writeCsv(path.join(outDir, 'source-archive-review.csv'), entries);
  writeHtml(path.join(outDir, 'source-archive-review.html'), summary, entries);

  console.log(`[registry:source-review] total=${summary.total} needRename=${summary.needRename} embedded=${summary.embedded} missing=${summary.missing} clean=${summary.clean}`);
  console.log(`[registry:source-review] wrote ${normalizePath(path.relative(rootDir, outDir))}`);
}

if (require.main === module) {
  main();
}

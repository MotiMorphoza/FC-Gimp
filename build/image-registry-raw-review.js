'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const DEFAULT_REGISTRY = 'data/image-registry.json';
const DEFAULT_RECONCILE = '.build-temp/registry-reconcile-full.json';
const DEFAULT_HOLDS = 'data/manual-problematic-overrides.json';
const DEFAULT_OUTDIR = '.build-temp/registry-raw-review';
const DEFAULT_RAWDIR = 'D:\\RAW';
const EXIFTOOL_PATH = 'C:\\Tools\\ExifTool\\exiftool.exe';
const RAW_EXTENSIONS = new Set(['.nef', '.dng', '.arw', '.cr2', '.cr3', '.orf', '.rw2', '.raf']);

function parseArgs(argv = []) {
  const args = {
    registry: DEFAULT_REGISTRY,
    reconcile: DEFAULT_RECONCILE,
    holds: DEFAULT_HOLDS,
    outdir: DEFAULT_OUTDIR,
    rawdir: DEFAULT_RAWDIR,
    scope: 'rename-targets'
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
    if (token === '--holds') {
      args.holds = argv[index + 1] ? String(argv[index + 1]) : args.holds;
      index += 1;
      continue;
    }
    if (token === '--outdir') {
      args.outdir = argv[index + 1] ? String(argv[index + 1]) : args.outdir;
      index += 1;
      continue;
    }
    if (token === '--rawdir') {
      args.rawdir = argv[index + 1] ? String(argv[index + 1]) : args.rawdir;
      index += 1;
      continue;
    }
    if (token === '--scope') {
      args.scope = argv[index + 1] ? String(argv[index + 1]) : args.scope;
      index += 1;
    }
  }

  return args;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
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

function sourceNameNeedsRename(sourceName = '', cameraCode = '') {
  const stem = stripExtension(sourceName).toUpperCase();
  const normalizedCode = sanitizeCameraCode(cameraCode);
  if (!normalizedCode) return false;
  if (hasDelimitedCameraCode(stem, normalizedCode)) return false;
  return hasAnyCameraCode(stem, normalizedCode) || !hasAnyCameraCode(stem, normalizedCode);
}

function fileUrlFromPath(filePath) {
  const normalized = path.resolve(filePath).replace(/\\/g, '/');
  return `file:///${encodeURI(normalized)}`;
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

function padNumber(value, width = 3) {
  return String(value).padStart(width, '0');
}

function buildHoldSet(holds) {
  return new Set((Array.isArray(holds) ? holds : [])
    .map((entry) => normalizePath(entry?.currentSitePath || entry?.siteRelativePath || ''))
    .filter(Boolean));
}

function listRawFiles(rootDir) {
  const queue = [rootDir];
  const files = [];

  while (queue.length) {
    const currentDir = queue.shift();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        return;
      }
      if (!entry.isFile()) return;
      const extension = path.extname(entry.name).toLowerCase();
      if (!RAW_EXTENSIONS.has(extension)) return;
      files.push(fullPath);
    });
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function buildRawIndex(rawFiles) {
  const index = new Map();
  rawFiles.forEach((filePath) => {
    const upperName = path.basename(filePath).toUpperCase();
    const match = upperName.match(/(DSCF\d{3,}|DSC_\d{3,}|IMG_\d{3,}|IMGP\d{3,})/);
    if (!match || !match[1]) return;
    const code = sanitizeCameraCode(match[1]);
    if (!index.has(code)) index.set(code, []);
    index.get(code).push(filePath);
  });
  return index;
}

function exiftoolJson(filePath) {
  const output = execFileSync(EXIFTOOL_PATH, ['-j', '-FileType', '-CreateDate', '-DateTimeOriginal', '-ImageWidth', '-ImageHeight', '-PreviewImage', '-JpgFromRaw', '-ThumbnailImage', filePath], {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const payload = JSON.parse(output);
  return Array.isArray(payload) ? (payload[0] || {}) : {};
}

function selectPreviewTag(metadata = {}) {
  if (metadata.PreviewImage) return 'PreviewImage';
  if (metadata.JpgFromRaw) return 'JpgFromRaw';
  if (metadata.ThumbnailImage) return 'ThumbnailImage';
  return '';
}

function extractPreview(rawPath, outDir, metadata = {}) {
  const previewTag = selectPreviewTag(metadata);
  if (!previewTag) return '';

  const hash = crypto.createHash('sha1').update(rawPath).digest('hex').slice(0, 12);
  const outputPath = path.join(outDir, `${hash}.jpg`);
  if (!fs.existsSync(outputPath)) {
    const buffer = execFileSync(EXIFTOOL_PATH, ['-b', `-${previewTag}`, rawPath], {
      encoding: 'buffer',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);
  }
  return outputPath;
}

function parseDate(value = '') {
  return String(value || '').trim();
}

function chooseJpegDate(asset, image) {
  return parseDate(
    asset?.fingerprintBundle?.dateTimeOriginal ||
    image?.source?.dateTimeOriginal ||
    image?.source?.createDate ||
    ''
  );
}

function compareRawCandidate(candidateMetadata, jpegDate) {
  const rawDate = parseDate(candidateMetadata.DateTimeOriginal || candidateMetadata.CreateDate || '');
  let score = 0;
  if (rawDate && jpegDate) {
    if (rawDate === jpegDate) score += 5;
    else if (rawDate.slice(0, 10) === jpegDate.slice(0, 10)) score += 2;
  }
  if (candidateMetadata.PreviewImage || candidateMetadata.JpgFromRaw) score += 1;
  return {
    rawDate,
    score
  };
}

function buildApprovedEntries(registry, holdSet, archiveDir) {
  const imageLookup = new Map();
  (registry?.images || []).forEach((image) => {
    const imageId = String(image?.imageId || '').trim();
    if (imageId) imageLookup.set(imageId, image);
  });

  return (registry?.sourceAssets || [])
    .map((asset) => {
      const linkedImages = (Array.isArray(asset?.linkedImageIds) ? asset.linkedImageIds : [])
        .map((imageId) => imageLookup.get(String(imageId || '').trim()))
        .filter(Boolean);
      if (!linkedImages.length) return null;

      const eligibleImages = linkedImages.filter((image) => {
        const status = String(image?.registryStatus || '').trim();
        if (status !== 'resolved') return false;
        const placements = Array.isArray(image?.placements) ? image.placements : [];
        return placements.every((placement) => !holdSet.has(normalizePath(placement?.siteRelativePath || '')));
      });

      if (!eligibleImages.length) return null;

      const image = eligibleImages[0];
      const placement = (Array.isArray(image?.placements) ? image.placements : [])[0] || null;
      const variant = (Array.isArray(image?.variants) ? image.variants : [])[0] || null;
      const sourcePath = normalizePath(asset?.sourcePath || '');
      const cameraCode = sanitizeCameraCode(asset?.cameraCode || image?.source?.cameraCode || '');
      const sourceName = String(asset?.sourceName || path.basename(sourcePath)).trim();
      if (!placement || !variant || !cameraCode || !sourcePath) return null;
      if (!sourceNameNeedsRename(sourceName, cameraCode)) return null;

      return {
        imageId: String(image?.imageId || '').trim(),
        sourceAssetId: String(asset?.sourceAssetId || '').trim(),
        cameraCode,
        projectSlug: String(placement?.projectSlug || '').trim(),
        siteRelativePath: normalizePath(placement?.siteRelativePath || ''),
        siteFilename: String(placement?.currentFilename || '').trim(),
        sourcePath,
        sourceName,
        absoluteSourcePath: archiveDir ? path.join(archiveDir, sourcePath) : '',
        absoluteSitePath: path.resolve(process.cwd(), normalizePath(placement?.siteRelativePath || '')),
        jpegDate: chooseJpegDate(asset, image),
        jpegCreateDate: '',
        jpegDateTimeOriginal: ''
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

function buildAllEntries(registry, holdSet, archiveDir) {
  const sourceAssetById = new Map();
  (registry?.sourceAssets || []).forEach((asset) => {
    const sourceAssetId = String(asset?.sourceAssetId || '').trim();
    if (sourceAssetId) sourceAssetById.set(sourceAssetId, asset);
  });

  return (registry?.images || [])
    .map((image) => {
      const placements = Array.isArray(image?.placements) ? image.placements : [];
      const placement = placements[0] || null;
      if (!placement) return null;
      const sourceAsset = sourceAssetById.get(String(image?.sourceAssetId || '').trim()) || null;
      const sourcePath = normalizePath(sourceAsset?.sourcePath || image?.source?.sourcePath || '');
      const sourceName = String(sourceAsset?.sourceName || image?.source?.sourceName || path.basename(sourcePath)).trim();
      const cameraCode = sanitizeCameraCode(sourceAsset?.cameraCode || image?.source?.cameraCode || '');
      const siteRelativePath = normalizePath(placement?.siteRelativePath || '');
      return {
        imageId: String(image?.imageId || '').trim(),
        sourceAssetId: String(sourceAsset?.sourceAssetId || image?.sourceAssetId || '').trim(),
        registryStatus: String(image?.registryStatus || '').trim(),
        held: holdSet.has(siteRelativePath),
        cameraCode,
        projectSlug: String(placement?.projectSlug || '').trim(),
        siteRelativePath,
        siteFilename: String(placement?.currentFilename || '').trim(),
        sourcePath,
        sourceName,
        absoluteSourcePath: archiveDir && sourcePath ? path.join(archiveDir, sourcePath) : '',
        absoluteSitePath: path.resolve(process.cwd(), siteRelativePath),
        jpegDate: '',
        jpegCreateDate: '',
        jpegDateTimeOriginal: '',
        placementCount: placements.length,
        linkedSitePaths: placements.map((item) => normalizePath(item?.siteRelativePath || '')).filter(Boolean)
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.siteRelativePath.localeCompare(right.siteRelativePath));
}

function renderRawCandidate(candidate, label) {
  const thumb = candidate.previewPath && fs.existsSync(candidate.previewPath)
    ? `<img src="${escapeHtml(fileUrlFromPath(candidate.previewPath))}" alt="${escapeHtml(candidate.rawPath)}" loading="lazy">`
    : '<div class="missing-thumb">No embedded preview</div>';

  return `
    <div class="raw-candidate">
      <div class="raw-label">${escapeHtml(label)}</div>
      <div class="raw-thumb">${thumb}</div>
      <div class="raw-meta mono small">${escapeHtml(candidate.rawRelativePath)}</div>
      <div class="raw-meta small">Type: ${escapeHtml(candidate.fileType || '')}</div>
      <div class="raw-meta small">Date: ${escapeHtml(candidate.rawDate || '') || 'n/a'}</div>
      <div class="raw-meta small">Match score: ${escapeHtml(String(candidate.score))}</div>
    </div>
  `;
}

function renderEntry(entry, index) {
  const reviewNumber = padNumber(index + 1);
  const siteThumb = entry.absoluteSitePath && fs.existsSync(entry.absoluteSitePath)
    ? `<img src="${escapeHtml(fileUrlFromPath(entry.absoluteSitePath))}" alt="${escapeHtml(entry.siteFilename)}" loading="lazy">`
    : '<div class="missing-thumb">Missing site file</div>';
  const jpegThumb = entry.absoluteSourcePath && fs.existsSync(entry.absoluteSourcePath)
    ? `<img src="${escapeHtml(fileUrlFromPath(entry.absoluteSourcePath))}" alt="${escapeHtml(entry.sourceName)}" loading="lazy">`
    : '<div class="missing-thumb">Missing JPEG source</div>';
  const rawColumn = entry.rawCandidates.length
    ? entry.rawCandidates.map((candidate, candidateIndex) => renderRawCandidate(candidate, String.fromCharCode(65 + candidateIndex))).join('')
    : '<div class="missing-thumb">No RAW candidate found by camera code</div>';

  return `
    <article class="card">
      <div class="card-top">
        <div class="review-number">${reviewNumber}</div>
        <div class="meta-inline">
          <span class="pill">${escapeHtml(entry.cameraCode || 'NO CODE')}</span>
          <span class="mono small">${escapeHtml(entry.projectSlug)}</span>
          <span class="mono small">${escapeHtml(entry.registryStatus || '')}</span>
        </div>
      </div>
      <div class="card-path mono">${escapeHtml(entry.siteRelativePath)}</div>
      <div class="card-grid">
        <section class="panel">
          <div class="panel-title">RAW</div>
          <div class="raw-list">${rawColumn}</div>
        </section>
        <section class="panel">
          <div class="panel-title">JPEG source</div>
          <div class="single-thumb">${jpegThumb}</div>
          <div class="mono small">${escapeHtml(entry.sourcePath || 'n/a')}</div>
          <div class="small">JPEG EXIF date: ${escapeHtml(entry.jpegDate || '') || 'n/a'}</div>
        </section>
        <section class="panel">
          <div class="panel-title">Site</div>
          <div class="single-thumb">${siteThumb}</div>
          <div class="mono small">${escapeHtml(entry.siteRelativePath)}</div>
          <div class="small">Placements: ${escapeHtml(String(entry.placementCount || 1))}</div>
        </section>
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
  <title>RAW verification review</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #efe7d7;
      --card: rgba(255,255,255,.88);
      --ink: #2c241d;
      --muted: #726150;
      --line: #d8c5a8;
      --accent: #8f4c1e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background:
        radial-gradient(circle at top left, rgba(176,132,74,.2), transparent 32%),
        linear-gradient(180deg, #f8f3ea 0%, var(--bg) 100%);
      color: var(--ink);
    }
    main { max-width: 1600px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 42px; }
    p { color: var(--muted); font-size: 20px; line-height: 1.45; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin: 24px 0;
    }
    .summary-card, .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(104, 80, 47, .10);
    }
    .summary-card { padding: 16px 20px; }
    .summary-card .label { color: var(--muted); text-transform: uppercase; letter-spacing: .06em; font-size: 13px; }
    .summary-card .value { font-size: 34px; font-weight: 700; margin-top: 6px; }
    .cards { display: grid; gap: 18px; }
    .card { padding: 18px; }
    .card-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 8px;
    }
    .review-number { font-size: 34px; font-weight: 700; }
    .card-path { color: var(--muted); margin-bottom: 14px; word-break: break-word; }
    .meta-inline { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .pill {
      background: var(--accent);
      color: #fff;
      border-radius: 999px;
      padding: 6px 14px;
      font-weight: 700;
      letter-spacing: .06em;
    }
    .card-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 12px;
      background: rgba(255,255,255,.7);
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
    .raw-label {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: #3d3128;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 10px;
    }
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
    .missing-thumb {
      color: var(--muted);
      text-align: center;
      font-size: 17px;
      padding: 20px;
    }
    .mono { font-family: "Courier New", monospace; }
    .small { font-size: 13px; line-height: 1.45; word-break: break-word; }
    .raw-meta { margin-top: 4px; color: var(--muted); }
    @media (max-width: 1100px) {
      .card-grid { grid-template-columns: 1fr; }
      h1 { font-size: 34px; }
    }
  </style>
</head>
<body>
  <main>
    <h1>RAW Verification Review</h1>
    <p>Approved-safe entries only. Each item shows RAW candidate previews next to the matched JPEG source and the current site image.</p>
    <section class="summary">
      <div class="summary-card"><div class="label">Approved entries</div><div class="value">${summary.total}</div></div>
      <div class="summary-card"><div class="label">With RAW candidates</div><div class="value">${summary.withRaw}</div></div>
      <div class="summary-card"><div class="label">Without RAW candidates</div><div class="value">${summary.withoutRaw}</div></div>
      <div class="summary-card"><div class="label">Multi-candidate RAW</div><div class="value">${summary.multiRaw}</div></div>
    </section>
    <section class="cards">${body}</section>
  </main>
</body>
</html>`;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html, 'utf8');
}

function writeCsv(filePath, entries) {
  const header = [
    'reviewNumber',
    'imageId',
    'sourceAssetId',
    'cameraCode',
    'projectSlug',
    'siteRelativePath',
    'sourcePath',
    'rawCandidateCount',
    'rawCandidates'
  ];

  const rows = entries.map((entry, index) => [
    padNumber(index + 1),
    entry.imageId,
    entry.sourceAssetId,
    entry.cameraCode,
    entry.projectSlug,
    entry.siteRelativePath,
    entry.sourcePath,
    entry.rawCandidates.length,
    entry.rawCandidates.map((candidate) => candidate.rawRelativePath).join(' | ')
  ]);

  const content = [header, ...rows]
    .map((row) => row.map((value) => csvEscape(value)).join(','))
    .join('\n');

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const registry = readJson(path.resolve(rootDir, args.registry), { images: [], sourceAssets: [] });
  const reconcile = readJson(path.resolve(rootDir, args.reconcile), {});
  const holds = readJson(path.resolve(rootDir, args.holds), []);
  const holdSet = buildHoldSet(holds);
  const archiveDir = reconcile?.archiveDir ? path.resolve(String(reconcile.archiveDir)) : '';
  const rawDir = path.resolve(args.rawdir);
  const outDir = path.resolve(rootDir, args.outdir);
  const previewDir = path.join(outDir, 'raw-previews');

  const entries = args.scope === 'all'
    ? buildAllEntries(registry, holdSet, archiveDir)
    : buildApprovedEntries(registry, holdSet, archiveDir);
  const rawFiles = listRawFiles(rawDir);
  const rawIndex = buildRawIndex(rawFiles);

  const enrichedEntries = entries.map((entry) => {
    let jpegMetadata = {};
    try {
      if (entry.absoluteSourcePath && fs.existsSync(entry.absoluteSourcePath)) {
        jpegMetadata = exiftoolJson(entry.absoluteSourcePath);
      }
    } catch (error) {
      jpegMetadata = {};
    }

    const jpegDate = parseDate(
      entry.jpegDate ||
      jpegMetadata.DateTimeOriginal ||
      jpegMetadata.CreateDate ||
      ''
    );

    const rawCandidates = (rawIndex.get(entry.cameraCode) || [])
      .map((rawPath) => {
        let metadata = {};
        try {
          metadata = exiftoolJson(rawPath);
        } catch (error) {
          metadata = {};
        }

        const comparison = compareRawCandidate(metadata, jpegDate);
        let previewPath = '';
        try {
          previewPath = extractPreview(rawPath, previewDir, metadata);
        } catch (error) {
          previewPath = '';
        }

        return {
          rawPath,
          rawRelativePath: normalizePath(path.relative(rawDir, rawPath)),
          fileType: String(metadata.FileType || path.extname(rawPath).replace(/^\./, '')).trim(),
          createDate: parseDate(metadata.CreateDate || ''),
          dateTimeOriginal: parseDate(metadata.DateTimeOriginal || ''),
          rawDate: comparison.rawDate,
          score: comparison.score,
          previewPath
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return left.rawRelativePath.localeCompare(right.rawRelativePath);
      });

    return {
      ...entry,
      jpegDate,
      jpegCreateDate: parseDate(jpegMetadata.CreateDate || ''),
      jpegDateTimeOriginal: parseDate(jpegMetadata.DateTimeOriginal || ''),
      rawCandidates
    };
  });

  const summary = {
    total: enrichedEntries.length,
    withRaw: enrichedEntries.filter((entry) => entry.rawCandidates.length > 0).length,
    withoutRaw: enrichedEntries.filter((entry) => entry.rawCandidates.length === 0).length,
    multiRaw: enrichedEntries.filter((entry) => entry.rawCandidates.length > 1).length,
    withCameraCode: enrichedEntries.filter((entry) => entry.cameraCode).length,
    withoutCameraCode: enrichedEntries.filter((entry) => !entry.cameraCode).length
  };

  writeJson(path.join(outDir, 'raw-verification-review.json'), {
    generatedAt: new Date().toISOString(),
    rawDir,
    archiveDir,
    scope: args.scope,
    summary,
    entries: enrichedEntries
  });
  writeCsv(path.join(outDir, 'raw-verification-review.csv'), enrichedEntries);
  writeHtml(path.join(outDir, 'raw-verification-review.html'), summary, enrichedEntries);

  console.log(`[registry:raw-review] approved=${summary.total} withRaw=${summary.withRaw} withoutRaw=${summary.withoutRaw} multiRaw=${summary.multiRaw}`);
  console.log(`[registry:raw-review] wrote ${normalizePath(path.relative(rootDir, outDir))}`);
}

if (require.main === module) {
  main();
}

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execFileSync } = require('child_process');

const DEFAULT_RAW_DIR = 'D:\\RAW\\2019\\100OC_19';
const DEFAULT_REGISTRY = 'data/image-registry.json';
const DEFAULT_HOLDS = 'data/manual-problematic-overrides.json';
const DEFAULT_OUTDIR = '.build-temp/raw-folder-compare';
const EXIFTOOL_PATH = 'C:\\Tools\\ExifTool\\exiftool.exe';
const RAW_EXTENSIONS = new Set(['.nef', '.dng', '.arw', '.cr2', '.cr3', '.orf', '.rw2', '.raf']);

function parseArgs(argv = []) {
  const args = {
    rawdir: DEFAULT_RAW_DIR,
    registry: DEFAULT_REGISTRY,
    holds: DEFAULT_HOLDS,
    outdir: DEFAULT_OUTDIR
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--rawdir') {
      args.rawdir = argv[index + 1] ? String(argv[index + 1]) : args.rawdir;
      index += 1;
      continue;
    }
    if (token === '--registry') {
      args.registry = argv[index + 1] ? String(argv[index + 1]) : args.registry;
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
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fileUrlFromPath(filePath) {
  const normalized = path.resolve(filePath).replace(/\\/g, '/');
  return `file:///${encodeURI(normalized)}`;
}

function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await worker(items[current], current);
    }
  }

  return Promise.all(new Array(Math.max(1, limit)).fill(null).map(() => run())).then(() => results);
}

function popcountBigInt(value) {
  let count = 0;
  let current = BigInt(value);
  while (current) {
    current &= current - 1n;
    count += 1;
  }
  return count;
}

function hashBinaryPixels(pixels = [], threshold = 0) {
  let hash = 0n;
  pixels.forEach((value) => {
    hash <<= 1n;
    if (value >= threshold) hash |= 1n;
  });
  return hash;
}

function computeAverageHash(buffer) {
  let sum = 0;
  for (let index = 0; index < buffer.length; index += 1) sum += buffer[index];
  const average = buffer.length ? sum / buffer.length : 0;
  return hashBinaryPixels([...buffer], average);
}

function computeDifferenceHash(buffer, width, height) {
  let hash = 0n;
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width - 1; col += 1) {
      const left = buffer[row * width + col];
      const right = buffer[row * width + col + 1];
      hash <<= 1n;
      if (left > right) hash |= 1n;
    }
  }
  return hash;
}

function computeHistogram(buffer, bins = 16) {
  const histogram = new Array(bins).fill(0);
  for (let index = 0; index < buffer.length; index += 1) {
    const bucket = Math.min(bins - 1, Math.floor((buffer[index] / 256) * bins));
    histogram[bucket] += 1;
  }
  if (!buffer.length) return histogram;
  return histogram.map((value) => value / buffer.length);
}

function histogramDistance(left = [], right = []) {
  const length = Math.max(left.length, right.length);
  let distance = 0;
  for (let index = 0; index < length; index += 1) {
    distance += Math.abs(Number(left[index] || 0) - Number(right[index] || 0));
  }
  return distance;
}

function getOrientation(width = 0, height = 0) {
  if (!width || !height) return 'unknown';
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

async function buildFingerprint(filePath) {
  const metadata = await sharp(filePath, { animated: false, limitInputPixels: false }).metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  const aspect = width && height ? width / height : 0;
  const orientation = getOrientation(width, height);

  const [averageHashBuffer, differenceHashBuffer, histogramBuffer] = await Promise.all([
    sharp(filePath, { animated: false, limitInputPixels: false })
      .rotate()
      .grayscale()
      .resize(8, 8, { fit: 'fill' })
      .raw()
      .toBuffer(),
    sharp(filePath, { animated: false, limitInputPixels: false })
      .rotate()
      .grayscale()
      .resize(9, 8, { fit: 'fill' })
      .raw()
      .toBuffer(),
    sharp(filePath, { animated: false, limitInputPixels: false })
      .rotate()
      .grayscale()
      .resize(16, 16, { fit: 'fill' })
      .raw()
      .toBuffer()
  ]);

  return {
    width,
    height,
    aspect,
    orientation,
    averageHash: computeAverageHash(averageHashBuffer).toString(),
    differenceHash: computeDifferenceHash(differenceHashBuffer, 9, 8).toString(),
    histogram: computeHistogram(histogramBuffer)
  };
}

function compareFingerprints(site, raw) {
  const siteAverageHash = BigInt(site.averageHash);
  const rawAverageHash = BigInt(raw.averageHash);
  const siteDifferenceHash = BigInt(site.differenceHash);
  const rawDifferenceHash = BigInt(raw.differenceHash);
  const averageHashDistance = popcountBigInt(siteAverageHash ^ rawAverageHash);
  const differenceHashDistance = popcountBigInt(siteDifferenceHash ^ rawDifferenceHash);
  const ratioDiff = site.aspect && raw.aspect
    ? Math.abs(site.aspect - raw.aspect) / Math.max(site.aspect, raw.aspect)
    : 1;
  const histogramDiff = histogramDistance(site.histogram, raw.histogram);

  let score = 0.94;
  score -= (averageHashDistance / 64) * 0.34;
  score -= (differenceHashDistance / 64) * 0.41;
  score -= Math.min(ratioDiff / 0.18, 1) * 0.17;
  score -= Math.min(histogramDiff / 1.1, 1) * 0.08;
  if (site.orientation !== raw.orientation && site.orientation !== 'square' && raw.orientation !== 'square') {
    score -= 0.12;
  }

  return {
    score,
    averageHashDistance,
    differenceHashDistance,
    ratioDiff,
    histogramDiff
  };
}

function exiftoolJson(filePath) {
  const output = execFileSync(EXIFTOOL_PATH, ['-j', '-FileType', '-CreateDate', '-DateTimeOriginal', '-PreviewImage', '-JpgFromRaw', '-ThumbnailImage', filePath], {
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
  const safeName = `${path.parse(rawPath).name}.jpg`;
  const outputPath = path.join(outDir, safeName);
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

function listRawFiles(rawDir) {
  return fs.readdirSync(rawDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && RAW_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(rawDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

function buildTargets(registry, holds, rootDir) {
  const holdSet = new Set((Array.isArray(holds) ? holds : [])
    .map((entry) => normalizePath(entry?.currentSitePath || ''))
    .filter(Boolean));

  const all = (registry?.images || []).flatMap((image) => {
    const placements = Array.isArray(image?.placements) ? image.placements : [];
    return placements.map((placement) => ({
      imageId: String(image?.imageId || '').trim(),
      registryStatus: String(image?.registryStatus || '').trim(),
      sourceMatchStatus: String(image?.sourceMatchStatus || '').trim(),
      cameraCode: sanitizeCameraCode(image?.source?.cameraCode || ''),
      sourcePath: normalizePath(image?.source?.sourcePath || ''),
      siteRelativePath: normalizePath(placement?.siteRelativePath || ''),
      projectSlug: String(placement?.projectSlug || '').trim(),
      currentFilename: String(placement?.currentFilename || '').trim(),
      absoluteSitePath: path.resolve(rootDir, normalizePath(placement?.siteRelativePath || '')),
      holdReason: holdSet.has(normalizePath(placement?.siteRelativePath || ''))
    }));
  });

  return {
    problematic: all.filter((entry) => entry.holdReason),
    unresolved: all.filter((entry) => entry.registryStatus === 'unresolved')
  };
}

async function fingerprintTargets(targets) {
  return mapConcurrent(targets, 4, async (target) => ({
    ...target,
    fingerprint: await buildFingerprint(target.absoluteSitePath)
  }));
}

async function fingerprintRawFolder(rawDir, previewDir) {
  const rawFiles = listRawFiles(rawDir);
  return mapConcurrent(rawFiles, 3, async (rawPath) => {
    const metadata = exiftoolJson(rawPath);
    const previewPath = extractPreview(rawPath, previewDir, metadata);
    const fingerprint = previewPath ? await buildFingerprint(previewPath) : null;
    const match = path.basename(rawPath).toUpperCase().match(/(DSCF\d{3,}|DSC_\d{3,}|IMG_\d{3,}|IMGP\d{3,})/);
    return {
      rawPath,
      rawRelativePath: normalizePath(path.relative(rawDir, rawPath)),
      cameraCode: match && match[1] ? sanitizeCameraCode(match[1]) : '',
      createDate: String(metadata.CreateDate || '').trim(),
      dateTimeOriginal: String(metadata.DateTimeOriginal || '').trim(),
      previewPath,
      fingerprint
    };
  });
}

function rankCandidates(target, raws, limit = 6) {
  return raws
    .filter((raw) => raw.fingerprint)
    .map((raw) => ({
      rawPath: raw.rawPath,
      rawRelativePath: raw.rawRelativePath,
      cameraCode: raw.cameraCode,
      createDate: raw.createDate,
      dateTimeOriginal: raw.dateTimeOriginal,
      previewPath: raw.previewPath,
      ...compareFingerprints(target.fingerprint, raw.fingerprint)
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((candidate) => ({
      ...candidate,
      score: Number(candidate.score.toFixed(4)),
      ratioDiff: Number(candidate.ratioDiff.toFixed(6)),
      histogramDiff: Number(candidate.histogramDiff.toFixed(6))
    }));
}

function buildExactCodeOverlap(raws, targets) {
  const rawCodeMap = new Map();
  raws.forEach((raw) => {
    if (!raw.cameraCode) return;
    if (!rawCodeMap.has(raw.cameraCode)) rawCodeMap.set(raw.cameraCode, []);
    rawCodeMap.get(raw.cameraCode).push(raw.rawRelativePath);
  });

  return targets
    .filter((target) => target.cameraCode && rawCodeMap.has(target.cameraCode))
    .map((target) => ({
      cameraCode: target.cameraCode,
      siteRelativePath: target.siteRelativePath,
      projectSlug: target.projectSlug,
      registryStatus: target.registryStatus,
      sourcePath: target.sourcePath,
      rawPaths: rawCodeMap.get(target.cameraCode)
    }))
    .sort((left, right) => left.cameraCode.localeCompare(right.cameraCode));
}

function renderTargetCard(entry, index) {
  const siteImage = fs.existsSync(entry.absoluteSitePath)
    ? `<img src="${escapeHtml(fileUrlFromPath(entry.absoluteSitePath))}" alt="${escapeHtml(entry.siteRelativePath)}" loading="lazy">`
    : '<div class="missing">Missing site image</div>';
  const candidates = entry.candidates.length
    ? entry.candidates.map((candidate, candidateIndex) => {
      const label = String.fromCharCode(65 + candidateIndex);
      const preview = candidate.previewPath && fs.existsSync(candidate.previewPath)
        ? `<img src="${escapeHtml(fileUrlFromPath(candidate.previewPath))}" alt="${escapeHtml(candidate.rawRelativePath)}" loading="lazy">`
        : '<div class="missing">No preview</div>';
      return `
        <div class="candidate">
          <div class="candidate-label">${label}</div>
          <div class="candidate-thumb">${preview}</div>
          <div class="mono small">${escapeHtml(candidate.rawRelativePath)}</div>
          <div class="small">Code: ${escapeHtml(candidate.cameraCode || 'n/a')}</div>
          <div class="small">Score: ${escapeHtml(String(candidate.score))}</div>
          <div class="small">Date: ${escapeHtml(candidate.dateTimeOriginal || candidate.createDate || '') || 'n/a'}</div>
        </div>
      `;
    }).join('')
    : '<div class="missing">No candidate previews</div>';

  return `
    <article class="card">
      <div class="card-head">
        <div class="review-number">${String(index + 1).padStart(3, '0')}</div>
        <div class="mono small">${escapeHtml(entry.projectSlug)}</div>
      </div>
      <div class="mono path">${escapeHtml(entry.siteRelativePath)}</div>
      <div class="small">Current code: ${escapeHtml(entry.cameraCode || 'none')}</div>
      <div class="small">Source path: ${escapeHtml(entry.sourcePath || 'n/a')}</div>
      <div class="layout">
        <div class="site-panel">
          <div class="section-title">Site</div>
          <div class="site-thumb">${siteImage}</div>
        </div>
        <div class="candidates-panel">
          <div class="section-title">RAW candidates from 100OC_19</div>
          <div class="candidate-grid">${candidates}</div>
        </div>
      </div>
    </article>
  `;
}

function writeHtml(filePath, title, subtitle, entries, exactCodeOverlap) {
  const cards = entries.map((entry, index) => renderTargetCard(entry, index)).join('\n');
  const overlapList = exactCodeOverlap.length
    ? exactCodeOverlap.map((entry) => `<li><span class="mono">${escapeHtml(entry.cameraCode)}</span> -> <span class="mono">${escapeHtml(entry.siteRelativePath)}</span></li>`).join('')
    : '<li>No exact camera-code overlap in this set.</li>';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin:0; font-family: Georgia, serif; background:#f6efe4; color:#2f241c; }
    main { max-width:1500px; margin:0 auto; padding:24px; }
    h1 { margin:0 0 8px; font-size:42px; }
    p, li, .small { color:#6f5d49; line-height:1.45; }
    .summary, .card { background:rgba(255,255,255,.88); border:1px solid #dcc7ab; border-radius:24px; box-shadow:0 10px 28px rgba(96,72,40,.1); }
    .summary { padding:18px 22px; margin-bottom:20px; }
    .cards { display:grid; gap:18px; }
    .card { padding:18px; }
    .card-head { display:flex; justify-content:space-between; gap:12px; align-items:center; }
    .review-number { font-size:34px; font-weight:700; }
    .layout { display:grid; grid-template-columns:300px minmax(0,1fr); gap:18px; margin-top:14px; }
    .site-thumb, .candidate-thumb { min-height:180px; display:flex; align-items:center; justify-content:center; background:#fff; border-radius:14px; overflow:hidden; }
    img { max-width:100%; max-height:320px; display:block; }
    .candidate-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; }
    .candidate { border:1px solid #dcc7ab; border-radius:18px; padding:10px; background:#fff; }
    .candidate-label { display:inline-block; background:#3d3128; color:#fff; border-radius:999px; padding:4px 10px; font-size:12px; font-weight:700; margin-bottom:8px; }
    .mono { font-family:"Courier New", monospace; word-break:break-word; }
    .path { margin-top:6px; }
    .section-title { text-transform:uppercase; letter-spacing:.06em; color:#6f5d49; font-size:13px; margin-bottom:8px; }
    .missing { color:#6f5d49; padding:20px; text-align:center; }
    @media (max-width: 1100px) { .layout { grid-template-columns:1fr; } h1 { font-size:34px; } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(subtitle)}</p>
    <section class="summary">
      <div><strong>Items:</strong> ${entries.length}</div>
      <div><strong>Exact camera-code overlaps:</strong> ${exactCodeOverlap.length}</div>
      <ul>${overlapList}</ul>
    </section>
    <section class="cards">${cards}</section>
  </main>
</body>
</html>`;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const registry = readJson(path.resolve(rootDir, args.registry), { images: [] });
  const holds = readJson(path.resolve(rootDir, args.holds), []);
  const rawDir = path.resolve(args.rawdir);
  const outDir = path.resolve(rootDir, args.outdir);
  const previewDir = path.join(outDir, 'raw-previews');

  const targets = buildTargets(registry, holds, rootDir);
  const [problematicTargets, unresolvedTargets, rawEntries] = await Promise.all([
    fingerprintTargets(targets.problematic),
    fingerprintTargets(targets.unresolved),
    fingerprintRawFolder(rawDir, previewDir)
  ]);

  const problematicResults = problematicTargets.map((target) => ({
    ...target,
    candidates: rankCandidates(target, rawEntries)
  }));
  const unresolvedResults = unresolvedTargets.map((target) => ({
    ...target,
    candidates: rankCandidates(target, rawEntries)
  }));

  const problematicOverlap = buildExactCodeOverlap(rawEntries, problematicResults);
  const unresolvedOverlap = buildExactCodeOverlap(rawEntries, unresolvedResults);

  writeJson(path.join(outDir, 'problematic.json'), {
    generatedAt: new Date().toISOString(),
    rawDir,
    summary: {
      itemCount: problematicResults.length,
      exactCodeOverlapCount: problematicOverlap.length
    },
    exactCodeOverlap: problematicOverlap,
    entries: problematicResults
  });

  writeJson(path.join(outDir, 'unresolved.json'), {
    generatedAt: new Date().toISOString(),
    rawDir,
    summary: {
      itemCount: unresolvedResults.length,
      exactCodeOverlapCount: unresolvedOverlap.length
    },
    exactCodeOverlap: unresolvedOverlap,
    entries: unresolvedResults
  });

  writeHtml(
    path.join(outDir, 'problematic.html'),
    '100OC_19 vs Problematic Images',
    'First pass against the problematic/held images.',
    problematicResults,
    problematicOverlap
  );

  writeHtml(
    path.join(outDir, 'unresolved.html'),
    '100OC_19 vs Unresolved Images',
    'Second pass against unresolved images that still have no final match.',
    unresolvedResults,
    unresolvedOverlap
  );

  console.log(`[raw-folder-compare] problematic=${problematicResults.length} overlap=${problematicOverlap.length}`);
  console.log(`[raw-folder-compare] unresolved=${unresolvedResults.length} overlap=${unresolvedOverlap.length}`);
  console.log(`[raw-folder-compare] wrote ${normalizePath(path.relative(rootDir, outDir))}`);
}

main().catch((error) => {
  console.error(`[raw-folder-compare] ${error.message}`);
  process.exitCode = 1;
});

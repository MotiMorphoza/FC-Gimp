'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const Scanner = require('./scanner');

const SITE_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const SOURCE_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp', '.gif']);
function createLogger() {
  return {
    info() {},
    warn() {},
    error() {}
  };
}

function parseArgs(argv = []) {
  const args = {
    archive: null,
    manualCodes: null,
    manualMatches: 'data/manual-source-matches.json',
    write: null,
    limitSite: 0,
    cache: '.build-temp/registry-fingerprint-cache.json'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--archive') {
      args.archive = argv[index + 1] ? String(argv[index + 1]) : null;
      index += 1;
      continue;
    }

    if (token === '--write') {
      args.write = argv[index + 1] ? String(argv[index + 1]) : null;
      index += 1;
      continue;
    }

    if (token === '--manual-codes') {
      args.manualCodes = argv[index + 1] ? String(argv[index + 1]) : null;
      index += 1;
      continue;
    }

    if (token === '--manual-matches') {
      args.manualMatches = argv[index + 1] ? String(argv[index + 1]) : null;
      index += 1;
      continue;
    }

    if (token === '--limit-site') {
      args.limitSite = Number(argv[index + 1] || 0) || 0;
      index += 1;
      continue;
    }

    if (token === '--cache') {
      args.cache = argv[index + 1] ? String(argv[index + 1]) : args.cache;
      index += 1;
    }
  }

  return args;
}

function normalizeStem(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '');
}

function sanitizeCameraCode(value = '') {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

function normalizeSiteRelativePath(value = '') {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '');
}

function normalizePath(value = '') {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/');
}

function extractCameraCode(filename = '') {
  const parsed = path.parse(String(filename || ''));
  const base = String(parsed.name || '').toUpperCase();
  const match = base.match(/(DSCF\d{3,}|DSC_\d{3,}|IMG_\d{3,}|IMGP\d{3,})[A-Z]?/);
  if (match && match[1]) return sanitizeCameraCode(match[1]);
  return '';
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadManualCodeOverrides(filePath) {
  if (!filePath) return { filePath: null, bySitePath: new Map(), entries: [] };

  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Manual codes file does not exist: ${resolvedPath}`);
  }

  const payload = readJsonFile(resolvedPath);
  const rows = Array.isArray(payload) ? payload : [];
  const bySitePath = new Map();
  const entries = [];

  rows.forEach((row) => {
    const sitePath = normalizeSiteRelativePath(row?.currentSitePath || row?.siteRelativePath || '');
    const manualCameraCode = sanitizeCameraCode(row?.manualCameraCode || row?.cameraCode || '');
    if (!sitePath || !manualCameraCode) return;

    const entry = {
      reviewId: String(row?.reviewId || '').trim(),
      reviewNumber: String(row?.reviewNumber || '').trim(),
      projectSlug: String(row?.projectSlug || '').trim(),
      currentSitePath: sitePath,
      currentSiteFilename: String(row?.currentSiteFilename || '').trim(),
      manualCameraCode
    };

    bySitePath.set(sitePath, entry);
    entries.push(entry);
  });

  return {
    filePath: resolvedPath,
    bySitePath,
    entries
  };
}

function loadManualSourceMatches(filePath) {
  if (!filePath) return { filePath: null, bySitePath: new Map(), entries: [] };

  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    return { filePath: resolvedPath, bySitePath: new Map(), entries: [] };
  }

  const payload = readJsonFile(resolvedPath);
  const rows = Array.isArray(payload) ? payload : [];
  const bySitePath = new Map();
  const entries = [];

  rows.forEach((row) => {
    const sitePath = normalizeSiteRelativePath(row?.siteRelativePath || row?.currentSitePath || '');
    const cameraCode = sanitizeCameraCode(row?.cameraCode || '');
    const sourcePath = normalizePath(row?.sourcePath || '');
    if (!sitePath || !cameraCode) return;

    const entry = {
      projectSlug: String(row?.projectSlug || '').trim(),
      siteRelativePath: sitePath,
      currentSiteFilename: String(row?.currentSiteFilename || '').trim(),
      cameraCode,
      sourcePath,
      rawPath: normalizePath(row?.rawPath || ''),
      note: String(row?.note || '').trim()
    };

    bySitePath.set(sitePath, entry);
    entries.push(entry);
  });

  return {
    filePath: resolvedPath,
    bySitePath,
    entries
  };
}

function isSiteImage(filePath = '') {
  return SITE_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isSourceImage(filePath = '') {
  return SOURCE_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function getOrientation(width = 0, height = 0) {
  if (!width || !height) return 'unknown';
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

function formatRelative(baseDir, filePath) {
  return path.relative(baseDir, filePath).replace(/\\/g, '/');
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
  for (let index = 0; index < buffer.length; index += 1) {
    sum += buffer[index];
  }

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
    const value = buffer[index];
    const bucket = Math.min(bins - 1, Math.floor((value / 256) * bins));
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

async function readFileHash(filePath) {
  const buffer = await fs.promises.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function buildFingerprint(filePath) {
  const metadata = await sharp(filePath, { animated: false, limitInputPixels: false }).metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  const aspect = width && height ? width / height : 0;
  const orientation = getOrientation(width, height);
  const stat = await fs.promises.stat(filePath);
  const exactHash = await readFileHash(filePath);

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
    fileSize: Number(stat.size || 0),
    exactHash,
    averageHash: computeAverageHash(averageHashBuffer).toString(),
    differenceHash: computeDifferenceHash(differenceHashBuffer, 9, 8).toString(),
    histogram: computeHistogram(histogramBuffer)
  };
}

function loadCache(cachePath) {
  if (!cachePath || !fs.existsSync(cachePath)) return { entries: {} };

  try {
    const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (payload && typeof payload === 'object' && payload.entries && typeof payload.entries === 'object') {
      return payload;
    }
  } catch (error) {
    return { entries: {} };
  }

  return { entries: {} };
}

function saveCache(cachePath, cache) {
  if (!cachePath) return;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
}

async function getCachedFingerprint(filePath, cache) {
  const stat = await fs.promises.stat(filePath);
  const cacheEntry = cache.entries[filePath];

  if (
    cacheEntry &&
    Number(cacheEntry.fileSize || 0) === Number(stat.size || 0) &&
    Number(cacheEntry.mtimeMs || 0) === Number(stat.mtimeMs || 0)
  ) {
    return cacheEntry.fingerprint;
  }

  const fingerprint = await buildFingerprint(filePath);
  cache.entries[filePath] = {
    fileSize: Number(stat.size || 0),
    mtimeMs: Number(stat.mtimeMs || 0),
    fingerprint
  };

  return fingerprint;
}

async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = new Array(Math.max(1, limit)).fill(null).map(() => run());
  await Promise.all(workers);
  return results;
}

function scanSiteImages(rootDir) {
  const scanner = new Scanner(createLogger());
  const projects = scanner.scanProjectsFromRoot(rootDir);

  return projects.flatMap((project) => {
    const projectDir = path.join(rootDir, 'src', 'projects', project.slug);
    const images = Array.isArray(project.images) ? project.images : [];

    return images
      .filter((image) => isSiteImage(image?.src))
      .map((image, imageIndex) => {
        const src = String(image?.src || '').trim();
        const stem = path.parse(src).name;
        return {
          projectSlug: project.slug,
          projectTitle: project.title,
          sitePath: path.join(projectDir, src),
          currentFilename: src,
          currentStem: stem,
          siteRelativePath: `src/projects/${project.slug}/${src}`.replace(/\\/g, '/'),
          imageIndex,
          alt: String(image?.alt || '').trim(),
          caption: String(image?.caption || '').trim()
        };
      });
  });
}

async function scanSourceImages(archiveDir) {
  const queue = [archiveDir];
  const files = [];

  while (queue.length) {
    const currentDir = queue.shift();
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!isSourceImage(fullPath)) continue;
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function compareFingerprints(site, source) {
  const siteAverageHash = BigInt(site.averageHash);
  const sourceAverageHash = BigInt(source.averageHash);
  const siteDifferenceHash = BigInt(site.differenceHash);
  const sourceDifferenceHash = BigInt(source.differenceHash);

  const averageHashDistance = popcountBigInt(siteAverageHash ^ sourceAverageHash);
  const differenceHashDistance = popcountBigInt(siteDifferenceHash ^ sourceDifferenceHash);
  const ratioDiff = site.aspect && source.aspect
    ? Math.abs(site.aspect - source.aspect) / Math.max(site.aspect, source.aspect)
    : 1;
  const histogramDiff = histogramDistance(site.histogram, source.histogram);
  const exactHashMatch = site.exactHash === source.exactHash;

  const orientationPenalty = site.orientation === source.orientation || site.orientation === 'square' || source.orientation === 'square'
    ? 0
    : 0.12;

  let score = exactHashMatch ? 1 : 0.94;
  score -= (averageHashDistance / 64) * 0.34;
  score -= (differenceHashDistance / 64) * 0.41;
  score -= Math.min(ratioDiff / 0.14, 1) * 0.17;
  score -= Math.min(histogramDiff / 1.1, 1) * 0.08;
  score -= orientationPenalty;

  return {
    score,
    exactHashMatch,
    averageHashDistance,
    differenceHashDistance,
    ratioDiff,
    histogramDiff
  };
}

function buildProposedFilename(siteEntry, cameraCode, sourcePath) {
  const ext = path.extname(siteEntry.currentFilename).toLowerCase() || path.extname(sourcePath).toLowerCase() || '.jpg';
  const prefix = String(siteEntry.currentStem || '').trim();
  const normalizedCode = sanitizeCameraCode(cameraCode);

  if (!prefix || !normalizedCode) return '';
  if (prefix.toUpperCase().endsWith(`__${normalizedCode}`)) {
    return `${prefix}${ext}`;
  }
  return `${prefix}__${normalizedCode}${ext}`;
}

function buildSourceCodeIndex(sourceEntries = []) {
  const index = new Map();

  sourceEntries
    .filter((entry) => !entry.error && entry.cameraCode)
    .forEach((entry) => {
      const code = sanitizeCameraCode(entry.cameraCode);
      if (!index.has(code)) index.set(code, []);
      index.get(code).push(entry);
    });

  return index;
}

function buildSourcePathIndex(sourceEntries = []) {
  const index = new Map();

  sourceEntries
    .filter((entry) => !entry.error)
    .forEach((entry) => {
      const relativePath = normalizePath(entry.relativePath || '');
      if (!relativePath) return;
      index.set(relativePath, entry);
    });

  return index;
}

function classifyMatch(best, secondBest) {
  if (!best) return 'unmatched';
  if (best.exactHashMatch) return 'exact';
  if (best.score >= 0.93 && (!secondBest || (best.score - secondBest.score) >= 0.05)) return 'strong';
  if (best.score >= 0.89 && (!secondBest || (best.score - secondBest.score) >= 0.03)) return 'probable';
  if (best.score >= 0.84) return 'ambiguous';
  return 'unmatched';
}

function summarizeMatches(matches = []) {
  const summary = {
    exact: 0,
    strong: 0,
    probable: 0,
    ambiguous: 0,
    manual: 0,
    unmatched: 0,
    matchedWithCameraCode: 0,
    matchedWithoutCameraCode: 0
  };

  matches.forEach((entry) => {
    summary[entry.status] = (summary[entry.status] || 0) + 1;
    if (entry.status === 'exact' || entry.status === 'strong' || entry.status === 'probable' || entry.status === 'manual') {
      if (entry.bestMatch?.cameraCode) summary.matchedWithCameraCode += 1;
      else summary.matchedWithoutCameraCode += 1;
    }
  });

  return summary;
}

function formatCandidate(candidate, archiveDir) {
  return {
    sourcePath: formatRelative(archiveDir, candidate.path),
    sourceName: candidate.name,
    cameraCode: candidate.cameraCode,
    score: Number(candidate.score.toFixed(4)),
    exactHashMatch: candidate.exactHashMatch,
    averageHashDistance: candidate.averageHashDistance,
    differenceHashDistance: candidate.differenceHashDistance,
    ratioDiff: Number(candidate.ratioDiff.toFixed(6)),
    histogramDiff: Number(candidate.histogramDiff.toFixed(6)),
    width: candidate.width,
    height: candidate.height,
    equivalentSourcePaths: Array.isArray(candidate.equivalentSourcePaths)
      ? candidate.equivalentSourcePaths.slice(0, 10)
      : []
  };
}

async function buildSourceEntries(archiveDir, cache) {
  const sourceFiles = await scanSourceImages(archiveDir);

  return mapConcurrent(sourceFiles, 6, async (filePath) => {
    try {
      const fingerprint = await getCachedFingerprint(filePath, cache);
      return {
        path: filePath,
        name: path.basename(filePath),
        relativePath: formatRelative(archiveDir, filePath),
        cameraCode: extractCameraCode(filePath),
        ...fingerprint
      };
    } catch (error) {
      return {
        path: filePath,
        name: path.basename(filePath),
        relativePath: formatRelative(archiveDir, filePath),
        cameraCode: extractCameraCode(filePath),
        error: error.message
      };
    }
  });
}

async function buildSiteEntries(rootDir, cache, limitSite = 0) {
  const siteImages = scanSiteImages(rootDir);
  const selected = limitSite > 0 ? siteImages.slice(0, limitSite) : siteImages;

  return mapConcurrent(selected, 6, async (entry) => {
    const fingerprint = await getCachedFingerprint(entry.sitePath, cache);
    return {
      ...entry,
      ...fingerprint
    };
  });
}

function createSourceBuckets(sourceEntries = []) {
  const buckets = new Map();

  sourceEntries
    .filter((entry) => !entry.error)
    .forEach((entry) => {
      const key = entry.orientation || 'unknown';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(entry);
    });

  return buckets;
}

function getSourceCandidates(siteEntry, sourceBuckets) {
  const direct = sourceBuckets.get(siteEntry.orientation) || [];
  const square = sourceBuckets.get('square') || [];
  const unknown = sourceBuckets.get('unknown') || [];

  const candidates = siteEntry.orientation === 'square'
    ? [...direct, ...(sourceBuckets.get('landscape') || []), ...(sourceBuckets.get('portrait') || []), ...unknown]
    : [...direct, ...square, ...unknown];

  return candidates.filter((candidate) => {
    if (!siteEntry.aspect || !candidate.aspect) return true;
    const ratioDiff = Math.abs(siteEntry.aspect - candidate.aspect) / Math.max(siteEntry.aspect, candidate.aspect);
    return ratioDiff <= 0.18;
  });
}

function collapseEquivalentCandidates(candidates = []) {
  const grouped = new Map();

  candidates.forEach((candidate) => {
    const key = candidate.exactHash || candidate.path;

    if (!grouped.has(key)) {
      grouped.set(key, {
        ...candidate,
        equivalentSourcePaths: [candidate.relativePath]
      });
      return;
    }

    const existing = grouped.get(key);
    existing.equivalentSourcePaths.push(candidate.relativePath);

    if (!existing.cameraCode && candidate.cameraCode) {
      existing.cameraCode = candidate.cameraCode;
      existing.name = candidate.name;
      existing.path = candidate.path;
      existing.relativePath = candidate.relativePath;
    }
  });

  return [...grouped.values()];
}

function rankCandidates(siteEntry, candidatePool = [], minScore = 0.74) {
  return collapseEquivalentCandidates(
    candidatePool
    .map((candidate) => {
      const metrics = compareFingerprints(siteEntry, candidate);
      return {
        ...candidate,
        ...metrics
      };
    })
    .filter((candidate) => candidate.score >= minScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
  )
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.cameraCode && !right.cameraCode) return -1;
      if (right.cameraCode && !left.cameraCode) return 1;
      return left.relativePath.localeCompare(right.relativePath);
    })
    .slice(0, 5);
}

function reconcileSiteEntry(siteEntry, sourceBuckets, archiveDir, options = {}) {
  const manualCameraCode = sanitizeCameraCode(options.manualCameraCode || '');
  const manualMatch = options.manualMatch || null;
  const defaultCandidates = rankCandidates(siteEntry, getSourceCandidates(siteEntry, sourceBuckets), 0.74);
  const exactManualSource = manualMatch?.sourcePath && options.sourcePathIndex?.get(manualMatch.sourcePath)
    ? options.sourcePathIndex.get(manualMatch.sourcePath)
    : null;
  const manualSourcePool = exactManualSource
    ? [exactManualSource]
    : (manualMatch?.cameraCode && options.sourceCodeIndex
      ? (options.sourceCodeIndex.get(manualMatch.cameraCode) || [])
      : (manualCameraCode && options.sourceCodeIndex
        ? (options.sourceCodeIndex.get(manualCameraCode) || [])
        : []));
  const manualCandidates = exactManualSource
    ? rankCandidates(siteEntry, [exactManualSource], 0)
    : (manualSourcePool.length
      ? rankCandidates(siteEntry, manualSourcePool, 0.45)
      : []);
  const candidates = manualCandidates.length ? manualCandidates : defaultCandidates;

  const best = candidates[0] || null;
  const secondBest = candidates[1] || null;
  const status = manualCandidates.length ? 'manual' : classifyMatch(best, secondBest);
  const effectiveCameraCode = manualMatch?.cameraCode || manualCameraCode || best?.cameraCode || '';

  const bestMatch = best
    ? {
        ...formatCandidate(best, archiveDir),
        cameraCode: effectiveCameraCode,
        proposedFilename: buildProposedFilename(siteEntry, effectiveCameraCode, best.path),
        manualOverride: manualCandidates.length,
        manualCameraCode: effectiveCameraCode || '',
        manualRawPath: manualMatch?.rawPath || ''
      }
    : null;

  return {
    site: {
      projectSlug: siteEntry.projectSlug,
      projectTitle: siteEntry.projectTitle,
      siteRelativePath: siteEntry.siteRelativePath,
      currentFilename: siteEntry.currentFilename,
      currentStem: siteEntry.currentStem,
      alt: siteEntry.alt,
      caption: siteEntry.caption,
      width: siteEntry.width,
      height: siteEntry.height
    },
    status,
    manualCameraCode,
    bestMatch,
    candidates: candidates.map((candidate) => formatCandidate(candidate, archiveDir))
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const archiveDir = args.archive ? path.resolve(args.archive) : null;
  const cachePath = args.cache ? path.resolve(rootDir, args.cache) : null;
  const cache = loadCache(cachePath);

  if (!archiveDir) {
    throw new Error('Missing required --archive <path> argument');
  }

  if (!fs.existsSync(archiveDir)) {
    throw new Error(`Archive directory does not exist: ${archiveDir}`);
  }

  console.log('[registry:reconcile] Building site image fingerprints...');
  const siteEntries = await buildSiteEntries(rootDir, cache, args.limitSite);

  console.log('[registry:reconcile] Building source archive fingerprints...');
  const sourceEntries = await buildSourceEntries(archiveDir, cache);
  const sourceBuckets = createSourceBuckets(sourceEntries);
  const sourceCodeIndex = buildSourceCodeIndex(sourceEntries);
  const manualOverrides = loadManualCodeOverrides(args.manualCodes);
  const manualMatches = loadManualSourceMatches(args.manualMatches);
  const sourcePathIndex = buildSourcePathIndex(sourceEntries);
  saveCache(cachePath, cache);

  console.log('[registry:reconcile] Matching site images to source archive...');
  const matches = siteEntries.map((entry) => reconcileSiteEntry(entry, sourceBuckets, archiveDir, {
    sourceCodeIndex,
    sourcePathIndex,
    manualCameraCode: manualOverrides.bySitePath.get(normalizeSiteRelativePath(entry.siteRelativePath))?.manualCameraCode || '',
    manualMatch: manualMatches.bySitePath.get(normalizeSiteRelativePath(entry.siteRelativePath)) || null
  }));
  const summary = summarizeMatches(matches);

  const report = {
    generatedAt: new Date().toISOString(),
    rootDir,
    archiveDir,
    summary: {
      siteImageCount: siteEntries.length,
      sourceImageCount: sourceEntries.filter((entry) => !entry.error).length,
      sourceImageErrorCount: sourceEntries.filter((entry) => entry.error).length,
      ...summary
    },
    sourceScan: {
      withCameraCode: sourceEntries.filter((entry) => entry.cameraCode && !entry.error).length,
      withoutCameraCode: sourceEntries.filter((entry) => !entry.cameraCode && !entry.error).length,
      errors: sourceEntries.filter((entry) => entry.error).slice(0, 50).map((entry) => ({
        sourcePath: entry.relativePath,
        error: entry.error
      }))
    },
    manualOverrides: {
      filePath: manualOverrides.filePath ? formatRelative(rootDir, manualOverrides.filePath) : '',
      count: manualOverrides.entries.length,
      applied: matches.filter((entry) => entry.status === 'manual').length
    },
    manualSourceMatches: {
      filePath: manualMatches.filePath ? formatRelative(rootDir, manualMatches.filePath) : '',
      count: manualMatches.entries.length,
      applied: matches.filter((entry) => entry.bestMatch?.manualRawPath || entry.status === 'manual').length
    },
    matches
  };

  console.log(`[registry:reconcile] exact=${summary.exact} strong=${summary.strong} probable=${summary.probable} manual=${summary.manual} ambiguous=${summary.ambiguous} unmatched=${summary.unmatched}`);
  console.log(`[registry:reconcile] matched with camera code=${summary.matchedWithCameraCode}, without camera code=${summary.matchedWithoutCameraCode}`);

  if (args.write) {
    const outputPath = path.resolve(rootDir, args.write);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[registry:reconcile] Wrote ${formatRelative(rootDir, outputPath)}`);
  }
}

main().catch((error) => {
  console.error(`[registry:reconcile] ${error.message}`);
  process.exitCode = 1;
});

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_REPORT = '.build-temp/registry-reconcile-full.json';
const DEFAULT_HOLDS = '.build-temp/manual-remaining-overrides.json';
const DEFAULT_REGISTRY = 'data/image-registry.json';

function parseArgs(argv = []) {
  const args = {
    report: DEFAULT_REPORT,
    holds: DEFAULT_HOLDS,
    registry: DEFAULT_REGISTRY
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--report') {
      args.report = argv[i + 1] ? String(argv[i + 1]) : args.report;
      i += 1;
      continue;
    }
    if (token === '--holds') {
      args.holds = argv[i + 1] ? String(argv[i + 1]) : args.holds;
      i += 1;
      continue;
    }
    if (token === '--registry') {
      args.registry = argv[i + 1] ? String(argv[i + 1]) : args.registry;
      i += 1;
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

function padNumber(value, width = 6) {
  return String(value).padStart(width, '0');
}

function loadProjects(rootDir) {
  const projectsRoot = path.join(rootDir, 'src', 'projects');
  const entries = fs.readdirSync(projectsRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const projectSlug = entry.name;
      const projectJsonPath = path.join(projectsRoot, projectSlug, 'project.json');
      const data = readJson(projectJsonPath, {});
      return {
        slug: projectSlug,
        title: String(data.title || projectSlug).trim(),
        images: Array.isArray(data.images) ? data.images : []
      };
    });
}

function loadPlacements(projects) {
  const placements = new Map();

  projects.forEach((project) => {
    project.images.forEach((image, orderIndex) => {
      const src = String(image?.src || '').trim();
      if (!src) return;

      const siteRelativePath = normalizePath(`src/projects/${project.slug}/${src}`);
      placements.set(siteRelativePath, {
        projectSlug: project.slug,
        projectTitle: project.title,
        src,
        siteRelativePath,
        orderIndex,
        alt: String(image?.alt || '').trim(),
        caption: String(image?.caption || '').trim()
      });
    });
  });

  return placements;
}

function buildHoldMap(holds = []) {
  const map = new Map();
  (Array.isArray(holds) ? holds : []).forEach((entry) => {
    const sitePath = normalizePath(entry?.currentSitePath || entry?.siteRelativePath || '');
    if (!sitePath) return;
    map.set(sitePath, {
      reason: String(entry?.reason || '').trim(),
      note: String(entry?.note || '').trim()
    });
  });
  return map;
}

function buildExistingRegistryMaps(existingRegistry) {
  const byIdentityKey = new Map();
  const byPlacementPath = new Map();
  const sourceAssetByPath = new Map();
  const variantByPath = new Map();
  let maxNumericId = 0;
  let maxSourceAssetNumericId = 0;
  let maxVariantNumericId = 0;

  (existingRegistry?.images || []).forEach((entry) => {
    const imageId = String(entry?.imageId || '').trim();
    const identityKey = String(entry?.identityKey || '').trim();

    if (identityKey && imageId) byIdentityKey.set(identityKey, imageId);
    (entry?.placements || []).forEach((placement) => {
      const sitePath = normalizePath(placement?.siteRelativePath || '');
      if (sitePath && imageId) byPlacementPath.set(sitePath, imageId);
    });

    const match = imageId.match(/imgreg-(\d+)/i);
    if (match) {
      maxNumericId = Math.max(maxNumericId, Number(match[1] || 0));
    }

    (entry?.variants || []).forEach((variant) => {
      const filePath = normalizePath(variant?.filePath || '');
      const variantId = String(variant?.variantId || '').trim();
      if (filePath && variantId) variantByPath.set(filePath, variantId);

      const variantMatch = variantId.match(/imgvar-(\d+)/i);
      if (variantMatch) {
        maxVariantNumericId = Math.max(maxVariantNumericId, Number(variantMatch[1] || 0));
      }
    });
  });

  (existingRegistry?.sourceAssets || []).forEach((asset) => {
    const sourcePath = normalizePath(asset?.sourcePath || '');
    const sourceAssetId = String(asset?.sourceAssetId || '').trim();
    if (sourcePath && sourceAssetId) sourceAssetByPath.set(sourcePath, sourceAssetId);

    const match = sourceAssetId.match(/srcast-(\d+)/i);
    if (match) {
      maxSourceAssetNumericId = Math.max(maxSourceAssetNumericId, Number(match[1] || 0));
    }
  });

  return {
    byIdentityKey,
    byPlacementPath,
    sourceAssetByPath,
    variantByPath,
    maxNumericId,
    maxSourceAssetNumericId,
    maxVariantNumericId
  };
}

function buildIdentityKey(match, holdMap) {
  const sitePath = normalizePath(match?.site?.siteRelativePath || '');
  const isHeld = holdMap.has(sitePath);
  const sourcePath = normalizePath(match?.bestMatch?.sourcePath || '');

  if (sourcePath && !isHeld) {
    return `source:${sourcePath}`;
  }

  return `site:${sitePath}`;
}

function buildRegistryStatus(match, holdMap) {
  const sitePath = normalizePath(match?.site?.siteRelativePath || '');
  if (holdMap.has(sitePath)) return 'held';
  if (match?.bestMatch?.proposedFilename) return 'resolved';
  return 'unresolved';
}

function assignImageId(identityKey, placementPath, idMaps) {
  const existingByIdentity = idMaps.byIdentityKey.get(identityKey);
  if (existingByIdentity) return existingByIdentity;

  const existingByPlacement = idMaps.byPlacementPath.get(placementPath);
  if (existingByPlacement) return existingByPlacement;

  idMaps.maxNumericId += 1;
  const imageId = `imgreg-${padNumber(idMaps.maxNumericId)}`;
  idMaps.byIdentityKey.set(identityKey, imageId);
  idMaps.byPlacementPath.set(placementPath, imageId);
  return imageId;
}

function assignSourceAssetId(sourcePath, idMaps) {
  const existing = idMaps.sourceAssetByPath.get(sourcePath);
  if (existing) return existing;

  idMaps.maxSourceAssetNumericId += 1;
  const sourceAssetId = `srcast-${padNumber(idMaps.maxSourceAssetNumericId)}`;
  idMaps.sourceAssetByPath.set(sourcePath, sourceAssetId);
  return sourceAssetId;
}

function assignVariantId(filePath, idMaps) {
  const existing = idMaps.variantByPath.get(filePath);
  if (existing) return existing;

  idMaps.maxVariantNumericId += 1;
  const variantId = `imgvar-${padNumber(idMaps.maxVariantNumericId)}`;
  idMaps.variantByPath.set(filePath, variantId);
  return variantId;
}

function createEntryBase({ imageId, identityKey, registryStatus, match, hold }) {
  return {
    imageId,
    identityKey,
    registryStatus,
    sourceMatchStatus: String(match?.status || '').trim(),
    source: match?.bestMatch ? {
      sourcePath: normalizePath(match.bestMatch.sourcePath || ''),
      sourceName: String(match.bestMatch.sourceName || '').trim(),
      cameraCode: String(match.bestMatch.cameraCode || '').trim(),
      proposedFilename: String(match.bestMatch.proposedFilename || '').trim(),
      exactHashMatch: Boolean(match.bestMatch.exactHashMatch),
      averageHashDistance: Number(match.bestMatch.averageHashDistance || 0),
      differenceHashDistance: Number(match.bestMatch.differenceHashDistance || 0),
      ratioDiff: Number(match.bestMatch.ratioDiff || 0),
      histogramDiff: Number(match.bestMatch.histogramDiff || 0)
    } : null,
    manualReview: {
      held: Boolean(hold),
      holdReason: hold?.reason || '',
      holdNote: hold?.note || '',
      manualCameraCode: String(match?.manualCameraCode || '').trim()
    },
    placements: [],
    metadataRefs: []
  };
}

function buildSourceRecord(match) {
  if (!match?.bestMatch) return null;

  return {
    sourcePath: normalizePath(match.bestMatch.sourcePath || ''),
    sourceName: String(match.bestMatch.sourceName || '').trim(),
    cameraCode: String(match.bestMatch.cameraCode || '').trim(),
    proposedFilename: String(match.bestMatch.proposedFilename || '').trim(),
    exactHashMatch: Boolean(match.bestMatch.exactHashMatch),
    averageHashDistance: Number(match.bestMatch.averageHashDistance || 0),
    differenceHashDistance: Number(match.bestMatch.differenceHashDistance || 0),
    ratioDiff: Number(match.bestMatch.ratioDiff || 0),
    histogramDiff: Number(match.bestMatch.histogramDiff || 0)
  };
}

function buildSourceAssetRecord(sourceAssetId, match) {
  const source = buildSourceRecord(match);
  if (!source) return null;

  return {
    sourceAssetId,
    sourcePath: source.sourcePath,
    sourceName: source.sourceName,
    cameraCode: source.cameraCode,
    fingerprintBundle: {
      exactHashMatch: source.exactHashMatch,
      averageHashDistance: source.averageHashDistance,
      differenceHashDistance: source.differenceHashDistance,
      ratioDiff: source.ratioDiff,
      histogramDiff: source.histogramDiff
    }
  };
}

function buildVariantRecord(variantId, placement, source) {
  const currentFilename = String(placement?.src || placement?.currentFilename || '').trim();
  const filePath = normalizePath(placement?.siteRelativePath || '');
  const parsed = path.parse(currentFilename);

  return {
    variantId,
    kind: 'site-master',
    filePath,
    filename: currentFilename,
    stem: String(parsed.name || '').trim(),
    extension: String(parsed.ext || '').trim().toLowerCase(),
    proposedFilename: String(source?.proposedFilename || currentFilename).trim(),
    cameraCode: String(source?.cameraCode || '').trim()
  };
}

function buildRegistry(rootDir, report, holds, existingRegistry) {
  const projects = loadProjects(rootDir);
  const placements = loadPlacements(projects);
  const holdMap = buildHoldMap(holds);
  const idMaps = buildExistingRegistryMaps(existingRegistry);
  const entryMap = new Map();
  const sourceAssetMap = new Map();

  report.matches.forEach((match) => {
    const sitePath = normalizePath(match?.site?.siteRelativePath || '');
    const placement = placements.get(sitePath);
    if (!placement) return;

    const identityKey = buildIdentityKey(match, holdMap);
    const registryStatus = buildRegistryStatus(match, holdMap);
    const imageId = assignImageId(identityKey, sitePath, idMaps);
    const hold = holdMap.get(sitePath) || null;
    const source = buildSourceRecord(match);
    const sourceAssetId = source?.sourcePath ? assignSourceAssetId(source.sourcePath, idMaps) : '';

    if (sourceAssetId && !sourceAssetMap.has(sourceAssetId)) {
      sourceAssetMap.set(sourceAssetId, buildSourceAssetRecord(sourceAssetId, match));
    }

    if (!entryMap.has(imageId)) {
      entryMap.set(imageId, createEntryBase({ imageId, identityKey, registryStatus, match, hold }));
    }

    const entry = entryMap.get(imageId);
    entry.registryStatus = entry.registryStatus === 'resolved' && registryStatus !== 'resolved'
      ? registryStatus
      : entry.registryStatus;
    entry.sourceMatchStatus = String(match?.status || '').trim() || entry.sourceMatchStatus;
    entry.source = source;
    entry.sourceAssetId = sourceAssetId || null;

    entry.manualReview.held = entry.manualReview.held || Boolean(hold);
    if (hold?.reason) entry.manualReview.holdReason = hold.reason;
    if (hold?.note) entry.manualReview.holdNote = hold.note;
    entry.manualReview.manualCameraCode = String(match?.manualCameraCode || entry.manualReview.manualCameraCode || '').trim();

    entry.placements.push({
      projectSlug: placement.projectSlug,
      projectTitle: placement.projectTitle,
      siteRelativePath: placement.siteRelativePath,
      currentFilename: placement.src,
      orderIndex: placement.orderIndex,
      alt: placement.alt,
      caption: placement.caption
    });

    const variantId = assignVariantId(placement.siteRelativePath, idMaps);
    if (!Array.isArray(entry.variants)) entry.variants = [];
    entry.variants.push(buildVariantRecord(variantId, placement, source));

    entry.metadataRefs.push({
      projectSlug: placement.projectSlug,
      src: placement.src
    });
  });

  const images = [...entryMap.values()]
    .map((entry) => ({
      ...entry,
      sourceAssetId: entry.sourceAssetId || null,
      placements: entry.placements.sort((left, right) => left.siteRelativePath.localeCompare(right.siteRelativePath)),
      variants: (entry.variants || []).sort((left, right) => left.filePath.localeCompare(right.filePath)),
      metadataRefs: entry.metadataRefs.sort((left, right) => `${left.projectSlug}::${left.src}`.localeCompare(`${right.projectSlug}::${right.src}`))
    }))
    .sort((left, right) => left.imageId.localeCompare(right.imageId));

  const sourceAssets = [...sourceAssetMap.values()]
    .filter(Boolean)
    .sort((left, right) => left.sourceAssetId.localeCompare(right.sourceAssetId))
    .map((asset) => ({
      ...asset,
      linkedImageIds: images
        .filter((entry) => entry.sourceAssetId === asset.sourceAssetId)
        .map((entry) => entry.imageId)
        .sort((left, right) => left.localeCompare(right))
    }));

  const summary = {
    imageCount: images.length,
    placementCount: images.reduce((sum, entry) => sum + entry.placements.length, 0),
    variantCount: images.reduce((sum, entry) => sum + (entry.variants || []).length, 0),
    sourceAssetCount: sourceAssets.length,
    resolved: images.filter((entry) => entry.registryStatus === 'resolved').length,
    held: images.filter((entry) => entry.registryStatus === 'held').length,
    unresolved: images.filter((entry) => entry.registryStatus === 'unresolved').length
  };

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: 2,
    summary,
    sourceAssets,
    images
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const reportPath = path.resolve(rootDir, args.report);
  const holdsPath = path.resolve(rootDir, args.holds);
  const registryPath = path.resolve(rootDir, args.registry);

  const report = readJson(reportPath);
  const holds = readJson(holdsPath, []);
  const existingRegistry = readJson(registryPath, { images: [] });
  const registry = buildRegistry(rootDir, report, holds, existingRegistry);

  writeJson(registryPath, registry);
  console.log(`[registry:foundation] wrote ${normalizePath(path.relative(rootDir, registryPath))}`);
  console.log(`[registry:foundation] images=${registry.summary.imageCount} placements=${registry.summary.placementCount} resolved=${registry.summary.resolved} held=${registry.summary.held} unresolved=${registry.summary.unresolved}`);
}

main();

'use strict';

const fs = require('fs');
const path = require('path');

const Scanner = require('./scanner');
const { runFoundation } = require('./image-registry-foundation');
const { loadImageRegistry, findRegistryEntry } = require('./image-registry');

const DEFAULT_REGISTRY = 'data/image-registry.json';
const DEFAULT_IMAGES = 'data/images.json';
const DEFAULT_REPORT = '.build-temp/registry-maintenance-report.json';

function parseArgs(argv = []) {
  const args = {
    registry: DEFAULT_REGISTRY,
    images: DEFAULT_IMAGES,
    report: DEFAULT_REPORT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--registry') {
      args.registry = argv[index + 1] ? String(argv[index + 1]) : args.registry;
      index += 1;
      continue;
    }
    if (token === '--images') {
      args.images = argv[index + 1] ? String(argv[index + 1]) : args.images;
      index += 1;
      continue;
    }
    if (token === '--report') {
      args.report = argv[index + 1] ? String(argv[index + 1]) : args.report;
      index += 1;
    }
  }

  return args;
}

function normalizePath(value = '') {
  return String(value || '').replace(/\\/g, '/').trim();
}

function normalizeStem(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '');
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function collectCurrentPlacements(projects) {
  return projects.flatMap((project) =>
    (project.images || []).map((image, orderIndex) => ({
      projectSlug: project.slug,
      siteRelativePath: normalizePath(`src/projects/${project.slug}/${image.src}`),
      currentFilename: String(image?.src || '').trim(),
      stem: normalizeStem(image?.src || ''),
      orderIndex
    }))
  );
}

function collectImagesMetadata(imagesMetadata = []) {
  return (Array.isArray(imagesMetadata) ? imagesMetadata : []).map((entry) => ({
    projectSlug: String(entry?.projectSlug || '').trim(),
    src: String(entry?.src || '').trim(),
    stem: normalizeStem(entry?.src || '')
  }));
}

function buildRegistryPlacementMap(registry) {
  const placementMap = new Map();
  const stemMap = new Map();

  (registry?.payload?.images || []).forEach((entry) => {
    (entry?.placements || []).forEach((placement) => {
      const siteRelativePath = normalizePath(placement?.siteRelativePath || '');
      const projectSlug = String(placement?.projectSlug || '').trim();
      const currentFilename = String(placement?.currentFilename || '').trim();
      const stemKey = `${projectSlug}::${normalizeStem(currentFilename)}`;

      if (siteRelativePath) placementMap.set(siteRelativePath, entry);
      if (projectSlug && currentFilename && !stemMap.has(stemKey)) stemMap.set(stemKey, entry);
    });
  });

  return { placementMap, stemMap };
}

function summarizeTop(items = [], limit = 12) {
  return items.slice(0, limit);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const reportPath = path.resolve(rootDir, args.report);
  const imagesPath = path.resolve(rootDir, args.images);
  const registryPath = path.resolve(rootDir, args.registry);

  const previousRegistry = loadImageRegistry(rootDir, null, args.registry);
  const previousSummary = previousRegistry?.payload?.summary || null;
  const previousPlacementCount = previousSummary?.placementCount || 0;
  const previousImageCount = previousSummary?.imageCount || 0;

  const scanner = new Scanner({
    info() {},
    warn() {},
    error() {}
  });
  const projects = scanner.scanProjectsFromRoot(rootDir);
  const currentPlacements = collectCurrentPlacements(projects);
  const imagesMetadata = collectImagesMetadata(readJson(imagesPath, []));

  const missingMetadataEntries = currentPlacements.filter((placement) => {
    return !imagesMetadata.some((entry) => entry.projectSlug === placement.projectSlug && entry.stem === placement.stem);
  });

  const previousPlacementMap = previousRegistry ? buildRegistryPlacementMap(previousRegistry).placementMap : new Map();
  const previousStemMap = previousRegistry ? buildRegistryPlacementMap(previousRegistry).stemMap : new Map();

  const addedPlacements = [];
  const movedOrRenamedPlacements = [];

  currentPlacements.forEach((placement) => {
    if (previousPlacementMap.has(placement.siteRelativePath)) return;

    const stemKey = `${placement.projectSlug}::${placement.stem}`;
    const previousEntry = previousStemMap.get(stemKey) || null;

    if (previousEntry) {
      const priorPlacement = (previousEntry.placements || []).find((item) => item.projectSlug === placement.projectSlug) || previousEntry.placements?.[0] || null;
      movedOrRenamedPlacements.push({
        projectSlug: placement.projectSlug,
        currentSitePath: placement.siteRelativePath,
        previousSitePath: normalizePath(priorPlacement?.siteRelativePath || ''),
        registryImageId: String(previousEntry?.imageId || '').trim()
      });
      return;
    }

    addedPlacements.push({
      projectSlug: placement.projectSlug,
      currentSitePath: placement.siteRelativePath
    });
  });

  const missingPlacements = [...previousPlacementMap.keys()]
    .filter((siteRelativePath) => !currentPlacements.some((placement) => placement.siteRelativePath === siteRelativePath))
    .map((siteRelativePath) => {
      const entry = previousPlacementMap.get(siteRelativePath);
      return {
        currentSitePath: siteRelativePath,
        registryImageId: String(entry?.imageId || '').trim(),
        registryStatus: String(entry?.registryStatus || '').trim()
      };
    });

  const refreshedRegistry = runFoundation(['--registry', args.registry]);
  const registry = loadImageRegistry(rootDir, null, args.registry);
  const unresolvedEntries = (registry?.payload?.images || [])
    .filter((entry) => entry.registryStatus === 'unresolved' || entry.registryStatus === 'held')
    .map((entry) => ({
      imageId: String(entry?.imageId || '').trim(),
      registryStatus: String(entry?.registryStatus || '').trim(),
      sourceMatchStatus: String(entry?.sourceMatchStatus || '').trim(),
      cameraCode: String(entry?.source?.cameraCode || '').trim(),
      placements: (entry?.placements || []).map((placement) => ({
        projectSlug: String(placement?.projectSlug || '').trim(),
        currentFilename: String(placement?.currentFilename || '').trim(),
        siteRelativePath: normalizePath(placement?.siteRelativePath || '')
      }))
    }));

  const multiPlacementImages = (registry?.payload?.images || [])
    .filter((entry) => (entry?.placements || []).length > 1)
    .map((entry) => ({
      imageId: String(entry?.imageId || '').trim(),
      placementCount: (entry?.placements || []).length,
      placements: (entry?.placements || []).map((placement) => normalizePath(placement?.siteRelativePath || ''))
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    registryPath: normalizePath(path.relative(rootDir, registryPath)),
    summary: {
      previousImageCount,
      previousPlacementCount,
      currentProjectCount: projects.length,
      currentPlacementCount: currentPlacements.length,
      refreshedImageCount: refreshedRegistry.summary.imageCount,
      refreshedPlacementCount: refreshedRegistry.summary.placementCount,
      refreshedResolved: refreshedRegistry.summary.resolved,
      refreshedHeld: refreshedRegistry.summary.held,
      refreshedUnresolved: refreshedRegistry.summary.unresolved,
      addedPlacements: addedPlacements.length,
      movedOrRenamedPlacements: movedOrRenamedPlacements.length,
      missingPlacements: missingPlacements.length,
      missingMetadataEntries: missingMetadataEntries.length,
      multiPlacementImages: multiPlacementImages.length
    },
    changes: {
      addedPlacements: summarizeTop(addedPlacements),
      movedOrRenamedPlacements: summarizeTop(movedOrRenamedPlacements),
      missingPlacements: summarizeTop(missingPlacements),
      missingMetadataEntries: summarizeTop(missingMetadataEntries.map((entry) => ({
        projectSlug: entry.projectSlug,
        currentSitePath: entry.siteRelativePath
      }))),
      unresolvedEntries: summarizeTop(unresolvedEntries),
      multiPlacementImages: summarizeTop(multiPlacementImages)
    }
  };

  writeJson(reportPath, report);
  console.log(`[registry:maintenance] wrote ${normalizePath(path.relative(rootDir, reportPath))}`);
  console.log(
    `[registry:maintenance] placements=${report.summary.currentPlacementCount} ` +
    `added=${report.summary.addedPlacements} moved=${report.summary.movedOrRenamedPlacements} ` +
    `missing=${report.summary.missingPlacements} unresolved=${report.summary.refreshedUnresolved} held=${report.summary.refreshedHeld}`
  );
}

main();

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_REGISTRY_PATH = path.join('data', 'image-registry.json');

function normalizeStem(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '');
}

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').trim();
}

function loadImageRegistry(rootDir, logger = null, registryPath = DEFAULT_REGISTRY_PATH) {
  const resolvedPath = path.resolve(rootDir, registryPath);
  if (!fs.existsSync(resolvedPath)) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn(`[registry] Registry file not found: ${path.relative(rootDir, resolvedPath).replace(/\\/g, '/')}`);
    }
    return null;
  }

  const payload = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  const images = Array.isArray(payload?.images) ? payload.images : [];
  const sourceAssets = Array.isArray(payload?.sourceAssets) ? payload.sourceAssets : [];

  const byPlacementPath = new Map();
  const byProjectStem = new Map();
  const sourceAssetById = new Map();

  sourceAssets.forEach((asset) => {
    const sourceAssetId = String(asset?.sourceAssetId || '').trim();
    if (sourceAssetId) sourceAssetById.set(sourceAssetId, asset);
  });

  images.forEach((entry) => {
    (entry?.placements || []).forEach((placement) => {
      const siteRelativePath = normalizePath(placement?.siteRelativePath || '');
      const currentFilename = String(placement?.currentFilename || '').trim();
      const projectSlug = String(placement?.projectSlug || '').trim();
      const stemKey = `${projectSlug}::${normalizeStem(currentFilename)}`;

      if (siteRelativePath) byPlacementPath.set(siteRelativePath, entry);
      if (projectSlug && currentFilename && !byProjectStem.has(stemKey)) {
        byProjectStem.set(stemKey, entry);
      }
    });
  });

  if (logger && typeof logger.info === 'function') {
    logger.info(`[registry] Loaded image registry (${images.length} images, ${sourceAssets.length} source assets)`);
  }

  return {
    filePath: resolvedPath,
    payload,
    byPlacementPath,
    byProjectStem,
    sourceAssetById
  };
}

function findRegistryEntry(registry, projectSlug, src) {
  if (!registry) return null;

  const siteRelativePath = normalizePath(`src/projects/${projectSlug}/${src}`);
  const byPlacement = registry.byPlacementPath.get(siteRelativePath);
  if (byPlacement) return byPlacement;

  const stemKey = `${String(projectSlug || '').trim()}::${normalizeStem(src)}`;
  return registry.byProjectStem.get(stemKey) || null;
}

function buildRegistryImageFields(entry, registry) {
  if (!entry) {
    return {
      registryImageId: '',
      registryStatus: '',
      registryIdentityKey: '',
      registrySourceAssetId: '',
      cameraCode: '',
      sourcePath: '',
      sourceName: '',
      variantId: '',
      placementCount: 0
    };
  }

  const placements = Array.isArray(entry.placements) ? entry.placements : [];
  const variants = Array.isArray(entry.variants) ? entry.variants : [];
  const sourceAssetId = String(entry.sourceAssetId || '').trim();
  const sourceAsset = sourceAssetId ? registry?.sourceAssetById.get(sourceAssetId) : null;

  return {
    registryImageId: String(entry.imageId || '').trim(),
    registryStatus: String(entry.registryStatus || '').trim(),
    registryIdentityKey: String(entry.identityKey || '').trim(),
    registrySourceAssetId: sourceAssetId,
    cameraCode: String(entry?.source?.cameraCode || sourceAsset?.cameraCode || '').trim(),
    sourcePath: String(entry?.source?.sourcePath || sourceAsset?.sourcePath || '').trim(),
    sourceName: String(entry?.source?.sourceName || sourceAsset?.sourceName || '').trim(),
    variantId: String(variants[0]?.variantId || '').trim(),
    placementCount: placements.length
  };
}

module.exports = {
  loadImageRegistry,
  findRegistryEntry,
  buildRegistryImageFields
};

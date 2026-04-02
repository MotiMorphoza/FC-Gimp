'use strict';

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const CONVERT_EXT = new Set(['.jpg', '.jpeg', '.png']);
const PROJECT_IMAGE_EXT = new Set(['.webp', '.jpg', '.jpeg', '.png']);
const RETRYABLE_DELETE_CODES = new Set(['EPERM', 'EBUSY', 'ENOTEMPTY']);
const DELETE_RETRY_DELAYS_MS = [150, 300, 600, 1200];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeFileIfPossible(filePath, logger) {
  if (!fs.existsSync(filePath)) return true;

  let lastError = null;

  for (let attempt = 0; attempt <= DELETE_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      lastError = error;

      if (!RETRYABLE_DELETE_CODES.has(error.code) || attempt === DELETE_RETRY_DELAYS_MS.length) {
        break;
      }

      await sleep(DELETE_RETRY_DELAYS_MS[attempt]);
    }
  }

  if (logger) {
    logger.warn(`[webp] Could not remove original file after conversion: ${filePath} (${lastError?.code || lastError?.message || 'unknown error'})`);
  }

  return false;
}

async function convertProjectImages(tempDir, logger) {

  const srcProjects  = path.join(tempDir, 'src', 'projects');
  const rootProjects = path.join(tempDir, 'projects');

  if (fs.existsSync(srcProjects)) {

    await convertSrcToRoot(srcProjects, rootProjects, logger);

    fs.rmSync(srcProjects, { recursive: true, force: true });

    logger.info('[webp] src/projects removed from temp; scanner will use projects/');

  }
  else if (fs.existsSync(rootProjects)) {

    await convertInPlace(rootProjects, logger);

  }
  else {

    logger.warn('[webp] No projects directory found – skipping');

  }

}

/* ------------------------------------------------ */

async function convertSrcToRoot(srcDir, destDir, logger) {

  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }

  fs.mkdirSync(destDir, { recursive: true });

  let converted = 0;

  const projects = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of projects) {

    if (!entry.isDirectory()) continue;

    const projectSrc  = path.join(srcDir, entry.name);
    const projectDest = path.join(destDir, entry.name);

    fs.mkdirSync(projectDest, { recursive: true });

    const files = fs.readdirSync(projectSrc);
    const srcJsonPath = path.join(projectSrc, 'project.json');

    for (const file of files) {

      const srcFile = path.join(projectSrc, file);
      const ext = path.extname(file).toLowerCase();

      if (file === 'project.json') continue;

      if (CONVERT_EXT.has(ext)) {

        const webpName = toWebpName(file);
        const destFile = path.join(projectDest, webpName);

        if (fs.existsSync(destFile)) continue;

        await convertImage(srcFile, destFile);

        converted++;
        continue;

      }

      fs.copyFileSync(srcFile, path.join(projectDest, file));

    }

    if (fs.existsSync(srcJsonPath)) {
      rewriteProjectJson(
        srcJsonPath,
        path.join(projectDest, 'project.json'),
        projectDest
      );
    }

  }

  logger.info(`[webp] Converted ${converted} images to WebP`);

}

/* ------------------------------------------------ */

async function convertInPlace(projectsDir, logger) {

  let converted = 0;

  const projects = fs.readdirSync(projectsDir, { withFileTypes: true });

  for (const entry of projects) {

    if (!entry.isDirectory()) continue;

    const projectDir = path.join(projectsDir, entry.name);
    const files = fs.readdirSync(projectDir);

    for (const file of files) {

      const ext = path.extname(file).toLowerCase();

      if (!CONVERT_EXT.has(ext)) continue;

      const srcFile = path.join(projectDir, file);
      const webpName = toWebpName(file);
      const destFile = path.join(projectDir, webpName);

      if (fs.existsSync(destFile)) continue;

      await convertImage(srcFile, destFile);

      await removeFileIfPossible(srcFile, logger);

      converted++;

    }

    const jsonPath = path.join(projectDir, 'project.json');

    if (fs.existsSync(jsonPath)) {
      rewriteProjectJson(jsonPath, jsonPath, projectDir);
    }

  }

  logger.info(`[webp] Converted ${converted} images to WebP`);

}

/* ------------------------------------------------ */

async function convertImage(src, dest) {

  await sharp(src)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(dest);

}

function listProjectImagesSorted(projectDir) {
  return fs.readdirSync(projectDir)
    .filter((name) => PROJECT_IMAGE_EXT.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function normalizeImageMetadataEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const src = typeof entry.src === 'string' ? entry.src.trim() : '';
  if (!src) return null;

  return {
    src,
    caption: typeof entry.caption === 'string' ? entry.caption : '',
    alt: typeof entry.alt === 'string' ? entry.alt.trim() : ''
  };
}

function buildImageMetadataMaps(images) {
  const bySrc = new Map();
  const byStem = new Map();

  images.forEach((entry) => {
    const normalized = normalizeImageMetadataEntry(entry);
    if (!normalized) return;

    const stem = path.parse(normalized.src).name.toLowerCase();
    bySrc.set(normalized.src, normalized);
    if (!byStem.has(stem)) byStem.set(stem, normalized);
  });

  return { bySrc, byStem };
}

function getMetadataForFilename(filename, metadataMaps) {
  const exact = metadataMaps.bySrc.get(filename);
  if (exact) return exact;

  const stem = path.parse(filename).name.toLowerCase();
  return metadataMaps.byStem.get(stem) || null;
}

function rewriteProjectJson(srcPath, destPath, projectDir) {

  const json = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  const existingImages = Array.isArray(json.images) ? json.images : [];
  const metadataMaps = buildImageMetadataMaps(existingImages);

  const imageFiles = listProjectImagesSorted(projectDir);

  json.images = imageFiles.map((filename) => {
    const metadataEntry = getMetadataForFilename(filename, metadataMaps);

    return {
      src: filename,
      caption: metadataEntry?.caption || '',
      alt: metadataEntry?.alt || ''
    };
  });

  fs.writeFileSync(destPath, JSON.stringify(json, null, 2), 'utf8');

}

function toWebpName(file) {

  const ext = path.extname(file);
  return file.slice(0, file.length - ext.length) + '.webp';

}

module.exports = { convertProjectImages };

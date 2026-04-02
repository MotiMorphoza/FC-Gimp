'use strict';

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const CONVERT_EXT = new Set(['.jpg', '.jpeg', '.png']);
const PROJECT_IMAGE_EXT = new Set(['.webp', '.jpg', '.jpeg', '.png']);
const RETRYABLE_DELETE_CODES = new Set(['EPERM', 'EBUSY', 'ENOTEMPTY']);
const DELETE_RETRY_DELAYS_MS = [150, 300, 600, 1200];
const CONVERT_CONCURRENCY = 4;
const PROGRESS_EVERY = 25;

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

  return false;
}

async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = new Array(Math.max(1, limit)).fill(null).map(() => runWorker());
  await Promise.all(workers);
  return results;
}

function collectConvertibleJobs(projectDir) {
  const files = fs.readdirSync(projectDir);

  return files
    .filter((file) => CONVERT_EXT.has(path.extname(file).toLowerCase()))
    .map((file) => {
      const srcFile = path.join(projectDir, file);
      const webpName = toWebpName(file);
      const destFile = path.join(projectDir, webpName);
      return { file, srcFile, webpName, destFile };
    })
    .filter((job) => !fs.existsSync(job.destFile));
}

async function runConversionJobs(jobs, logger, mode = 'copy', failedRemovals = []) {
  let completed = 0;

  await mapConcurrent(jobs, CONVERT_CONCURRENCY, async (job) => {
    await convertImage(job.srcFile, job.destFile);

    if (mode === 'in-place') {
      const removed = await removeFileIfPossible(job.srcFile, logger);
      if (!removed) failedRemovals.push(job.srcFile);
    }

    completed += 1;
    if (logger && (completed % PROGRESS_EVERY === 0 || completed === jobs.length)) {
      logger.info(`[webp] Converted ${completed}/${jobs.length} images`);
    }
  });

  return jobs.length;
}

async function retryFailedRemovals(filePaths, logger) {
  const uniquePaths = [...new Set((filePaths || []).filter(Boolean))];
  const stillLocked = [];

  for (const filePath of uniquePaths) {
    const removed = await removeFileIfPossible(filePath, logger);
    if (!removed && fs.existsSync(filePath)) {
      stillLocked.push(filePath);
    }
  }

  if (logger) {
    if (stillLocked.length) {
      logger.warn(`[webp] ${stillLocked.length} original image files remained locked in dist after retry; WebP outputs were generated and will be preferred.`);
    } else if (uniquePaths.length) {
      logger.info(`[webp] Deferred cleanup removed ${uniquePaths.length} original image files after conversion locks cleared`);
    }
  }

  return stillLocked;
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

    const srcJsonPath = path.join(projectSrc, 'project.json');

    const files = fs.readdirSync(projectSrc);

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

    const conversionJobs = collectConvertibleJobs(projectSrc).map((job) => ({
      ...job,
      destFile: path.join(projectDest, job.webpName)
    }));

    converted += await runConversionJobs(conversionJobs, logger, 'copy');

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
  const failedRemovals = [];

  const projects = fs.readdirSync(projectsDir, { withFileTypes: true });

  for (const entry of projects) {

    if (!entry.isDirectory()) continue;

    const projectDir = path.join(projectsDir, entry.name);
    const conversionJobs = collectConvertibleJobs(projectDir);
    converted += await runConversionJobs(conversionJobs, logger, 'in-place', failedRemovals);

    const jsonPath = path.join(projectDir, 'project.json');

    if (fs.existsSync(jsonPath)) {
      rewriteProjectJson(jsonPath, jsonPath, projectDir);
    }

  }

  await retryFailedRemovals(failedRemovals, logger);
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
  const preferredByStem = new Map();

  fs.readdirSync(projectDir)
    .filter((name) => PROJECT_IMAGE_EXT.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .forEach((name) => {
      const stem = path.parse(name).name.toLowerCase();
      const current = preferredByStem.get(stem);

      if (!current) {
        preferredByStem.set(stem, name);
        return;
      }

      const currentExt = path.extname(current).toLowerCase();
      const nextExt = path.extname(name).toLowerCase();

      if (currentExt !== '.webp' && nextExt === '.webp') {
        preferredByStem.set(stem, name);
      }
    });

  return [...preferredByStem.values()].sort((a, b) => a.localeCompare(b));
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

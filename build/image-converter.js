'use strict';

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const CONVERT_EXT = new Set(['.jpg', '.jpeg', '.png']);
const PROJECT_IMAGE_EXT = new Set(['.webp', '.jpg', '.jpeg', '.png']);

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

      fs.unlinkSync(srcFile);

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

function rewriteProjectJson(srcPath, destPath, projectDir) {

  const json = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  const existingImages = Array.isArray(json.images) ? json.images : [];

  const imageFiles = listProjectImagesSorted(projectDir);

  json.images = imageFiles.map((filename, index) => ({
    src: filename,
    caption: typeof existingImages[index]?.caption === 'string'
      ? existingImages[index].caption
      : ''
  }));

  fs.writeFileSync(destPath, JSON.stringify(json, null, 2), 'utf8');

}

function toWebpName(file) {

  const ext = path.extname(file);
  return file.slice(0, file.length - ext.length) + '.webp';

}

module.exports = { convertProjectImages };

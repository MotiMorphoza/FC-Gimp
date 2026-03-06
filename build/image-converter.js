// build/image-converter.js
'use strict';

/**
 * Image converter for the MotoSynteza build pipeline.
 *
 * Converts all project source images (JPG / JPEG / PNG) to WebP inside
 * .build-temp so that docs/ never contains the originals.
 *
 * Source images in src/projects are NEVER modified.
 *
 * Pipeline position:
 *   copyToTemp()  →  convertProjectImages()  →  scanProjectsFromRoot()  →  …
 *
 * What this module does
 * ─────────────────────
 * 1. Locate the projects directory inside .build-temp using the same logic as
 *    Scanner.getProjectsSourceDir() so the two are always in sync.
 *
 * 2. When the repo uses the src/ layout (src/projects → projects):
 *      a. Read each project from tempDir/src/projects
 *      b. Create a parallel directory at tempDir/projects
 *      c. Convert every .jpg/.jpeg/.png → .webp  (sharp, 1200 px, q80, no EXIF)
 *      d. Copy project.json with src references rewritten to .webp
 *      e. Copy any other non-image files verbatim
 *      f. Delete tempDir/src/projects so Scanner falls back to tempDir/projects
 *         (getProjectsSourceDir checks src/projects first; removing it forces
 *          the fallback path and ensures deploy outputs docs/projects not
 *          docs/src/projects)
 *
 * 3. When there is no src/ layout (projects already at root):
 *      Convert in-place inside tempDir/projects.
 *
 * Conversion settings
 * ───────────────────
 *   resize  → max width 1200 px, withoutEnlargement: true
 *   format  → WebP, quality 80
 *   meta    → stripped (sharp default; no .withMetadata() call)
 */

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

/* Extensions we convert */
const CONVERT_EXT = new Set(['.jpg', '.jpeg', '.png']);

/* ──────────────────────────────────────────────────────────────────────────
   convertProjectImages
   Main entry point called by build.js
   ────────────────────────────────────────────────────────────────────────── */

/**
 * @param {string} tempDir   Absolute path to the .build-temp directory
 * @param {object} logger    Build logger (must expose .info() and .warn())
 */
async function convertProjectImages(tempDir, logger) {
  const srcProjects  = path.join(tempDir, 'src', 'projects');
  const rootProjects = path.join(tempDir, 'projects');

  if (fs.existsSync(srcProjects)) {
    // ── Standard layout: src/projects → projects ───────────────────────
    await _convertSrcToRoot(srcProjects, rootProjects, logger);

    // Remove src/projects from temp so Scanner.getProjectsSourceDir(tempDir)
    // falls back to tempDir/projects (the webp output we just built).
    // tempDir/src/ may contain other things; only remove the projects sub-dir.
    fs.rmSync(srcProjects, { recursive: true, force: true });

    logger.info('[webp] src/projects removed from temp; scanner will use projects/');

  } else if (fs.existsSync(rootProjects)) {
    // ── Flat layout: projects already at root, convert in-place ─────────
    await _convertInPlace(rootProjects, logger);

  } else {
    logger.warn('[webp] No projects directory found in temp – skipping WebP conversion');
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   _convertSrcToRoot
   Reads from srcDir, writes WebP output to destDir
   ────────────────────────────────────────────────────────────────────────── */

async function _convertSrcToRoot(srcDir, destDir, logger) {
  // Clear any stale output from previous runs
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  const stats = { converted: 0, copied: 0, errors: [] };

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;  // ignore stray files at root level

    const projectSrc  = path.join(srcDir,  entry.name);
    const projectDest = path.join(destDir, entry.name);

    fs.mkdirSync(projectDest, { recursive: true });

    const files = fs.readdirSync(projectSrc);

    for (const file of files) {
      const srcFile  = path.join(projectSrc, file);
      const ext      = path.extname(file).toLowerCase();

      if (file === 'project.json') {
        _rewriteProjectJson(srcFile, path.join(projectDest, 'project.json'));
        stats.copied++;
        continue;
      }

      if (CONVERT_EXT.has(ext)) {
        const webpName = _toWebpName(file);
        const destFile = path.join(projectDest, webpName);

        try {
          await _convertImage(srcFile, destFile);
          stats.converted++;
        } catch (err) {
          stats.errors.push(`${entry.name}/${file}: ${err.message}`);
          logger.warn(`[webp] Conversion failed for ${entry.name}/${file}: ${err.message}`);
        }
        continue;
      }

      // All other files (covers, thumbs, etc.) → copy verbatim
      fs.copyFileSync(srcFile, path.join(projectDest, file));
      stats.copied++;
    }
  }

  _logStats(stats, logger);
}

/* ──────────────────────────────────────────────────────────────────────────
   _convertInPlace
   Converts images inside an existing projects directory in-place
   ────────────────────────────────────────────────────────────────────────── */

async function _convertInPlace(projectsDir, logger) {
  const stats = { converted: 0, copied: 0, errors: [] };

  const entries = fs.readdirSync(projectsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const projectDir = path.join(projectsDir, entry.name);
    const files      = fs.readdirSync(projectDir);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!CONVERT_EXT.has(ext)) continue;

      const srcFile  = path.join(projectDir, file);
      const webpName = _toWebpName(file);
      const destFile = path.join(projectDir, webpName);

      try {
        await _convertImage(srcFile, destFile);
        fs.unlinkSync(srcFile);   // remove original so docs never has .jpg
        stats.converted++;
      } catch (err) {
        stats.errors.push(`${entry.name}/${file}: ${err.message}`);
        logger.warn(`[webp] Conversion failed for ${entry.name}/${file}: ${err.message}`);
      }
    }

    // Rewrite project.json in-place
    const jsonPath = path.join(projectDir, 'project.json');
    if (fs.existsSync(jsonPath)) {
      _rewriteProjectJson(jsonPath, jsonPath);
    }
  }

  _logStats(stats, logger);
}

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Convert a single image file to WebP using sharp.
 * – max 1200 px wide, no upscaling
 * – quality 80
 * – metadata stripped (sharp default)
 */
async function _convertImage(srcPath, destPath) {
  await sharp(srcPath)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(destPath);
}

/**
 * Read a project.json, rewrite all image src references to .webp, write result.
 * srcPath and destPath may be the same file (in-place rewrite).
 */
function _rewriteProjectJson(srcPath, destPath) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  } catch (err) {
    throw new Error(`[webp] Cannot parse ${srcPath}: ${err.message}`);
  }

  if (Array.isArray(json.images)) {
    json.images = json.images.map(img => {
      if (typeof img.src !== 'string') return img;
      return { ...img, src: img.src.replace(/\.(jpg|jpeg|png)$/i, '.webp') };
    });
  }

  fs.writeFileSync(destPath, JSON.stringify(json, null, 2), 'utf8');
}

/** Replace the last extension with .webp */
function _toWebpName(filename) {
  const ext = path.extname(filename);
  return filename.slice(0, filename.length - ext.length) + '.webp';
}

function _logStats(stats, logger) {
  const errInfo = stats.errors.length
    ? ` (${stats.errors.length} error${stats.errors.length > 1 ? 's' : ''})`
    : '';
  logger.info(
    `[webp] Converted ${stats.converted} image${stats.converted !== 1 ? 's' : ''} to WebP` +
    `${errInfo}`
  );
  if (stats.errors.length) {
    stats.errors.forEach(e => logger.warn(`[webp]   ✗ ${e}`));
  }
}

module.exports = { convertProjectImages };

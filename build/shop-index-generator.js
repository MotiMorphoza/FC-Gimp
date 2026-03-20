'use strict';

/**
 * shop-index-generator.js
 *
 * Build-time module for MotoSynteza.
 * Scans all /projects/<slug>/ directories, validates project.json files,
 * generates descending image codes, and writes /shop/index.json in the build output.
 *
 * Descending logic:
 *   Given N images, image[0] gets code PREFIX-00N, image[N-1] gets PREFIX-001.
 *   Padding width = number of digits in N (minimum 3).
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Validation helpers ─────────────────────────────────────────────────────

const CODE_PREFIX_RE = /^[A-Z0-9]+$/;

function validateCodePrefix(prefix, slug) {
  if (!prefix || typeof prefix !== 'string') {
    throw new Error(`[shop-index-generator] Project "${slug}" is missing codePrefix.`);
  }
  if (!CODE_PREFIX_RE.test(prefix)) {
    throw new Error(
      `[shop-index-generator] Project "${slug}" has invalid codePrefix "${prefix}". ` +
      `Only A–Z and 0–9 are allowed (no lowercase, spaces, symbols, or unicode).`
    );
  }
}

function validateImagesArray(images, slug) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error(
      `[shop-index-generator] Project "${slug}" has no images or images is not an array.`
    );
  }
}

function validateImageFilesExist(images, projectDir, slug) {
  for (const img of images) {
    const fullPath = path.join(projectDir, img.src);
    if (!fs.existsSync(fullPath)) {
      throw new Error(
        `[shop-index-generator] Project "${slug}" references image "${img.src}" ` +
        `which does not exist at "${fullPath}".`
      );
    }
  }
}

// ─── Code generation ─────────────────────────────────────────────────────────

/**
 * Generate padded descending codes for a project's image array.
 *
 * @param {string} prefix   - e.g. "UU"
 * @param {number} total    - total number of images in the project
 * @param {number} index    - 0-based index of the image
 * @returns {string}        - e.g. "UU-012"
 */
function generateImageCode(prefix, total, index) {
  const padWidth = Math.max(3, String(total).length);
  const number   = total - index;                     // descending
  return `${prefix}-${String(number).padStart(padWidth, '0')}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * generateShopIndex
 *
 * @param {object} opts
 * @param {string} opts.projectsDir   - absolute path to /projects source
 * @param {string} opts.outputDir     - absolute path to /shop in the build output
 * @param {string} [opts.buildVersion] - hash string to embed / use as filename suffix
 * @param {boolean} [opts.hashFilename] - if true, write index.<hash>.json instead of index.json
 *
 * @returns {{ outputPath: string, manifest: object }}
 */
function generateShopIndex({ projectsDir, outputDir, buildVersion, hashFilename = false }) {
  if (!fs.existsSync(projectsDir)) {
    throw new Error(`[shop-index-generator] projectsDir does not exist: "${projectsDir}"`);
  }

  const slugs = fs.readdirSync(projectsDir).filter(name => {
    const full = path.join(projectsDir, name);
    return fs.statSync(full).isDirectory();
  });

  if (slugs.length === 0) {
    throw new Error(`[shop-index-generator] No projects found in "${projectsDir}".`);
  }

  const seenPrefixes = new Map(); // prefix → slug
  const seenCodes    = new Set(); // full image codes across ALL projects
  const projects     = [];

  for (const slug of slugs) {
    const projectDir  = path.join(projectsDir, slug);
    const jsonPath    = path.join(projectDir, 'project.json');

    if (!fs.existsSync(jsonPath)) {
      console.warn(`[shop-index-generator] Skipping "${slug}" – no project.json found.`);
      continue;
    }

    let data;
    try {
      data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      throw new Error(`[shop-index-generator] Failed to parse project.json for "${slug}": ${e.message}`);
    }

    const { title, codePrefix, description, images } = data;

    // Validate codePrefix
    validateCodePrefix(codePrefix, slug);

    // Unique prefix check
    if (seenPrefixes.has(codePrefix)) {
      throw new Error(
        `[shop-index-generator] Duplicate codePrefix "${codePrefix}" found in ` +
        `"${slug}" and "${seenPrefixes.get(codePrefix)}". All prefixes must be unique.`
      );
    }
    seenPrefixes.set(codePrefix, slug);

    // Validate images
    validateImagesArray(images, slug);
    validateImageFilesExist(images, projectDir, slug);

    // Generate codes
    const total = images.length;
    const imageEntries = images.map((img, index) => {
      const code = generateImageCode(codePrefix, total, index);

      if (seenCodes.has(code)) {
        // Should never happen as prefixes are unique, but guard anyway
        throw new Error(
          `[shop-index-generator] Duplicate image code "${code}" generated. ` +
          `This indicates a logic error – please report.`
        );
      }
      seenCodes.add(code);

      return {
        code,
        src: img.src,
        caption: img.caption || '',
        alt: img.alt || img.caption || '',
        thumbnailUrl: `projects/${slug}/${img.src}`
      };
    });

    projects.push({
      projectCode: codePrefix,
      title: title || slug,
      description: description || '',
      folder: `projects/${slug}`,
      images: imageEntries
    });
  }

  // ── Write output ──────────────────────────────────────────────────────────

  const manifest = {
    generatedAt: new Date().toISOString(),
    buildVersion: buildVersion || null,
    projects
  };

  const json = JSON.stringify(manifest, null, 2);

  // Determine filename
  let filename;
  if (hashFilename) {
    const hash = crypto.createHash('sha256').update(json).digest('hex').slice(0, 12);
    filename = `index.${hash}.json`;
  } else {
    filename = 'index.json';
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, json, 'utf8');

  console.log(`[shop-index-generator] Wrote ${projects.length} project(s) → "${outputPath}"`);

  return { outputPath, filename, manifest };
}

module.exports = { generateShopIndex, generateImageCode };

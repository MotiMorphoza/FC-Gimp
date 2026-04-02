'use strict';

const fs = require('fs');
const path = require('path');

const Scanner = require('./scanner');

function normalizeStem(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '');
}

function parseArgs(argv = []) {
  const args = { write: null };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--write') {
      args.write = argv[index + 1] ? String(argv[index + 1]) : null;
      index += 1;
    }
  }

  return args;
}

function isNumericSiteFilename(filename = '') {
  return /^\d+[a-z]?$/i.test(path.parse(String(filename || '')).name);
}

function createLogger() {
  return {
    info() {},
    warn() {},
    error() {}
  };
}

function loadProjects(rootDir) {
  const scanner = new Scanner(createLogger());
  return scanner.scanProjectsFromRoot(rootDir);
}

function loadManualMetadata(rootDir) {
  const sourcePath = path.join(rootDir, 'data', 'images.json');
  if (!fs.existsSync(sourcePath)) {
    return { entries: [], sourcePath, exists: false };
  }

  const payload = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  if (!Array.isArray(payload)) {
    throw new Error('data/images.json must be an array');
  }

  return { entries: payload, sourcePath, exists: true };
}

function collectProjectImages(projects = []) {
  return projects.flatMap((project, projectIndex) => {
    const images = Array.isArray(project.images) ? project.images : [];

    return images.map((image, imageIndex) => {
      const src = String(image?.src || '').trim();
      const stem = normalizeStem(src);
      const key = `${project.slug}::${stem}`;

      return {
        key,
        projectSlug: project.slug,
        projectTitle: project.title,
        projectIndex,
        imageIndex,
        codePrefix: String(project.codePrefix || '').trim(),
        src,
        stem,
        alt: String(image?.alt || '').trim(),
        caption: String(image?.caption || '').trim(),
        isNumericSiteFilename: isNumericSiteFilename(src)
      };
    });
  });
}

function countBy(items = [], getKey) {
  const counts = new Map();

  items.forEach((item) => {
    const key = getKey(item);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return counts;
}

function groupBy(items = [], getKey) {
  const groups = new Map();

  items.forEach((item) => {
    const key = getKey(item);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  return groups;
}

function toSortedPairs(map) {
  return [...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function buildAudit(rootDir) {
  const projects = loadProjects(rootDir);
  const manual = loadManualMetadata(rootDir);
  const projectImages = collectProjectImages(projects);

  const projectImageKeys = new Set(projectImages.map((entry) => entry.key));
  const manualEntries = manual.entries.map((entry) => {
    const projectSlug = String(entry?.projectSlug || '').trim();
    const src = String(entry?.src || '').trim();
    const stem = normalizeStem(src);

    return {
      projectSlug,
      src,
      stem,
      key: `${projectSlug}::${stem}`,
      id: String(entry?.id || '').trim(),
      alt: String(entry?.alt || '').trim()
    };
  });

  const manualKeys = new Set(manualEntries.map((entry) => entry.key));
  const projectKeyGroups = groupBy(projectImages, (entry) => entry.key);
  const manualKeyGroups = groupBy(manualEntries, (entry) => entry.key);
  const codePrefixGroups = groupBy(projects, (project) => String(project.codePrefix || '').trim());
  const stemGroups = groupBy(projectImages, (entry) => entry.stem);
  const altGroups = groupBy(
    projectImages.filter((entry) => entry.alt),
    (entry) => entry.alt.toLowerCase()
  );

  const nonNumericFiles = projectImages
    .filter((entry) => !entry.isNumericSiteFilename)
    .map((entry) => ({
      projectSlug: entry.projectSlug,
      src: entry.src
    }));

  const duplicateProjectImageKeys = toSortedPairs(projectKeyGroups)
    .filter(([, entries]) => entries.length > 1)
    .map(([key, entries]) => ({
      key,
      entries: entries.map((entry) => ({
        projectSlug: entry.projectSlug,
        src: entry.src
      }))
    }));

  const duplicateManualKeys = toSortedPairs(manualKeyGroups)
    .filter(([, entries]) => entries.length > 1)
    .map(([key, entries]) => ({
      key,
      entries: entries.map((entry) => ({
        projectSlug: entry.projectSlug,
        src: entry.src,
        id: entry.id
      }))
    }));

  const duplicateCodePrefixes = toSortedPairs(codePrefixGroups)
    .filter(([prefix, entries]) => prefix && entries.length > 1)
    .map(([codePrefix, entries]) => ({
      codePrefix,
      projectSlugs: entries.map((entry) => entry.slug)
    }));

  const crossProjectStemCollisions = toSortedPairs(stemGroups)
    .filter(([, entries]) => {
      const projectSlugs = new Set(entries.map((entry) => entry.projectSlug));
      return entries.length > 1 && projectSlugs.size > 1;
    })
    .map(([stem, entries]) => ({
      stem,
      entries: entries.map((entry) => ({
        projectSlug: entry.projectSlug,
        src: entry.src
      }))
    }));

  const duplicateAltTexts = toSortedPairs(altGroups)
    .filter(([, entries]) => {
      const projectSlugs = new Set(entries.map((entry) => entry.projectSlug));
      return entries.length > 1 && projectSlugs.size > 1;
    })
    .slice(0, 50)
    .map(([alt, entries]) => ({
      alt,
      entries: entries.map((entry) => ({
        projectSlug: entry.projectSlug,
        src: entry.src
      }))
    }));

  const projectImagesWithoutManual = projectImages
    .filter((entry) => !manualKeys.has(entry.key))
    .map((entry) => ({
      projectSlug: entry.projectSlug,
      src: entry.src
    }));

  const orphanManualEntries = manualEntries
    .filter((entry) => !projectImageKeys.has(entry.key))
    .map((entry) => ({
      projectSlug: entry.projectSlug,
      src: entry.src,
      id: entry.id
    }));

  const currentIdentityDependencies = {
    effectiveKey: 'projectSlug + normalized src stem',
    reasons: [
      'project.json images are matched by src/stem in scanner and converter',
      'data/images.json overrides are keyed by projectSlug + src/stem',
      'search dataset imageUrl/projectUrl are derived from projectSlug and src',
      'shop codes are generated per project from codePrefix and image order'
    ]
  };

  return {
    generatedAt: new Date().toISOString(),
    rootDir,
    summary: {
      projectCount: projects.length,
      imageCount: projectImages.length,
      manualMetadataCount: manualEntries.length,
      nonNumericFilenameCount: nonNumericFiles.length,
      projectImagesWithoutManualCount: projectImagesWithoutManual.length,
      orphanManualEntryCount: orphanManualEntries.length,
      duplicateProjectImageKeyCount: duplicateProjectImageKeys.length,
      duplicateManualKeyCount: duplicateManualKeys.length,
      duplicateCodePrefixCount: duplicateCodePrefixes.length,
      crossProjectStemCollisionCount: crossProjectStemCollisions.length,
      duplicateAltAcrossProjectsCount: duplicateAltTexts.length
    },
    currentIdentityDependencies,
    paths: {
      projectsDir: path.join(rootDir, 'src', 'projects'),
      manualMetadataPath: manual.sourcePath,
      searchGeneratorPath: path.join(rootDir, 'build', 'image-search-generator.js'),
      searchRegressionPath: path.join(rootDir, 'build', 'search-regression.js'),
      searchGoldenPath: path.join(rootDir, 'build', 'search-golden.js'),
      searchGoldenQueriesPath: path.join(rootDir, 'data', 'search-golden-queries.json'),
      shopGeneratorPath: path.join(rootDir, 'build', 'shop-index-generator.js')
    },
    findings: {
      nonNumericFiles,
      duplicateProjectImageKeys,
      duplicateManualKeys,
      duplicateCodePrefixes,
      crossProjectStemCollisions,
      duplicateAltTexts,
      projectImagesWithoutManual,
      orphanManualEntries
    }
  };
}

function printSummary(audit) {
  const summary = audit.summary || {};
  console.log('[registry:audit] Current image identity audit');
  console.log(`- projects: ${summary.projectCount}`);
  console.log(`- images: ${summary.imageCount}`);
  console.log(`- manual metadata entries: ${summary.manualMetadataCount}`);
  console.log(`- non-numeric filenames: ${summary.nonNumericFilenameCount}`);
  console.log(`- project images without manual metadata: ${summary.projectImagesWithoutManualCount}`);
  console.log(`- orphan manual metadata entries: ${summary.orphanManualEntryCount}`);
  console.log(`- cross-project stem collisions: ${summary.crossProjectStemCollisionCount}`);
  console.log(`- duplicate code prefixes: ${summary.duplicateCodePrefixCount}`);

  const sample = (audit.findings?.nonNumericFiles || []).slice(0, 5);
  if (sample.length) {
    console.log('- sample naming exceptions:');
    sample.forEach((entry) => {
      console.log(`  * ${entry.projectSlug} :: ${entry.src}`);
    });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const audit = buildAudit(rootDir);

  printSummary(audit);

  if (args.write) {
    const outputPath = path.resolve(rootDir, args.write);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2), 'utf8');
    console.log(`[registry:audit] Wrote ${path.relative(rootDir, outputPath).replace(/\\/g, '/')}`);
  }
}

main();

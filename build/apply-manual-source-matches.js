'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_MATCHES = 'data/manual-source-matches.json';
const DEFAULT_IMAGES = 'data/images.json';
const DEFAULT_PROBLEMATIC = 'data/manual-problematic-overrides.json';

function parseArgs(argv = []) {
  const args = {
    matches: DEFAULT_MATCHES,
    images: DEFAULT_IMAGES,
    problematic: DEFAULT_PROBLEMATIC,
    apply: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--matches') {
      args.matches = argv[index + 1] ? String(argv[index + 1]) : args.matches;
      index += 1;
      continue;
    }
    if (token === '--images') {
      args.images = argv[index + 1] ? String(argv[index + 1]) : args.images;
      index += 1;
      continue;
    }
    if (token === '--problematic') {
      args.problematic = argv[index + 1] ? String(argv[index + 1]) : args.problematic;
      index += 1;
      continue;
    }
    if (token === '--apply') {
      args.apply = true;
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

function sanitizeCameraCode(value = '') {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

function hasDelimitedCameraCode(stem = '', cameraCode = '') {
  if (!stem || !cameraCode) return false;
  const escaped = cameraCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|[^A-Z0-9])${escaped}([A-Z]?)(?=$|[^A-Z0-9])`, 'i');
  return regex.test(stem);
}

function buildSuggestedSourceFilename(sourceName = '', cameraCode = '') {
  const parsed = path.parse(String(sourceName || '').trim());
  const normalizedCode = sanitizeCameraCode(cameraCode);
  if (!parsed.base || !normalizedCode) return parsed.base || '';
  const stem = String(parsed.name || '').trim();
  if (hasDelimitedCameraCode(stem.toUpperCase(), normalizedCode)) return parsed.base;
  return `${stem} ${normalizedCode}${parsed.ext}`.replace(/\s{2,}/g, ' ').trim();
}

function buildSiteFilename(currentFilename = '', cameraCode = '') {
  const parsed = path.parse(String(currentFilename || '').trim());
  const normalizedCode = sanitizeCameraCode(cameraCode);
  if (!parsed.base || !normalizedCode) return parsed.base || '';
  if (parsed.name.toUpperCase().endsWith(`__${normalizedCode}`)) return parsed.base;
  return `${parsed.name}__${normalizedCode}${parsed.ext}`;
}

function updateProjectJson(projectJsonPath, currentFilename, newFilename) {
  const project = readJson(projectJsonPath, {});
  const image = Array.isArray(project.images)
    ? project.images.find((entry) => String(entry?.src || '').trim() === currentFilename)
    : null;
  if (!image) throw new Error(`Could not find "${currentFilename}" in ${projectJsonPath}`);
  image.src = newFilename;
  return project;
}

function updateImagesMetadata(images, projectSlug, currentFilename, newFilename) {
  return (Array.isArray(images) ? images : []).map((entry) => {
    if (
      String(entry?.projectSlug || '').trim() === projectSlug &&
      String(entry?.src || '').trim() === currentFilename
    ) {
      return { ...entry, src: newFilename };
    }
    return entry;
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const matchesPath = path.resolve(rootDir, args.matches);
  const imagesPath = path.resolve(rootDir, args.images);
  const problematicPath = path.resolve(rootDir, args.problematic);
  const matches = readJson(matchesPath, []);
  const images = readJson(imagesPath, []);
  const problematic = readJson(problematicPath, []);

  const operations = (Array.isArray(matches) ? matches : []).map((entry) => {
    const siteRelativePath = normalizePath(entry?.siteRelativePath || '');
    const projectSlug = String(entry?.projectSlug || '').trim();
    const currentSiteFilename = String(entry?.currentSiteFilename || path.basename(siteRelativePath)).trim();
    const cameraCode = sanitizeCameraCode(entry?.cameraCode || '');
    const sourcePath = normalizePath(entry?.sourcePath || '');
    const newSiteFilename = buildSiteFilename(currentSiteFilename, cameraCode);
    const newSitePath = normalizePath(`src/projects/${projectSlug}/${newSiteFilename}`);
    const siteAbsolutePath = path.resolve(rootDir, siteRelativePath);
    const newSiteAbsolutePath = path.resolve(rootDir, newSitePath);
    const sourceAbsolutePath = path.resolve('C:\\Users\\Dell 7490\\Documents\\Photography', sourcePath);
    const sourceName = path.basename(sourcePath);
    const suggestedSourceName = buildSuggestedSourceFilename(sourceName, cameraCode);
    const newSourcePath = normalizePath(path.join(path.dirname(sourcePath), suggestedSourceName));
    const newSourceAbsolutePath = path.resolve('C:\\Users\\Dell 7490\\Documents\\Photography', newSourcePath);
    const projectJsonPath = path.resolve(rootDir, 'src', 'projects', projectSlug, 'project.json');

    return {
      ...entry,
      originalSiteRelativePath: siteRelativePath,
      originalSiteFilename: currentSiteFilename,
      originalSourcePath: sourcePath,
      siteRelativePath,
      projectSlug,
      currentSiteFilename,
      cameraCode,
      sourcePath,
      newSiteFilename,
      newSitePath,
      siteAbsolutePath,
      newSiteAbsolutePath,
      sourceAbsolutePath,
      newSourcePath,
      newSourceAbsolutePath,
      projectJsonPath
    };
  });

  operations.forEach((operation) => {
    if (!fs.existsSync(operation.siteAbsolutePath)) {
      throw new Error(`Missing site image: ${operation.siteAbsolutePath}`);
    }
    if (!fs.existsSync(operation.sourceAbsolutePath)) {
      throw new Error(`Missing source JPEG: ${operation.sourceAbsolutePath}`);
    }
    if (!fs.existsSync(operation.projectJsonPath)) {
      throw new Error(`Missing project.json: ${operation.projectJsonPath}`);
    }
  });

  const plan = {
    generatedAt: new Date().toISOString(),
    operationsCount: operations.length,
    operations: operations.map((operation) => ({
      projectSlug: operation.projectSlug,
      siteRelativePath: operation.siteRelativePath,
      newSitePath: operation.newSitePath,
      sourcePath: operation.sourcePath,
      newSourcePath: operation.newSourcePath,
      cameraCode: operation.cameraCode
    }))
  };

  writeJson(path.resolve(rootDir, '.build-temp/manual-source-match-apply-plan.json'), plan);
  console.log(`[manual-source-matches] planned ${operations.length} updates`);

  if (!args.apply) return;

  const updatedProjects = new Map();
  let updatedImages = images;

  operations.forEach((operation) => {
    if (normalizePath(operation.siteAbsolutePath) !== normalizePath(operation.newSiteAbsolutePath)) {
      fs.renameSync(operation.siteAbsolutePath, operation.newSiteAbsolutePath);
    }
    if (normalizePath(operation.sourceAbsolutePath) !== normalizePath(operation.newSourceAbsolutePath)) {
      fs.renameSync(operation.sourceAbsolutePath, operation.newSourceAbsolutePath);
    }

    const project = updatedProjects.has(operation.projectJsonPath)
      ? updatedProjects.get(operation.projectJsonPath)
      : updateProjectJson(operation.projectJsonPath, operation.currentSiteFilename, operation.newSiteFilename);

    if (updatedProjects.has(operation.projectJsonPath)) {
      const image = project.images.find((entry) => String(entry?.src || '').trim() === operation.currentSiteFilename);
      if (!image) {
        const byNew = project.images.find((entry) => String(entry?.src || '').trim() === operation.newSiteFilename);
        if (!byNew) throw new Error(`Could not update image "${operation.currentSiteFilename}" in ${operation.projectJsonPath}`);
      } else {
        image.src = operation.newSiteFilename;
      }
    }

    updatedProjects.set(operation.projectJsonPath, project);
    updatedImages = updateImagesMetadata(updatedImages, operation.projectSlug, operation.currentSiteFilename, operation.newSiteFilename);

  });

  for (const [filePath, payload] of updatedProjects.entries()) {
    writeJson(filePath, payload);
  }
  writeJson(imagesPath, updatedImages);

  const updatedMatches = matches.map((entry) => {
    const operation = operations.find((item) => normalizePath(item.originalSiteRelativePath) === normalizePath(entry.siteRelativePath));
    if (!operation) return entry;
    return {
      ...entry,
      siteRelativePath: operation.newSitePath,
      currentSiteFilename: operation.newSiteFilename,
      sourcePath: operation.newSourcePath
    };
  });
  writeJson(matchesPath, updatedMatches);

  const remainingProblematic = (Array.isArray(problematic) ? problematic : []).filter((entry) =>
    !operations.some((operation) => normalizePath(operation.siteRelativePath) === normalizePath(entry?.currentSitePath || ''))
  );
  writeJson(problematicPath, remainingProblematic);

  console.log(`[manual-source-matches] applied ${operations.length} updates`);
}

main();

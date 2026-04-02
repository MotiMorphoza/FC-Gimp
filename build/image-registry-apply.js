'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_REPORT = '.build-temp/registry-reconcile-full.json';
const DEFAULT_HOLDS = '.build-temp/manual-remaining-overrides.json';
const DEFAULT_MANUAL_CODES = '.build-temp/manual-codes-merged-27.json';
const DEFAULT_PLAN = '.build-temp/registry-apply-plan.json';

function parseArgs(argv = []) {
  const args = {
    report: DEFAULT_REPORT,
    holds: DEFAULT_HOLDS,
    manualCodes: DEFAULT_MANUAL_CODES,
    plan: DEFAULT_PLAN,
    apply: false
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
    if (token === '--manual-codes') {
      args.manualCodes = argv[i + 1] ? String(argv[i + 1]) : args.manualCodes;
      i += 1;
      continue;
    }
    if (token === '--plan') {
      args.plan = argv[i + 1] ? String(argv[i + 1]) : args.plan;
      i += 1;
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

function normalizeStem(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '');
}

function normalizePath(value = '') {
  return String(value || '').replace(/\\/g, '/').trim();
}

function buildHoldSet(holds = []) {
  return new Set(
    (Array.isArray(holds) ? holds : [])
      .map((entry) => normalizePath(entry?.currentSitePath || entry?.siteRelativePath || ''))
      .filter(Boolean)
  );
}

function buildOperations({ rootDir, report, holdSet }) {
  const eligibleStatuses = new Set(['exact', 'strong', 'probable', 'manual']);

  return report.matches
    .filter((match) => eligibleStatuses.has(String(match.status || '')))
    .filter((match) => match.bestMatch?.proposedFilename)
    .filter((match) => !holdSet.has(normalizePath(match.site?.siteRelativePath || '')))
    .map((match, index) => {
      const projectSlug = String(match.site.projectSlug || '').trim();
      const currentFilename = String(match.site.currentFilename || '').trim();
      const proposedFilename = String(match.bestMatch.proposedFilename || '').trim();
      const projectDir = path.join(rootDir, 'src', 'projects', projectSlug);
      const fromPath = path.join(projectDir, currentFilename);
      const toPath = path.join(projectDir, proposedFilename);
      const sitePath = normalizePath(match.site.siteRelativePath);
      const newSitePath = normalizePath(`src/projects/${projectSlug}/${proposedFilename}`);
      const projectJsonPath = path.join(projectDir, 'project.json');

      return {
        index: index + 1,
        projectSlug,
        status: match.status,
        currentFilename,
        proposedFilename,
        cameraCode: match.bestMatch.cameraCode || '',
        sitePath,
        newSitePath,
        fromPath,
        toPath,
        projectJsonPath
      };
    });
}

function validateOperations(operations) {
  const issues = [];
  const targetPaths = new Set();

  operations.forEach((op) => {
    if (!fs.existsSync(op.fromPath)) {
      issues.push(`Missing source image: ${op.fromPath}`);
    }

    const targetKey = normalizePath(op.toPath);
    if (targetPaths.has(targetKey)) {
      issues.push(`Duplicate target path: ${op.toPath}`);
    }
    targetPaths.add(targetKey);

    if (normalizePath(op.fromPath) !== normalizePath(op.toPath) && fs.existsSync(op.toPath)) {
      issues.push(`Target already exists: ${op.toPath}`);
    }

    if (!fs.existsSync(op.projectJsonPath)) {
      issues.push(`Missing project.json: ${op.projectJsonPath}`);
    }
  });

  return issues;
}

function updateProjectFiles(operations) {
  const projectMap = new Map();

  operations.forEach((op) => {
    if (!projectMap.has(op.projectJsonPath)) {
      projectMap.set(op.projectJsonPath, readJson(op.projectJsonPath));
    }

    const project = projectMap.get(op.projectJsonPath);
    const image = Array.isArray(project.images)
      ? project.images.find((entry) => String(entry?.src || '').trim() === op.currentFilename)
      : null;

    if (!image) {
      throw new Error(`Could not find image "${op.currentFilename}" in ${op.projectJsonPath}`);
    }

    image.src = op.proposedFilename;
  });

  return projectMap;
}

function updateImagesMetadata(imagesMetadata, operations) {
  const updated = Array.isArray(imagesMetadata)
    ? imagesMetadata.map((entry) => ({ ...entry }))
    : [];

  operations.forEach((op) => {
    const candidates = updated.filter((entry) =>
      String(entry?.projectSlug || '').trim() === op.projectSlug &&
      (
        String(entry?.src || '').trim() === op.currentFilename ||
        normalizeStem(entry?.src || '') === normalizeStem(op.currentFilename)
      )
    );

    candidates.forEach((entry) => {
      entry.src = op.proposedFilename;
    });
  });

  return updated;
}

function updateManualCodes(manualCodes, operations) {
  if (!Array.isArray(manualCodes)) return manualCodes;
  const opBySitePath = new Map(operations.map((op) => [op.sitePath, op]));

  return manualCodes.map((entry) => {
    const currentSitePath = normalizePath(entry?.currentSitePath || '');
    const op = opBySitePath.get(currentSitePath);
    if (!op) return entry;
    return {
      ...entry,
      currentSitePath: op.newSitePath,
      currentSiteFilename: op.proposedFilename
    };
  });
}

function buildPlan(operations) {
  return {
    generatedAt: new Date().toISOString(),
    operationsCount: operations.length,
    operations: operations.map((op) => ({
      projectSlug: op.projectSlug,
      status: op.status,
      currentFilename: op.currentFilename,
      proposedFilename: op.proposedFilename,
      cameraCode: op.cameraCode,
      currentSitePath: op.sitePath,
      newSitePath: op.newSitePath
    }))
  };
}

function applyRenames(operations) {
  const phaseOne = [];
  const phaseTwo = [];

  try {
    operations.forEach((op, index) => {
      const parsed = path.parse(op.fromPath);
      const tempPath = path.join(parsed.dir, `${parsed.name}.__registry_tmp_${String(index + 1).padStart(4, '0')}${parsed.ext}`);
      if (fs.existsSync(tempPath)) {
        throw new Error(`Temporary path already exists: ${tempPath}`);
      }
      fs.renameSync(op.fromPath, tempPath);
      phaseOne.push({ from: op.fromPath, temp: tempPath, to: op.toPath });
    });

    phaseOne.forEach((move) => {
      fs.renameSync(move.temp, move.to);
      phaseTwo.push(move);
    });
  } catch (error) {
    for (let index = phaseTwo.length - 1; index >= 0; index -= 1) {
      const move = phaseTwo[index];
      if (fs.existsSync(move.to)) fs.renameSync(move.to, move.temp);
    }
    for (let index = phaseOne.length - 1; index >= 0; index -= 1) {
      const move = phaseOne[index];
      if (fs.existsSync(move.temp)) fs.renameSync(move.temp, move.from);
    }
    throw error;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const reportPath = path.resolve(rootDir, args.report);
  const holdsPath = path.resolve(rootDir, args.holds);
  const manualCodesPath = path.resolve(rootDir, args.manualCodes);
  const planPath = path.resolve(rootDir, args.plan);
  const imagesPath = path.join(rootDir, 'data', 'images.json');

  const report = readJson(reportPath);
  const holds = readJson(holdsPath, []);
  const manualCodes = readJson(manualCodesPath, []);
  const holdSet = buildHoldSet(holds);
  const operations = buildOperations({ rootDir, report, holdSet });
  const issues = validateOperations(operations);

  if (issues.length) {
    throw new Error(`Validation failed:\n- ${issues.join('\n- ')}`);
  }

  const projectMap = updateProjectFiles(operations);
  const imagesMetadata = updateImagesMetadata(readJson(imagesPath, []), operations);
  const updatedManualCodes = updateManualCodes(manualCodes, operations);
  const plan = buildPlan(operations);
  writeJson(planPath, plan);

  console.log(`[registry:apply] planned ${operations.length} safe renames`);
  console.log(`[registry:apply] wrote ${normalizePath(path.relative(rootDir, planPath))}`);

  if (!args.apply) return;

  const projectBackups = new Map();
  for (const [filePath] of projectMap.entries()) {
    projectBackups.set(filePath, fs.readFileSync(filePath, 'utf8'));
  }
  const imagesBackup = fs.readFileSync(imagesPath, 'utf8');
  const manualCodesBackup = fs.existsSync(manualCodesPath) ? fs.readFileSync(manualCodesPath, 'utf8') : '';

  applyRenames(operations);

  try {
    for (const [filePath, payload] of projectMap.entries()) {
      writeJson(filePath, payload);
    }
    writeJson(imagesPath, imagesMetadata);
    writeJson(manualCodesPath, updatedManualCodes);
  } catch (error) {
    for (const [filePath, content] of projectBackups.entries()) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    fs.writeFileSync(imagesPath, imagesBackup, 'utf8');
    if (manualCodesPath) {
      fs.writeFileSync(manualCodesPath, manualCodesBackup, 'utf8');
    }
    throw error;
  }

  console.log(`[registry:apply] applied ${operations.length} safe renames`);
}

main();

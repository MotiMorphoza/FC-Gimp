'use strict';

const fs = require('fs');
const path = require('path');

const VALID_LAYOUT_CODES = new Set(['01', '01C', '02', '02C', '02T', '02TC', '03', '04', '05', '05S', '06']);
const LANGUAGES = ['en', 'he', 'es'];
const HEADER_KEYS = new Set(['LAYOUT', 'TITLE', 'IMAGE', 'HIDDEN', 'BODY']);

function createEntrySlug(language, fileName) {
  const stem = path.parse(String(fileName || '')).name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${String(language || '').trim().toLowerCase()}-${stem || 'entry'}`;
}

function normalizeLayoutCode(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^\d+$/.test(value)) {
    return value.padStart(2, '0');
  }
  return value.toUpperCase();
}

function parseBoolean(raw, fieldName, filePath) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === '') return false;
  if (value === 'truth' || value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`[human-writes] Invalid ${fieldName} in ${filePath}. Use empty, TRUTH, TRUE or FALSE.`);
}

function parseEntryFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.replace(/\r\n/g, '\n').split('\n');

  const bodyLineIndex = lines.findIndex((line) => /^BODY\s*:/i.test(line));
  if (bodyLineIndex < 0) {
    throw new Error(`[human-writes] Missing BODY field in ${filePath}`);
  }

  const fields = new Map();

  for (let i = 0; i < bodyLineIndex; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;

    const match = line.match(/^([A-Z]+)\s*:\s*(.*)$/i);
    if (!match) {
      throw new Error(`[human-writes] Invalid field syntax before BODY in ${filePath} at line ${i + 1}`);
    }

    const key = match[1].trim().toUpperCase();
    const value = match[2] || '';

    if (!HEADER_KEYS.has(key)) {
      throw new Error(`[human-writes] Unknown field ${key} in ${filePath} at line ${i + 1}`);
    }

    if (fields.has(key)) {
      throw new Error(`[human-writes] Duplicate field ${key} in ${filePath}`);
    }

    fields.set(key, value);
  }

  for (let i = bodyLineIndex + 1; i < lines.length; i += 1) {
    const candidate = lines[i];
    const match = candidate.match(/^\s*([A-Z]+)\s*:/i);
    if (!match) continue;

    const key = match[1].trim().toUpperCase();
    if (key !== 'BODY' && HEADER_KEYS.has(key)) {
      throw new Error(`[human-writes] BODY must be the last field in ${filePath} (found ${key} at line ${i + 1})`);
    }
  }

  const bodyMatch = lines[bodyLineIndex].match(/^BODY\s*:\s?(.*)$/i);
  const bodyHead = bodyMatch ? bodyMatch[1] : '';
  const bodyTail = lines.slice(bodyLineIndex + 1).join('\n');
  const body = bodyHead
    ? `${bodyHead}${bodyTail ? `\n${bodyTail}` : ''}`
    : bodyTail;

  const layout = normalizeLayoutCode(fields.get('LAYOUT'));
  if (!layout) {
    throw new Error(`[human-writes] Missing LAYOUT in ${filePath}`);
  }

  if (!VALID_LAYOUT_CODES.has(layout)) {
    throw new Error(`[human-writes] Unknown layout code ${layout} in ${filePath}`);
  }

  const hidden = parseBoolean(fields.get('HIDDEN') || '', 'HIDDEN', filePath);
  const title = String(fields.get('TITLE') || '');
  const image = String(fields.get('IMAGE') || '').trim();

  return {
    layout,
    title,
    image,
    hidden,
    body
  };
}

function listEntryFiles(langDir) {
  if (!fs.existsSync(langDir)) return [];

  return fs.readdirSync(langDir, { withFileTypes: true })
    .filter((item) => item.isFile() && item.name.toLowerCase().endsWith('.txt'))
    .map((item) => item.name)
    .sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
}

function generateHumanWritesContent({ sourceRoot, outputPath, logger }) {
  const textRoot = path.join(sourceRoot, 'text');
  const picsRoot = path.join(sourceRoot, 'pics');

  if (!fs.existsSync(textRoot)) {
    throw new Error(`[human-writes] Missing directory: ${textRoot}`);
  }

  const generated = [];

  for (const lang of LANGUAGES) {
    const langDir = path.join(textRoot, lang);
    if (!fs.existsSync(langDir)) {
      throw new Error(`[human-writes] Missing language directory: ${langDir}`);
    }

    const files = listEntryFiles(langDir);
    for (const fileName of files) {
      const entryPath = path.join(langDir, fileName);
      const parsed = parseEntryFile(entryPath);

      if (parsed.hidden) continue;

      if (parsed.image) {
        const imagePath = path.join(picsRoot, parsed.image);
        if (!fs.existsSync(imagePath)) {
          logger?.warn?.(`[human-writes] Image missing (warning): ${parsed.image} referenced by ${entryPath}`);
        }
      }

      generated.push({
        lang,
        slug: createEntrySlug(lang, fileName),
        layout: parsed.layout,
        title: parsed.title,
        image: parsed.image,
        hidden: false,
        body: parsed.body
      });
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(generated, null, 2), 'utf8');
  logger?.info?.(`[human-writes] Generated ${generated.length} visible entries -> ${path.relative(process.cwd(), outputPath)}`);

  return generated;
}

module.exports = {
  generateHumanWritesContent,
  VALID_LAYOUT_CODES
};

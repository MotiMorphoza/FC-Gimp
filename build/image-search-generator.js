const fs = require('fs');
const path = require('path');

const ARRAY_FIELDS = [
  'primary',
  'secondary',
  'noise',
  'objects',
  'environment',
  'style',
  'composition',
  'lighting',
  'colors',
  'mood',
  'themes',
  'symbols',
  'texture',
  'motion',
  'tone',
  'relations',
  'tension',
  'reading',
  'negative',
  'related'
];

const STRING_FIELDS = ['density', 'pov', 'manipulation'];
const OBJECT_FIELDS = ['intensity', 'score'];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'above', 'across', 'against', 'along', 'around',
  'before', 'behind', 'beneath', 'beside', 'between', 'by', 'for', 'from', 'in',
  'inside', 'into', 'near', 'of', 'on', 'over', 'past', 'through', 'to', 'toward',
  'under', 'up', 'with', 'without', 'the', 'this', 'that', 'these', 'those'
]);

const HUMAN_HINTS = [
  'people', 'person', 'man', 'woman', 'women', 'child', 'children', 'girl', 'boy',
  'adult', 'adults', 'crowd', 'pedestrian', 'pedestrians', 'protester', 'protesters',
  'priest', 'priests', 'nun', 'nuns', 'cyclist', 'cyclists', 'rider', 'riders',
  'worker', 'workers', 'vendor', 'vendors', 'seller', 'sellers', 'figure', 'figures'
];

const GRAYSCALE_HINTS = ['black and white', 'black-and-white', 'monochrome', 'grayscale', 'greyscale'];
const COLOR_HINTS = [
  'black', 'white', 'gray', 'grey', 'blue', 'red', 'yellow', 'green', 'pink',
  'orange', 'purple', 'violet', 'gold', 'silver', 'brown', 'beige', 'turquoise'
];
const OBJECT_HINTS = [
  'window', 'windows', 'wall', 'cross', 'bird', 'birds', 'pigeon', 'duck', 'gull',
  'stork', 'heron', 'dog', 'dogs', 'umbrella', 'phone', 'smartphone', 'hand', 'hands',
  'bench', 'tree', 'sign', 'tram', 'bicycle', 'bike', 'stroller', 'flower', 'flag',
  'skull', 'glasses', 'statue', 'mask', 'mirror', 'reflection', 'boat', 'cage', 'chair',
  'stairs', 'windowpanes', 'billboard', 'shadow', 'coat', 'wheel', 'snow', 'water'
];

function uniqueStrings(items = []) {
  return [...new Set(
    items
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  )];
}

function normalizeStem(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '');
}

function slugifyId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'image';
}

function normalizeToken(token) {
  return String(token || '')
    .toLowerCase()
    .replace(/(^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$)/gu, '');
}

function tokenizeText(text) {
  return uniqueStrings(
    String(text || '')
      .replace(/[/'"]/g, ' ')
      .split(/[\s,.;:!?()[\]{}]+/)
      .map(normalizeToken)
      .filter((token) => token && token.length > 1 && !STOP_WORDS.has(token))
  );
}

function deriveNegativeHints(alt) {
  const normalizedAlt = String(alt || '').toLowerCase();
  const negatives = [];

  if (HUMAN_HINTS.some((hint) => normalizedAlt.includes(hint))) {
    negatives.push('people');
  }

  if (!GRAYSCALE_HINTS.some((hint) => normalizedAlt.includes(hint))) {
    negatives.push('color');
  }

  return uniqueStrings(negatives);
}

function deriveFieldByIncludes(alt, mapping) {
  const normalizedAlt = String(alt || '').toLowerCase();
  return uniqueStrings(
    mapping
      .filter(({ match }) => match.some((term) => normalizedAlt.includes(term)))
      .flatMap(({ values }) => values)
  );
}

function derivePointOfView(alt) {
  const normalizedAlt = String(alt || '').toLowerCase();
  if (normalizedAlt.includes('seen from above') || normalizedAlt.includes('overhead view')) return 'overhead';
  if (normalizedAlt.includes('close-up')) return 'close-up';
  if (normalizedAlt.includes('through')) return 'framed view';
  if (normalizedAlt.includes('silhouette')) return 'silhouette';
  return '';
}

function deriveManipulation(alt) {
  const normalizedAlt = String(alt || '').toLowerCase();
  if (GRAYSCALE_HINTS.some((hint) => normalizedAlt.includes(hint))) return 'monochrome';
  if (normalizedAlt.includes('motion-blurred') || normalizedAlt.includes('blur')) return 'motion blur';
  if (normalizedAlt.includes('reflection')) return 'reflection';
  return 'straight';
}

function deriveObjects(alt) {
  const normalizedAlt = String(alt || '').toLowerCase();
  return uniqueStrings(
    OBJECT_HINTS.filter((term) => normalizedAlt.includes(term)).map((term) =>
      term.endsWith('s') ? term.slice(0, -1) : term
    )
  );
}

function deriveColors(alt) {
  return uniqueStrings(
    COLOR_HINTS.filter((term) => String(alt || '').toLowerCase().includes(term))
  );
}

function deriveComposition(alt) {
  return deriveFieldByIncludes(alt, [
    { match: ['seen from above', 'overhead view'], values: ['overhead view', 'bird\'s-eye view'] },
    { match: ['close-up'], values: ['close crop'] },
    { match: ['through', 'framed by'], values: ['frame within frame'] },
    { match: ['reflection', 'reflected'], values: ['reflection'] },
    { match: ['row of', 'line of', 'rows of', 'repeating'], values: ['repetition'] },
    { match: ['single ', 'alone', 'solitary'], values: ['isolated subject'] },
    { match: ['silhouette'], values: ['silhouette contrast'] }
  ]);
}

function deriveLighting(alt) {
  return deriveFieldByIncludes(alt, [
    { match: ['sunset', 'sun flare', 'glowing orange'], values: ['sunset light'] },
    { match: ['night', 'neon', 'glowing word'], values: ['night light'] },
    { match: ['daylight', 'daytime'], values: ['daylight'] },
    { match: ['shadow', 'shadows'], values: ['directional light'] },
    { match: ['backlit'], values: ['backlit light'] },
    { match: ['snow', 'winter'], values: ['cold daylight'] }
  ]);
}

function deriveMotionHints(alt) {
  return deriveFieldByIncludes(alt, [
    { match: ['walking', 'crossing'], values: ['walking'] },
    { match: ['riding', 'cyclist', 'bicycle', 'tram'], values: ['transit movement'] },
    { match: ['flying', 'gliding', 'flapping', 'bursting into flight'], values: ['flight'] },
    { match: ['motion-blurred', 'blur'], values: ['blurred motion'] },
    { match: ['reflection', 'reflected'], values: ['visual shimmer'] },
    { match: ['ripples', 'water'], values: ['water movement'] }
  ]);
}

function deriveTextureHints(alt) {
  return deriveFieldByIncludes(alt, [
    { match: ['snow', 'ice'], values: ['snow', 'ice'] },
    { match: ['glass', 'window'], values: ['glass'] },
    { match: ['metal', 'tram', 'sign', 'bike'], values: ['metal'] },
    { match: ['wall', 'stone', 'pavement', 'concrete'], values: ['hard surface'] },
    { match: ['water', 'puddle', 'river'], values: ['water surface'] },
    { match: ['feather', 'bird', 'duck', 'gull', 'pigeon'], values: ['feathers'] }
  ]);
}

function deriveEnvironment(project, alt) {
  const base = uniqueStrings(project.tags || []);
  return uniqueStrings([
    ...base,
    ...deriveFieldByIncludes(alt, [
      { match: ['street', 'city', 'intersection', 'crosswalk'], values: ['city', 'street'] },
      { match: ['park', 'bench', 'tree'], values: ['park'] },
      { match: ['snow', 'winter'], values: ['winter'] },
      { match: ['water', 'pond', 'river', 'puddle'], values: ['water edge'] },
      { match: ['wall', 'facade', 'window', 'building'], values: ['architecture'] }
    ])
  ]);
}

function deriveStyle(project, alt) {
  const normalizedAlt = String(alt || '').toLowerCase();
  const style = [];

  if (/window|facade|building/.test(normalizedAlt)) style.push('architectural observation');
  if (/reflection|reflected|mirror/.test(normalizedAlt)) style.push('reflection study');
  if (/motion-blurred|blur/.test(normalizedAlt)) style.push('motion-blur street photography');
  if (/bird|duck|gull|pigeon|stork|heron/.test(normalizedAlt)) style.push('poetic observation');
  if (/umbrella|crossing|cyclist|pedestrian|street|tram/.test(normalizedAlt)) style.push('street photography');
  if (/skull|vegetable|eggplant|birdcage|chair|boat/.test(normalizedAlt)) style.push('conceptual still life');

  return uniqueStrings([...style, ...(project.tags || [])]);
}

function deriveBaseEntry(project, image, projectIndex, imageIndex) {
  const altTokens = tokenizeText(image.alt);
  const projectTags = uniqueStrings(project.tags || []);
  const stem = normalizeStem(image.src);
  const id = `img-${String(projectIndex + 1).padStart(3, '0')}-${slugifyId(project.slug)}-${slugifyId(stem)}`;

  return {
    id,
    projectSlug: project.slug,
    projectTitle: project.title,
    projectDescription: project.description || '',
    projectUrl: `project-${encodeURIComponent(project.slug)}.html`,
    imageUrl: `projects/${project.slug}/${image.src}`,
    projectIndex,
    imageIndex,
    src: image.src,
    alt: image.alt || '',
    caption: image.caption || '',
    primary: [],
    secondary: uniqueStrings([...projectTags, ...altTokens]).slice(0, 18),
    noise: uniqueStrings([project.title]),
    objects: deriveObjects(image.alt),
    environment: deriveEnvironment(project, image.alt),
    style: deriveStyle(project, image.alt),
    composition: deriveComposition(image.alt),
    lighting: deriveLighting(image.alt),
    colors: deriveColors(image.alt),
    mood: [],
    themes: projectTags,
    symbols: [],
    texture: deriveTextureHints(image.alt),
    motion: deriveMotionHints(image.alt),
    tone: [],
    relations: [],
    tension: [],
    reading: image.alt ? [image.alt] : [],
    density: '',
    intensity: {},
    pov: derivePointOfView(image.alt),
    manipulation: deriveManipulation(image.alt),
    negative: deriveNegativeHints(image.alt),
    related: []
  };
}

function normalizeManualEntry(entry) {
  const normalized = {};

  if (entry && typeof entry === 'object') {
    Object.entries(entry).forEach(([key, value]) => {
      normalized[key] = value;
    });
  }

  ARRAY_FIELDS.forEach((field) => {
    normalized[field] = uniqueStrings(normalized[field]);
  });

  STRING_FIELDS.forEach((field) => {
    normalized[field] = typeof normalized[field] === 'string' ? normalized[field].trim() : '';
  });

  OBJECT_FIELDS.forEach((field) => {
    normalized[field] = normalized[field] && typeof normalized[field] === 'object' && !Array.isArray(normalized[field])
      ? { ...normalized[field] }
      : {};
  });

  normalized.projectSlug = String(normalized.projectSlug || '').trim();
  normalized.src = String(normalized.src || '').trim();
  normalized.id = String(normalized.id || '').trim();

  return normalized;
}

function loadManualMetadata(rootDir, logger) {
  const sourcePath = path.join(rootDir, 'data', 'images.json');
  if (!fs.existsSync(sourcePath)) return new Map();

  const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error('data/images.json must be an array of image metadata objects');
  }

  const overrides = new Map();

  raw.forEach((entry) => {
    const normalized = normalizeManualEntry(entry);
    if (!normalized.projectSlug || !normalized.src) {
      throw new Error('Every image metadata override must include projectSlug and src');
    }

    const key = `${normalized.projectSlug}::${normalizeStem(normalized.src)}`;
    overrides.set(key, normalized);
  });

  if (logger) {
    logger.info(`[search] Loaded ${overrides.size} manual image metadata entries`);
  }

  return overrides;
}

function mergeEntry(baseEntry, override = {}) {
  const safeOverride = override || {};
  const merged = {
    ...baseEntry,
    id: safeOverride.id || baseEntry.id
  };

  ARRAY_FIELDS.forEach((field) => {
    merged[field] = uniqueStrings([
      ...(baseEntry[field] || []),
      ...(safeOverride[field] || [])
    ]);
  });

  STRING_FIELDS.forEach((field) => {
    merged[field] = safeOverride[field] || baseEntry[field] || '';
  });

  OBJECT_FIELDS.forEach((field) => {
    merged[field] = {
      ...(baseEntry[field] || {}),
      ...(safeOverride[field] || {})
    };
  });

  return merged;
}

function generateImageSearchDataset(projects, rootDir, logger) {
  const overrides = loadManualMetadata(rootDir, logger);
  const dataset = [];

  projects.forEach((project, projectIndex) => {
    (project.images || []).forEach((image, imageIndex) => {
      const baseEntry = deriveBaseEntry(project, image, projectIndex, imageIndex);
      const overrideKey = `${project.slug}::${normalizeStem(image.src)}`;
      const override = overrides.get(overrideKey) || null;
      dataset.push(mergeEntry(baseEntry, override));
    });
  });

  return dataset;
}

function writeImageSearchDataset({ projects, rootDir, tempDir, logger }) {
  const dataset = generateImageSearchDataset(projects, rootDir, logger);
  const outputPath = path.join(tempDir, 'data', 'images-search.generated.json');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), 'utf8');

  if (logger) {
    logger.info(`[search] Generated image search dataset (${dataset.length} images)`);
  }

  return dataset;
}

module.exports = {
  ARRAY_FIELDS,
  STRING_FIELDS,
  OBJECT_FIELDS,
  generateImageSearchDataset,
  writeImageSearchDataset
};

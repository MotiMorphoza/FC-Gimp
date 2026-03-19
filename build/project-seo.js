'use strict';

const GENERIC_VISUAL_TERMS = new Set([
  'architecture',
  'city',
  'color',
  'daylight',
  'daytime',
  'people',
  'park',
  'street',
  'urban',
  'water edge',
  'winter'
]);

const VISUAL_PRIMARY_HINTS = [
  'bench',
  'bird',
  'blur',
  'bottle',
  'building',
  'cat',
  'chair',
  'chimney',
  'coat',
  'cross',
  'cyclist',
  'dog',
  'duck',
  'egg',
  'face',
  'flag',
  'flower',
  'glove',
  'hand',
  'mask',
  'nun',
  'panel',
  'phone',
  'pigeon',
  'reflection',
  'shadow',
  'sign',
  'silhouette',
  'smoke',
  'snow',
  'statue',
  'stroller',
  'tram',
  'tree',
  'umbrella',
  'vendor',
  'window'
];

const MOTIF_LABELS = new Map([
  ['bird', 'Birds'],
  ['bike', 'Bicycles'],
  ['bottle', 'Bottles'],
  ['cat', 'Cats'],
  ['chair', 'Chairs'],
  ['chimney', 'Chimneys'],
  ['cross', 'Crosses'],
  ['dog', 'Dogs'],
  ['duck', 'Birds'],
  ['egg', 'Broken eggs'],
  ['flag', 'Flags'],
  ['flower', 'Flowers'],
  ['glove', 'Discarded objects'],
  ['hand', 'Hands'],
  ['mask', 'Masks'],
  ['phone', 'Phones'],
  ['pigeon', 'Birds'],
  ['reflection', 'Reflections'],
  ['shadow', 'Shadows'],
  ['sign', 'Signs'],
  ['snow', 'Snow'],
  ['statue', 'Statues'],
  ['stroller', 'Strollers'],
  ['tram', 'Trams'],
  ['tree', 'Trees'],
  ['umbrella', 'Umbrellas'],
  ['window', 'Windows']
]);

const CONCEPT_REWRITES = new Map([
  ['alienation', 'holding distance and human detachment in view'],
  ['authority', 'testing how power appears in public space'],
  ['beauty', 'finding lyric form inside ordinary surfaces'],
  ['connection', 'searching for brief links between separate lives'],
  ['daily life', 'staying close to the theatre of daily life'],
  ['everyday symbolism', 'letting ordinary scenes lean toward symbol'],
  ['freedom', 'keeping a sense of release inside the frame'],
  ['humor', 'finding wit in the smallest urban collisions'],
  ['identity', 'testing how identity slips between surface and role'],
  ['loneliness', 'holding solitude against the public scene'],
  ['modern life', 'tracking how modern life compresses attention'],
  ['movement', 'letting motion unsettle the scene'],
  ['nature', 'letting nature interrupt the built world'],
  ['observation', 'staying with distance, watching, and pause'],
  ['ordinary life', 'finding tension in ordinary public life'],
  ['pattern', 'turning repetition into visual pressure'],
  ['poetic', 'keeping a poetic drift inside the image'],
  ['politics', 'keeping civic pressure close to the surface'],
  ['public space', 'treating public space as a charged stage'],
  ['rain', 'using weather as part of the emotional frame'],
  ['reflection', 'letting doubled views disturb the surface'],
  ['reflections', 'letting doubled views disturb the surface'],
  ['society', 'testing how social order looks from the street'],
  ['solitude', 'holding solitude against the public scene'],
  ['surreal', 'nudging the ordinary toward the surreal'],
  ['surveillance', 'keeping watchfulness inside the picture'],
  ['technology', 'showing technology as part of daily ritual'],
  ['time', 'turning small moments into a study of passing time'],
  ['urban absurdity', 'finding absurdity inside ordinary public space'],
  ['urban nature', 'letting nature press back into the city'],
  ['vulnerability', 'keeping fragility close to the frame']
]);

const CONCEPT_LABELS = new Map([
  ['alienation', 'urban detachment'],
  ['authority', 'public power'],
  ['beauty', 'everyday beauty'],
  ['connection', 'human connection'],
  ['daily life', 'daily life'],
  ['everyday symbolism', 'everyday symbolism'],
  ['freedom', 'small freedoms'],
  ['humor', 'urban humor'],
  ['identity', 'shifting identity'],
  ['loneliness', 'urban loneliness'],
  ['modern life', 'modern life'],
  ['movement', 'restless motion'],
  ['nature', 'nature in the city'],
  ['observation', 'watchful observation'],
  ['ordinary life', 'ordinary public life'],
  ['pattern', 'visual repetition'],
  ['poetic', 'poetic drift'],
  ['politics', 'civic tension'],
  ['public space', 'public space'],
  ['rain', 'weather-soaked streets'],
  ['reflection', 'reflections'],
  ['reflections', 'reflections'],
  ['society', 'social order'],
  ['solitude', 'public solitude'],
  ['surreal', 'surreal street moments'],
  ['surveillance', 'watchfulness'],
  ['technology', 'daily technology'],
  ['time', 'passing time'],
  ['urban absurdity', 'urban absurdity'],
  ['urban nature', 'urban nature'],
  ['vulnerability', 'small fragility']
]);

const TONE_LABELS = new Map([
  ['alienation', 'detached'],
  ['authority', 'tense'],
  ['beauty', 'lyrical'],
  ['connection', 'tender'],
  ['humor', 'wry'],
  ['loneliness', 'quiet'],
  ['movement', 'restless'],
  ['nature', 'calm'],
  ['observation', 'watchful'],
  ['poetic', 'poetic'],
  ['politics', 'charged'],
  ['public space', 'watchful'],
  ['rain', 'muted'],
  ['reflection', 'reflective'],
  ['reflections', 'reflective'],
  ['solitude', 'quiet'],
  ['surreal', 'offbeat'],
  ['surveillance', 'uneasy'],
  ['time', 'contemplative'],
  ['urban absurdity', 'offbeat'],
  ['vulnerability', 'fragile']
]);

const SETTING_LABELS = new Map([
  ['alley', 'in city alleys'],
  ['bridge', 'around city bridges'],
  ['cemetery', 'in a cemetery setting'],
  ['crosswalk', 'at city crossings'],
  ['facade', 'against city facades'],
  ['park', 'in public parks'],
  ['public square', 'in public squares'],
  ['river', 'along the river'],
  ['shop window', 'in shopfront scenes'],
  ['snow', 'in winter streets'],
  ['station', 'around transit platforms'],
  ['street', 'in city streets'],
  ['tram', 'around tram lines'],
  ['wall', 'against urban walls'],
  ['window', 'around windows and facades']
]);

function uniqueStrings(items = []) {
  return [...new Set(
    items
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  )];
}

function normalizeTerm(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeStem(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '');
}

function capitalize(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toTitleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => capitalize(word))
    .join(' ');
}

function ensureSentence(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/[.!?]$/.test(text)) return text;
  return `${text}.`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function termCountMap() {
  return new Map();
}

function addCount(map, value, weight = 1) {
  const normalized = normalizeTerm(value);
  if (!normalized) return;
  map.set(normalized, (map.get(normalized) || 0) + weight);
}

function sortedEntries(map) {
  return [...map.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function isLiteralVisualPrimary(term) {
  const normalized = normalizeTerm(term);
  if (!normalized || normalized.includes(' versus ') || normalized.includes(' vs ')) return false;
  if (normalized.split(/\s+/).some((part) => VISUAL_PRIMARY_HINTS.includes(part))) return true;
  return VISUAL_PRIMARY_HINTS.some((hint) => normalized.includes(hint));
}

function getVisualPrimary(meta = {}) {
  return uniqueStrings((meta.primary || []).filter((term) => isLiteralVisualPrimary(term)));
}

function firstMeaningful(values = [], exclude = new Set()) {
  return values.find((value) => {
    const normalized = normalizeTerm(value);
    return normalized && !exclude.has(normalized);
  }) || '';
}

function humanizeMotif(term) {
  const normalized = normalizeTerm(term);
  return MOTIF_LABELS.get(normalized) || capitalize(term);
}

function isWeakMotifTerm(term) {
  const normalized = normalizeTerm(term);
  return !normalized || GENERIC_VISUAL_TERMS.has(normalized) || CONCEPT_LABELS.has(normalized);
}

function getTopMotifTerm(aggregates = {}) {
  return sortedEntries(aggregates.motifs || termCountMap())
    .map(([term]) => term)
    .find((term) => !isWeakMotifTerm(term)) || '';
}

function rewriteConcept(value) {
  const raw = String(value || '').trim();
  const normalized = normalizeTerm(raw);
  if (!normalized) return '';

  const versusMatch = normalized.match(/^(.+?)\s+versus\s+(.+)$/i) || normalized.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (versusMatch) {
    return `holding ${versusMatch[1]} and ${versusMatch[2]} in the same frame`;
  }

  if (CONCEPT_REWRITES.has(normalized)) {
    return CONCEPT_REWRITES.get(normalized);
  }

  if (normalized.includes('absurd')) return 'finding absurdity inside the everyday scene';
  if (normalized.includes('symbol')) return 'letting ordinary details carry symbolic weight';
  if (normalized.includes('surveillance')) return 'keeping watchfulness inside the image';
  if (normalized.includes('solitude') || normalized.includes('loneliness')) return 'holding solitude against the public scene';
  if (normalized.includes('nature')) return 'letting nature interrupt the built world';
  if (normalized.includes('movement')) return 'letting motion unsettle the scene';
  if (normalized.includes('reflection')) return 'letting doubled views disturb the surface';

  return '';
}

function countWords(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function hasAnyTerm(meta = {}, terms = []) {
  const haystack = uniqueStrings([
    ...(meta.primary || []),
    ...(meta.objects || []),
    ...(meta.environment || []),
    ...(meta.mood || []),
    ...(meta.themes || []),
    ...(meta.tension || [])
  ]).map((item) => normalizeTerm(item));

  return terms.some((term) => haystack.includes(normalizeTerm(term)));
}

function getConceptLabel(value) {
  const normalized = normalizeTerm(value);
  if (!normalized) return '';
  if (CONCEPT_LABELS.has(normalized)) return CONCEPT_LABELS.get(normalized);
  if (normalized.includes('loneliness') || normalized.includes('solitude')) return 'urban loneliness';
  if (normalized.includes('reflection')) return 'reflections';
  if (normalized.includes('surveillance')) return 'watchfulness';
  if (normalized.includes('nature')) return 'urban nature';
  if (normalized.includes('movement')) return 'restless motion';
  if (normalized.includes('absurd')) return 'urban absurdity';
  return normalized;
}

function getToneLabel(value) {
  const normalized = normalizeTerm(value);
  if (!normalized) return '';
  if (TONE_LABELS.has(normalized)) return TONE_LABELS.get(normalized);
  if (normalized.includes('loneliness') || normalized.includes('solitude')) return 'quiet';
  if (normalized.includes('surveillance')) return 'uneasy';
  if (normalized.includes('reflection')) return 'reflective';
  if (normalized.includes('humor') || normalized.includes('absurd')) return 'offbeat';
  return '';
}

function getSettingLabel(aggregates = {}) {
  const topSetting = sortedEntries(aggregates.environmentTerms || termCountMap())
    .map(([term]) => term)
    .find((term) => SETTING_LABELS.has(term));

  return topSetting ? SETTING_LABELS.get(topSetting) : '';
}

function buildIntentQualifier(meta = {}) {
  const urbanish = hasAnyTerm(meta, [
    'city', 'street', 'urban', 'building', 'window', 'public space', 'public square', 'tram'
  ]);

  if (hasAnyTerm(meta, ['loneliness', 'solitude', 'alienation'])) {
    return urbanish ? 'urban loneliness scene' : 'quiet solitude scene';
  }

  if (hasAnyTerm(meta, ['observation', 'surveillance'])) {
    return urbanish ? 'street observation scene' : 'watchful scene';
  }

  if (hasAnyTerm(meta, ['reflection', 'reflections'])) {
    return urbanish ? 'reflective city scene' : 'reflective scene';
  }

  if (hasAnyTerm(meta, ['authority', 'politics', 'public space', 'society'])) {
    return 'public tension scene';
  }

  if (hasAnyTerm(meta, ['surreal', 'urban absurdity', 'everyday symbolism'])) {
    return urbanish ? 'surreal street scene' : 'offbeat scene';
  }

  if (hasAnyTerm(meta, ['nature', 'urban nature', 'freedom'])) {
    return urbanish ? 'urban nature scene' : 'quiet nature scene';
  }

  if (hasAnyTerm(meta, ['movement', 'time'])) {
    return urbanish ? 'fleeting city scene' : 'moment-in-passing scene';
  }

  if (hasAnyTerm(meta, ['rain'])) {
    return 'rainy street scene';
  }

  return '';
}

function appendIntentQualifier(baseSentence, qualifier) {
  const base = String(baseSentence || '').trim().replace(/[.!?]+$/g, '');
  const suffix = String(qualifier || '').trim();
  if (!base || !suffix) return ensureSentence(baseSentence);

  const combined = `${base}, ${suffix}`;
  if (countWords(combined) > 18) {
    return ensureSentence(base);
  }

  return ensureSentence(combined);
}

function buildRelatedAnchorText(title = '', sharedMotif = '', sharedConcept = '') {
  const conceptLabel = getConceptLabel(sharedConcept);
  if (conceptLabel) {
    return `${toTitleCase(conceptLabel)} series – ${title}`;
  }

  if (sharedMotif) {
    return `${humanizeMotif(sharedMotif)} series – ${title}`;
  }

  return `Related gallery – ${title}`;
}

function buildGalleryTitleDescriptor(aggregates = {}) {
  const motif = getTopMotifTerm(aggregates);
  const concept = sortedEntries(aggregates.concepts || termCountMap())
    .map(([term]) => term)
    .find(Boolean) || '';

  if (motif && concept) {
    return `${humanizeMotif(motif)} and ${toTitleCase(getConceptLabel(concept))}`;
  }

  if (motif) {
    return `${humanizeMotif(motif)} Conceptual Street Photography`;
  }

  if (concept) {
    return `${toTitleCase(getConceptLabel(concept))} Conceptual Street Photography`;
  }

  return 'Conceptual Street Photography Series';
}

function buildGalleryMetaDescription(project, aggregates = {}) {
  const base = ensureSentence(project.description || '');
  const motif = getTopMotifTerm(aggregates);
  const concept = sortedEntries(aggregates.concepts || termCountMap())
    .map(([term]) => term)
    .find(Boolean) || '';
  const mood = sortedEntries(aggregates.moodTerms || termCountMap())
    .map(([term]) => getToneLabel(term))
    .find(Boolean) || getToneLabel(concept);
  const setting = getSettingLabel(aggregates);

  const details = [];
  if (motif) details.push(humanizeMotif(motif).toLowerCase());
  if (concept) details.push(getConceptLabel(concept));

  if (!details.length && !setting && !mood) {
    return base || 'MotoSynteza conceptual street photography gallery.';
  }

  let sentence = 'A conceptual street photography series';
  if (details.length === 1) sentence += ` shaped by ${details[0]}`;
  if (details.length >= 2) sentence += ` shaped by ${details[0]} and ${details[1]}`;
  if (setting) sentence += ` ${setting}`;
  if (mood) sentence += ` with a ${mood} tone`;

  return [base, ensureSentence(sentence)].filter(Boolean).join(' ');
}

function collectProjectAggregates(entries = []) {
  const motifs = termCountMap();
  const concepts = termCountMap();
  const environmentTerms = termCountMap();
  const moodTerms = termCountMap();
  const themeTerms = termCountMap();
  const symbolTerms = termCountMap();

  entries.forEach((entry) => {
    getVisualPrimary(entry).forEach((term) => addCount(motifs, term, 3));
    (entry.objects || []).forEach((term) => addCount(motifs, term, 4));
    (entry.environment || [])
      .filter((term) => !GENERIC_VISUAL_TERMS.has(normalizeTerm(term)))
      .forEach((term) => {
        addCount(motifs, term, 1);
        addCount(environmentTerms, term, 1);
      });

    (entry.tension || []).forEach((term) => addCount(concepts, term, 4));
    (entry.themes || []).forEach((term) => addCount(concepts, term, 2));
    (entry.mood || []).forEach((term) => {
      addCount(concepts, term, 1);
      addCount(moodTerms, term, 1);
    });

    (entry.themes || []).forEach((term) => addCount(themeTerms, term, 1));
    (entry.symbols || []).forEach((term) => addCount(symbolTerms, term, 1));
  });

  return { motifs, concepts, environmentTerms, moodTerms, themeTerms, symbolTerms };
}

function buildProjectLead(project, aggregates) {
  const motif = getTopMotifTerm(aggregates);
  const conceptTerm = sortedEntries(aggregates.concepts).map(([term]) => term).find(Boolean) || '';
  const concept = rewriteConcept(conceptTerm);
  const conceptLabel = getConceptLabel(conceptTerm);
  const slugSeed = String(project.slug || project.title || '').length % 3;
  const motifLabel = motif ? humanizeMotif(motif) : '';

  if (motif && concept) {
    if (slugSeed === 0) return ensureSentence(`${motifLabel} return throughout the gallery, ${concept}`);
    if (slugSeed === 1) return ensureSentence(`${motifLabel} thread through these images, ${concept}`);
    return ensureSentence(`${motifLabel} give the sequence its pulse, ${concept}`);
  }

  if (motif) {
    if (slugSeed === 0) return ensureSentence(`${motifLabel} return as a quiet visual thread through the gallery`);
    if (slugSeed === 1) return ensureSentence(`${motifLabel} keep the gallery grounded in a steady visual rhythm`);
    return ensureSentence(`${motifLabel} give the gallery a recurring visual anchor`);
  }

  if (conceptLabel) {
    if (slugSeed === 0) return ensureSentence(`The gallery moves gently through scenes of ${conceptLabel}`);
    if (slugSeed === 1) return ensureSentence(`The sequence stays close to moments of ${conceptLabel}`);
    return ensureSentence(`The gallery keeps its attention on small signs of ${conceptLabel}`);
  }

  if (project.description) {
    return ensureSentence('The gallery stays close to small details and the pressure they quietly hold');
  }

  return '';
}

function buildImageKeywords(meta = {}) {
  return uniqueStrings([
    ...getVisualPrimary(meta),
    ...(meta.objects || []),
    ...(meta.environment || []).filter((term) => !GENERIC_VISUAL_TERMS.has(normalizeTerm(term))),
    ...(meta.colors || []).slice(0, 1),
    ...(meta.lighting || []).slice(0, 1)
  ]).slice(0, 5);
}

function buildImageName(meta = {}, finalAlt = '', index = 0) {
  const primary = firstMeaningful(getVisualPrimary(meta));
  if (primary) return toTitleCase(primary);

  const objects = uniqueStrings(meta.objects || []);
  if (objects.length >= 2) return toTitleCase(`${objects[0]} and ${objects[1]}`);
  if (objects[0]) return toTitleCase(objects[0]);

  const words = String(finalAlt || '')
    .replace(/[.!?]+$/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 7)
    .join(' ');

  return words ? capitalize(words) : `Image ${index + 1}`;
}

function buildAltFallback(projectTitle, meta = {}, index = 0) {
  const primary = firstMeaningful(getVisualPrimary(meta));
  const objects = uniqueStrings(meta.objects || []).filter((term) => !GENERIC_VISUAL_TERMS.has(normalizeTerm(term)));
  const environment = uniqueStrings(meta.environment || []).filter((term) => !GENERIC_VISUAL_TERMS.has(normalizeTerm(term)));
  const colors = uniqueStrings(meta.colors || []);
  const lighting = uniqueStrings(meta.lighting || []);
  const qualifier = buildIntentQualifier(meta);

  const subject = primary || (objects.length >= 2 ? `${objects[0]} and ${objects[1]}` : objects[0]) || '';
  const env = environment[0] || '';
  const color = colors[0] || '';
  const light = lighting[0] || '';

  if (subject && env && light) {
    return appendIntentQualifier(`${capitalize(subject)} in ${env} under ${light}`, qualifier);
  }

  if (subject && env && color) {
    return appendIntentQualifier(`${capitalize(subject)} in ${color} tones against ${env}`, qualifier);
  }

  if (subject && env) {
    return appendIntentQualifier(`${capitalize(subject)} in ${env}`, qualifier);
  }

  if (subject && light) {
    return appendIntentQualifier(`${capitalize(subject)} in ${light}`, qualifier);
  }

  if (subject) {
    return appendIntentQualifier(`${capitalize(subject)} photographed in the gallery`, qualifier);
  }

  return `${projectTitle} image ${index + 1}`;
}

function buildGalleryKeywords(aggregates) {
  const motifKeywords = sortedEntries(aggregates.motifs)
    .map(([term]) => term)
    .filter((term) => !GENERIC_VISUAL_TERMS.has(term))
    .slice(0, 3);

  const conceptKeywords = sortedEntries(aggregates.concepts)
    .map(([term]) => term)
    .filter((term) => !/versus/i.test(term))
    .slice(0, 2);

  return uniqueStrings([...motifKeywords, ...conceptKeywords]).slice(0, 5);
}

function buildGalleryAbout(aggregates) {
  const visual = sortedEntries(aggregates.motifs)
    .map(([term]) => humanizeMotif(term).toLowerCase())
    .filter(Boolean)
    .slice(0, 2);

  const conceptual = sortedEntries(aggregates.concepts)
    .map(([term]) => {
      const normalized = normalizeTerm(term);
      if (!normalized) return '';
      if (normalized.includes(' versus ')) return normalized.replace(/\s+versus\s+/i, ' and ');
      return normalized;
    })
    .filter(Boolean)
    .slice(0, 2);

  return uniqueStrings([...visual, ...conceptual]).slice(0, 4);
}

function buildRelatedContext(sharedMotif = '', sharedConcept = '') {
  const conceptLabel = getConceptLabel(sharedConcept);

  if (sharedMotif && conceptLabel) {
    return ensureSentence(`Another gallery where ${sharedMotif} carry a similar ${conceptLabel} charge`);
  }

  if (sharedMotif) {
    return ensureSentence(`Another gallery shaped by ${sharedMotif}`);
  }

  if (conceptLabel) {
    return ensureSentence(`Another gallery drawn toward ${conceptLabel}`);
  }

  return ensureSentence('A nearby gallery with a related visual tension');
}

function buildSharedMotif(sourceAggregates, targetAggregates) {
  const sourceTerms = new Set(
    sortedEntries(sourceAggregates.motifs)
      .map(([term]) => term)
      .filter((term) => !isWeakMotifTerm(term))
  );

  const targetTerm = sortedEntries(targetAggregates.motifs)
    .map(([term]) => term)
    .find((term) => !isWeakMotifTerm(term) && sourceTerms.has(term));

  return targetTerm ? humanizeMotif(targetTerm).toLowerCase() : '';
}

function buildSharedConcept(sourceAggregates, targetAggregates) {
  const sourceTerms = new Set(sortedEntries(sourceAggregates.concepts).map(([term]) => term));
  const targetTerm = sortedEntries(targetAggregates.concepts)
    .map(([term]) => term)
    .find((term) => sourceTerms.has(term));

  const rewritten = rewriteConcept(targetTerm);
  if (!rewritten) return '';

  return rewritten
    .replace(/^holding\s+/i, '')
    .replace(/^finding\s+/i, '')
    .replace(/^letting\s+/i, '')
    .replace(/^keeping\s+/i, '')
    .trim();
}

function buildCanonicalGalleryUrl(slug) {
  return `project-${slug}.html`;
}

function buildProjectSeoMap(projects = [], dataset = []) {
  const entriesByProject = new Map();
  const entriesById = new Map();

  dataset.forEach((entry) => {
    entriesById.set(entry.id, entry);
    if (!entriesByProject.has(entry.projectSlug)) {
      entriesByProject.set(entry.projectSlug, []);
    }
    entriesByProject.get(entry.projectSlug).push(entry);
  });

  const aggregatesByProject = new Map();
  projects.forEach((project) => {
    aggregatesByProject.set(project.slug, collectProjectAggregates(entriesByProject.get(project.slug) || []));
  });

  const seoMap = new Map();
  const canonicalSlugs = new Set(projects.map((project) => project.slug));
  const projectLookup = new Map(projects.map((project) => [project.slug, project]));

  projects.forEach((project) => {
    const entries = entriesByProject.get(project.slug) || [];
    const aggregates = aggregatesByProject.get(project.slug) || collectProjectAggregates([]);
    const imageSeoByStem = new Map();

    entries.forEach((entry, index) => {
      const finalAlt = String(entry.alt || '').trim() || buildAltFallback(project.title, entry, index);
      imageSeoByStem.set(normalizeStem(entry.src), {
        finalAlt,
        name: buildImageName(entry, finalAlt, index),
        keywords: buildImageKeywords(entry),
        representativeOfPage: index === 0
      });
    });

    const relationWeights = new Map();
    entries.forEach((entry) => {
      (entry.related || []).forEach((relatedId) => {
        const relatedEntry = entriesById.get(relatedId);
        if (!relatedEntry) return;
        if (!canonicalSlugs.has(relatedEntry.projectSlug)) return;
        if (relatedEntry.projectSlug === project.slug) return;
        relationWeights.set(
          relatedEntry.projectSlug,
          (relationWeights.get(relatedEntry.projectSlug) || 0) + 1
        );
      });
    });

    const relatedLinks = sortedEntries(relationWeights)
      .map(([targetSlug, weight]) => {
        const targetProject = projectLookup.get(targetSlug);
        if (!targetProject) return null;

        const targetAggregates = aggregatesByProject.get(targetSlug) || collectProjectAggregates([]);
        const sharedMotif = buildSharedMotif(aggregates, targetAggregates);
        const sharedConcept = buildSharedConcept(aggregates, targetAggregates);

        return {
          slug: targetSlug,
          title: targetProject.title,
          href: buildCanonicalGalleryUrl(targetSlug),
          anchorText: buildRelatedAnchorText(targetProject.title, sharedMotif, sharedConcept),
          context: buildRelatedContext(sharedMotif, sharedConcept),
          weight
        };
      })
      .filter(Boolean)
      .slice(0, 3);

    seoMap.set(project.slug, {
      lead: buildProjectLead(project, aggregates),
      titleDescriptor: buildGalleryTitleDescriptor(aggregates),
      metaDescription: buildGalleryMetaDescription(project, aggregates),
      keywords: buildGalleryKeywords(aggregates),
      about: buildGalleryAbout(aggregates),
      relatedLinks,
      imageSeoByStem
    });
  });

  return seoMap;
}

function applyProjectSeoData(projects = [], seoMap = new Map()) {
  projects.forEach((project) => {
    const seo = seoMap.get(project.slug);
    if (!seo) return;

    project.seo = {
      lead: seo.lead,
      titleDescriptor: seo.titleDescriptor,
      metaDescription: seo.metaDescription,
      keywords: [...seo.keywords],
      about: [...seo.about],
      relatedLinks: seo.relatedLinks.map((link) => ({ ...link }))
    };

    project.images = (project.images || []).map((image, index) => {
      const imageSeo = seo.imageSeoByStem.get(normalizeStem(image.src)) || null;
      const finalAlt = String(image.alt || '').trim() || imageSeo?.finalAlt || `${project.title} image ${index + 1}`;

      return {
        ...image,
        alt: finalAlt,
        seo: imageSeo
          ? {
              name: imageSeo.name,
              keywords: [...imageSeo.keywords],
              representativeOfPage: Boolean(imageSeo.representativeOfPage),
              description: finalAlt
            }
          : {
              name: buildImageName({}, finalAlt, index),
              keywords: [],
              representativeOfPage: index === 0,
              description: finalAlt
            }
      };
    });
  });
}

function buildImageCode(project, total, index) {
  const prefix = String(project.codePrefix || '').trim().toUpperCase() ||
    project.slug.split('-').map((segment) => segment[0]?.toUpperCase()).join('');
  const padWidth = Math.max(3, String(total).length);
  const number = String(total - index).padStart(padWidth, '0');
  return `${prefix}-${number}`;
}

function renderCaptionHtml(image) {
  const humanCaption = String(image.caption || '').trim();
  const text = humanCaption;

  if (!text) {
    return '<figcaption class="project-caption"></figcaption>';
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const paragraphs = lines.length
    ? lines.map((line, index) => {
        const className = index > 0 ? 'project-caption-line project-caption-line--enter' : 'project-caption-line';
        return `<p class="${className}">${escapeHtml(line)}</p>`;
      }).join('')
    : escapeHtml(text);

  return `<figcaption class="project-caption">${paragraphs}</figcaption>`;
}

function renderRelatedLinksHtml(project) {
  const relatedLinks = project?.seo?.relatedLinks || [];
  if (!relatedLinks.length) {
    return '<nav class="project-related-links" aria-label="Related galleries"></nav>';
  }

  const items = relatedLinks
    .map((link) => `
      <a class="project-related-link" href="${escapeAttribute(link.href)}">
        <span class="project-related-title">${escapeHtml(link.anchorText || link.title)}</span>
        <span class="project-related-copy">${escapeHtml(link.context)}</span>
      </a>
    `.trim())
    .join('');

  return `
    <nav class="project-related-links" aria-label="Related galleries">
      <p class="project-related-label">Related Galleries</p>
      ${items}
    </nav>
  `.trim();
}

function renderProjectSeedMarkup(project) {
  const total = (project.images || []).length;

  const contextHtml = `
    <section class="project-context">
      <h1 class="project-context-title">${escapeHtml(project.title)}</h1>
      ${project.description ? `<p class="project-context-description">${escapeHtml(project.description)}</p>` : ''}
      ${project?.seo?.lead ? `<p class="project-context-lead">${escapeHtml(project.seo.lead)}</p>` : ''}
    </section>
  `.trim();

  const galleryItems = (project.images || []).map((image, index) => {
    const imageCode = buildImageCode(project, total, index);
    const alt = String(image.alt || '').trim() || `${project.title} image ${index + 1}`;
    const imageSrc = `projects/${project.slug}/${image.src}`;

    return `
      <figure class="project-figure">
        <div class="project-image-wrapper">
          <div class="image-code project-image-code" data-code="${escapeAttribute(imageCode)}">
            ${escapeHtml(imageCode)}
            <span class="add-to-cart-hint">ADD TO CART</span>
          </div>
          <img src="${escapeAttribute(imageSrc)}" alt="${escapeAttribute(alt)}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async"${index === 0 ? ' fetchpriority="high"' : ''}>
        </div>
        ${renderCaptionHtml(image)}
      </figure>
    `.trim();
  }).join('');

  const galleryHtml = `<div class="project-gallery" data-seeded-gallery="true">${galleryItems}</div>`;
  const relatedHtml = renderRelatedLinksHtml(project);

  return { contextHtml, galleryHtml, relatedHtml };
}

module.exports = {
  applyProjectSeoData,
  buildProjectSeoMap,
  renderProjectSeedMarkup
};

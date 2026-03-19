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

const NOTE_BLOCKLIST = [
  /\bstarts reading as\b/i,
  /\bbegins to read as\b/i,
  /\bthe ordinary presence of\b/i,
  /\bsmall emblem of\b/i,
  /\breading as\b/i
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

function cleanEditorialSentence(value) {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();

  if (!normalized) return '';
  if (NOTE_BLOCKLIST.some((pattern) => pattern.test(normalized))) return '';

  const clipped = normalized.length > 220 ? `${normalized.slice(0, 217).trimEnd()}...` : normalized;
  return ensureSentence(clipped);
}

function collectProjectAggregates(entries = []) {
  const motifs = termCountMap();
  const concepts = termCountMap();
  const themeTerms = termCountMap();
  const symbolTerms = termCountMap();

  entries.forEach((entry) => {
    getVisualPrimary(entry).forEach((term) => addCount(motifs, term, 3));
    (entry.objects || []).forEach((term) => addCount(motifs, term, 4));
    (entry.environment || [])
      .filter((term) => !GENERIC_VISUAL_TERMS.has(normalizeTerm(term)))
      .forEach((term) => addCount(motifs, term, 1));

    (entry.tension || []).forEach((term) => addCount(concepts, term, 4));
    (entry.themes || []).forEach((term) => addCount(concepts, term, 2));
    (entry.mood || []).forEach((term) => addCount(concepts, term, 1));

    (entry.themes || []).forEach((term) => addCount(themeTerms, term, 1));
    (entry.symbols || []).forEach((term) => addCount(symbolTerms, term, 1));
  });

  return { motifs, concepts, themeTerms, symbolTerms };
}

function buildProjectLead(project, aggregates) {
  const motif = sortedEntries(aggregates.motifs).find(([term]) => !GENERIC_VISUAL_TERMS.has(term))?.[0] || '';
  const concept = sortedEntries(aggregates.concepts)
    .map(([term]) => rewriteConcept(term))
    .find(Boolean) || '';

  if (motif && concept) {
    return ensureSentence(`${humanizeMotif(motif)} keep returning here, ${concept}`);
  }

  if (motif) {
    return ensureSentence(`${humanizeMotif(motif)} keep returning here, giving the gallery its visual rhythm`);
  }

  if (concept) {
    return ensureSentence(`The gallery moves through the image world ${concept.replace(/^holding\s+/i, 'while holding ')}`);
  }

  if (project.description) {
    return ensureSentence('The gallery stays close to small details and the tensions they quietly release');
  }

  return '';
}

function imageScore(meta = {}) {
  const score = meta.score && typeof meta.score === 'object' ? meta.score : {};
  const impact = Number(score.impact) || 0;
  const originality = Number(score.originality) || 0;
  const emotion = Number(score.emotion) || 0;
  return impact * 2 + originality + emotion;
}

function selectSemanticNoteSources(entries = []) {
  const scored = entries
    .map((entry, index) => {
      const base = imageScore(entry);
      const relationBonus = (entry.relations || []).length ? 2 : 0;
      const symbolBonus = (entry.symbols || []).length ? 1 : 0;
      const readingBonus = (entry.reading || []).length ? 1 : 0;
      return {
        src: entry.src,
        index,
        score: base + relationBonus + symbolBonus + readingBonus
      };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const selected = new Set();
  const cover = entries[0];
  if (cover) selected.add(cover.src);

  scored.forEach((item) => {
    if (selected.size >= 5) return;
    selected.add(item.src);
  });

  return selected;
}

function deriveSemanticNote(meta = {}) {
  const reading = cleanEditorialSentence((meta.reading || [])[0] || '');
  if (reading) return reading;

  const relation = cleanEditorialSentence((meta.relations || [])[0] || '');
  if (relation) return relation;

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

  const subject = primary || (objects.length >= 2 ? `${objects[0]} and ${objects[1]}` : objects[0]) || '';
  const env = environment[0] || '';
  const color = colors[0] || '';
  const light = lighting[0] || '';

  if (subject && env && light) {
    return ensureSentence(`${capitalize(subject)} in ${env} under ${light}`);
  }

  if (subject && env && color) {
    return ensureSentence(`${capitalize(subject)} in ${color} tones against ${env}`);
  }

  if (subject && env) {
    return ensureSentence(`${capitalize(subject)} in ${env}`);
  }

  if (subject && light) {
    return ensureSentence(`${capitalize(subject)} in ${light}`);
  }

  if (subject) {
    return ensureSentence(`${capitalize(subject)} photographed in the gallery`);
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
  if (sharedMotif && sharedConcept) {
    return ensureSentence(`Continues the thread of ${sharedMotif} and ${sharedConcept}`);
  }

  if (sharedMotif) {
    return ensureSentence(`Another gallery shaped by ${sharedMotif}`);
  }

  if (sharedConcept) {
    return ensureSentence(`Another gallery drawn toward ${sharedConcept}`);
  }

  return ensureSentence('A nearby gallery with a related visual tension');
}

function buildSharedMotif(sourceAggregates, targetAggregates) {
  const sourceTerms = new Set(
    sortedEntries(sourceAggregates.motifs)
      .map(([term]) => term)
      .filter((term) => !GENERIC_VISUAL_TERMS.has(term))
  );

  const targetTerm = sortedEntries(targetAggregates.motifs)
    .map(([term]) => term)
    .find((term) => sourceTerms.has(term));

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
    const selectedNoteSources = selectSemanticNoteSources(entries);
    const imageSeoByStem = new Map();

    entries.forEach((entry, index) => {
      const finalAlt = String(entry.alt || '').trim() || buildAltFallback(project.title, entry, index);
      const note = selectedNoteSources.has(entry.src) ? deriveSemanticNote(entry) : '';
      imageSeoByStem.set(normalizeStem(entry.src), {
        finalAlt,
        note,
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
          context: buildRelatedContext(sharedMotif, sharedConcept),
          weight
        };
      })
      .filter(Boolean)
      .slice(0, 3);

    seoMap.set(project.slug, {
      lead: buildProjectLead(project, aggregates),
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
              note: imageSeo.note,
              keywords: [...imageSeo.keywords],
              representativeOfPage: Boolean(imageSeo.representativeOfPage),
              description: imageSeo.note || finalAlt
            }
          : {
              name: buildImageName({}, finalAlt, index),
              note: '',
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
  const note = String(image?.seo?.note || '').trim();
  const text = humanCaption || note;

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
        <span class="project-related-title">${escapeHtml(link.title)}</span>
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

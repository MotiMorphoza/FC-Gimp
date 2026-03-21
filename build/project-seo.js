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
  ['cros', 'Crosses'],
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

const WEAK_KEYWORD_TERMS = new Set([
  'architecture',
  'city',
  'color',
  'image',
  'photo',
  'photography',
  'gallery',
  'series',
  'scene',
  'visual',
  'daylight',
  'daytime',
  'urban'
]);

const PROJECT_SEO_OVERRIDES = new Map([
  ['000 - unusuall_usual', {
    titleDescriptor: 'Everyday Street Observations',
    metaDescription: 'A conceptual street photography series finding humor, drama, and poetry in ordinary urban moments. Small gestures and passing encounters turn daily life slightly strange.',
    lead: 'Everyday gestures and passing encounters keep the gallery light on its feet.',
    about: ['everyday street life', 'urban observation', 'humor in public space'],
    keywords: ['street photography', 'everyday moments', 'urban humor', 'public life']
  }],
  ['001 - window_to_redemption', {
    titleDescriptor: 'Urban Window Studies',
    metaDescription: 'Photographs made from a single window overlooking Savior Square in Warsaw. Weather, passersby, and reflections turn one fixed view into a study of urban change.',
    lead: 'A fixed Warsaw window becomes a stage for weather, reflection, and passing lives.',
    about: ['Warsaw city square', 'window observation', 'urban change'],
    keywords: ['window photography', 'Warsaw street life', 'urban observation', 'reflections']
  }],
  ['002 - ohhhhh_your_god', {
    titleDescriptor: 'Religious Street Observations',
    metaDescription: 'A street photography series observing ritual, costume, and devotion in public space. Faith appears here as spectacle, symbol, and uneasy performance.',
    lead: 'Ritual, costume, and devotion turn the street into a public performance.',
    about: ['religious ritual in public space', 'street observation', 'symbolic performance'],
    keywords: ['religious procession', 'street photography', 'public ritual', 'symbols']
  }],
  ['003 - demon_stration', {
    titleDescriptor: 'Political Street Theatre',
    metaDescription: 'A conceptual street photography series about protest, authority, and civic symbolism in public space. Resistance and power stay pressed together inside the frame.',
    lead: 'Protest imagery and official symbols collide across the public frame.',
    about: ['public protest', 'authority and resistance', 'civic theatre'],
    keywords: ['protest photography', 'public space', 'authority', 'resistance']
  }],
  ['004 - windows_eyes_of_the_modern_soul', {
    titleDescriptor: 'Window Reflection Studies',
    metaDescription: 'A conceptual street photography series built around windows, frames, and reflective surfaces. City facades become places of distance, watching, and doubled vision.',
    lead: 'Windows recur as surfaces of watching, distance, and reflection.',
    about: ['windows and facades', 'urban observation', 'reflections'],
    keywords: ['windows', 'urban architecture', 'reflection study', 'street photography']
  }],
  ['005 - doggy style', {
    titleDescriptor: 'Urban Dog Portraits',
    metaDescription: 'A playful street photography series following dogs through movement, character, and city rhythm. Humor and affection keep the urban setting light on its feet.',
    lead: 'Dogs move through the city with humor, speed, and stubborn personality.',
    about: ['dogs in the city', 'urban movement', 'playful observation'],
    keywords: ['dogs', 'street photography', 'urban animals', 'motion']
  }],
  ['006 - smashed', {
    titleDescriptor: 'Motion Experiment Series',
    metaDescription: 'An experimental photography series using long exposure and subject tracking to stretch movement through the frame. Street scenes dissolve into speed, blur, and unstable time.',
    lead: 'Blur and long exposure pull ordinary movement out of stable time.',
    about: ['long exposure', 'subject tracking', 'motion experiments'],
    keywords: ['long exposure', 'motion blur', 'subject tracking', 'experimental photography']
  }],
  ['007 - umbrellas', {
    titleDescriptor: 'Rain Street Scenes',
    metaDescription: 'A street photography series built around umbrellas as small moving shelters in the city. Weather, motion, and color turn public space into a shifting choreography.',
    lead: 'Umbrellas drift through the frame like brief shelters in motion.',
    about: ['umbrellas in motion', 'rainy streets', 'public space'],
    keywords: ['umbrellas', 'rain', 'street photography', 'movement']
  }],
  ['008 - arty', {
    titleDescriptor: 'Conceptual Still Life Series',
    metaDescription: 'A conceptual still life series finding strange beauty in ordinary objects. Familiar materials are reframed through wit, juxtaposition, and visual surprise.',
    lead: 'Ordinary objects tip quietly toward wit, imbalance, and surprise.',
    about: ['conceptual still life', 'ordinary objects', 'visual wit'],
    keywords: ['still life', 'ordinary objects', 'conceptual photography', 'visual wit']
  }],
  ['009 - KING NO SMO', {
    titleDescriptor: 'Smoking Street Portraits',
    metaDescription: 'A street photography series observing the small rituals around smoking in public space. Breath, pause, and gesture shape the mood of each encounter.',
    lead: 'The pause between inhale and exhale shapes the rhythm of the gallery.',
    about: ['smoking rituals', 'public pauses', 'street portraiture'],
    keywords: ['smoking', 'street portraits', 'urban ritual', 'gesture']
  }],
  ['010 - reflection', {
    titleDescriptor: 'Reflection Study Series',
    metaDescription: 'A conceptual street photography series built around reflections, doubled surfaces, and unstable viewpoints. City scenes fold back on themselves with a quiet, watchful tone.',
    lead: 'Reflected surfaces keep the city slightly unstable and doubled.',
    about: ['reflections and surfaces', 'doubled views', 'urban observation'],
    keywords: ['reflections', 'street photography', 'glass', 'doubled image']
  }],
  ['011 - golden age', {
    titleDescriptor: 'Aging in Public Space',
    metaDescription: 'A street photography series observing older bodies, public presence, and the passing of time. The images stay tender, direct, and attentive to everyday dignity.',
    lead: 'Older bodies and public gestures turn passing time into the subject.',
    about: ['older bodies in public space', 'passing time', 'everyday dignity'],
    keywords: ['aging', 'street photography', 'public life', 'time']
  }],
  ['012 - smart times', {
    titleDescriptor: 'Watchful City Scenes',
    metaDescription: 'A conceptual street photography series about phones, attention, and quiet surveillance in city life. Screens, gestures, and public behavior reveal a watchful modern routine.',
    lead: 'Phones and watchful habits thread through the city scene.',
    about: ['phones in public space', 'watchfulness', 'modern behavior'],
    keywords: ['smartphone', 'urban observation', 'surveillance', 'modern life']
  }],
  ['013 - natural taste', {
    titleDescriptor: 'Minimal Still Life Series',
    metaDescription: 'A minimal still life series shaped by organic forms, fragile materials, and small visual shocks. Nature and domestic objects meet in crisp, unexpected arrangements.',
    lead: 'Organic forms and domestic fragments hold beauty just before they turn strange.',
    about: ['organic still life', 'unexpected beauty', 'domestic fragments'],
    keywords: ['still life', 'organic forms', 'conceptual photography', 'nature']
  }],
  ['014 - stat you', {
    titleDescriptor: 'Statue Encounter Series',
    metaDescription: 'A street photography series observing statues, idols, and the uneasy boundary between image and worship. Public sculpture becomes a stage for irony, distance, and belief.',
    lead: 'Statues and acts of looking keep image, belief, and irony close together.',
    about: ['statues and idols', 'image and belief', 'public irony'],
    keywords: ['statues', 'public art', 'idolatry', 'street photography']
  }],
  ['015 - brain blow', {
    titleDescriptor: 'Public Symbol Study',
    metaDescription: 'A conceptual street photography series centered on the rainbow installation in Warsaw and the public meanings gathered around it. Color, memory, and civic symbolism stay close to the frame.',
    lead: 'A public symbol gathers color, memory, and civic tension around it.',
    about: ['rainbow installation', 'public symbol', 'civic memory'],
    keywords: ['rainbow installation', 'Warsaw', 'public symbol', 'conceptual street photography']
  }],
  ['016 - star dust', {
    titleDescriptor: 'Cosmic Street Fragments',
    metaDescription: 'A conceptual photography series linking small earthly details to cosmic suggestion. Fleeting objects and city fragments take on a wider, slightly metaphysical scale.',
    lead: 'Small earthly fragments open briefly onto a wider cosmic feeling.',
    about: ['cosmic suggestion', 'street fragments', 'small scale wonder'],
    keywords: ['conceptual photography', 'cosmic imagery', 'urban fragments', 'poetic observation']
  }],
  ['017 - wings1', {
    titleDescriptor: 'Flight in Urban Space',
    metaDescription: 'A street photography series built around birds, wings, and the human desire to rise above the ground. City air, movement, and freedom guide the sequence.',
    lead: 'Birds and winged forms keep pulling the gallery upward toward escape.',
    about: ['birds and flight', 'urban freedom', 'motion'],
    keywords: ['birds', 'flight', 'street photography', 'freedom']
  }],
  ['018 - one color', {
    titleDescriptor: 'Monochrome Tone Studies',
    metaDescription: 'A conceptual photography series built around monochrome reduction, tonal restraint, and the pressure of a single visual register. Form, shadow, and atmosphere carry the image when color falls away.',
    lead: 'By stripping the frame toward one tonal family, the gallery makes form, contrast, and atmosphere do the emotional work.',
    about: ['monochrome reduction', 'tonal restraint', 'minimal visual tension'],
    keywords: ['monochrome photography', 'black and white gallery', 'minimal conceptual photography', 'tonal study']
  }],
  ['019 - quite handy', {
    titleDescriptor: 'Public Gesture Studies',
    metaDescription: 'A conceptual street photography series built around hands, gestures, exchanges, and reaching bodies in public space. Small acts of touch, warning, care, and play become the real subject of the frame.',
    lead: 'Hands, exchanges, and bodily gestures keep turning ordinary public scenes into charged moments of touch, care, and distance.',
    about: ['hands and gesture', 'public exchange', 'touch and distance'],
    keywords: ['hands photography', 'gesture study', 'street gestures', 'public touch']
  }],
  ['020 - abstractisimo', {
    titleDescriptor: 'Abstract Surface Studies',
    metaDescription: 'A conceptual photography series built around abstraction discovered in ordinary structures, surfaces, and materials. Bridges, puddles, benches, walls, barrels, and fruit are pushed toward rhythm, repetition, and near-nonrepresentational form.',
    lead: 'Ordinary structures and surfaces dissolve into rhythm, reflection, repetition, and material abstraction.',
    about: ['urban abstraction', 'surface pattern', 'material studies'],
    keywords: ['abstract photography', 'surface studies', 'urban abstraction', 'pattern photography']
  }],
  ['021 - Shadows', {
    titleDescriptor: 'Shadow Street Studies',
    metaDescription: 'A conceptual street photography series built around shadows cast by cyclists, pedestrians, and passing bodies. Pavement, water, and walls become stages where silhouettes overtake the people who made them.',
    lead: 'The gallery lets shadows do the acting, turning ordinary streets into graphic studies of movement, trace, and silhouette.',
    about: ['shadows in public space', 'urban silhouettes', 'light and shadow'],
    keywords: ['shadow photography', 'street silhouettes', 'light and shadow', 'urban shadows']
  }],
  ['022 - dont stay', {
    titleDescriptor: 'Passing Figure Studies',
    metaDescription: 'A street photography series built around pedestrians, departures, crossings, and fleeting figures in public space. Parks, bridges, sidewalks, and night streets become stages for movement, distance, and brief contact.',
    lead: 'Walkers, drifters, commuters, and solitary silhouettes keep moving through the frame until transit itself becomes the subject.',
    about: ['pedestrians in motion', 'urban departures', 'passing figures'],
    keywords: ['street photography movement', 'pedestrians walking', 'urban departures', 'passing figures']
  }],
  ['023 - palace', {
    titleDescriptor: 'Warsaw Landmark Studies',
    metaDescription: 'A conceptual urban photography series built around Warsaw\'s Palace of Culture and Science seen through demolition, reflection, signage, weather, and skyline. The tower keeps returning as a monument of time, memory, and changing city form.',
    lead: 'The gallery circles one landmark through weather, framing devices, ruins, billboards, and skyline distance until the tower becomes a measure of the whole city.',
    about: ['Warsaw landmark', 'urban monument', 'changing skyline'],
    keywords: ['Palace of Culture and Science', 'Warsaw architecture photography', 'Warsaw skyline', 'urban landmark photography']
  }],
  ['024 - dust bw', {
    titleDescriptor: 'Monochrome Street Fragments',
    metaDescription: 'A black-and-white street photography series built from rough portraits, drifting figures, public encounters, labor, leisure, and social unease. The gallery moves between intimacy, observation, and the unstable edge of everyday urban life.',
    lead: 'Monochrome portraits, passing scenes, and street fragments gather into a gallery of social texture, restlessness, and off-balance contact.',
    about: ['black and white street photography', 'urban fragments', 'social portraiture'],
    keywords: ['black and white street photography', 'monochrome street portraits', 'urban fragments', 'observational photography']
  }],
  ['025 - raport', {
    titleDescriptor: 'Police Encounter Study',
    metaDescription: 'A compact documentary street series centered on a police encounter with a family resting on city steps. Gestures, paperwork, children, and waiting bodies turn a brief intervention into a study of authority, care, and public exposure.',
    lead: 'The gallery stays close to one public encounter and lets small gestures between police officers, parents, and children carry the whole tension.',
    about: ['public encounter', 'documentary street photography', 'authority and care'],
    keywords: ['documentary street photography', 'police encounter', 'public intervention', 'urban documentary photography']
  }],
  ['020 - quite fency', {
    titleDescriptor: 'Fence And Surface Studies',
    metaDescription: 'A conceptual photography series built around fences, railings, reflective water, weathered wood, bridge structures, and repeated urban surfaces. The gallery moves between abstraction and observation until barriers and textures become the main subject.',
    lead: 'Bridge ribs, iron curls, puddle reflections, fence silhouettes, and worn materials turn everyday structures into studies of rhythm, exclusion, and urban abstraction.',
    about: ['fences and surfaces', 'urban abstraction', 'material rhythm'],
    keywords: ['fence photography', 'urban abstraction', 'surface studies', 'architectural detail photography']
  }]
]);

const IMAGE_SEO_TEXT_OVERRIDES = new Map([
  ['000 - unusuall_usual/02', { name: 'Excavator Claw' }],
  ['002 - ohhhhh_your_god/15', { name: 'Cross' }],
  ['003 - demon_stration/31', { name: 'Police Crossing' }],
  ['003 - demon_stration/32', { name: 'Police Crossing' }],
  ['003 - demon_stration/37', { name: 'Crossing and Dog' }],
  ['004 - windows_eyes_of_the_modern_soul/24', { name: 'Mural Facade' }],
  ['006 - smashed/05', { name: 'Bicycle and Sunglasses' }],
  ['012 - smart times/02', { name: 'Woman Taking a Selfie' }],
  ['012 - smart times/13', { name: 'Cross-legged Scene' }],
  ['013 - natural taste/18', { name: 'Wall and Vine' }],
  ['014 - stat you/02', { name: 'Stone Figure and Crane' }],
  ['014 - stat you/15', { name: 'Flowers and Sunglasses' }],
  ['014 - stat you/20', { name: 'Skull and Glasses' }],
  ['015 - brain blow/02', { name: 'Rainbow Over City Buildings' }],
  ['015 - brain blow/04', { name: 'Rainbow Prism' }],
  ['016 - star dust/11', { name: 'Woman in Glasses' }]
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

function cleanText(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function cleanSentence(value) {
  return ensureSentence(cleanText(value));
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

function getProjectSeoOverride(project) {
  return PROJECT_SEO_OVERRIDES.get(String(project?.slug || '').trim()) || null;
}

function filterKeywordTerms(items = []) {
  return uniqueStrings(items).filter((term) => {
    const normalized = normalizeTerm(term);
    return normalized && !WEAK_KEYWORD_TERMS.has(normalized) && normalized.length > 2;
  });
}

function keywordTitleCase(value) {
  const normalized = cleanText(value).replace(/\s+/g, ' ');
  if (!normalized) return '';
  return normalized
    .split(' ')
    .map((word) => {
      const lower = normalizeTerm(word);
      if (!lower) return '';
      if (['and', 'in', 'of', 'the', 'to'].includes(lower)) return lower;
      return capitalize(lower);
    })
    .filter(Boolean)
    .join(' ');
}

function getImageSeoTextOverride(projectSlug = '', src = '') {
  return IMAGE_SEO_TEXT_OVERRIDES.get(`${projectSlug}/${normalizeStem(src)}`) || null;
}

function buildImageNameFromAlt(finalAlt = '', index = 0) {
  const baseAlt = cleanText(finalAlt)
    .replace(/[.!?]+$/g, '')
    .split(/\s*,\s*/)[0]
    .replace(/^(a|an|the)\s+/i, '')
    .trim();

  if (baseAlt) {
    const words = [];
    for (const word of baseAlt.split(/\s+/)) {
      const normalized = normalizeTerm(word);
      if (!normalized) continue;
      if (words.length >= 6) break;
      if (words.length >= 3 && ['in', 'on', 'at', 'by', 'with', 'through', 'under', 'against', 'near'].includes(normalized)) break;
      words.push(word);
    }

    const candidate = keywordTitleCase(words.join(' '));
    if (candidate) return candidate;
  }

  return `Image ${index + 1}`;
}

function sanitizeImageName(name = '', { projectSlug = '', src = '', finalAlt = '', index = 0 } = {}) {
  const override = getImageSeoTextOverride(projectSlug, src);
  if (override?.name) {
    return override.name;
  }

  let cleaned = cleanText(name)
    .replace(/\bglasse\b/gi, 'glasses')
    .replace(/\bcros\b/gi, 'cross')
    .trim();

  if (/(\band|\bfrom|\btaking|\btoward a)$/i.test(cleaned)) {
    cleaned = buildImageNameFromAlt(finalAlt, index);
  }

  return keywordTitleCase(cleaned) || `Image ${index + 1}`;
}

function sanitizeImageKeyword(term = '', finalAlt = '') {
  const cleaned = cleanText(term);
  const normalized = normalizeTerm(cleaned);
  const alt = normalizeTerm(finalAlt);

  if (!normalized) return '';
  if (normalized === 'glasse') return 'glasses';

  if (normalized === 'cros') {
    if (/\bcross-legged\b/.test(alt)) return 'cross-legged';
    if (/\bcrossing\b|\bcrosswalk\b|\bzebra crossing\b/.test(alt)) return 'crossing';
    if (/\bcross\b|\bcrucifix\b/.test(alt)) return 'cross';
    return '';
  }

  return cleaned;
}

function sanitizeImageKeywords(keywords = [], finalAlt = '') {
  const seen = new Set();
  const sanitized = [];

  keywords.forEach((term) => {
    const candidate = sanitizeImageKeyword(term, finalAlt);
    const normalized = normalizeTerm(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    sanitized.push(candidate);
  });

  return filterKeywordTerms(sanitized).slice(0, 5);
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

function buildGalleryTitleDescriptor(project, aggregates = {}) {
  const override = getProjectSeoOverride(project);
  if (override?.titleDescriptor) {
    return override.titleDescriptor;
  }

  const motif = getTopMotifTerm(aggregates);
  const concept = sortedEntries(aggregates.concepts || termCountMap())
    .map(([term]) => term)
    .find(Boolean) || '';
  const setting = getSettingLabel(aggregates).replace(/^in\s+/i, '').replace(/^around\s+/i, '');
  const descriptorCandidates = [
    motif ? `${humanizeMotif(motif)} studies` : '',
    concept ? `${toTitleCase(getConceptLabel(concept))} series` : '',
    setting ? `${capitalize(setting)} series` : '',
    'Conceptual Street Photography Series'
  ].map(cleanText).filter(Boolean);

  return descriptorCandidates.find((candidate) => {
    const words = countWords(candidate);
    return words >= 2 && words <= 5;
  }) || 'Conceptual Street Photography Series';
}

function buildGalleryMetaDescription(project, aggregates = {}) {
  const override = getProjectSeoOverride(project);
  if (override?.metaDescription) {
    return cleanSentence(override.metaDescription);
  }

  const base = cleanSentence(project.description || '');
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
  if (mood) sentence += ` with a ${mood} atmosphere`;

  return [base, cleanSentence(sentence)].filter(Boolean).join(' ');
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
  const override = getProjectSeoOverride(project);
  if (override?.lead) {
    return cleanSentence(override.lead);
  }

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

function buildImageKeywords(meta = {}, finalAlt = '') {
  const concept = firstMeaningful(meta.themes || []);
  return sanitizeImageKeywords([
    ...getVisualPrimary(meta),
    ...(meta.objects || []),
    ...(meta.environment || []).filter((term) => !GENERIC_VISUAL_TERMS.has(normalizeTerm(term))),
    ...(meta.colors || []).slice(0, 1),
    concept ? getConceptLabel(concept) : ''
  ], finalAlt);
}

function buildImageName(meta = {}, finalAlt = '', index = 0, projectSlug = '', src = '') {
  const primary = firstMeaningful(getVisualPrimary(meta));
  if (primary) return sanitizeImageName(keywordTitleCase(primary), { projectSlug, src, finalAlt, index });

  const objects = filterKeywordTerms(meta.objects || []);
  if (objects.length >= 2) return sanitizeImageName(`${objects[0]} and ${objects[1]}`, { projectSlug, src, finalAlt, index });
  if (objects[0]) return sanitizeImageName(objects[0], { projectSlug, src, finalAlt, index });

  return sanitizeImageName(buildImageNameFromAlt(finalAlt, index), { projectSlug, src, finalAlt, index });
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

function buildGalleryKeywords(project, aggregates) {
  const override = getProjectSeoOverride(project);
  if (override?.keywords?.length) {
    return filterKeywordTerms(override.keywords).slice(0, 5);
  }

  const motifKeywords = sortedEntries(aggregates.motifs)
    .map(([term]) => term)
    .filter((term) => !GENERIC_VISUAL_TERMS.has(term))
    .slice(0, 3);

  const conceptKeywords = sortedEntries(aggregates.concepts)
    .map(([term]) => term)
    .filter((term) => !/versus/i.test(term))
    .slice(0, 2);

  return filterKeywordTerms([...motifKeywords, ...conceptKeywords]).slice(0, 5);
}

function buildGalleryAbout(project, aggregates) {
  const override = getProjectSeoOverride(project);
  if (override?.about?.length) {
    return filterKeywordTerms(override.about).slice(0, 4);
  }

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

  return filterKeywordTerms([...visual, ...conceptual]).slice(0, 4);
}

function buildCanonicalGalleryUrl(slug) {
  return `project-${slug}.html`;
}

function buildProjectSeoMap(projects = [], dataset = []) {
  const entriesByProject = new Map();

  dataset.forEach((entry) => {
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

  projects.forEach((project) => {
    const entries = entriesByProject.get(project.slug) || [];
    const aggregates = aggregatesByProject.get(project.slug) || collectProjectAggregates([]);
    const imageSeoByStem = new Map();

    entries.forEach((entry, index) => {
        const finalAlt = String(entry.alt || '').trim() || buildAltFallback(project.title, entry, index);
        imageSeoByStem.set(normalizeStem(entry.src), {
          finalAlt,
          name: buildImageName(entry, finalAlt, index, project.slug, entry.src),
          keywords: buildImageKeywords(entry, finalAlt),
          representativeOfPage: index === 0
        });
      });

    seoMap.set(project.slug, {
      lead: buildProjectLead(project, aggregates),
      titleDescriptor: buildGalleryTitleDescriptor(project, aggregates),
      metaDescription: buildGalleryMetaDescription(project, aggregates),
      keywords: buildGalleryKeywords(project, aggregates),
      about: buildGalleryAbout(project, aggregates),
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
      titleDescriptor: seo.titleDescriptor,
      metaDescription: seo.metaDescription,
      keywords: [...seo.keywords],
      about: [...seo.about]
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

function renderProjectSeedMarkup(project) {
  const total = (project.images || []).length;

  const contextHtml = `
    <section class="project-context">
      <h1 class="project-context-title">${escapeHtml(project.title)}</h1>
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

  return { contextHtml, galleryHtml };
}

function renderProjectsIndexSeedMarkup(projects) {
  const items = Array.isArray(projects) ? projects : [];
  const totalProjects = items.length;

  return items.map((project, index) => {
    const slug = String(project.slug || '').trim();
    const title = String(project.title || '').trim();

    if (!slug || !title) return '';

    const sectionClass =
      `project-item ${index % 2 === 0 ? 'bg-1' : 'bg-2'}${index % 2 === 1 ? ' reverse' : ''}`;
    const href = buildCanonicalGalleryUrl(slug);
    const counter = `${String(index + 1).padStart(2, '0')} / ${String(totalProjects).padStart(2, '0')}`;
    const coverAlt = String(project.images?.[0]?.alt || project.images?.[0]?.caption || project.title || '').trim();
    const imageSrc = project.images?.[0]?.src
      ? `projects/${slug}/${project.images[0].src}`
      : '';
    const imageHtml = imageSrc
      ? `<img class="project-media" src="${escapeAttribute(imageSrc)}" alt="${escapeAttribute(coverAlt || title)}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async"${index === 0 ? ' fetchpriority="high"' : ''}>`
      : '<div class="project-media placeholder" aria-hidden="true"></div>';
    const description = String(project.description || '').trim();

    const textHtml = `
      <a href="${escapeAttribute(href)}" class="project-text">
        <h2>${escapeHtml(title)}</h2>
        <p>
          ${description ? `${escapeHtml(description)} ` : ''}<span class="enter">ENTER &rarr;</span>
        </p>
      </a>
    `.trim();

    const mediaHtml = `
      <a href="${escapeAttribute(href)}" class="project-link">
        ${imageHtml}
      </a>
    `.trim();

    const gridHtml = index % 2 === 0
      ? `${mediaHtml}\n${textHtml}`
      : `${textHtml}\n${mediaHtml}`;

    const separatorHtml = index < totalProjects - 1
      ? '\n<div class="separator"></div>'
      : '';

    return `
      <section class="${sectionClass}">
        <div class="project-counter">${escapeHtml(counter)}</div>
        <div class="project-grid">
          ${gridHtml}
        </div>
      </section>${separatorHtml}
    `.trim();
  }).filter(Boolean).join('\n');
}

module.exports = {
  applyProjectSeoData,
  buildProjectSeoMap,
  renderProjectSeedMarkup,
  renderProjectsIndexSeedMarkup
};

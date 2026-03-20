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

const STRING_FIELDS = ['density', 'pov', 'manipulation', 'subject_scale'];
const OBJECT_FIELDS = ['intensity', 'score', 'object_roles'];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'above', 'across', 'against', 'along', 'around',
  'before', 'behind', 'beneath', 'beside', 'between', 'by', 'for', 'from', 'in',
  'inside', 'into', 'near', 'of', 'on', 'over', 'past', 'through', 'to', 'toward',
  'under', 'up', 'with', 'without', 'the', 'this', 'that', 'these', 'those',
  'while', 'seen', 'view', 'older', 'young', 'adult', 'adults', 'one', 'two',
  'three', 'four', 'five', 'few', 'many', 'black', 'white', 'red', 'blue',
  'yellow', 'green', 'pink', 'orange', 'purple', 'close'
]);

const HUMAN_HINTS = [
  'people', 'person', 'man', 'woman', 'women', 'child', 'children', 'girl', 'boy',
  'adult', 'adults', 'crowd', 'pedestrian', 'pedestrians', 'protester', 'protesters',
  'priest', 'priests', 'nun', 'nuns', 'cyclist', 'cyclists', 'rider', 'riders',
  'worker', 'workers', 'vendor', 'vendors', 'seller', 'sellers', 'figure', 'figures'
  , 'paddleboarder', 'smoker', 'smokers'
];

const GRAYSCALE_HINTS = ['black and white', 'black-and-white', 'monochrome', 'grayscale', 'greyscale'];
const COLOR_HINTS = [
  'black', 'white', 'gray', 'grey', 'blue', 'red', 'yellow', 'green', 'pink',
  'orange', 'purple', 'violet', 'gold', 'silver', 'brown', 'beige', 'turquoise'
];
const OBJECT_FAMILIES = [
  { canonical: 'window', match: ['window', 'windows', 'pane', 'panes', 'windowpane', 'windowpanes', 'shop window', 'storefront window'] },
  { canonical: 'wall', match: ['wall', 'walls', 'facade', 'facades'] },
  { canonical: 'cross', match: ['cross', 'crosses', 'crucifix'] },
  { canonical: 'bird', match: ['bird', 'birds', 'pigeon', 'pigeons', 'duck', 'ducks', 'gull', 'gulls', 'seagull', 'seagulls', 'stork', 'storks', 'heron', 'herons', 'crow', 'crows', 'sparrow', 'sparrows'] },
  { canonical: 'dog', match: ['dog', 'dogs', 'puppy', 'puppies', 'canine'] },
  { canonical: 'umbrella', match: ['umbrella', 'umbrellas', 'parasol', 'parasols'] },
  { canonical: 'phone', match: ['phone', 'phones', 'smartphone', 'smartphones', 'cellphone', 'cellphones', 'mobile phone', 'mobile phones'] },
  { canonical: 'hand', match: ['hand', 'hands', 'palm', 'palms', 'glove', 'gloves'] },
  { canonical: 'bench', match: ['bench', 'benches'] },
  { canonical: 'tree', match: ['tree', 'trees', 'branch', 'branches', 'trunk', 'trunks'] },
  { canonical: 'sign', match: ['sign', 'signs', 'traffic sign', 'traffic signs', 'billboard', 'billboards'] },
  { canonical: 'tram', match: ['tram', 'trams'] },
  { canonical: 'bike', match: ['bike', 'bikes', 'bicycle', 'bicycles', 'cyclist', 'cyclists', 'rider', 'riders'] },
  { canonical: 'stroller', match: ['stroller', 'strollers', 'pram', 'prams'] },
  { canonical: 'flower', match: ['flower', 'flowers', 'rose', 'roses', 'bouquet', 'bouquets'] },
  { canonical: 'flag', match: ['flag', 'flags', 'banner', 'banners'] },
  { canonical: 'skull', match: ['skull', 'skulls'] },
  { canonical: 'glasses', match: ['glasses', 'sunglasses', 'spectacles'] },
  { canonical: 'statue', match: ['statue', 'statues', 'sculpture', 'sculptures', 'monument', 'monuments'] },
  { canonical: 'mask', match: ['mask', 'masks'] },
  { canonical: 'mirror', match: ['mirror', 'mirrors', 'reflection', 'reflections'] },
  { canonical: 'boat', match: ['boat', 'boats'] },
  { canonical: 'cage', match: ['cage', 'cages', 'birdcage', 'birdcages'] },
  { canonical: 'chair', match: ['chair', 'chairs'] },
  { canonical: 'stairs', match: ['stairs', 'stair', 'staircase'] },
  { canonical: 'shadow', match: ['shadow', 'shadows', 'silhouette', 'silhouettes'] },
  { canonical: 'wheel', match: ['wheel', 'wheels'] },
  { canonical: 'snow', match: ['snow', 'snowy'] },
  { canonical: 'water', match: ['water', 'waters', 'puddle', 'puddles', 'river', 'rivers', 'pond', 'ponds'] },
  { canonical: 'car', match: ['car', 'cars', 'vehicle', 'vehicles', 'taxi', 'taxis', 'van', 'vans'] },
  { canonical: 'cigarette', match: ['cigarette', 'cigarettes', 'smoker', 'smokers', 'smoking', 'smoke'] },
  { canonical: 'cat', match: ['cat', 'cats', 'kitten', 'kittens'] }
];
const VALUE_CORRECTIONS = new Map([
  ['cros', 'cross'],
  ['glasse', 'glasses']
]);

const WOMAN_HINTS = ['woman', 'women', 'female', 'nun', 'nuns', 'girl', 'girls', 'mother', 'mothers'];
const MAN_HINTS = ['man', 'men', 'male', 'priest', 'priests', 'monk', 'monks', 'boy', 'boys', 'king'];
const CHILD_HINTS = ['child', 'children', 'kid', 'kids', 'boy', 'boys', 'girl', 'girls', 'baby', 'babies'];
const CROWD_HINTS = ['crowd', 'protesters', 'choir', 'marchers', 'group'];
const PLURAL_PEOPLE_HINTS = ['people', 'pedestrians', 'children', 'officers', 'workers', 'vendors', 'women', 'men', 'girls', 'boys', 'performers', 'smokers'];
const NUMBERED_PEOPLE_HINTS = [
  { hints: ['five'], count: 5 },
  { hints: ['four'], count: 4 },
  { hints: ['three'], count: 3 },
  { hints: ['two', 'pair', 'couple', 'both'], count: 2 },
  { hints: ['single', 'lone', 'solitary'], count: 1 }
];
const INDOOR_HINTS = ['indoor', 'indoors', 'interior', 'kitchen', 'room', 'bedroom', 'studio', 'table'];
const OUTDOOR_HINTS = ['outdoor', 'outdoors', 'street', 'park', 'bench', 'crosswalk', 'tram', 'snow', 'sky', 'river', 'pond', 'sidewalk', 'bridge'];
const DOMESTIC_HINTS = ['kitchen', 'room', 'bedroom', 'table', 'domestic', 'home', 'house'];
const STREET_HINTS = ['street', 'crosswalk', 'sidewalk', 'tram', 'intersection', 'public square', 'public space'];
const DIRECT_STREET_HINTS = ['street', 'crosswalk', 'sidewalk', 'intersection', 'curb', 'bollard', 'bollards', 'shop window', 'storefront window', 'pedestrian bridge', 'tram tracks', 'tram stop'];
const NATURE_HINTS = ['tree', 'trees', 'flower', 'flowers', 'bird', 'birds', 'duck', 'gull', 'stork', 'heron', 'river', 'pond', 'water', 'grass', 'leaf', 'leaves'];
const NATURE_ENV_HINTS = ['tree', 'trees', 'branch', 'branches', 'flower', 'flowers', 'grass', 'leaf', 'leaves', 'river', 'pond', 'water', 'field', 'garden', 'park', 'shore', 'mud', 'bark', 'vine', 'vines'];
const URBAN_ENV_HINTS = ['city', 'urban', 'building', 'buildings', 'facade', 'facades', 'billboard', 'billboards', 'balcony', 'balconies', 'traffic', 'pavement', 'road', 'bench', 'shop', 'storefront', 'bus stop', 'tram', 'trams', 'tracks', 'crossing'];
const COLORFUL_HINTS = ['rainbow', 'colorful', 'colourful', 'vivid', 'bright', 'multicolor', 'multicolour'];
const CLOSE_UP_HINTS = ['close-up', 'close up', 'close crop'];
const DETAIL_HINTS = ['detail', 'detail study'];
const WIDE_HINTS = ['wide shot', 'wide view', 'wide scene', 'wide frame', 'panoramic'];
const PHONE_SCREEN_ACTION_HINTS = ['checking', 'looking at', 'focused on', 'concentrating on', 'texting', 'scrolling', 'photographing'];
const CROSS_OBJECT_HINTS = [
  'church cross', 'wooden cross', 'large wooden cross', 'red cross', 'green cross',
  'crucifix', 'cross arm', 'cross shadow', 'cross reflection', 'cross-bearing',
  'holding a cross', 'holding cross', 'carrying a cross', 'carry a cross',
  'topped with a cross', 'bird on cross', 'perched on the arm of a church cross',
  'perched on top of a church cross', 'statue holding a cross', 'cross silhouetted',
  'silhouetted cross'
];

function includesAny(text, hints = []) {
  const normalizedText = String(text || '').toLowerCase();
  return hints.some((hint) => hasNormalizedTerm(normalizedText, hint));
}

function hasPossessiveHint(text, hints = []) {
  const normalizedText = String(text || '').toLowerCase();
  return hints.some((hint) => {
    const token = String(hint || '').toLowerCase().trim();
    if (!token || token.includes(' ')) return false;
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}(?:'s|s')\\b`, 'i').test(normalizedText);
  });
}

function includesDirectHumanHint(text, hints = []) {
  return includesAny(text, hints) && !hasPossessiveHint(text, hints);
}

function uniqueStrings(items = []) {
  return [...new Set(
    items
      .map((item) => cleanSemanticValue(item))
      .filter(Boolean)
  )];
}

function normalizeForMatch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[â€™']/g, '')
    .replace(/[^a-z0-9\u0590-\u05ff -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemWord(value) {
  const token = normalizeForMatch(value);
  if (!token) return '';
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('s') && token.length > 3) return token.slice(0, -1);
  return token;
}

function tokenizeForMatch(value) {
  return normalizeForMatch(String(value || '').replace(/-/g, ' '))
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function hasNormalizedTerm(text, term) {
  const normalizedText = normalizeForMatch(text);
  const normalizedTerm = normalizeForMatch(term);
  if (!normalizedText || !normalizedTerm) return false;

  if (normalizedTerm.includes(' ')) {
    const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
    const pattern = new RegExp(`(^|[^a-z0-9\\u0590-\\u05ff])${escaped}(?=$|[^a-z0-9\\u0590-\\u05ff])`, 'i');
    return pattern.test(normalizedText);
  }

  const textTokens = tokenizeForMatch(normalizedText);
  const termStem = stemWord(normalizedTerm);
  return textTokens.some((token) => token === normalizedTerm || stemWord(token) === termStem);
}

function cleanSemanticValue(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  const corrected = VALUE_CORRECTIONS.get(normalized.toLowerCase());
  return corrected || normalized;
}

function deriveApproxPeopleCount(text, hasPeople, gender = [], ageGroup = []) {
  const normalizedText = String(text || '').toLowerCase();
  if (!hasPeople) return 0;
  if (includesAny(normalizedText, CROWD_HINTS)) return 5;

  let count = 1;

  NUMBERED_PEOPLE_HINTS.forEach(({ hints, count: hintCount }) => {
    if (hintCount > count && includesAny(normalizedText, hints)) {
      count = hintCount;
    }
  });

  if (includesAny(normalizedText, PLURAL_PEOPLE_HINTS)) {
    count = Math.max(count, 3);
  }

  const categoryHits = [
    (gender || []).includes('woman'),
    (gender || []).includes('man'),
    (ageGroup || []).includes('child')
  ].filter(Boolean).length;

  if (categoryHits >= 2) {
    count = Math.max(count, categoryHits);
  }

  const leadPeopleMentions = [
    includesAny(normalizedText, WOMAN_HINTS),
    includesAny(normalizedText, MAN_HINTS),
    includesAny(normalizedText, CHILD_HINTS),
    includesAny(normalizedText, ['person', 'figure', 'pedestrian', 'rider', 'cyclist', 'smoker', 'vendor', 'worker', 'officer', 'performer'])
  ].filter(Boolean).length;

  if (leadPeopleMentions >= 2) {
    count = Math.max(count, Math.min(leadPeopleMentions, 4));
  }

  return count;
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

  if (includesAny(normalizedAlt, HUMAN_HINTS)) {
    negatives.push('people');
  }

  if (!includesAny(normalizedAlt, GRAYSCALE_HINTS)) {
    negatives.push('color');
  }

  return uniqueStrings(negatives);
}

function deriveFieldByIncludes(alt, mapping) {
  const normalizedAlt = String(alt || '').toLowerCase();
  return uniqueStrings(
    mapping
      .filter(({ match }) => includesAny(normalizedAlt, match))
      .flatMap(({ values }) => values)
  );
}

function derivePointOfView(alt) {
  const normalizedAlt = String(alt || '').toLowerCase();
  if (includesAny(normalizedAlt, ['seen from above', 'overhead view'])) return 'overhead';
  if (includesAny(normalizedAlt, ['close-up', 'close up'])) return 'close-up';
  if (includesAny(normalizedAlt, ['through', 'framed by'])) return 'framed view';
  if (includesAny(normalizedAlt, ['silhouette', 'silhouettes'])) return 'silhouette';
  return '';
}

function deriveManipulation(alt) {
  const normalizedAlt = String(alt || '').toLowerCase();
  if (includesAny(normalizedAlt, GRAYSCALE_HINTS)) return 'monochrome';
  if (includesAny(normalizedAlt, ['motion-blurred', 'motion blurred', 'blur', 'blurred'])) return 'motion blur';
  if (includesAny(normalizedAlt, ['reflection', 'reflections', 'reflected'])) return 'reflection';
  return 'straight';
}

function deriveObjects(alt) {
  const normalizedAlt = String(alt || '').toLowerCase();
  return uniqueStrings(
    OBJECT_FAMILIES
      .filter(({ canonical, match }) => matchesObjectFamily(normalizedAlt, canonical, match))
      .map(({ canonical }) => canonical)
  );
}

function matchesObjectFamily(text = '', canonical = '', family = []) {
  const normalizedText = String(text || '').toLowerCase();
  if (!normalizedText) return false;

  if (canonical === 'cross') {
    if (includesAny(normalizedText, ['crosswalk', 'crosswalks', 'crossing', 'crossings', 'across', 'cross-legged', 'crosscurrent'])) {
      return false;
    }
    if (includesAny(normalizedText, CROSS_OBJECT_HINTS)) {
      return true;
    }
    return /\bcross\b/.test(normalizedText) && !/\bto\s+cross\b/.test(normalizedText);
  }

  return includesAny(normalizedText, family);
}

function matchesCanonicalFamily(values = [], canonical = '', family = []) {
  return (Array.isArray(values) ? values : []).some((value) => matchesObjectFamily(String(value || '').toLowerCase(), canonical, family));
}

function deriveObjectRoles(alt, primary = [], secondary = [], objects = []) {
  const normalizedAlt = String(alt || '').toLowerCase();
  const leadAlt = normalizedAlt.split(/\s+/).slice(0, 10).join(' ');
  const roles = {};

  OBJECT_FAMILIES.forEach(({ canonical, match }) => {
    const inPrimary = matchesCanonicalFamily(primary, canonical, match);
    const inSecondary = matchesCanonicalFamily(secondary, canonical, match);
    const inObjects = (objects || []).includes(canonical);
    const leadMatch = matchesObjectFamily(leadAlt, canonical, match);
    const altMatch = matchesObjectFamily(normalizedAlt, canonical, match);

    if ((inPrimary || leadMatch) && (inObjects || altMatch || inPrimary)) {
      roles[canonical] = 'primary';
      return;
    }

    if (inSecondary || inObjects) {
      roles[canonical] = 'secondary';
      return;
    }

    if (altMatch) {
      roles[canonical] = 'incidental';
    }
  });

  return roles;
}

function deriveColors(alt) {
  return uniqueStrings(
    COLOR_HINTS.filter((term) => includesAny(String(alt || '').toLowerCase(), [term]))
  );
}

function derivePeopleProfile(alt) {
  const normalizedAlt = String(alt || '').toLowerCase();
  const woman = includesDirectHumanHint(alt, WOMAN_HINTS);
  const man = includesDirectHumanHint(alt, MAN_HINTS);
  const child = includesDirectHumanHint(alt, CHILD_HINTS);
  const crowd = includesAny(normalizedAlt, CROWD_HINTS);
  const hasPeople = includesAny(normalizedAlt, HUMAN_HINTS);

  const gender = uniqueStrings([
    woman ? 'woman' : '',
    man ? 'man' : ''
  ]);

  const ageGroup = uniqueStrings([
    child ? 'child' : '',
    hasPeople && !child ? 'adult' : ''
  ]);
  const ageStage = includesAny(normalizedAlt, ['older', 'elderly', 'old man', 'old woman'])
    ? 'older'
    : '';

  const peopleCount = deriveApproxPeopleCount(normalizedAlt, hasPeople, gender, ageGroup);
  const leadWindow = normalizedAlt.split(/\s+/).slice(0, 8).join(' ');
  const focusWindow = normalizedAlt.split(/\s+/).slice(0, 12).join(' ');

  let prominence = 'none';
  if (hasPeople) {
    prominence = includesDirectHumanHint(leadWindow, HUMAN_HINTS) ? 'primary' : 'secondary';
    if (crowd) prominence = 'primary';
  }

  let focus = '';
  if (crowd || peopleCount >= 4) {
    focus = 'crowd';
  } else if (includesDirectHumanHint(focusWindow, CHILD_HINTS)) {
    focus = 'child';
  } else if (includesDirectHumanHint(focusWindow, WOMAN_HINTS) && !includesDirectHumanHint(focusWindow, MAN_HINTS)) {
    focus = 'woman';
  } else if (includesDirectHumanHint(focusWindow, MAN_HINTS) && !includesDirectHumanHint(focusWindow, WOMAN_HINTS)) {
    focus = 'man';
  } else if (hasPeople && Number(peopleCount) === 1 && prominence === 'primary') {
    if (gender.includes('woman') && !gender.includes('man')) focus = 'woman';
    else if (gender.includes('man') && !gender.includes('woman')) focus = 'man';
    else if (ageGroup.includes('child')) focus = 'child';
    else focus = 'person';
  }

  return {
    has_people: hasPeople,
    people_count: peopleCount,
    gender,
    age_group: ageGroup,
    age_stage: ageStage,
    people_prominence: prominence,
    people_focus: focus
  };
}

function deriveColorProfile(alt, colors, manipulation) {
  const normalizedAlt = String(alt || '').toLowerCase();
  const dominantColors = uniqueStrings(colors || []).slice(0, 3);

  let colorMode = 'color';
  if (includesAny(normalizedAlt, GRAYSCALE_HINTS) || String(manipulation || '').toLowerCase() === 'monochrome') {
    colorMode = 'bw';
  } else if (includesAny(normalizedAlt, COLORFUL_HINTS) || dominantColors.length >= 3) {
    colorMode = 'colorful';
  }

  return {
    color_mode: colorMode,
    dominant_colors: dominantColors
  };
}

function deriveEnvironmentProfile(project, alt, environment = []) {
  const normalizedAlt = String(alt || '').toLowerCase();
  const environmentType = [];
  const settingType = [];
  const natureHintCount = NATURE_ENV_HINTS.filter((hint) => includesAny(normalizedAlt, [hint])).length;
  const streetCue = includesAny(normalizedAlt, DIRECT_STREET_HINTS);
  const urbanCue = streetCue || includesAny(normalizedAlt, URBAN_ENV_HINTS);
  const waterCue = includesAny(normalizedAlt, ['river', 'pond', 'water', 'puddle', 'fountain', 'shore']);
  const parkCue = includesAny(normalizedAlt, ['park', 'garden']);
  const natureCue = natureHintCount >= 2 || parkCue || waterCue;
  const indoorCue = includesAny(normalizedAlt, INDOOR_HINTS);
  const domesticCue = includesAny(normalizedAlt, DOMESTIC_HINTS);
  const outdoorCue = includesAny(normalizedAlt, OUTDOOR_HINTS) || streetCue || waterCue || natureCue;

  if (indoorCue) environmentType.push('indoor');
  if (outdoorCue) environmentType.push('outdoor');
  if (streetCue) {
    environmentType.push('street', 'urban');
    settingType.push('street');
  } else if (urbanCue) {
    environmentType.push('urban');
  }
  if (natureCue) {
    environmentType.push('nature');
  }
  if (includesAny(normalizedAlt, DOMESTIC_HINTS)) {
    environmentType.push('domestic', 'indoor');
    settingType.push('domestic');
  }

  if (includesAny(normalizedAlt, ['park'])) settingType.push('park');
  if (includesAny(normalizedAlt, ['public square'])) settingType.push('public square');
  if (includesAny(normalizedAlt, ['window', 'windows', 'pane', 'panes'])) settingType.push('window');
  if (includesAny(normalizedAlt, ['river', 'pond', 'water', 'puddle'])) settingType.push('water edge');

  return {
    environment_type: uniqueStrings(environmentType),
    setting_type: uniqueStrings(settingType)
  };
}

function deriveScreenVisible(alt) {
  const normalizedAlt = String(alt || '').toLowerCase();
  const phoneMention = includesAny(normalizedAlt, ['phone', 'smartphone', 'mobile phone', 'cellphone']);
  if (!phoneMention) return false;
  if (includesAny(normalizedAlt, ['screen', 'display', 'phone screen', 'smartphone screen', 'mobile phone screen'])) return true;
  return PHONE_SCREEN_ACTION_HINTS.some((hint) => normalizedAlt.includes(hint));
}

function deriveShotType(alt, composition = [], pov = '') {
  const normalizedAlt = String(alt || '').toLowerCase();
  const normalizedComposition = (composition || []).map((value) => String(value || '').toLowerCase());
  const normalizedPov = String(pov || '').toLowerCase();

  if (includesAny(normalizedAlt, CLOSE_UP_HINTS) || normalizedComposition.includes('close crop') || normalizedPov === 'close-up') {
    return 'close_up';
  }
  if (includesAny(normalizedAlt, DETAIL_HINTS)) {
    return 'detail';
  }
  if (includesAny(normalizedAlt, WIDE_HINTS) || normalizedComposition.includes("bird's-eye view")) {
    return 'wide';
  }
  if (includesAny(normalizedAlt, ['portrait', 'face']) && includesAny(normalizedAlt, HUMAN_HINTS)) {
    return 'portrait';
  }
  return '';
}

function deriveSubjectScale(alt, shotType = '') {
  const normalizedAlt = String(alt || '').toLowerCase();
  if (shotType === 'detail' || includesAny(normalizedAlt, ['detail', 'close-up', 'close up', 'cropped'])) {
    return 'detail';
  }
  if (shotType === 'close_up' || shotType === 'portrait') {
    return 'close';
  }
  if (shotType === 'wide' || includesAny(normalizedAlt, ['seen from above', 'overhead view', 'wide shot', 'wide view', 'wide scene'])) {
    return 'wide';
  }
  if (includesAny(normalizedAlt, ['half-length', 'waist-up', 'mid-shot', 'medium shot'])) {
    return 'medium';
  }
  return 'medium';
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
    { match: ['daylight', 'daytime', 'sunny'], values: ['daylight'] },
    { match: ['shadow', 'shadows'], values: ['directional light', 'shadowed light'] },
    { match: ['backlit'], values: ['backlit light'] },
    { match: ['snow', 'winter'], values: ['cold daylight'] },
    { match: ['fog', 'mist', 'overcast', 'cloudy'], values: ['soft light'] },
    { match: ['dark', 'dim'], values: ['low light'] },
    { match: ['lit', 'glowing', 'lamp', 'lamps'], values: ['artificial light'] },
    { match: ['window light'], values: ['window light'] }
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
  return uniqueStrings([
    ...deriveFieldByIncludes(alt, [
      { match: ['street', 'city', 'intersection', 'crosswalk'], values: ['city', 'street'] },
      { match: ['park', 'bench', 'tree'], values: ['park'] },
      { match: ['snow', 'winter'], values: ['winter'] },
      { match: ['water', 'pond', 'river', 'puddle'], values: ['water edge'] },
      { match: ['wall', 'facade', 'window', 'building', 'billboard', 'balcony'], values: ['architecture'] },
      { match: ['kitchen', 'room', 'bedroom', 'table'], values: ['interior', 'domestic'] },
      { match: ['bridge', 'tram', 'tracks'], values: ['transit'] }
    ])
  ]);
}

function deriveStyle(project, alt) {
  const normalizedAlt = String(alt || '').toLowerCase();
  const style = [];

  if (includesAny(normalizedAlt, ['window', 'windows', 'facade', 'building', 'buildings'])) style.push('architectural observation');
  if (includesAny(normalizedAlt, ['reflection', 'reflections', 'reflected', 'mirror', 'mirrors'])) style.push('reflection study');
  if (includesAny(normalizedAlt, ['motion-blurred', 'motion blurred', 'blur', 'blurred'])) style.push('motion-blur street photography');
  if (includesAny(normalizedAlt, ['bird', 'birds', 'duck', 'ducks', 'gull', 'gulls', 'pigeon', 'pigeons', 'stork', 'storks', 'heron', 'herons'])) style.push('poetic observation');
  if (includesAny(normalizedAlt, ['umbrella', 'umbrellas', 'crossing', 'cyclist', 'cyclists', 'pedestrian', 'pedestrians', 'street', 'tram', 'trams'])) style.push('street photography');
  if (includesAny(normalizedAlt, ['skull', 'skulls', 'vegetable', 'vegetables', 'eggplant', 'eggplants', 'birdcage', 'birdcages', 'chair', 'chairs', 'boat', 'boats'])) style.push('conceptual still life');

  return uniqueStrings([...style, ...(project.tags || [])]);
}

function deriveBaseEntry(project, image, projectIndex, imageIndex) {
  const altTokens = tokenizeText(image.alt);
  const projectTags = uniqueStrings(project.tags || []);
  const stem = normalizeStem(image.src);
  const id = `img-${String(projectIndex + 1).padStart(3, '0')}-${slugifyId(project.slug)}-${slugifyId(stem)}`;
  const objects = deriveObjects(image.alt);
  const environment = deriveEnvironment(project, image.alt);
  const composition = deriveComposition(image.alt);
  const lighting = deriveLighting(image.alt);
  const colors = deriveColors(image.alt);
  const pov = derivePointOfView(image.alt);
  const manipulation = deriveManipulation(image.alt);
  const peopleProfile = derivePeopleProfile(image.alt);
  const colorProfile = deriveColorProfile(image.alt, colors, manipulation);
  const environmentProfile = deriveEnvironmentProfile(project, image.alt, environment);
  const shotType = deriveShotType(image.alt, composition, pov);
  const subjectScale = deriveSubjectScale(image.alt, shotType);
  const objectRoles = deriveObjectRoles(image.alt, projectTags, altTokens, objects);
  const screenVisible = deriveScreenVisible(image.alt);

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
    objects,
    environment,
    style: deriveStyle(project, image.alt),
    composition,
    lighting,
    colors,
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
    pov,
    manipulation,
    negative: deriveNegativeHints(image.alt),
    related: [],
    object_roles: objectRoles,
    ...peopleProfile,
    ...colorProfile,
    ...environmentProfile,
    shot_type: shotType,
    subject_scale: subjectScale,
    screen_visible: screenVisible
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
  normalized.age_stage = typeof normalized.age_stage === 'string' ? normalized.age_stage.trim() : '';
  if (Object.prototype.hasOwnProperty.call(normalized, 'screen_visible')) {
    normalized.screen_visible = typeof normalized.screen_visible === 'boolean'
      ? normalized.screen_visible
      : Boolean(normalized.screen_visible);
  } else {
    normalized.screen_visible = undefined;
  }

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

  merged.age_stage = safeOverride.age_stage || baseEntry.age_stage || '';
  merged.screen_visible = typeof safeOverride.screen_visible === 'boolean'
    ? safeOverride.screen_visible
    : Boolean(baseEntry.screen_visible);

  return merged;
}

function generateBaseImageSearchDataset(projects) {
  const dataset = [];

  projects.forEach((project, projectIndex) => {
    (project.images || []).forEach((image, imageIndex) => {
      const baseEntry = deriveBaseEntry(project, image, projectIndex, imageIndex);
      dataset.push(baseEntry);
    });
  });

  return dataset;
}

function generateImageSearchDataset(projects, rootDir, logger, options = {}) {
  const baseDataset = generateBaseImageSearchDataset(projects);
  if (options.baseOnly) {
    return baseDataset;
  }

  const overrides = loadManualMetadata(rootDir, logger);
  return baseDataset.map((baseEntry) => {
    const overrideKey = `${baseEntry.projectSlug}::${normalizeStem(baseEntry.src)}`;
    const override = overrides.get(overrideKey) || null;
    return mergeEntry(baseEntry, override);
  });
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
  generateBaseImageSearchDataset,
  generateImageSearchDataset,
  writeImageSearchDataset
};

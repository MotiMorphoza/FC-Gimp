const SEARCH_ARRAY_FIELDS = [
  "primary",
  "secondary",
  "noise",
  "objects",
  "environment",
  "style",
  "composition",
  "lighting",
  "colors",
  "mood",
  "themes",
  "symbols",
  "texture",
  "motion",
  "tone",
  "relations",
  "tension",
  "reading",
  "negative",
  "related"
];

const SEARCH_STRING_FIELDS = ["density", "pov", "manipulation", "subject_scale", "alt", "caption", "projectTitle", "projectDescription"];
const MAX_RENDERED_RESULTS = 120;
const FIELD_WEIGHTS = {
  primary: 5,
  secondary: 3,
  noise: 1
};

const HUMAN_VISUAL_HINTS = [
  "people", "person", "human", "humans", "man", "men", "woman", "women",
  "child", "children", "girl", "girls", "boy", "boys", "nun", "nuns",
  "priest", "priests", "crowd", "pedestrian", "pedestrians", "figure", "figures",
  "cyclist", "cyclists", "rider", "riders", "vendor", "vendors", "seller", "sellers",
  "worker", "workers", "paddleboarder", "smoker", "smokers"
];

const COLORFUL_HINTS = ["colorful", "colourful", "vivid", "multicolor", "multicolour", "rainbow"];
const CROWD_VISUAL_HINTS = ["crowd", "protesters", "choir", "marchers", "group"];
const PLURAL_PEOPLE_HINTS = ["people", "pedestrians", "children", "officers", "workers", "vendors"];
const WOMAN_VISUAL_HINTS = ["woman", "women", "female", "nun", "nuns", "girl", "girls", "mother", "mothers"];
const MAN_VISUAL_HINTS = ["man", "men", "male", "priest", "priests", "monk", "monks", "boy", "boys", "father", "fathers"];
const CHILD_VISUAL_HINTS = ["child", "children", "kid", "kids", "girl", "girls", "boy", "boys", "baby", "babies"];
const PLURAL_GENDER_HINTS = ["women", "men", "girls", "boys", "children", "babies", "nuns", "priests", "cyclists", "riders", "vendors", "workers", "smokers", "performers", "officers"];
const NUMBERED_PEOPLE_HINTS = [
  { hints: ["five"], count: 5 },
  { hints: ["four"], count: 4 },
  { hints: ["three"], count: 3 },
  { hints: ["two", "pair", "couple", "both"], count: 2 },
  { hints: ["single", "lone", "solitary"], count: 1 }
];
const STRICT_OBJECT_QUERY_CLASSES = new Set(["object"]);
const EMOTION_QUERY_FIELDS = {
  mood: 7,
  tone: 6,
  themes: 4,
  tension: 4,
  reading: 3,
  relations: 2,
  projectDescription: 1
};
const EMOTION_QUERY_CANONICALS = new Set(["happy", "sad", "calm", "lonely", "quiet"]);
const EMOTION_SIGNAL_FIELDS = ["mood", "tone", "themes", "tension", "reading", "relations", "composition"];
const EMOTION_QUERY_PROFILES = {
  happy: {
    primary: ["joy", "joyful", "cheerful", "delight", "delightful", "smile", "smiling", "laughter", "laughing", "companionship", "warmth", "tenderness", "playfulness", "openness", "lightness"],
    secondary: ["wonder", "surprise", "resilience"],
    counter: ["melancholy", "sadness", "sorrow", "grief", "fatigue", "withdrawal", "loneliness", "isolation"]
  },
  sad: {
    primary: ["sad", "sadness", "melancholy", "sorrow", "grief", "fragility", "fatigue", "neglect", "vulnerability", "withdrawal", "reserve"],
    secondary: ["lonely", "loneliness", "solitude", "detachment", "distance", "silence"],
    counter: ["joy", "joyful", "playfulness", "companionship", "warmth", "openness", "lightness", "laughter"]
  },
  lonely: {
    primary: ["lonely", "loneliness", "solitude", "isolation", "withdrawal", "anonymity", "emptiness", "separation", "solitary"],
    secondary: ["distance", "silence", "detachment", "reserve", "quietness"],
    counter: ["companionship", "warmth", "openness", "joy", "playfulness"]
  },
  calm: {
    primary: ["calm", "stillness", "quietness", "contemplation", "restraint", "gentleness", "clarity", "patience", "suspension"],
    secondary: ["wonder", "order", "afterglow", "distance"],
    counter: ["hostility", "violence", "chaos", "alarm", "velocity", "tension"]
  },
  quiet: {
    primary: ["quiet", "quietness", "silence", "stillness", "hushed", "muted", "contemplation", "restraint"],
    secondary: ["calm", "distance", "reserve", "order"],
    counter: ["crowd", "hostility", "violence", "alarm", "velocity", "tension"]
  }
};
const ALONE_CUE_VARIANTS = ["alone", "solitary", "solitude", "lonely", "loneliness", "isolation", "withdrawal", "emptiness", "separation"];
const ALONE_COMPOSITION_VARIANTS = ["isolated subject"];
const ISOLATION_VARIANTS = [
  "solitude", "lonely", "loneliness", "isolation", "detachment", "distance",
  "withdrawal", "anonymity", "silence", "quietness", "separation", "alone"
];
const ISOLATION_COMPOSITION_VARIANTS = ["isolated subject", "frame within frame"];
const GENERIC_STANDALONE_TERMS = new Set(["people", "street", "urban", "outdoor", "wall"]);
const DIRECT_STREET_VISUAL_HINTS = ["street", "crosswalk", "sidewalk", "intersection", "curb", "bollard", "bollards", "shop window", "storefront window", "pedestrian bridge", "tram tracks", "tram stop"];
const PHONE_SCREEN_VISUAL_HINTS = ["screen", "display", "phone screen", "smartphone screen", "mobile phone screen", "checking", "looking at", "focused on", "concentrating on", "texting", "scrolling", "photographing"];
const ROAD_SURFACE_HINTS = ["road", "roadway", "roadside", "busy road", "wet road", "lane", "lanes", "bike lane", "traffic lane", "crosswalk", "intersection", "tram tracks", "street junction"];
const ROAD_STRUCTURAL_HINTS = ["street", "bridge", "path", "crosswalk", "intersection"];
const CROSSING_PATH_HINTS = ["street", "road", "roadway", "crosswalk", "intersection", "tram tracks", "bridge", "path", "square", "pavement", "curb"];
const CROSSING_VERB_PATTERN = /\b(crossing|cross the street|cross the road|walking across|running across|stepping off|step off)\b/i;
const CROSSING_SOFT_PATTERN = /\bacross\b/i;

const SEARCH_STATE = {
  loadPromise: null,
  images: [],
  index: [],
  currentQuery: "",
  debounceTimer: null
};

function getTagHelpers() {
  return window.MotoSearchTags || {
    normalizeTerm: (value) => String(value || "").toLowerCase().trim(),
    stemTerm: (value) => String(value || "").toLowerCase().trim(),
    valueHasVariant: (value, variant) => String(value || "").toLowerCase().split(/\s+/).includes(String(variant || "").toLowerCase()),
    valueHasAnyVariant: (value, variants = []) => variants.some((variant) => String(value || "").toLowerCase().split(/\s+/).includes(String(variant || "").toLowerCase())),
    parseQuery: (query) => ({
      raw: query,
      normalized: String(query || "").trim().toLowerCase(),
      positive: [],
      negative: []
    })
  };
}

function normalizeArray(values) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
}

function normalizeMaybeArray(values) {
  if (Array.isArray(values)) return normalizeArray(values);
  if (values == null || values === "") return [];
  return normalizeArray([values]);
}

function normalizeObjectMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, role]) => [String(key || "").trim().toLowerCase(), String(role || "").trim().toLowerCase()])
      .filter(([key, role]) => key && role)
  );
}

function includesVariant(values, variants, canonical) {
  const { valueHasAnyVariant } = getTagHelpers();
  return normalizeArray(values).some((value) => {
    return valueHasAnyVariant(value, [...variants, canonical].filter(Boolean));
  });
}

function textHasHint(text, hint) {
  return getTagHelpers().valueHasVariant(text, hint);
}

function textHasAnyHint(text, hints = []) {
  return hints.some((hint) => textHasHint(text, hint));
}

function textHasPossessiveHint(text, hints = []) {
  const normalizedText = String(text || "").toLowerCase();
  return hints.some((hint) => {
    const token = String(hint || "").toLowerCase().trim();
    if (!token || token.includes(" ")) return false;
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}(?:'s|s')\\b`, "i").test(normalizedText);
  });
}

function textHasDirectHumanHint(text, hints = []) {
  return textHasAnyHint(text, hints) && !textHasPossessiveHint(text, hints);
}

function deriveApproxPeopleCount(text, hasPeople, gender = [], ageGroup = []) {
  const normalizedText = String(text || "");
  if (!hasPeople) return 0;
  if (textHasAnyHint(normalizedText, CROWD_VISUAL_HINTS)) return 5;

  let count = 1;

  NUMBERED_PEOPLE_HINTS.forEach(({ hints, count: hintCount }) => {
    if (hintCount > count && textHasAnyHint(normalizedText, hints)) {
      count = hintCount;
    }
  });

  if (textHasAnyHint(normalizedText, PLURAL_PEOPLE_HINTS) || textHasAnyHint(normalizedText, PLURAL_GENDER_HINTS)) {
    count = Math.max(count, 3);
  }

  const categoryHits = [
    (gender || []).includes("woman"),
    (gender || []).includes("man"),
    (ageGroup || []).includes("child")
  ].filter(Boolean).length;

  if (categoryHits >= 2) {
    count = Math.max(count, categoryHits);
  }

  const leadPeopleMentions = [
    textHasAnyHint(normalizedText, WOMAN_VISUAL_HINTS),
    textHasAnyHint(normalizedText, MAN_VISUAL_HINTS),
    textHasAnyHint(normalizedText, CHILD_VISUAL_HINTS),
    textHasAnyHint(normalizedText, ["person", "figure", "pedestrian", "rider", "cyclist", "smoker", "vendor", "worker", "officer", "performer"])
  ].filter(Boolean).length;

  if (leadPeopleMentions >= 2) {
    count = Math.max(count, Math.min(leadPeopleMentions, 4));
  }

  return count;
}

function deriveVisualProfile(image) {
  const { normalizeTerm } = getTagHelpers();
  const primary = normalizeArray(image.primary);
  const secondary = normalizeArray(image.secondary);
  const objects = normalizeArray(image.objects);
  const environment = normalizeArray(image.environment);
  const colors = normalizeArray(image.colors);
  const composition = normalizeArray(image.composition);
  const combinedText = normalizeTerm([
    image.alt,
    ...primary,
    ...secondary,
    ...objects,
    ...environment,
    image.caption
  ].join(" "));

  const explicitHasPeople = typeof image.has_people === "boolean" ? image.has_people : null;
  const hasPeople = explicitHasPeople != null
    ? explicitHasPeople
    : textHasAnyHint(combinedText, HUMAN_VISUAL_HINTS);

  const gender = normalizeMaybeArray(image.gender);
  if (!gender.length) {
    if (textHasDirectHumanHint(image.alt, ["woman", "women", "female", "nun", "nuns"])) {
      gender.push("woman");
    }
    if (textHasDirectHumanHint(image.alt, ["man", "men", "male", "priest", "priests"])) {
      gender.push("man");
    }
  }

  const ageGroup = normalizeMaybeArray(image.age_group);
  if (!ageGroup.length) {
    if (textHasDirectHumanHint(image.alt, ["child", "children", "boy", "boys", "girl", "girls", "baby", "babies"])) {
      ageGroup.push("child");
    } else if (hasPeople) {
      ageGroup.push("adult");
    }
  }

  const derivedPeopleCount = deriveApproxPeopleCount(combinedText, hasPeople, gender, ageGroup);
  const explicitPeopleCount = Number.isFinite(image.people_count)
    ? Number(image.people_count)
    : null;
  const peopleCount = explicitPeopleCount != null
    ? Math.max(explicitPeopleCount, derivedPeopleCount)
    : derivedPeopleCount;

  let peopleProminence = String(image.people_prominence || "").trim().toLowerCase();
  if (!peopleProminence) {
    const leadText = String(image.alt || "").split(/\s+/).slice(0, 8).join(" ");
    peopleProminence = hasPeople
      ? textHasDirectHumanHint(leadText, HUMAN_VISUAL_HINTS) ? "primary" : "secondary"
      : "none";
  }

  let peopleFocus = String(image.people_focus || "").trim().toLowerCase();
  if (!peopleFocus) {
    const leadText = String(image.alt || "").split(/\s+/).slice(0, 12).join(" ");
    if (textHasAnyHint(combinedText, CROWD_VISUAL_HINTS) || Number(peopleCount) >= 4) {
      peopleFocus = "crowd";
    } else if (textHasDirectHumanHint(leadText, CHILD_VISUAL_HINTS)) {
      peopleFocus = "child";
    } else if (textHasDirectHumanHint(leadText, WOMAN_VISUAL_HINTS) && !textHasDirectHumanHint(leadText, MAN_VISUAL_HINTS)) {
      peopleFocus = "woman";
    } else if (textHasDirectHumanHint(leadText, MAN_VISUAL_HINTS) && !textHasDirectHumanHint(leadText, WOMAN_VISUAL_HINTS)) {
      peopleFocus = "man";
    } else if (hasPeople && Number(peopleCount) === 1 && peopleProminence === "primary") {
      if (gender.includes("woman") && !gender.includes("man")) peopleFocus = "woman";
      else if (gender.includes("man") && !gender.includes("woman")) peopleFocus = "man";
      else if (ageGroup.includes("child")) peopleFocus = "child";
      else peopleFocus = "person";
    }
  }

  const colorMode = String(image.color_mode || "").trim().toLowerCase() ||
    (String(image.manipulation || "").trim().toLowerCase() === "monochrome" ? "bw" :
      (colors.length >= 3 || textHasAnyHint(combinedText, COLORFUL_HINTS) ? "colorful" : "color"));

  const dominantColors = normalizeMaybeArray(image.dominant_colors);
  if (!dominantColors.length) {
    dominantColors.push(...colors);
  }

  const environmentType = normalizeMaybeArray(image.environment_type);
  if (!environmentType.length && !image._explicit_environment_type) {
    const natureHintCount = ["river", "pond", "water", "grass", "leaf", "leaves", "flower", "flowers", "tree", "trees", "branch", "branches"]
      .filter((hint) => textHasHint(combinedText, hint))
      .length;
    const urbanHintCount = ["street", "crosswalk", "sidewalk", "intersection", "city", "urban", "public space"]
      .filter((hint) => textHasHint(combinedText, hint))
      .length;

    if (environment.some((value) => /street|city|public space|urban/.test(normalizeTerm(value))) || textHasAnyHint(combinedText, ["street", "crosswalk", "sidewalk", "intersection"])) {
      environmentType.push("street", "urban", "outdoor");
    }
    if (environment.some((value) => /nature|urban nature|water edge/.test(normalizeTerm(value))) || natureHintCount >= (urbanHintCount ? 3 : 2)) {
      environmentType.push("nature", "outdoor");
    }
    if (textHasAnyHint(combinedText, ["interior", "indoor", "room", "kitchen", "bedroom", "table"])) {
      environmentType.push("indoor");
    }
    if (textHasAnyHint(combinedText, ["home", "house", "domestic", "kitchen", "bedroom", "room"])) {
      environmentType.push("domestic", "indoor");
    }
  }

  const settingType = normalizeMaybeArray(image.setting_type);
  if (!settingType.length && !image._explicit_setting_type) {
    if (textHasAnyHint(combinedText, ["street", "crosswalk", "sidewalk", "intersection"])) settingType.push("street");
    if (textHasAnyHint(combinedText, ["park"])) settingType.push("park");
    if (textHasAnyHint(combinedText, ["public square"])) settingType.push("public square");
    if (textHasAnyHint(combinedText, ["window", "windows", "pane", "panes"])) settingType.push("window");
    if (textHasAnyHint(combinedText, ["river", "pond", "water", "puddle"])) settingType.push("water edge");
    if (textHasAnyHint(combinedText, ["kitchen", "room", "bedroom", "table"])) settingType.push("domestic");
  }

  if (settingType.includes("street")) {
    environmentType.push("street", "urban", "outdoor");
  }
  if (settingType.includes("public square")) {
    environmentType.push("urban", "outdoor");
  }
  if (settingType.includes("domestic") || settingType.includes("interior")) {
    environmentType.push("indoor");
  }

  let shotType = String(image.shot_type || "").trim().toLowerCase();
  if (!shotType) {
    if (composition.some((value) => normalizeTerm(value) === "close crop") || /close up|close-up/.test(combinedText)) {
      shotType = "close_up";
    } else if (/detail/.test(combinedText)) {
      shotType = "detail";
    } else if (composition.some((value) => /bird's-eye view|overhead view/.test(normalizeTerm(value))) || /wide shot|wide view|wide scene/.test(combinedText)) {
      shotType = "wide";
    } else if (textHasAnyHint(combinedText, ["portrait", "face"]) && hasPeople) {
      shotType = "portrait";
    }
  }

  return {
    has_people: hasPeople,
    people_count: peopleCount,
    gender: normalizeArray(gender),
    age_group: normalizeArray(ageGroup),
    age_stage: String(image.age_stage || "").trim().toLowerCase(),
    people_focus: peopleFocus || "",
    people_prominence: peopleProminence || "none",
    color_mode: colorMode || "color",
    dominant_colors: normalizeArray(dominantColors),
    environment_type: normalizeArray(environmentType),
    setting_type: normalizeArray(settingType),
    shot_type: shotType,
    subject_scale: String(image.subject_scale || "").trim().toLowerCase(),
    screen_visible: typeof image.screen_visible === "boolean" ? image.screen_visible : textHasAnyHint(combinedText, PHONE_SCREEN_VISUAL_HINTS),
    object_roles: normalizeObjectMap(image.object_roles)
  };
}

function normalizeImage(image, index) {
  const projectSlug = String(image?.projectSlug || "").trim();
  const src = String(image?.src || "").trim();
  const normalized = {
    id: String(image?.id || `img-${index + 1}`),
    projectSlug,
    projectTitle: String(image?.projectTitle || "").trim(),
    projectDescription: String(image?.projectDescription || "").trim(),
    projectUrl: String(image?.projectUrl || `project-${encodeURIComponent(projectSlug)}.html`).trim(),
    imageUrl: String(image?.imageUrl || (projectSlug && src ? `projects/${projectSlug}/${src}` : "")).trim(),
    src,
    alt: String(image?.alt || "").trim(),
    caption: String(image?.caption || "").trim(),
    projectIndex: Number.isFinite(image?.projectIndex) ? Number(image.projectIndex) : index,
    imageIndex: Number.isFinite(image?.imageIndex) ? Number(image.imageIndex) : index,
    intensity: image?.intensity && typeof image.intensity === "object" && !Array.isArray(image.intensity)
      ? { ...image.intensity }
      : {},
    score: image?.score && typeof image.score === "object" && !Array.isArray(image.score)
      ? { ...image.score }
      : {},
    density: String(image?.density || "").trim(),
    pov: String(image?.pov || "").trim(),
    manipulation: String(image?.manipulation || "").trim(),
    has_people: typeof image?.has_people === "boolean" ? image.has_people : null,
    people_count: Number.isFinite(image?.people_count) ? Number(image.people_count) : null,
    gender: normalizeMaybeArray(image?.gender),
    age_group: normalizeMaybeArray(image?.age_group),
    age_stage: String(image?.age_stage || "").trim(),
    people_prominence: String(image?.people_prominence || "").trim(),
    color_mode: String(image?.color_mode || "").trim(),
    dominant_colors: normalizeMaybeArray(image?.dominant_colors),
    environment_type: normalizeMaybeArray(image?.environment_type),
    setting_type: normalizeMaybeArray(image?.setting_type),
    _explicit_environment_type: Object.prototype.hasOwnProperty.call(image || {}, 'environment_type'),
    _explicit_setting_type: Object.prototype.hasOwnProperty.call(image || {}, 'setting_type'),
    shot_type: String(image?.shot_type || "").trim(),
    subject_scale: String(image?.subject_scale || "").trim(),
    people_focus: String(image?.people_focus || "").trim(),
    screen_visible: typeof image?.screen_visible === "boolean" ? image.screen_visible : Boolean(image?.screen_visible),
    object_roles: normalizeObjectMap(image?.object_roles)
  };

  SEARCH_ARRAY_FIELDS.forEach((field) => {
    normalized[field] = normalizeArray(image?.[field]);
  });

  normalized.visual = deriveVisualProfile(normalized);

  return normalized;
}

function createKeyTags(image) {
  return [...new Set([
    ...image.primary,
    ...image.objects,
    ...image.mood,
    ...image.themes,
    ...image.colors,
    ...image.secondary
  ])].slice(0, 6);
}

function indexImage(image, order) {
  const { normalizeTerm, stemTerm } = getTagHelpers();
  const fields = {};

  SEARCH_ARRAY_FIELDS.forEach((field) => {
    fields[field] = image[field]
      .map((value) => normalizeTerm(value))
      .filter(Boolean);
  });

  SEARCH_STRING_FIELDS.forEach((field) => {
    const normalized = normalizeTerm(image[field]);
    fields[field] = normalized ? [normalized] : [];
  });

  if (image.intensity && typeof image.intensity === "object") {
    fields.intensity = Object.entries(image.intensity)
      .map(([key, value]) => normalizeTerm(`${key} ${value}`))
      .filter(Boolean);
  } else {
    fields.intensity = [];
  }

  const searchableFieldNames = Object.keys(fields).filter((field) => field !== "negative");
  const allValues = searchableFieldNames.flatMap((field) => fields[field] || []);

  return {
    image,
    order,
    fields,
    allValues,
    stemmedValues: allValues.map((value) => stemTerm(value)),
    keyTags: createKeyTags(image)
  };
}

async function fetchSearchDataset() {
  const version = window.__BUILD_VERSION__ ? `?v=${encodeURIComponent(window.__BUILD_VERSION__)}` : "";
  const generatedDatasetUrl = `data/images-search.generated.json${version}`;
  const sources = window.__BUILD_VERSION__
    ? [generatedDatasetUrl]
    : [generatedDatasetUrl, `data/images.json${version}`];

  let lastError = null;

  for (const source of sources) {
    try {
      const response = await fetch(source, { credentials: "same-origin" });
      if (!response.ok) {
        lastError = new Error(`${source} returned HTTP ${response.status}`);
        continue;
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) {
        lastError = new Error(`${source} did not return an array`);
        continue;
      }

      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Image search dataset could not be loaded");
}

async function loadSearchIndex() {
  if (SEARCH_STATE.loadPromise) return SEARCH_STATE.loadPromise;

  SEARCH_STATE.loadPromise = (async () => {
    const payload = await fetchSearchDataset();
    SEARCH_STATE.images = payload.map((image, index) => normalizeImage(image, index));
    SEARCH_STATE.index = SEARCH_STATE.images.map((image, index) => indexImage(image, index));
    return SEARCH_STATE.index;
  })();

  return SEARCH_STATE.loadPromise;
}

function readSearchStateFromUrl() {
  const url = new URL(window.location.href);
  return {
    query: url.searchParams.get("q") || ""
  };
}

function writeSearchStateToUrl(state) {
  const url = new URL(window.location.href);
  const query = String(state?.query || "").trim();

  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }

  url.searchParams.delete("tag");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function matchValue(value, stemmedValue, variants, canonical) {
  const { valueHasAnyVariant } = getTagHelpers();
  return valueHasAnyVariant(value, [...variants, canonical].filter(Boolean));
}

function hasWindowLightOnlyCue(indexedImage) {
  const alt = String(indexedImage?.image?.alt || "").toLowerCase();
  if (!/\bwindow light\b/.test(alt)) return false;

  const visual = indexedImage?.image?.visual || {};
  const explicitRole = visual.object_roles?.window || indexedImage?.image?.object_roles?.window;
  const settingType = normalizeArray(visual.setting_type || indexedImage?.image?.setting_type);
  const windowVariants = ["window", "windows", "pane", "panes", "windowpane"];
  const explicitWindowCue = explicitRole === "primary"
    || explicitRole === "secondary"
    || explicitRole === "incidental"
    || settingType.includes("window")
    || includesVariant(indexedImage?.image?.primary, windowVariants, "window")
    || includesVariant(indexedImage?.image?.objects, windowVariants, "window");

  return !explicitWindowCue;
}

function getExplicitObjectRole(indexedImage, termGroup) {
  const { normalizeTerm } = getTagHelpers();
  const objectRoles = {
    ...(indexedImage?.image?.object_roles || {}),
    ...(indexedImage?.image?.visual?.object_roles || {})
  };
  const variantKeys = [...new Set(
    [termGroup.canonical, ...(termGroup.variants || [])]
      .map((value) => normalizeTerm(value))
      .filter(Boolean)
  )];

  for (const key of variantKeys) {
    const role = String(objectRoles[key] || "").trim().toLowerCase();
    if (role === "primary" || role === "secondary" || role === "incidental") {
      return role;
    }
  }

  return "";
}

function getObjectProminence(indexedImage, termGroup) {
  const leadAlt = String(indexedImage.image.alt || "").split(/\s+/).slice(0, 10).join(" ");
  const allAlt = String(indexedImage.image.alt || "");
  const variants = [...termGroup.variants, termGroup.canonical].filter(Boolean);
  const primaryMatch = includesVariant(indexedImage.image.primary, termGroup.variants, termGroup.canonical);
  const objectMatch = includesVariant(indexedImage.image.objects, termGroup.variants, termGroup.canonical);
  const secondaryMatch = includesVariant(indexedImage.image.secondary, termGroup.variants, termGroup.canonical);
  const symbolMatch = includesVariant(indexedImage.image.symbols, termGroup.variants, termGroup.canonical);
  const readingMatch = includesVariant(indexedImage.image.reading, termGroup.variants, termGroup.canonical);
  const leadAltMatch = getTagHelpers().valueHasAnyVariant(leadAlt, variants);
  const altMatch = getTagHelpers().valueHasAnyVariant(allAlt, variants);
  const explicitRole = (primaryMatch || objectMatch || secondaryMatch || symbolMatch || readingMatch || altMatch)
    ? getExplicitObjectRole(indexedImage, termGroup)
    : "";

  if (explicitRole === "primary") return "primary";
  if (explicitRole === "secondary") return "secondary";
  if (explicitRole === "incidental") return "background";

  if (termGroup.canonical === "window" && hasWindowLightOnlyCue(indexedImage)) {
    return "none";
  }

  if (primaryMatch) {
    return "primary";
  }
  if (leadAltMatch && (objectMatch || symbolMatch || secondaryMatch)) {
    return "primary";
  }
  if (objectMatch) {
    return "secondary";
  }
  if (leadAltMatch || altMatch) {
    return "secondary";
  }
  if (symbolMatch && (secondaryMatch || readingMatch)) {
    return "secondary";
  }
  if (secondaryMatch || symbolMatch || readingMatch) {
    return "background";
  }
  return "none";
}

function isStandaloneGenericHardQuery(termGroup, parsedQuery) {
  return Boolean(
    parsedQuery &&
    parsedQuery.positive.length === 1 &&
    termGroup.kind === "hard" &&
    (termGroup.generic || GENERIC_STANDALONE_TERMS.has(termGroup.canonical))
  );
}

function hasUrbanCorroboration(indexedImage) {
  const visual = indexedImage.image.visual || {};
  return (
    (visual.setting_type || []).includes("street") ||
    (visual.setting_type || []).includes("public square") ||
    ["sign", "tram", "car", "window", "bench", "bike"].some((canonical) => {
      const role = visual.object_roles?.[canonical] || indexedImage.image.object_roles?.[canonical];
      return role === "primary" || role === "secondary";
    })
  );
}

function hasDirectStreetCue(indexedImage) {
  const alt = String(indexedImage?.image?.alt || "");
  return textHasAnyHint(alt, DIRECT_STREET_VISUAL_HINTS);
}

function hasPhoneScreenCue(indexedImage) {
  const alt = String(indexedImage?.image?.alt || "");
  const reading = normalizeArray(indexedImage?.image?.reading).join(" ");
  const visual = indexedImage?.image?.visual || {};
  if (Boolean(visual.screen_visible)) return true;
  return textHasAnyHint(`${alt} ${reading}`, PHONE_SCREEN_VISUAL_HINTS);
}

function hasRoadCue(indexedImage) {
  const visual = indexedImage?.image?.visual || {};
  const directSurface = [
    String(indexedImage?.image?.alt || ""),
    ...normalizeArray(indexedImage?.image?.primary),
    ...normalizeArray(indexedImage?.image?.secondary),
    ...normalizeArray(indexedImage?.image?.symbols),
    ...normalizeArray(indexedImage?.image?.environment)
  ].join(" ");
  const structuralSurface = [
    directSurface,
    ...normalizeArray(visual.environment_type),
    ...normalizeArray(visual.setting_type)
  ].join(" ");

  const strongCue = textHasAnyHint(directSurface, ROAD_SURFACE_HINTS);
  const structuralCue = textHasAnyHint(structuralSurface, ROAD_STRUCTURAL_HINTS);

  if (strongCue && structuralCue) {
    return { matched: true, score: 16 };
  }
  if (strongCue) {
    return { matched: true, score: 12 };
  }
  return { matched: false, score: 0 };
}

function hasCrossingCue(indexedImage) {
  const visual = indexedImage?.image?.visual || {};
  const textSurface = [
    String(indexedImage?.image?.alt || ""),
    ...normalizeArray(indexedImage?.image?.primary),
    ...normalizeArray(indexedImage?.image?.secondary),
    ...normalizeArray(indexedImage?.image?.symbols),
    ...normalizeArray(indexedImage?.image?.motion),
    ...normalizeArray(indexedImage?.image?.reading),
    ...normalizeArray(indexedImage?.image?.relations)
  ].join(" ");
  const structuralSurface = [
    ...normalizeArray(visual.setting_type),
    ...normalizeArray(visual.environment_type)
  ].join(" ");

  const strongActionCue = CROSSING_VERB_PATTERN.test(textSurface);
  const softAcrossCue = CROSSING_SOFT_PATTERN.test(textSurface);
  const textualPathCue = textHasAnyHint(textSurface, CROSSING_PATH_HINTS);
  const structuralPathCue = textHasAnyHint(structuralSurface, ["street", "bridge", "path", "crosswalk", "intersection", "public square"]);

  if (strongActionCue && (textualPathCue || (visual.has_people && structuralPathCue))) {
    return { matched: true, score: 18 };
  }
  if (softAcrossCue && textualPathCue) {
    return { matched: true, score: 11 };
  }
  return { matched: false, score: 0 };
}

function hasExpressionCue(indexedImage, termGroup) {
  const directSurface = [
    ...normalizeArray(indexedImage?.image?.primary),
    ...normalizeArray(indexedImage?.image?.secondary),
    String(indexedImage?.image?.alt || "")
  ];
  const semanticSurface = [
    ...directSurface,
    ...normalizeArray(indexedImage?.image?.mood),
    ...normalizeArray(indexedImage?.image?.themes),
    ...normalizeArray(indexedImage?.image?.reading),
    ...normalizeArray(indexedImage?.image?.relations)
  ];

  if (includesVariant(directSurface, termGroup.variants, termGroup.canonical)) {
    return { matched: true, score: 18 };
  }

  if (includesVariant(semanticSurface, termGroup.variants, termGroup.canonical)) {
    return { matched: true, score: 10 };
  }

  return { matched: false, score: 0 };
}

function hasActionCue(indexedImage, termGroup) {
  const directSurface = [
    ...normalizeArray(indexedImage?.image?.motion),
    ...normalizeArray(indexedImage?.image?.primary),
    String(indexedImage?.image?.alt || "")
  ];
  const semanticSurface = [
    ...directSurface,
    ...normalizeArray(indexedImage?.image?.secondary),
    ...normalizeArray(indexedImage?.image?.composition),
    ...normalizeArray(indexedImage?.image?.reading),
    ...normalizeArray(indexedImage?.image?.relations)
  ];

  if (includesVariant(directSurface, termGroup.variants, termGroup.canonical)) {
    return { matched: true, score: 16 };
  }

  if (includesVariant(semanticSurface, termGroup.variants, termGroup.canonical)) {
    return { matched: true, score: 9 };
  }

  return { matched: false, score: 0 };
}

function matchHardVisualTerm(indexedImage, termGroup, parsedQuery = null) {
  const visual = indexedImage.image.visual || {};
  const canonical = termGroup.canonical;
  const queryClass = termGroup.queryClass;
  const standaloneGeneric = isStandaloneGenericHardQuery(termGroup, parsedQuery);

  if (queryClass === "people") {
    if (canonical === "people") {
      if (!visual.has_people) return { matched: false, score: 0 };
      if (standaloneGeneric && visual.people_prominence !== "primary") return { matched: false, score: 0 };
      return { matched: true, score: visual.people_prominence === "primary" ? 14 : 10 };
    }
    if (canonical === "crowd") {
      return (visual.has_people && Number(visual.people_count) >= 4)
        ? { matched: true, score: 15 }
        : { matched: false, score: 0 };
    }
    if (canonical === "alone") {
      if (!(visual.has_people && Number(visual.people_count) === 1 && visual.people_prominence === "primary")) {
        return { matched: false, score: 0 };
      }
      if (!hasIsolationCue(indexedImage)) {
        return { matched: false, score: 0 };
      }

      return { matched: true, score: 18 };
    }
    if (canonical === "woman" || canonical === "man") {
      if (!(visual.gender || []).includes(canonical)) {
        return { matched: false, score: 0 };
      }

      if (visual.people_focus === canonical) {
        return { matched: true, score: visual.people_prominence === "primary" ? 18 : 12 };
      }

      if (visual.people_prominence !== "primary") {
        return { matched: false, score: 0 };
      }

      if ((!visual.people_focus || visual.people_focus === "person") && Number(visual.people_count) === 1) {
        return { matched: true, score: 11 };
      }

      return { matched: false, score: 0 };
    }
    if (canonical === "child") {
      if (!(visual.age_group || []).includes("child")) {
        return { matched: false, score: 0 };
      }

      if (visual.people_focus === "child") {
        return { matched: true, score: visual.people_prominence === "primary" ? 18 : 12 };
      }

      if (visual.people_prominence === "primary" && Number(visual.people_count) === 1) {
        return { matched: true, score: 8 };
      }

      return { matched: false, score: 0 };
    }
  }

  if (queryClass === "color") {
    if ((visual.color_mode || "") === "bw") return { matched: false, score: 0 };
    return (visual.dominant_colors || []).includes(canonical)
      ? { matched: true, score: 13 }
      : { matched: false, score: 0 };
  }

  if (queryClass === "color_mode") {
    if (canonical === "black and white" || canonical === "monochrome") {
      return visual.color_mode === "bw" ? { matched: true, score: 15 } : { matched: false, score: 0 };
    }
    if (canonical === "colorful") {
      return visual.color_mode === "colorful" ? { matched: true, score: 14 } : { matched: false, score: 0 };
    }
    if (canonical === "color") {
      return visual.color_mode !== "bw" ? { matched: true, score: 12 } : { matched: false, score: 0 };
    }
  }

  if (queryClass === "expression") {
    return hasExpressionCue(indexedImage, termGroup);
  }

  if (queryClass === "environment") {
    const environmentType = visual.environment_type || [];
    const settingType = visual.setting_type || [];
    if (canonical === "road") {
      return hasRoadCue(indexedImage);
    }

    if (canonical === "urban") {
      const matched = environmentType.includes("urban") || environmentType.includes("street");
      if (!matched) return { matched: false, score: 0 };
      if (standaloneGeneric && !hasUrbanCorroboration(indexedImage)) return { matched: false, score: 0 };
      return { matched: true, score: standaloneGeneric ? 10 : 13 };
    }

    if (canonical === "nature") {
      const hasNature = environmentType.includes("nature");
      const mixedUrban = environmentType.includes("urban") || environmentType.includes("street");
      const strongNatureSetting = settingType.includes("park") || settingType.includes("water edge");
      if (!hasNature) return { matched: false, score: 0 };
      if (!mixedUrban) return { matched: true, score: 15 };
      if (strongNatureSetting) return { matched: true, score: 9 };
      return { matched: true, score: 5 };
    }

    if (canonical === "outdoor") {
      const matched = environmentType.includes("outdoor");
      if (!matched) return { matched: false, score: 0 };
      if (standaloneGeneric && !(settingType.length || environmentType.includes("nature") || environmentType.includes("street"))) {
        return { matched: false, score: 0 };
      }
      return { matched: true, score: standaloneGeneric ? 10 : 13 };
    }

    const matched = environmentType.includes(canonical) || settingType.includes(canonical);
    if (!matched) return { matched: false, score: 0 };
    if (standaloneGeneric && canonical === "street" && !settingType.includes("street")) {
      return { matched: false, score: 0 };
    }
    return { matched: true, score: standaloneGeneric ? 10 : 13 };
  }

  if (queryClass === "object") {
    if (canonical === "animal") {
      const animalMatch = includesVariant(
        [...indexedImage.image.primary, ...indexedImage.image.objects],
        termGroup.variants,
        canonical
      );
      return animalMatch ? { matched: true, score: 12 } : { matched: false, score: 0 };
    }

    const prominence = getObjectProminence(indexedImage, termGroup);
    if (standaloneGeneric && prominence !== "primary") return { matched: false, score: 0 };
    if (prominence === "primary") return { matched: true, score: 16 };
    if (prominence === "secondary") return { matched: true, score: 10 };
    if (prominence === "background" && !STRICT_OBJECT_QUERY_CLASSES.has(queryClass)) return { matched: true, score: 4 };
    return { matched: false, score: 0 };
  }

  if (queryClass === "phrase") {
    if (canonical === "street dog") {
      const dogProminence = getObjectProminence(indexedImage, { canonical: "dog", variants: ["dog", "dogs", "puppy", "puppies"] });
      const streetMatch = hasDirectStreetCue(indexedImage);
      return dogProminence !== "none" && streetMatch
        ? { matched: true, score: dogProminence === "primary" ? 18 : 12 }
        : { matched: false, score: 0 };
    }

    if (canonical === "to cross") {
      return hasCrossingCue(indexedImage);
    }

    if (canonical === "old man") {
      const ageStage = String(visual.age_stage || indexedImage.image.age_stage || "").toLowerCase();
      const genders = visual.gender || [];
      const focusedOlderMan = visual.people_focus === "man";
      const singleOlderMan = Number(visual.people_count) === 1
        && !genders.includes("woman")
        && (!visual.people_focus || visual.people_focus === "person" || visual.people_focus === "man");
      return genders.includes("man") && visual.people_prominence === "primary" && ageStage === "older" && (focusedOlderMan || singleOlderMan)
        ? { matched: true, score: 18 }
        : { matched: false, score: 0 };
    }

    if (canonical === "phone screen") {
      const phoneProminence = getObjectProminence(indexedImage, { canonical: "phone", variants: ["phone", "phones", "smartphone", "smartphones", "mobile phone"] });
      return phoneProminence !== "none" && hasPhoneScreenCue(indexedImage)
        ? { matched: true, score: phoneProminence === "primary" ? 18 : 12 }
        : { matched: false, score: 0 };
    }

    if (canonical === "window reflection") {
      const windowProminence = getObjectProminence(indexedImage, { canonical: "window", variants: ["window", "windows", "pane", "panes", "windowpane"] });
      const reflectionMatch = String(indexedImage.image.manipulation || "").toLowerCase() === "reflection" ||
        includesVariant(indexedImage.image.composition, ["reflection"], "reflection") ||
        includesVariant(indexedImage.image.style, ["reflection study"], "reflection");
      return windowProminence !== "none" && reflectionMatch
        ? { matched: true, score: windowProminence === "primary" ? 18 : 12 }
        : { matched: false, score: 0 };
    }

    if (canonical === "public protest") {
      const protestValues = [
        ...indexedImage.image.secondary,
        ...indexedImage.image.objects,
        ...(indexedImage.image.alt ? [indexedImage.image.alt] : [])
      ];
      const protestPrimary = includesVariant(indexedImage.image.primary, ["protest", "protester", "protesters", "demonstration", "activists"], "protest");
      const protestReading = includesVariant(indexedImage.image.reading, ["protest", "demonstration", "protesters", "activists"], "protest");
      const explicitCrowdCue = includesVariant(
        protestValues,
        ["crowd", "protester", "protesters", "demonstration", "activists", "marchers", "banner", "banners"],
        "protester"
      );
      const signCue = includesVariant(
        protestValues,
        ["placard", "placards", "protest sign", "banner", "banners", "sign"],
        "banner"
      );
      const flagCue = includesVariant(
        protestValues,
        ["flag", "flags", "rainbow flag"],
        "flag"
      );
      const streetCue = (visual.setting_type || []).includes("street")
        || (visual.setting_type || []).includes("public square")
        || (visual.environment_type || []).includes("street")
        || includesVariant(indexedImage.image.secondary, ["street", "public space", "public square"], "street");
      const collectiveCue = Number(visual.people_count) >= 4 || visual.people_focus === "crowd";
      const strongProtestMatch = protestPrimary || protestReading || explicitCrowdCue || signCue || (flagCue && collectiveCue);
      if (strongProtestMatch && streetCue) {
        return { matched: true, score: collectiveCue ? 18 : 16 };
      }
      if (flagCue && streetCue) {
        return { matched: true, score: 11 };
      }
      return { matched: false, score: 0 };
    }

    if (canonical === "one color") {
      const projectTitle = String(indexedImage.image.projectTitle || "").toLowerCase();
      const exactGallery = projectTitle.includes("one color");
      return exactGallery
        ? { matched: true, score: 22 }
        : { matched: false, score: 0 };
    }

    if (canonical === "quite handy") {
      const projectTitle = String(indexedImage.image.projectTitle || "").toLowerCase();
      return projectTitle.includes("quite handy")
        ? { matched: true, score: 22 }
        : { matched: false, score: 0 };
    }
  }

  if (queryClass === "shot") {
    const shotType = visual.shot_type || "";
    const normalizedShot = canonical === "close up" ? "close_up"
      : canonical === "wide shot" ? "wide"
      : canonical;

    return shotType === normalizedShot
      ? { matched: true, score: 15 }
      : { matched: false, score: 0 };
  }

  if (queryClass === "action") {
    return hasActionCue(indexedImage, termGroup);
  }

  return { matched: false, score: 0 };
}

function getPremiumBoost(indexedImage) {
  const score = indexedImage?.image?.score;
  if (!score || typeof score !== "object") return 0;

  const impact = Number(score.impact) || 0;
  const originality = Number(score.originality) || 0;
  const emotion = Number(score.emotion) || 0;
  if (!impact && !originality && !emotion) return 0;

  const weightedAverage = ((impact * 0.35) + (originality * 0.35) + (emotion * 0.3)) / 10;
  return weightedAverage * 1.5;
}

function scoreField(indexedImage, fieldName, termGroup) {
  const values = indexedImage.fields[fieldName] || [];
  if (!values.length) return { matched: false, score: 0 };

  const { stemTerm } = getTagHelpers();
  let score = 0;
  let matched = false;

  values.forEach((value) => {
    const stemmedValue = stemTerm(value);
    if (!matchValue(value, stemmedValue, termGroup.variants, termGroup.canonical)) return;

    matched = true;
    score += FIELD_WEIGHTS[fieldName] || 2;
  });

  return { matched, score };
}

function isEmotionQuery(termGroup) {
  return termGroup.kind !== "hard" && EMOTION_QUERY_CANONICALS.has(termGroup.canonical);
}

function scoreEmotionTerm(indexedImage, termGroup) {
  let matched = false;
  let score = 0;
  const profile = EMOTION_QUERY_PROFILES[termGroup.canonical] || null;
  let primarySignal = 0;
  let secondarySignal = 0;
  let counterSignal = 0;

  Object.entries(EMOTION_QUERY_FIELDS).forEach(([fieldName, weight]) => {
    const values = indexedImage.fields[fieldName] || [];
    if (!values.length) return;

    values.forEach((value) => {
      if (!matchValue(value, getTagHelpers().stemTerm(value), termGroup.variants, termGroup.canonical)) return;
      matched = true;
      score += weight;
    });
  });

  if (profile) {
    EMOTION_SIGNAL_FIELDS.forEach((fieldName) => {
      const values = indexedImage.fields[fieldName] || [];
      if (!values.length) return;
      const weight = EMOTION_QUERY_FIELDS[fieldName] || 2;

      values.forEach((value) => {
        const stemmedValue = getTagHelpers().stemTerm(value);
        if (profile.primary.some((variant) => matchValue(value, stemmedValue, [variant], variant))) {
          primarySignal += weight;
        }
        if (profile.secondary.some((variant) => matchValue(value, stemmedValue, [variant], variant))) {
          secondarySignal += Math.max(1, weight - 1);
        }
        if (profile.counter.some((variant) => matchValue(value, stemmedValue, [variant], variant))) {
          counterSignal += Math.max(1, weight - 2);
        }
      });
    });

    if (primarySignal || secondarySignal) {
      matched = true;
      score += (primarySignal * 0.8) + (secondarySignal * 0.45);
    }

    if (counterSignal) {
      score = Math.max(1, score - (counterSignal * 0.35));
    }
  }

  return { matched, score };
}

function hasIsolationCue(indexedImage) {
  return (
    includesVariant(indexedImage.image.mood, ALONE_CUE_VARIANTS, "solitude") ||
    includesVariant(indexedImage.image.tone, ALONE_CUE_VARIANTS, "solitude") ||
    includesVariant(indexedImage.image.themes, ALONE_CUE_VARIANTS, "solitude") ||
    includesVariant(indexedImage.image.tension, ALONE_CUE_VARIANTS, "solitude") ||
    includesVariant(indexedImage.image.relations, ALONE_CUE_VARIANTS, "solitude") ||
    includesVariant(indexedImage.image.reading, ALONE_CUE_VARIANTS, "solitude") ||
    includesVariant(indexedImage.image.composition, ALONE_COMPOSITION_VARIANTS, "isolated subject")
  );
}

function isNegativeMatch(indexedImage, termGroup) {
  if (termGroup.kind === "hard") {
    return matchHardVisualTerm(indexedImage, termGroup, null).matched;
  }

  const explicitNegative = (indexedImage.fields.negative || []).some((value) =>
    matchValue(value, getTagHelpers().stemTerm(value), termGroup.variants, termGroup.canonical)
  );

  if (explicitNegative) return true;

  return indexedImage.allValues.some((value, valueIndex) =>
    matchValue(value, indexedImage.stemmedValues[valueIndex], termGroup.variants, termGroup.canonical)
  );
}

function scoreImage(indexedImage, parsedQuery) {
  if (!parsedQuery.normalized) {
    return {
      matched: true,
      score: 0,
      matchCount: 0
    };
  }

  if (parsedQuery.negative.some((termGroup) => isNegativeMatch(indexedImage, termGroup))) {
    return {
      matched: false,
      score: -Infinity,
      matchCount: 0
    };
  }

  let score = 0;
  let matchCount = 0;

  for (const termGroup of parsedQuery.positive) {
    let termMatched = false;
    let termScore = 0;

    if (termGroup.kind === "hard") {
      const hardResult = matchHardVisualTerm(indexedImage, termGroup, parsedQuery);
      termMatched = hardResult.matched;
      termScore = hardResult.score;
    } else if (isEmotionQuery(termGroup)) {
      const emotionResult = scoreEmotionTerm(indexedImage, termGroup);
      termMatched = emotionResult.matched;
      termScore = emotionResult.score;
    } else {
      Object.keys(indexedImage.fields).forEach((fieldName) => {
        if (fieldName === "negative") return;
        const fieldResult = scoreField(indexedImage, fieldName, termGroup);
        if (!fieldResult.matched) return;
        termMatched = true;
        termScore += fieldResult.score;
      });
    }

    if (!termMatched) {
      return {
        matched: false,
        score: 0,
        matchCount
      };
    }

    score += termScore;
    matchCount += 1;
  }

  if (parsedQuery.positive.length > 1 && matchCount === parsedQuery.positive.length) {
    score += parsedQuery.positive.length * 2;
  }

  score += getPremiumBoost(indexedImage);

  return {
    matched: true,
    score,
    matchCount
  };
}

function searchImages(indexedImages, query) {
  const { parseQuery } = getTagHelpers();
  const parsedQuery = parseQuery(query);

  if (!parsedQuery.normalized) {
    return {
      parsedQuery,
      mode: "empty",
      results: []
    };
  }

  if (!parsedQuery.positive.length && parsedQuery.negative.length) {
    const negativeMatches = indexedImages
      .filter((indexedImage) => !parsedQuery.negative.some((termGroup) => isNegativeMatch(indexedImage, termGroup)))
      .sort((left, right) =>
        left.image.projectIndex - right.image.projectIndex ||
        left.image.imageIndex - right.image.imageIndex
      );

    return {
      parsedQuery,
      mode: "negative",
      results: negativeMatches
    };
  }

  const andMatches = indexedImages
    .map((indexedImage) => {
      const result = scoreImage(indexedImage, parsedQuery);
      return { indexedImage, ...result };
    })
    .filter((result) => result.matched && result.score > 0)
    .sort((left, right) =>
      right.score - left.score ||
      left.indexedImage.image.projectIndex - right.indexedImage.image.projectIndex ||
      left.indexedImage.image.imageIndex - right.indexedImage.image.imageIndex
    )
    .map((result) => ({ ...result.indexedImage, _score: result.score }));

  if (andMatches.length) {
    return {
      parsedQuery,
      mode: "and",
      results: andMatches
    };
  }

  if (parsedQuery.positive.length <= 1) {
    return {
      parsedQuery,
      mode: "and",
      results: []
    };
  }

  if (parsedQuery.hasHardPositive && !parsedQuery.hasSoftPositive) {
    return {
      parsedQuery,
      mode: "and",
      results: []
    };
  }

  const orMatches = indexedImages
    .map((indexedImage) => {
      if (parsedQuery.negative.some((termGroup) => isNegativeMatch(indexedImage, termGroup))) {
        return null;
      }

      let score = 0;
      let matchedTerms = 0;
      let matchedSoftTerms = 0;
      let hardMismatch = false;

      parsedQuery.positive.forEach((termGroup) => {
        if (termGroup.kind === "hard") {
          const hardResult = matchHardVisualTerm(indexedImage, termGroup, parsedQuery);
          if (!hardResult.matched) {
            hardMismatch = true;
            return;
          }

          matchedTerms += 1;
          score += hardResult.score;
          return;
        }

        if (isEmotionQuery(termGroup)) {
          const emotionResult = scoreEmotionTerm(indexedImage, termGroup);
          if (!emotionResult.matched) return;
          matchedTerms += 1;
          matchedSoftTerms += 1;
          score += emotionResult.score;
          return;
        }

        let termMatched = false;
        Object.keys(indexedImage.fields).forEach((fieldName) => {
          if (fieldName === "negative") return;
          const fieldResult = scoreField(indexedImage, fieldName, termGroup);
          if (!fieldResult.matched) return;
          termMatched = true;
          score += fieldResult.score;
        });

        if (termMatched) {
          matchedTerms += 1;
          matchedSoftTerms += 1;
        }
      });

      if (hardMismatch || !matchedTerms || !score) return null;
      if (parsedQuery.hasHardPositive && parsedQuery.hasSoftPositive && !matchedSoftTerms) return null;

      return {
        ...indexedImage,
        _score: score + matchedTerms + getPremiumBoost(indexedImage)
      };
    })
    .filter(Boolean)
    .sort((left, right) =>
      right._score - left._score ||
      left.image.projectIndex - right.image.projectIndex ||
      left.image.imageIndex - right.image.imageIndex
    );

  return {
    parsedQuery,
    mode: "or",
    results: orMatches
  };
}

function debugScoreField(indexedImage, fieldName, termGroup) {
  const values = indexedImage.fields[fieldName] || [];
  const matches = [];

  values.forEach((value) => {
    if (!matchValue(value, getTagHelpers().stemTerm(value), termGroup.variants, termGroup.canonical)) return;
    matches.push(value);
  });

  return {
    matched: matches.length > 0,
    score: matches.length * (FIELD_WEIGHTS[fieldName] || 2),
    matches
  };
}

function debugScoreEmotionTerm(indexedImage, termGroup) {
  const breakdown = [];
  const baseResult = scoreEmotionTerm(indexedImage, termGroup);
  const profile = EMOTION_QUERY_PROFILES[termGroup.canonical] || null;

  Object.entries(EMOTION_QUERY_FIELDS).forEach(([fieldName, weight]) => {
    const values = indexedImage.fields[fieldName] || [];
    if (!values.length) return;

    const direct = [];
    const primary = [];
    const secondary = [];
    const counter = [];

    values.forEach((value) => {
      const stemmed = getTagHelpers().stemTerm(value);
      if (matchValue(value, stemmed, termGroup.variants, termGroup.canonical)) direct.push(value);
      if (profile?.primary?.some((variant) => matchValue(value, stemmed, [variant], variant))) primary.push(value);
      if (profile?.secondary?.some((variant) => matchValue(value, stemmed, [variant], variant))) secondary.push(value);
      if (profile?.counter?.some((variant) => matchValue(value, stemmed, [variant], variant))) counter.push(value);
    });

    if (!(direct.length || primary.length || secondary.length || counter.length)) return;

    breakdown.push({
      field: fieldName,
      weight,
      direct,
      primary,
      secondary,
      counter
    });
  });

  return {
    ...baseResult,
    breakdown
  };
}

function buildHardDebugDetails(indexedImage, termGroup, parsedQuery, hardResult) {
  const visual = indexedImage.image.visual || {};
  return {
    queryClass: termGroup.queryClass,
    precisionProfile: termGroup.precisionProfile || "",
    genericStandalone: isStandaloneGenericHardQuery(termGroup, parsedQuery),
    matched: hardResult.matched,
    score: hardResult.score,
    visual: {
      people_focus: visual.people_focus || "",
      people_prominence: visual.people_prominence || "",
      people_count: visual.people_count ?? 0,
      gender: visual.gender || [],
      age_group: visual.age_group || [],
      age_stage: visual.age_stage || "",
      color_mode: visual.color_mode || "",
      dominant_colors: visual.dominant_colors || [],
      environment_type: visual.environment_type || [],
      setting_type: visual.setting_type || [],
      shot_type: visual.shot_type || "",
      screen_visible: Boolean(visual.screen_visible),
      object_role: getExplicitObjectRole(indexedImage, termGroup)
    }
  };
}

function debugScoreImage(indexedImage, parsedQuery) {
  if (!parsedQuery.normalized) {
    return { matched: true, score: 0, matchCount: 0, terms: [], bonus: { multi: 0, premium: 0 } };
  }

  const negativeMatches = parsedQuery.negative
    .filter((termGroup) => isNegativeMatch(indexedImage, termGroup))
    .map((termGroup) => termGroup.canonical);

  if (negativeMatches.length) {
    return {
      matched: false,
      score: -Infinity,
      matchCount: 0,
      negativeMatches,
      terms: [],
      bonus: { multi: 0, premium: 0 }
    };
  }

  let score = 0;
  let matchCount = 0;
  const termDebug = [];

  for (const termGroup of parsedQuery.positive) {
    if (termGroup.kind === "hard") {
      const hardResult = matchHardVisualTerm(indexedImage, termGroup, parsedQuery);
      termDebug.push({
        token: termGroup.token,
        canonical: termGroup.canonical,
        kind: "hard",
        ...buildHardDebugDetails(indexedImage, termGroup, parsedQuery, hardResult)
      });
      if (!hardResult.matched) {
        return { matched: false, score: 0, matchCount, terms: termDebug, bonus: { multi: 0, premium: 0 } };
      }
      score += hardResult.score;
      matchCount += 1;
      continue;
    }

    if (isEmotionQuery(termGroup)) {
      const emotionResult = debugScoreEmotionTerm(indexedImage, termGroup);
      termDebug.push({
        token: termGroup.token,
        canonical: termGroup.canonical,
        kind: "emotion",
        matched: emotionResult.matched,
        score: emotionResult.score,
        fields: emotionResult.breakdown
      });
      if (!emotionResult.matched) {
        return { matched: false, score: 0, matchCount, terms: termDebug, bonus: { multi: 0, premium: 0 } };
      }
      score += emotionResult.score;
      matchCount += 1;
      continue;
    }

    const fieldBreakdown = [];
    let termMatched = false;
    let termScore = 0;

    Object.keys(indexedImage.fields).forEach((fieldName) => {
      if (fieldName === "negative") return;
      const fieldResult = debugScoreField(indexedImage, fieldName, termGroup);
      if (!fieldResult.matched) return;
      termMatched = true;
      termScore += fieldResult.score;
      fieldBreakdown.push({ field: fieldName, score: fieldResult.score, matches: fieldResult.matches });
    });

    termDebug.push({
      token: termGroup.token,
      canonical: termGroup.canonical,
      kind: "soft",
      matched: termMatched,
      score: termScore,
      fields: fieldBreakdown
    });

    if (!termMatched) {
      return { matched: false, score: 0, matchCount, terms: termDebug, bonus: { multi: 0, premium: 0 } };
    }

    score += termScore;
    matchCount += 1;
  }

  const multiBonus = parsedQuery.positive.length > 1 && matchCount === parsedQuery.positive.length
    ? parsedQuery.positive.length * 2
    : 0;
  const premiumBonus = getPremiumBoost(indexedImage);
  score += multiBonus + premiumBonus;

  return {
    matched: true,
    score,
    matchCount,
    terms: termDebug,
    bonus: {
      multi: multiBonus,
      premium: premiumBonus
    }
  };
}

function searchImagesDetailed(indexedImages, query) {
  const { parseQuery } = getTagHelpers();
  const parsedQuery = parseQuery(query);
  const rawResults = searchImages(indexedImages, query);

  const results = rawResults.results.map((indexedImage) => ({
    ...indexedImage,
    _debug: debugScoreImage(indexedImage, parsedQuery)
  }));

  return {
    ...rawResults,
    parsedQuery,
    results
  };
}

function enableDecodeFade(images) {
  images.forEach((img) => {
    if (img.complete) {
      img.classList.add("is-ready");
      return;
    }

    img.addEventListener("load", async () => {
      try {
        if (img.decode) await img.decode();
      } catch (_error) {}
      img.classList.add("is-ready");
    }, { once: true });
  });
}

function createTagPill(text) {
  const pill = document.createElement("span");
  pill.className = "search-result-tag";
  pill.textContent = text;
  return pill;
}

function createSearchResultCard(indexedImage, index) {
  const { image, keyTags } = indexedImage;
  const card = document.createElement("article");
  card.className = `search-result-card search-result-card--tone-${(index % 3) + 1}`;

  const link = document.createElement("a");
  link.className = "search-result-link";
  link.href = image.projectUrl || `project-${encodeURIComponent(image.projectSlug)}.html`;

  const mediaWrap = document.createElement("div");
  mediaWrap.className = "search-result-media-wrap";

  const media = document.createElement("img");
  media.className = "search-result-media";
  media.alt = image.alt || image.projectTitle || "MotoSynteza search result image";
  media.loading = index < 8 ? "eager" : "lazy";
  if (index < 4) media.setAttribute("fetchpriority", "high");
  media.decoding = "async";
  media.src = image.imageUrl;
  mediaWrap.appendChild(media);

  if (keyTags.length) {
    const overlay = document.createElement("div");
    overlay.className = "search-result-tags";
    keyTags.forEach((tag) => overlay.appendChild(createTagPill(tag)));
    mediaWrap.appendChild(overlay);
  }

  const copy = document.createElement("div");
  copy.className = "search-result-copy";

  const meta = document.createElement("p");
  meta.className = "search-result-meta";
  meta.textContent = image.projectTitle || image.projectSlug;

  const title = document.createElement("h2");
  title.textContent = image.alt || image.projectTitle || "Untitled image";

  const desc = document.createElement("p");
  desc.textContent = image.reading[0] || image.caption || image.projectDescription || "Open the gallery to explore the full visual context.";

  const enter = document.createElement("span");
  enter.className = "search-result-enter";
  enter.textContent = "Open gallery →";

  copy.appendChild(meta);
  copy.appendChild(title);
  copy.appendChild(desc);
  copy.appendChild(enter);

  link.appendChild(mediaWrap);
  link.appendChild(copy);
  card.appendChild(link);

  return card;
}

function renderEmptyState(resultsEl, query) {
  const empty = document.createElement("section");
  empty.className = "search-empty-state";

  const title = document.createElement("h2");
  title.textContent = query
    ? `No images matched "${query}".`
    : "Start with a keyword.";

  const copy = document.createElement("p");
  copy.textContent = query
    ? "Try broader terms, or remove a negative phrase like no people."
    : "Use the sidebar search to explore objects, moods, symbols, colors, and styles.";

  empty.appendChild(title);
  empty.appendChild(copy);
  resultsEl.appendChild(empty);
}

function renderResults(resultsEl, results, query) {
  resultsEl.innerHTML = "";

  if (!results.length) {
    renderEmptyState(resultsEl, query);
    return;
  }

  const fragment = document.createDocumentFragment();
  results.forEach((indexedImage, index) => {
    fragment.appendChild(createSearchResultCard(indexedImage, index));
  });

  resultsEl.appendChild(fragment);
  enableDecodeFade([...resultsEl.querySelectorAll(".search-result-media")]);
}

function updateResultsSummary(summaryEl, resultState, totalCount, renderedCount = resultState.results.length) {
  const query = resultState.parsedQuery.raw.trim();

  if (!query) {
    if (typeof totalCount === "number") {
      summaryEl.textContent = `Search across ${totalCount} indexed images by object, mood, color, symbol, or absence.`;
      return;
    }

    summaryEl.textContent = "Search by object, mood, color, symbol, or absence to load matching images.";
    return;
  }

  if (!resultState.results.length) {
    summaryEl.textContent = `No image matched "${query}". Try fewer words or remove a negative phrase.`;
    return;
  }

  const label = resultState.results.length === 1 ? "image" : "images";
  if (resultState.mode === "or") {
    if (renderedCount < resultState.results.length) {
      summaryEl.textContent = `Showing first ${renderedCount} of ${resultState.results.length} ${label} loosely matching "${query}" through partial semantic overlap. Refine the query to narrow further.`;
      return;
    }

    summaryEl.textContent = `${resultState.results.length} ${label} loosely matched "${query}" through partial semantic overlap.`;
    return;
  }

  if (resultState.mode === "negative") {
    if (renderedCount < resultState.results.length) {
      summaryEl.textContent = `Showing first ${renderedCount} of ${resultState.results.length} ${label} matching the absence filter "${query}". Refine the query to narrow further.`;
      return;
    }

    summaryEl.textContent = `${resultState.results.length} ${label} matched the absence filter "${query}".`;
    return;
  }

  if (renderedCount < resultState.results.length) {
    summaryEl.textContent = `Showing first ${renderedCount} of ${resultState.results.length} ${label} matching "${query}" across the visual index. Refine the query to narrow further.`;
    return;
  }

  summaryEl.textContent = `${resultState.results.length} ${label} matched "${query}" across the visual index.`;
}

async function renderSearch(query) {
  const summaryEl = document.getElementById("search-results-summary");
  const resultsEl = document.getElementById("search-results");
  if (!summaryEl || !resultsEl) return;

  const normalizedQuery = String(query || "").trim();
  const indexedImages = normalizedQuery ? await loadSearchIndex() : [];
  const resultState = searchImages(indexedImages, query);
  const renderedResults = resultState.results.slice(0, MAX_RENDERED_RESULTS);

  SEARCH_STATE.currentQuery = query;
  renderResults(resultsEl, renderedResults, query);
  updateResultsSummary(summaryEl, resultState, normalizedQuery ? indexedImages.length : null, renderedResults.length);
  writeSearchStateToUrl({ query });

  if (typeof window.setSidebarSearchValue === "function") {
    window.setSidebarSearchValue(query);
  }
}

function scheduleSearchPageQueryUpdate(query) {
  clearTimeout(SEARCH_STATE.debounceTimer);
  SEARCH_STATE.debounceTimer = window.setTimeout(() => {
    void renderSearch(query);
  }, 250);
}

function updateSearchPageQuery(query) {
  clearTimeout(SEARCH_STATE.debounceTimer);
  void renderSearch(query);
}

async function initSearchPage() {
  if (document.body.dataset.page !== "search") return;

  const summaryEl = document.getElementById("search-results-summary");
  const resultsEl = document.getElementById("search-results");
  if (!summaryEl || !resultsEl) return;

  try {
    const state = readSearchStateFromUrl();
    await renderSearch(state.query.trim());
  } catch (error) {
    console.error(error);
    resultsEl.innerHTML = "";
    renderEmptyState(resultsEl, "");
    summaryEl.textContent = "The image index could not be loaded right now.";
  }
}

window.initSearchPage = initSearchPage;
window.scheduleSearchPageQueryUpdate = scheduleSearchPageQueryUpdate;
window.updateSearchPageQuery = updateSearchPageQuery;
window.MotoSearchRuntime = {
  loadSearchIndex,
  searchImages,
  searchImagesDetailed,
  normalizeImage,
  indexImage,
  getObjectProminence
};

document.addEventListener("DOMContentLoaded", initSearchPage);

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

const SEARCH_STRING_FIELDS = ["density", "pov", "manipulation", "alt", "caption", "projectTitle", "projectDescription"];
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

function includesVariant(values, variants, canonical) {
  const { normalizeTerm, stemTerm } = getTagHelpers();
  return normalizeArray(values).some((value) => {
    const normalized = normalizeTerm(value);
    const stemmed = stemTerm(value);
    return variants.some((variant) => (
      variant &&
      (normalized === variant ||
        normalized.includes(variant) ||
        stemmed === variant ||
        stemmed.includes(variant) ||
        normalized.includes(canonical))
    ));
  });
}

function textHasHint(text, hint) {
  const normalizedText = String(text || "").toLowerCase();
  const normalizedHint = String(hint || "").toLowerCase().trim();
  if (!normalizedHint) return false;
  if (normalizedHint.includes(" ")) return normalizedText.includes(normalizedHint);
  const pattern = new RegExp(`(^|[^a-z])${normalizedHint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^a-z])`, "i");
  return pattern.test(normalizedText);
}

function textHasAnyHint(text, hints = []) {
  return hints.some((hint) => textHasHint(text, hint));
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
  const humanHintCount = HUMAN_VISUAL_HINTS.filter((hint) => textHasHint(combinedText, hint)).length;

  const peopleCount = Number.isFinite(image.people_count)
    ? Number(image.people_count)
    : textHasAnyHint(combinedText, CROWD_VISUAL_HINTS) ? 5
      : textHasAnyHint(combinedText, PLURAL_PEOPLE_HINTS) ? 3
      : (/\band\b/.test(combinedText) && humanHintCount >= 2) ? 2
      : hasPeople ? 1 : 0;

  const gender = normalizeMaybeArray(image.gender);
  if (!gender.length) {
    if (textHasAnyHint(combinedText, ["woman", "women", "female", "nun", "nuns"])) {
      gender.push("woman");
    }
    if (textHasAnyHint(combinedText, ["man", "men", "male", "priest", "priests"])) {
      gender.push("man");
    }
  }

  const ageGroup = normalizeMaybeArray(image.age_group);
  if (!ageGroup.length) {
    if (textHasAnyHint(combinedText, ["child", "children", "boy", "boys", "girl", "girls", "baby", "babies"])) {
      ageGroup.push("child");
    } else if (hasPeople) {
      ageGroup.push("adult");
    }
  }

  let peopleProminence = String(image.people_prominence || "").trim().toLowerCase();
  if (!peopleProminence) {
    const leadText = combinedText.split(/\s+/).slice(0, 8).join(" ");
    peopleProminence = hasPeople
      ? textHasAnyHint(leadText, HUMAN_VISUAL_HINTS) ? "primary" : "secondary"
      : "none";
  }

  const colorMode = String(image.color_mode || "").trim().toLowerCase() ||
    (String(image.manipulation || "").trim().toLowerCase() === "monochrome" ? "bw" :
      (colors.length >= 3 || COLORFUL_HINTS.some((hint) => combinedText.includes(hint)) ? "colorful" : "color"));

  const dominantColors = normalizeMaybeArray(image.dominant_colors);
  if (!dominantColors.length) {
    dominantColors.push(...colors);
  }

  const environmentType = normalizeMaybeArray(image.environment_type);
  if (!environmentType.length) {
    const natureHintCount = ["river", "pond", "water", "grass", "leaf", "leaves", "flower", "flowers", "tree", "trees", "branch", "branches"]
      .filter((hint) => textHasHint(combinedText, hint))
      .length;

    if (environment.some((value) => /street|city|public space|urban/.test(normalizeTerm(value))) || /street|crosswalk|sidewalk|intersection/.test(combinedText)) {
      environmentType.push("street", "urban", "outdoor");
    }
    if (environment.some((value) => /nature|urban nature|water edge/.test(normalizeTerm(value))) || natureHintCount >= 2) {
      environmentType.push("nature", "outdoor");
    }
    if (/interior|indoor|room|kitchen|bedroom|table/.test(combinedText)) {
      environmentType.push("indoor");
    }
    if (/home|house|domestic|kitchen|bedroom|room/.test(combinedText)) {
      environmentType.push("domestic", "indoor");
    }
  }

  const settingType = normalizeMaybeArray(image.setting_type);
  if (!settingType.length) {
    if (/street|crosswalk|sidewalk|intersection/.test(combinedText)) settingType.push("street");
    if (/park/.test(combinedText)) settingType.push("park");
    if (/public square/.test(combinedText)) settingType.push("public square");
    if (/window/.test(combinedText)) settingType.push("window");
    if (/river|pond|water/.test(combinedText)) settingType.push("water edge");
    if (/kitchen|room|bedroom|table/.test(combinedText)) settingType.push("domestic");
  }

  let shotType = String(image.shot_type || "").trim().toLowerCase();
  if (!shotType) {
    if (composition.some((value) => normalizeTerm(value) === "close crop") || /close up|close-up/.test(combinedText)) {
      shotType = "close_up";
    } else if (/detail/.test(combinedText)) {
      shotType = "detail";
    } else if (composition.some((value) => /bird's-eye view|overhead view/.test(normalizeTerm(value))) || /wide shot|wide view|wide scene/.test(combinedText)) {
      shotType = "wide";
    } else if ((combinedText.includes("portrait") || combinedText.includes("face")) && hasPeople) {
      shotType = "portrait";
    }
  }

  return {
    has_people: hasPeople,
    people_count: peopleCount,
    gender: normalizeArray(gender),
    age_group: normalizeArray(ageGroup),
    people_prominence: peopleProminence || "none",
    color_mode: colorMode || "color",
    dominant_colors: normalizeArray(dominantColors),
    environment_type: normalizeArray(environmentType),
    setting_type: normalizeArray(settingType),
    shot_type: shotType
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
    people_prominence: String(image?.people_prominence || "").trim(),
    color_mode: String(image?.color_mode || "").trim(),
    dominant_colors: normalizeMaybeArray(image?.dominant_colors),
    environment_type: normalizeMaybeArray(image?.environment_type),
    setting_type: normalizeMaybeArray(image?.setting_type),
    shot_type: String(image?.shot_type || "").trim()
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
  const sources = [
    `data/images-search.generated.json${version}`,
    `data/images.json${version}`
  ];

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
  return variants.some((variant) => {
    if (!variant) return false;
    return value === variant ||
      value.includes(variant) ||
      stemmedValue === variant ||
      stemmedValue.includes(variant) ||
      value.includes(canonical);
  });
}

function getObjectProminence(indexedImage, termGroup) {
  if (includesVariant(indexedImage.image.primary, termGroup.variants, termGroup.canonical)) return "primary";
  if (includesVariant(indexedImage.image.objects, termGroup.variants, termGroup.canonical)) return "secondary";
  if (includesVariant(indexedImage.image.secondary, termGroup.variants, termGroup.canonical) ||
    includesVariant([indexedImage.image.alt], termGroup.variants, termGroup.canonical)) {
    return "background";
  }
  return "none";
}

function matchHardVisualTerm(indexedImage, termGroup) {
  const visual = indexedImage.image.visual || {};
  const canonical = termGroup.canonical;
  const queryClass = termGroup.queryClass;

  if (queryClass === "people") {
    if (canonical === "people") {
      return visual.has_people ? { matched: true, score: visual.people_prominence === "primary" ? 14 : 10 } : { matched: false, score: 0 };
    }
    if (canonical === "crowd") {
      return (visual.has_people && Number(visual.people_count) >= 4)
        ? { matched: true, score: 15 }
        : { matched: false, score: 0 };
    }
    if (canonical === "alone") {
      return (visual.has_people && Number(visual.people_count) === 1 && visual.people_prominence === "primary")
        ? { matched: true, score: 14 }
        : { matched: false, score: 0 };
    }
    if (canonical === "woman" || canonical === "man") {
      return (visual.gender || []).includes(canonical)
        ? { matched: true, score: visual.people_prominence === "primary" ? 16 : 7 }
        : { matched: false, score: 0 };
    }
    if (canonical === "child") {
      return (visual.age_group || []).includes("child")
        ? { matched: true, score: visual.people_prominence === "primary" ? 16 : 7 }
        : { matched: false, score: 0 };
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

  if (queryClass === "environment") {
    const environmentType = visual.environment_type || [];
    const settingType = visual.setting_type || [];
    if (canonical === "urban") {
      return (environmentType.includes("urban") || environmentType.includes("street"))
        ? { matched: true, score: 13 }
        : { matched: false, score: 0 };
    }

    const matched = environmentType.includes(canonical) || settingType.includes(canonical);
    return matched ? { matched: true, score: 13 } : { matched: false, score: 0 };
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
    if (prominence === "primary") return { matched: true, score: 16 };
    if (prominence === "secondary") return { matched: true, score: 10 };
    if (prominence === "background") return { matched: true, score: 4 };
    return { matched: false, score: 0 };
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

function isNegativeMatch(indexedImage, termGroup) {
  if (termGroup.kind === "hard") {
    return matchHardVisualTerm(indexedImage, termGroup).matched;
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
      const hardResult = matchHardVisualTerm(indexedImage, termGroup);
      termMatched = hardResult.matched;
      termScore = hardResult.score;
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
      mode: "all",
      results: [...indexedImages].sort((left, right) =>
        left.image.projectIndex - right.image.projectIndex ||
        left.image.imageIndex - right.image.imageIndex
      )
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
          const hardResult = matchHardVisualTerm(indexedImage, termGroup);
          if (!hardResult.matched) {
            hardMismatch = true;
            return;
          }

          matchedTerms += 1;
          score += hardResult.score;
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
    : "No images are available right now.";

  const copy = document.createElement("p");
  copy.textContent = query
    ? "Try broader terms, or remove a negative phrase like no people."
    : "Use the sidebar search to explore objects, moods, symbols, and styles.";

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

function updateResultsSummary(summaryEl, resultState, totalCount) {
  const query = resultState.parsedQuery.raw.trim();

  if (!query) {
    summaryEl.textContent = `Showing all ${totalCount} images. Use the sidebar to search by object, mood, color, symbol, or absence.`;
    return;
  }

  if (!resultState.results.length) {
    summaryEl.textContent = `No image matched "${query}". Try fewer words or remove a negative phrase.`;
    return;
  }

  const label = resultState.results.length === 1 ? "image" : "images";
  if (resultState.mode === "or") {
    summaryEl.textContent = `${resultState.results.length} ${label} loosely matched "${query}" through partial semantic overlap.`;
    return;
  }

  if (resultState.mode === "negative") {
    summaryEl.textContent = `${resultState.results.length} ${label} matched the absence filter "${query}".`;
    return;
  }

  summaryEl.textContent = `${resultState.results.length} ${label} matched "${query}" across the visual index.`;
}

async function renderSearch(query) {
  const summaryEl = document.getElementById("search-results-summary");
  const resultsEl = document.getElementById("search-results");
  if (!summaryEl || !resultsEl) return;

  const indexedImages = await loadSearchIndex();
  const resultState = searchImages(indexedImages, query);

  SEARCH_STATE.currentQuery = query;
  renderResults(resultsEl, resultState.results, query);
  updateResultsSummary(summaryEl, resultState, indexedImages.length);
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

document.addEventListener("DOMContentLoaded", initSearchPage);

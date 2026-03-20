(function () {
  const TAG_MAP = {
    happy: ["happy", "happiness", "joy", "joyful", "cheerful", "delight", "delightful", "playful", "playfulness", "warmth", "lightness", "companionship", "tenderness", "openness", "smile", "smiling", "laughter", "laughing"],
    lonely: ["lonely", "loneliness", "isolated", "isolation", "solitude", "alienation", "emptiness", "distance", "withdrawal", "silence", "anonymity"],
    sad: ["sad", "sadness", "melancholy", "sorrow", "grief", "lonely", "loneliness", "solitude", "alienation", "detachment", "fatigue", "withdrawal", "reserve", "fragility"],
    quiet: ["quiet", "quietness", "silence", "stillness", "restraint", "calm", "hushed", "muted", "contemplation"],
    urban: ["urban", "city", "street", "metropolitan", "public space", "sidewalk"],
    hand: ["hand", "hands", "gesture", "palm", "fingers", "glove", "peace sign"],
    people: ["people", "person", "persons", "human", "humans", "figure", "figures", "pedestrian", "pedestrians"],
    blue: ["blue", "azure", "cobalt", "cyan"],
    cold: ["cold", "winter", "icy", "ice", "snow", "frozen", "frigid", "chill"],
    minimalism: ["minimalism", "minimal", "sparse", "empty", "reduced", "clean", "restraint"],
    window: ["window", "windows", "pane", "panes", "windowpane", "windowpanes"],
    bird: ["bird", "birds", "pigeon", "pigeons", "crow", "crows", "gull", "gulls", "duck", "ducks", "stork", "storks", "heron", "herons", "sparrow", "sparrows", "seagull", "seagulls"],
    protest: ["protest", "protester", "protesters", "demonstration", "march", "activism", "resistance"],
    absurd: ["absurd", "absurdity", "surreal", "irony", "ironic", "humor", "humour", "wit"],
    symbol: ["symbol", "symbols", "symbolic", "metaphor", "allegory", "sign"],
    dark: ["dark", "black", "shadow", "shadowy", "gloom"],
    calm: ["calm", "quiet", "quietness", "stillness", "peace", "meditative", "soft", "gentleness", "clarity", "patience", "contemplation", "suspension"],
    color: ["color", "colour", "colored", "colourful", "vivid", "multicolor", "multicolour"],
    monochrome: ["monochrome", "black and white", "black-and-white", "grayscale", "greyscale"]
  };

  const HARD_VISUAL_MAP = {
    woman: { queryClass: "people", variants: ["woman", "women", "female"], precisionProfile: "strict" },
    man: { queryClass: "people", variants: ["man", "men", "male"], precisionProfile: "strict" },
    child: { queryClass: "people", variants: ["child", "children", "kid", "kids", "boy", "boys", "girl", "girls", "baby", "babies"], precisionProfile: "strict" },
    crowd: { queryClass: "people", variants: ["crowd", "crowds", "group", "groups", "people", "pedestrians", "protesters", "marchers", "choir", "procession", "gathering"], precisionProfile: "strict" },
    people: { queryClass: "people", variants: ["people", "person", "persons", "human", "humans", "figure", "figures", "pedestrian", "pedestrians"], precisionProfile: "generic", generic: true },
    alone: { queryClass: "people", variants: ["alone", "solitary", "single person"], precisionProfile: "strict" },
    blue: { queryClass: "color", variants: ["blue", "azure", "cobalt", "cyan"], precisionProfile: "balanced" },
    red: { queryClass: "color", variants: ["red", "scarlet", "crimson"], precisionProfile: "balanced" },
    yellow: { queryClass: "color", variants: ["yellow", "gold", "golden"], precisionProfile: "balanced" },
    color: { queryClass: "color_mode", variants: ["color", "colour", "blue", "red", "yellow", "green", "orange", "purple", "pink"], precisionProfile: "balanced" },
    "black and white": { queryClass: "color_mode", variants: ["black and white", "black-and-white", "bw"], precisionProfile: "strict" },
    monochrome: { queryClass: "color_mode", variants: ["monochrome", "grayscale", "greyscale"], precisionProfile: "strict" },
    colorful: { queryClass: "color_mode", variants: ["colorful", "colourful", "vivid", "multicolor", "multicolour", "rainbow"], precisionProfile: "balanced" },
    indoor: { queryClass: "environment", variants: ["indoor", "indoors", "inside", "interior", "room", "kitchen", "studio"], precisionProfile: "balanced" },
    outdoor: { queryClass: "environment", variants: ["outdoor", "outdoors", "outside", "open air"], precisionProfile: "generic", generic: true },
    street: { queryClass: "environment", variants: ["street", "sidewalk", "crosswalk", "intersection"], precisionProfile: "generic", generic: true },
    urban: { queryClass: "environment", variants: ["urban", "city", "public space", "public square"], precisionProfile: "generic", generic: true },
    nature: { queryClass: "environment", variants: ["nature", "natural", "park", "garden", "field", "river", "pond", "water edge", "tree", "trees", "branch", "branches", "flower", "flowers", "grass"], precisionProfile: "balanced" },
    domestic: { queryClass: "environment", variants: ["domestic", "home", "house", "apartment", "kitchen", "room"], precisionProfile: "balanced" },
    dog: { queryClass: "object", variants: ["dog", "dogs", "puppy", "puppies", "canine"], precisionProfile: "strict" },
    animal: { queryClass: "object", variants: ["animal", "animals", "dog", "dogs", "cat", "cats", "bird", "birds", "duck", "gull", "stork", "heron", "pigeon"], precisionProfile: "balanced" },
    bird: { queryClass: "object", variants: ["bird", "birds", "pigeon", "pigeons", "duck", "ducks", "gull", "gulls", "seagull", "seagulls", "stork", "storks", "heron", "herons", "sparrow", "sparrows", "crow", "crows"], precisionProfile: "strict" },
    window: { queryClass: "object", variants: ["window", "windows", "pane", "panes", "windowpane", "windowpanes", "shop window", "storefront window"], precisionProfile: "strict" },
    umbrella: { queryClass: "object", variants: ["umbrella", "umbrellas", "parasol", "parasols"], precisionProfile: "strict" },
    wall: { queryClass: "object", variants: ["wall", "walls", "facade", "facades"], precisionProfile: "generic", generic: true },
    car: { queryClass: "object", variants: ["car", "cars", "vehicle", "vehicles", "taxi", "taxis"], precisionProfile: "strict" },
    bike: { queryClass: "object", variants: ["bike", "bikes", "bicycle", "bicycles", "cyclist", "cyclists", "rider", "riders"], precisionProfile: "strict" },
    bicycle: { queryClass: "object", variants: ["bicycle", "bicycles", "bike", "bikes", "cyclist", "cyclists", "rider", "riders"], precisionProfile: "strict" },
    tree: { queryClass: "object", variants: ["tree", "trees", "branch", "branches", "trunk", "trunks"], precisionProfile: "strict" },
    phone: { queryClass: "object", variants: ["phone", "phones", "smartphone", "smartphones", "cellphone", "cellphones", "mobile phone", "mobile phones"], precisionProfile: "strict" },
    cigarette: { queryClass: "object", variants: ["cigarette", "cigarettes", "smoke", "smoking", "smoker", "smokers"], precisionProfile: "strict" },
    smoking: { queryClass: "object", variants: ["smoking", "smoke", "smoker", "smokers", "cigarette", "cigarettes"], precisionProfile: "strict" },
    "close up": { queryClass: "shot", variants: ["close up", "close-up", "close crop"], precisionProfile: "strict" },
    "wide shot": { queryClass: "shot", variants: ["wide shot", "wide view", "wide scene", "wide frame"], precisionProfile: "strict" },
    detail: { queryClass: "shot", variants: ["detail", "detail study"], precisionProfile: "strict" },
    portrait: { queryClass: "shot", variants: ["portrait", "face portrait"], precisionProfile: "strict" },
    "street dog": { queryClass: "phrase", variants: ["street dog", "dog on the street"], precisionProfile: "strict", components: ["street", "dog"] },
    "old man": { queryClass: "phrase", variants: ["old man", "older man", "elderly man"], precisionProfile: "strict", components: ["man", "older"] },
    "phone screen": { queryClass: "phrase", variants: ["phone screen", "smartphone screen", "mobile phone screen"], precisionProfile: "strict", components: ["phone", "screen"] },
    "window reflection": { queryClass: "phrase", variants: ["window reflection", "reflected window", "window reflections"], precisionProfile: "strict", components: ["window", "reflection"] },
    "public protest": { queryClass: "phrase", variants: ["public protest", "street protest"], precisionProfile: "balanced", components: ["public", "protest"] }
  };

  const PHRASE_VARIANTS = [
    ["black and white", ["black and white", "black-and-white", "black white"]],
    ["close up", ["close up", "close-up"]],
    ["wide shot", ["wide shot", "wide view", "wide scene", "wide frame"]],
    ["street dog", ["street dog", "dog on the street"]],
    ["old man", ["old man", "older man", "elderly man"]],
    ["phone screen", ["phone screen", "smartphone screen", "mobile phone screen"]],
    ["window reflection", ["window reflection", "reflected window", "window reflections"]],
    ["public protest", ["public protest", "street protest"]],
    ["no people", ["no people"]],
    ["no color", ["no color", "no colour"]],
    ["no cars", ["no cars", "no car"]],
    ["no animals", ["no animals", "no animal"]]
  ];

  const QUERY_INTENT_ORDER = ["phrase", "people", "object", "environment", "color", "shot", "emotion", "conceptual"];

  const STOP_WORDS = new Set([
    "a", "an", "and", "at", "be", "for", "from", "in", "into", "is", "it", "of",
    "on", "or", "that", "the", "their", "this", "to", "with"
  ]);

  function escapeRegex(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizeTerm(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9\u0590-\u05ff_ -]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeQueryText(query) {
    let normalized = normalizeTerm(query);

    PHRASE_VARIANTS.forEach(([canonical, variants]) => {
      const placeholder = canonical.replace(/\s+/g, "_");
      variants.forEach((variant) => {
        const pattern = new RegExp(`\\b${escapeRegex(normalizeTerm(variant)).replace(/ /g, "\\s+")}\\b`, "g");
        normalized = normalized.replace(pattern, placeholder);
      });
    });

    return normalized;
  }

  function stemTerm(value) {
    const token = normalizeTerm(String(value || "").replace(/_/g, " ")).replace(/\s+/g, " ");
    if (!token) return "";
    if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
    if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
    if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
    return token;
  }

  function tokenizeValue(value) {
    return normalizeTerm(String(value || "").replace(/_/g, " ").replace(/-/g, " "))
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  function valueHasVariant(value, variant) {
    const normalizedValue = normalizeTerm(String(value || "").replace(/_/g, " "));
    const normalizedVariant = normalizeTerm(String(variant || "").replace(/_/g, " "));
    if (!normalizedValue || !normalizedVariant) return false;

    if (normalizedVariant.includes(" ")) {
      const pattern = new RegExp(
        `(^|[^a-z0-9\\u0590-\\u05ff])${escapeRegex(normalizedVariant).replace(/ /g, "\\s+")}(?=$|[^a-z0-9\\u0590-\\u05ff])`,
        "i"
      );
      return pattern.test(normalizedValue);
    }

    const valueTokens = tokenizeValue(normalizedValue);
    const variantStem = stemTerm(normalizedVariant);
    return valueTokens.some((token) => token === normalizedVariant || stemTerm(token) === variantStem);
  }

  function valueHasAnyVariant(value, variants = []) {
    return variants.some((variant) => valueHasVariant(value, variant));
  }

  function canonicalizeToken(token) {
    const normalized = stemTerm(token);
    if (!normalized) return "";

    if (HARD_VISUAL_MAP[normalized]) {
      return normalized;
    }

    for (const [canonical, variants] of Object.entries(TAG_MAP)) {
      if (canonical === normalized) return canonical;
      if (variants.some((variant) => stemTerm(variant) === normalized)) {
        return canonical;
      }
    }

    return normalized;
  }

  function getHardVisualDefinition(token) {
    const canonical = canonicalizeToken(token);
    if (!canonical) return null;
    if (!HARD_VISUAL_MAP[canonical]) return null;
    return {
      canonical,
      ...HARD_VISUAL_MAP[canonical]
    };
  }

  function tokenizeQuery(query) {
    return [...new Set(
      normalizeQueryText(query)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token && !STOP_WORDS.has(token))
    )];
  }

  function expandSoftToken(token) {
    const canonical = canonicalizeToken(token);
    const variants = TAG_MAP[canonical] || [];
    return [...new Set([canonical, ...variants.map(stemTerm), ...variants.map(normalizeTerm)])].filter(Boolean);
  }

  function expandHardToken(token) {
    const definition = getHardVisualDefinition(token);
    if (!definition) return [];
    return [...new Set([definition.canonical, ...definition.variants.map(stemTerm), ...definition.variants.map(normalizeTerm)])].filter(Boolean);
  }

  function expandToken(token, options = {}) {
    return options.hard ? expandHardToken(token) : expandSoftToken(token);
  }

  function buildTermGroup(token, forcedKind = "") {
    const rawToken = String(token || "").replace(/_/g, " ").trim();
    const hardDefinition = getHardVisualDefinition(rawToken);

    if (hardDefinition) {
      return {
        token: rawToken,
        canonical: hardDefinition.canonical,
        variants: expandHardToken(rawToken),
        kind: "hard",
        queryClass: hardDefinition.queryClass,
        precisionProfile: hardDefinition.precisionProfile || "balanced",
        generic: Boolean(hardDefinition.generic),
        components: Array.isArray(hardDefinition.components) ? [...hardDefinition.components] : []
      };
    }

    return {
      token: rawToken,
      canonical: canonicalizeToken(rawToken),
      variants: expandSoftToken(rawToken),
      kind: forcedKind || "soft",
      queryClass: "",
      precisionProfile: "conceptual",
      generic: false,
      components: []
    };
  }

  function buildIntentBuckets(positiveTokens = []) {
    const buckets = {
      phrase: 0,
      people: 0,
      object: 0,
      environment: 0,
      color: 0,
      shot: 0,
      emotion: 0,
      conceptual: 0
    };

    positiveTokens.forEach((token) => {
      if (token.kind === "hard") {
        if (token.queryClass === "color" || token.queryClass === "color_mode") buckets.color += 1;
        else if (Object.hasOwn(buckets, token.queryClass)) buckets[token.queryClass] += 1;
        else buckets.conceptual += 1;
        return;
      }

      if (["happy", "sad", "calm", "lonely", "quiet"].includes(token.canonical)) {
        buckets.emotion += 1;
        return;
      }

      buckets.conceptual += 1;
    });

    const dominantIntent = QUERY_INTENT_ORDER.find((bucket) => buckets[bucket] > 0) || "conceptual";
    return { buckets, dominantIntent };
  }

  function parseQuery(query) {
    const normalized = normalizeQueryText(query);
    const rawTokens = tokenizeQuery(normalized);
    const positiveTokens = [];
    const negativeTokens = [];

    for (let index = 0; index < rawTokens.length; index += 1) {
      const token = rawTokens[index];
      const nextToken = rawTokens[index + 1];

      if ((token === "no" || token === "without") && nextToken) {
        negativeTokens.push(buildTermGroup(nextToken, "hard"));
        index += 1;
        continue;
      }

      if (token.startsWith("no_")) {
        negativeTokens.push(buildTermGroup(token.slice(3), "hard"));
        continue;
      }

      positiveTokens.push(buildTermGroup(token));
    }

    const { buckets, dominantIntent } = buildIntentBuckets(positiveTokens);

    return {
      raw: query,
      normalized: normalized.replace(/_/g, " "),
      positive: positiveTokens,
      negative: negativeTokens,
      hasHardPositive: positiveTokens.some((token) => token.kind === "hard"),
      hasSoftPositive: positiveTokens.some((token) => token.kind !== "hard"),
      intentBuckets: buckets,
      dominantIntent
    };
  }

  window.MotoSearchTags = {
    TAG_MAP,
    HARD_VISUAL_MAP,
    STOP_WORDS,
    normalizeTerm,
    normalizeQueryText,
    stemTerm,
    tokenizeValue,
    valueHasVariant,
    valueHasAnyVariant,
    canonicalizeToken,
    tokenizeQuery,
    expandToken,
    getHardVisualDefinition,
    parseQuery
  };
})();

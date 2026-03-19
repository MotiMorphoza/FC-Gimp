(function () {
  const TAG_MAP = {
    lonely: ["lonely", "loneliness", "isolated", "isolation", "solitude", "alienation", "emptiness"],
    sad: ["sad", "sadness", "melancholy", "sorrow", "grief", "lonely", "loneliness", "solitude", "alienation", "detachment", "fatigue"],
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
    calm: ["calm", "quiet", "stillness", "peace", "meditative", "soft"],
    color: ["color", "colour", "colored", "colourful", "vivid", "multicolor", "multicolour"],
    monochrome: ["monochrome", "black and white", "black-and-white", "grayscale", "greyscale"]
  };

  const HARD_VISUAL_MAP = {
    woman: { queryClass: "people", variants: ["woman", "women", "female"] },
    man: { queryClass: "people", variants: ["man", "men", "male"] },
    child: { queryClass: "people", variants: ["child", "children", "kid", "kids", "boy", "boys", "girl", "girls", "baby", "babies"] },
    crowd: { queryClass: "people", variants: ["crowd", "crowds", "group", "groups", "people", "pedestrians", "protesters", "marchers", "choir", "procession", "gathering"] },
    people: { queryClass: "people", variants: ["people", "person", "persons", "human", "humans", "figure", "figures", "pedestrian", "pedestrians"] },
    alone: { queryClass: "people", variants: ["alone", "solitary", "single person"] },
    blue: { queryClass: "color", variants: ["blue", "azure", "cobalt", "cyan"] },
    red: { queryClass: "color", variants: ["red", "scarlet", "crimson"] },
    yellow: { queryClass: "color", variants: ["yellow", "gold", "golden"] },
    color: { queryClass: "color_mode", variants: ["color", "colour", "blue", "red", "yellow", "green", "orange", "purple", "pink"] },
    "black and white": { queryClass: "color_mode", variants: ["black and white", "black-and-white", "bw"] },
    monochrome: { queryClass: "color_mode", variants: ["monochrome", "grayscale", "greyscale"] },
    colorful: { queryClass: "color_mode", variants: ["colorful", "colourful", "vivid", "multicolor", "multicolour", "rainbow"] },
    indoor: { queryClass: "environment", variants: ["indoor", "indoors", "inside", "interior", "room", "kitchen", "studio"] },
    outdoor: { queryClass: "environment", variants: ["outdoor", "outdoors", "outside", "open air"] },
    street: { queryClass: "environment", variants: ["street", "sidewalk", "crosswalk", "intersection"] },
    urban: { queryClass: "environment", variants: ["urban", "city", "public space", "public square"] },
    nature: { queryClass: "environment", variants: ["nature", "natural", "park", "garden", "field", "river", "pond", "water edge", "tree", "trees", "branch", "branches", "flower", "flowers", "grass"] },
    domestic: { queryClass: "environment", variants: ["domestic", "home", "house", "apartment", "kitchen", "room"] },
    dog: { queryClass: "object", variants: ["dog", "dogs", "puppy", "puppies", "canine"] },
    animal: { queryClass: "object", variants: ["animal", "animals", "dog", "dogs", "cat", "cats", "bird", "birds", "duck", "gull", "stork", "heron", "pigeon"] },
    bird: { queryClass: "object", variants: ["bird", "birds", "pigeon", "pigeons", "duck", "ducks", "gull", "gulls", "seagull", "seagulls", "stork", "storks", "heron", "herons", "sparrow", "sparrows", "crow", "crows"] },
    window: { queryClass: "object", variants: ["window", "windows", "pane", "panes", "windowpane", "windowpanes", "shop window", "storefront window"] },
    umbrella: { queryClass: "object", variants: ["umbrella", "umbrellas", "parasol", "parasols"] },
    car: { queryClass: "object", variants: ["car", "cars", "vehicle", "vehicles", "taxi", "taxis"] },
    bike: { queryClass: "object", variants: ["bike", "bikes", "bicycle", "bicycles", "cyclist", "cyclists", "rider", "riders"] },
    bicycle: { queryClass: "object", variants: ["bicycle", "bicycles", "bike", "bikes", "cyclist", "cyclists", "rider", "riders"] },
    tree: { queryClass: "object", variants: ["tree", "trees", "branch", "branches", "trunk", "trunks"] },
    phone: { queryClass: "object", variants: ["phone", "phones", "smartphone", "smartphones", "cellphone", "cellphones", "mobile phone", "mobile phones"] },
    cigarette: { queryClass: "object", variants: ["cigarette", "cigarettes", "smoke", "smoking", "smoker", "smokers"] },
    smoking: { queryClass: "object", variants: ["smoking", "smoke", "smoker", "smokers", "cigarette", "cigarettes"] },
    "close up": { queryClass: "shot", variants: ["close up", "close-up", "close crop"] },
    "wide shot": { queryClass: "shot", variants: ["wide shot", "wide view", "wide scene", "wide frame"] },
    detail: { queryClass: "shot", variants: ["detail", "detail study"] },
    portrait: { queryClass: "shot", variants: ["portrait", "face portrait"] }
  };

  const PHRASE_VARIANTS = [
    ["black and white", ["black and white", "black-and-white", "black white"]],
    ["close up", ["close up", "close-up"]],
    ["wide shot", ["wide shot", "wide view", "wide scene", "wide frame"]],
    ["no people", ["no people"]],
    ["no color", ["no color", "no colour"]],
    ["no cars", ["no cars", "no car"]],
    ["no animals", ["no animals", "no animal"]]
  ];

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
        queryClass: hardDefinition.queryClass
      };
    }

    return {
      token: rawToken,
      canonical: canonicalizeToken(rawToken),
      variants: expandSoftToken(rawToken),
      kind: forcedKind || "soft",
      queryClass: ""
    };
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

    return {
      raw: query,
      normalized: normalized.replace(/_/g, " "),
      positive: positiveTokens,
      negative: negativeTokens,
      hasHardPositive: positiveTokens.some((token) => token.kind === "hard"),
      hasSoftPositive: positiveTokens.some((token) => token.kind !== "hard")
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

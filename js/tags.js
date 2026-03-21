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
    wheel: ["wheel", "wheels", "spare wheel", "bicycle", "bicycles", "bike", "bikes", "wheelchair", "stroller", "pram", "shopping trolley", "trolley", "cart", "scooter", "motorcycle"],
    sky: ["sky", "skies", "open sky", "blue sky", "night sky", "dusky sky", "skyline", "horizon", "moon", "crescent moon", "full moon", "half moon", "sun", "sunset", "sunrise", "cloud", "clouds", "contrail"],
    bird: ["bird", "birds", "pigeon", "pigeons", "crow", "crows", "gull", "gulls", "duck", "ducks", "stork", "storks", "heron", "herons", "sparrow", "sparrows", "seagull", "seagulls"],
    protest: ["protest", "protester", "protesters", "demonstration", "march", "activism", "resistance"],
    jesus: ["jesus", "christ", "christ figure", "christ statue", "holy card", "sacred heart", "crucifix"],
    religion: ["religion", "religious", "faith", "devotion", "ritual", "sacred", "holy", "church", "churches", "cross", "crosses", "crucifix", "nun", "nuns", "priest", "priests", "monk", "monks", "christian", "christianity", "procession"],
    smile: ["smile", "smiles", "smiling", "grin", "grins", "grinning", "smiley", "smirk", "smirking", "beaming"],
    glasses: ["glasses", "glesses", "glesses", "eyeglasses", "spectacles", "sunglasses", "broken glasses", "eyewear"],
    sit: ["sit", "sits", "sitting", "sat", "seated", "perched", "reclining", "resting", "lounging"],
    stand: ["stand", "stands", "standing", "stood", "upright", "standing still"],
    run: ["run", "runs", "running", "runner", "runners", "ran", "jog", "jogging", "sprint", "sprinting", "dash", "dashing", "jogger", "joggers"],
    walk: ["walk", "walks", "walking", "walked", "stroll", "strolling", "stride", "striding", "crossing", "crosses street", "pedestrian"],
    carry: ["carry", "carries", "carrying", "carried", "toting", "hauling"],
    hold: ["hold", "holds", "holding", "held", "gripping", "grasping", "raising"],
    look: ["look", "looks", "looking", "glancing", "gazing", "staring", "watching", "checking"],
    talk: ["talk", "talks", "talking", "speak", "speaks", "speaking", "conversation", "chatting"],
    absurd: ["absurd", "absurdity", "surreal", "irony", "ironic", "humor", "humour", "wit"],
    symbol: ["symbol", "symbols", "symbolic", "metaphor", "allegory", "sign"],
    dark: ["dark", "shadow", "shadowy", "gloom"],
    calm: ["calm", "quiet", "quietness", "stillness", "peace", "meditative", "soft", "gentleness", "clarity", "patience", "contemplation", "suspension"],
    color: ["color", "colour", "colored", "colourful", "vivid", "multicolor", "multicolour"],
    monochrome: ["monochrome", "black and white", "black-and-white", "grayscale", "greyscale"],
    "one color": ["one color", "one-color", "single color", "single-color", "one tone", "one-tone", "single tone", "single-tone"],
    "quite handy": ["quite handy", "quite-handy"]
  };

  const HARD_VISUAL_MAP = {
    woman: { queryClass: "people", variants: ["woman", "women", "female"], precisionProfile: "strict" },
    man: { queryClass: "people", variants: ["man", "men", "male"], precisionProfile: "strict" },
    child: { queryClass: "people", variants: ["child", "children", "kid", "kids", "boy", "boys", "girl", "girls", "baby", "babies"], precisionProfile: "strict" },
    crowd: { queryClass: "people", variants: ["crowd", "crowds", "group", "groups", "people", "pedestrians", "protesters", "marchers", "choir", "procession", "gathering"], precisionProfile: "strict" },
    people: { queryClass: "people", variants: ["people", "person", "persons", "human", "humans", "figure", "figures", "pedestrian", "pedestrians"], precisionProfile: "generic", generic: true },
    alone: { queryClass: "people", variants: ["alone", "solitary", "single person"], precisionProfile: "strict" },
    smile: { queryClass: "expression", variants: ["smile", "smiles", "smiling", "grin", "grins", "grinning", "smiley", "smirk", "smirking", "beaming"], precisionProfile: "strict" },
    blue: { queryClass: "color", variants: ["blue", "azure", "cobalt", "cyan"], precisionProfile: "balanced" },
    red: { queryClass: "color", variants: ["red", "scarlet", "crimson"], precisionProfile: "balanced" },
    yellow: { queryClass: "color", variants: ["yellow", "gold", "golden"], precisionProfile: "balanced" },
    green: { queryClass: "color", variants: ["green", "emerald", "olive", "lime"], precisionProfile: "balanced" },
    orange: { queryClass: "color", variants: ["orange", "amber", "tangerine"], precisionProfile: "balanced" },
    pink: { queryClass: "color", variants: ["pink", "magenta", "rose"], precisionProfile: "balanced" },
    purple: { queryClass: "color", variants: ["purple", "violet", "lavender"], precisionProfile: "balanced" },
    white: { queryClass: "color", variants: ["white", "ivory", "cream"], precisionProfile: "balanced" },
    black: { queryClass: "color", variants: ["black", "charcoal"], precisionProfile: "balanced" },
    gray: { queryClass: "color", variants: ["gray", "grey", "slate"], precisionProfile: "balanced" },
    brown: { queryClass: "color", variants: ["brown", "tan", "rust"], precisionProfile: "balanced" },
    beige: { queryClass: "color", variants: ["beige", "sand", "khaki"], precisionProfile: "balanced" },
    color: { queryClass: "color_mode", variants: ["color", "colour", "blue", "red", "yellow", "green", "orange", "purple", "pink"], precisionProfile: "balanced" },
    "black and white": { queryClass: "color_mode", variants: ["black and white", "black-and-white", "bw"], precisionProfile: "strict" },
    monochrome: { queryClass: "color_mode", variants: ["monochrome", "grayscale", "greyscale"], precisionProfile: "strict" },
    colorful: { queryClass: "color_mode", variants: ["colorful", "colourful", "vivid", "multicolor", "multicolour", "rainbow"], precisionProfile: "balanced" },
    indoor: { queryClass: "environment", variants: ["indoor", "indoors", "inside", "interior", "room", "kitchen", "studio"], precisionProfile: "balanced" },
    outdoor: { queryClass: "environment", variants: ["outdoor", "outdoors", "outside", "open air"], precisionProfile: "generic", generic: true },
    street: { queryClass: "environment", variants: ["street", "sidewalk", "crosswalk", "intersection"], precisionProfile: "generic", generic: true },
    road: { queryClass: "environment", variants: ["road", "roads", "roadway", "roadside", "busy road", "wet road", "lane", "lanes", "bike lane", "traffic lane"], precisionProfile: "balanced" },
    urban: { queryClass: "environment", variants: ["urban", "city", "public space", "public square"], precisionProfile: "generic", generic: true },
    nature: { queryClass: "environment", variants: ["nature", "natural", "park", "garden", "field", "river", "pond", "water edge", "tree", "trees", "branch", "branches", "flower", "flowers", "grass"], precisionProfile: "balanced" },
    domestic: { queryClass: "environment", variants: ["domestic", "home", "house", "apartment", "kitchen", "room"], precisionProfile: "balanced" },
    dog: { queryClass: "object", variants: ["dog", "dogs", "puppy", "puppies", "canine"], precisionProfile: "strict" },
    animal: { queryClass: "object", variants: ["animal", "animals", "dog", "dogs", "cat", "cats", "bird", "birds", "duck", "gull", "stork", "heron", "pigeon"], precisionProfile: "balanced" },
    bird: { queryClass: "object", variants: ["bird", "birds", "pigeon", "pigeons", "duck", "ducks", "gull", "gulls", "seagull", "seagulls", "stork", "storks", "heron", "herons", "sparrow", "sparrows", "crow", "crows"], precisionProfile: "strict" },
    rainbow: { queryClass: "object", variants: ["rainbow", "rainbows", "double rainbow", "rainbow flag", "rainbow umbrella", "rainbow fan", "rainbow arch", "rainbow prism", "rainbow installation", "rainbow balloon arch", "rainbow costume"], precisionProfile: "strict" },
    cross: { queryClass: "object", variants: ["cross", "crosses", "crucifix"], precisionProfile: "strict" },
    crucifix: { queryClass: "object", variants: ["crucifix", "crucifixes", "christ figure", "christ statue", "holy card"], precisionProfile: "strict" },
    church: { queryClass: "object", variants: ["church", "churches", "church tower", "church facade"], precisionProfile: "strict" },
    nun: { queryClass: "object", variants: ["nun", "nuns", "habit"], precisionProfile: "strict" },
    priest: { queryClass: "object", variants: ["priest", "priests", "cleric", "clergy"], precisionProfile: "strict" },
    glasses: { queryClass: "object", variants: ["glasses", "glesses", "glesses", "eyeglasses", "spectacles", "sunglasses", "broken glasses", "eyewear"], precisionProfile: "strict" },
    window: { queryClass: "object", variants: ["window", "windows", "pane", "panes", "windowpane", "windowpanes", "shop window", "storefront window"], precisionProfile: "strict" },
    umbrella: { queryClass: "object", variants: ["umbrella", "umbrellas", "parasol", "parasols"], precisionProfile: "strict" },
    wall: { queryClass: "object", variants: ["wall", "walls", "facade", "facades"], precisionProfile: "generic", generic: true },
    car: { queryClass: "object", variants: ["car", "cars", "vehicle", "vehicles", "taxi", "taxis"], precisionProfile: "strict" },
    bus: { queryClass: "object", variants: ["bus", "buses", "coach", "bus stop", "bus stop sign"], precisionProfile: "strict" },
    bike: { queryClass: "object", variants: ["bike", "bikes", "bicycle", "bicycles", "cyclist", "cyclists", "rider", "riders"], precisionProfile: "strict" },
    bicycle: { queryClass: "object", variants: ["bicycle", "bicycles", "bike", "bikes", "cyclist", "cyclists", "rider", "riders"], precisionProfile: "strict" },
    stick: { queryClass: "object", variants: ["stick", "sticks", "cane", "canes", "walking stick", "walking sticks", "walking staff", "staff", "walking pole", "walking poles"], precisionProfile: "strict" },
    tree: { queryClass: "object", variants: ["tree", "trees", "branch", "branches", "trunk", "trunks"], precisionProfile: "strict" },
    phone: { queryClass: "object", variants: ["phone", "phones", "smartphone", "smartphones", "cellphone", "cellphones", "mobile phone", "mobile phones"], precisionProfile: "strict" },
    cigarette: { queryClass: "object", variants: ["cigarette", "cigarettes", "smoke", "smoking", "smoker", "smokers"], precisionProfile: "strict" },
    smoking: { queryClass: "object", variants: ["smoking", "smoke", "smoker", "smokers", "cigarette", "cigarettes"], precisionProfile: "strict" },
    "close up": { queryClass: "shot", variants: ["close up", "close-up", "close crop"], precisionProfile: "strict" },
    "wide shot": { queryClass: "shot", variants: ["wide shot", "wide view", "wide scene", "wide frame"], precisionProfile: "strict" },
    detail: { queryClass: "shot", variants: ["detail", "detail study"], precisionProfile: "strict" },
    portrait: { queryClass: "shot", variants: ["portrait", "face portrait"], precisionProfile: "strict" },
    sit: { queryClass: "action", variants: ["sit", "sits", "sitting", "sat", "seated", "perched", "reclining", "resting", "lounging"], precisionProfile: "balanced" },
    stand: { queryClass: "action", variants: ["stand", "stands", "standing", "stood", "upright", "standing still"], precisionProfile: "balanced" },
    run: { queryClass: "action", variants: ["run", "runs", "running", "runner", "runners", "ran", "jog", "jogging", "sprint", "sprinting", "dash", "dashing", "jogger", "joggers"], precisionProfile: "strict" },
    walk: { queryClass: "action", variants: ["walk", "walks", "walking", "walked", "stroll", "strolling", "stride", "striding", "crossing", "pedestrian"], precisionProfile: "balanced" },
    carry: { queryClass: "action", variants: ["carry", "carries", "carrying", "carried", "toting", "hauling"], precisionProfile: "balanced" },
    hold: { queryClass: "action", variants: ["hold", "holds", "holding", "held", "gripping", "grasping", "raising"], precisionProfile: "balanced" },
    look: { queryClass: "action", variants: ["look", "looks", "looking", "glancing", "gazing", "staring", "watching", "checking"], precisionProfile: "balanced" },
    talk: { queryClass: "action", variants: ["talk", "talks", "talking", "speak", "speaks", "speaking", "conversation", "chatting"], precisionProfile: "balanced" },
    "street dog": { queryClass: "phrase", variants: ["street dog", "dog on the street"], precisionProfile: "strict", components: ["street", "dog"] },
    "to cross": { queryClass: "phrase", variants: ["to cross", "cross the street", "cross the road", "walking across", "running across"], precisionProfile: "strict", components: ["walk", "road"] },
    "old man": { queryClass: "phrase", variants: ["old man", "older man", "elderly man"], precisionProfile: "strict", components: ["man", "older"] },
    "phone screen": { queryClass: "phrase", variants: ["phone screen", "smartphone screen", "mobile phone screen"], precisionProfile: "strict", components: ["phone", "screen"] },
    "window reflection": { queryClass: "phrase", variants: ["window reflection", "reflected window", "window reflections"], precisionProfile: "strict", components: ["window", "reflection"] },
    "public protest": { queryClass: "phrase", variants: ["public protest", "street protest"], precisionProfile: "balanced", components: ["public", "protest"] },
    "one color": { queryClass: "phrase", variants: ["one color", "one-color", "single color", "single-color", "one tone", "one-tone", "single tone", "single-tone"], precisionProfile: "strict", components: ["monochrome", "minimalism"] },
    "quite handy": { queryClass: "phrase", variants: ["quite handy", "quite-handy"], precisionProfile: "strict", components: ["hand", "gesture"] }
  };

  const PHRASE_VARIANTS = [
    ["black and white", ["black and white", "black-and-white", "black white"]],
    ["close up", ["close up", "close-up"]],
    ["wide shot", ["wide shot", "wide view", "wide scene", "wide frame"]],
    ["street dog", ["street dog", "dog on the street"]],
    ["to cross", ["to cross", "cross the street", "cross the road", "walking across", "running across"]],
    ["old man", ["old man", "older man", "elderly man"]],
    ["phone screen", ["phone screen", "smartphone screen", "mobile phone screen"]],
    ["window reflection", ["window reflection", "reflected window", "window reflections"]],
    ["public protest", ["public protest", "street protest"]],
    ["one color", ["one color", "one-color", "single color", "single-color", "one tone", "one-tone", "single tone", "single-tone"]],
    ["quite handy", ["quite handy", "quite-handy"]],
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
      .replace(/[â€™']/g, "")
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
    if (["glasses", "glesses", "glesses", "eyeglasses", "spectacles", "sunglasses", "eyewear"].includes(token)) return token;
    if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
    if (token.endsWith("ss") && token.length > 3) return token;
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

    for (const [canonical, definition] of Object.entries(HARD_VISUAL_MAP)) {
      if ((definition.variants || []).some((variant) => stemTerm(variant) === normalized)) {
        return canonical;
      }
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

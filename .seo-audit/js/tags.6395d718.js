(function () {
  const TAG_MAP = {
    lonely: ["lonely", "loneliness", "isolated", "isolation", "solitude", "alone", "alienation", "emptiness"],
    urban: ["urban", "city", "street", "metropolitan", "public space", "sidewalk"],
    hand: ["hand", "hands", "gesture", "palm", "fingers", "glove", "peace sign"],
    people: ["people", "person", "persons", "human", "humans", "crowd", "man", "woman", "women", "child", "children", "figure", "figures", "pedestrian", "pedestrians", "portrait"],
    blue: ["blue", "azure", "cobalt", "cyan"],
    cold: ["cold", "winter", "icy", "ice", "snow", "frozen", "frigid", "chill"],
    minimalism: ["minimalism", "minimal", "sparse", "empty", "reduced", "clean", "restraint"],
    window: ["window", "windows", "pane", "panes", "frame", "frames", "opening", "aperture"],
    bird: ["bird", "birds", "pigeon", "crow", "gull", "duck", "stork", "heron", "sparrow"],
    protest: ["protest", "protester", "protesters", "demonstration", "march", "activism", "resistance"],
    absurd: ["absurd", "absurdity", "surreal", "irony", "ironic", "humor", "humour", "wit"],
    symbol: ["symbol", "symbols", "symbolic", "metaphor", "allegory", "sign"],
    dark: ["dark", "black", "shadow", "shadowy", "gloom"],
    calm: ["calm", "quiet", "stillness", "peace", "meditative", "soft"],
    color: ["color", "colour", "colored", "colourful", "vivid", "multicolor", "multicolour"],
    monochrome: ["monochrome", "blackandwhite", "black-white", "grayscale", "greyscale"]
  };

  const STOP_WORDS = new Set([
    "a", "an", "and", "at", "be", "for", "from", "in", "into", "is", "it", "of",
    "on", "or", "that", "the", "their", "this", "to", "with"
  ]);

  function normalizeTerm(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9\u0590-\u05ff]+/g, " ")
      .trim();
  }

  function stemTerm(value) {
    const token = normalizeTerm(value).replace(/\s+/g, " ");
    if (!token) return "";
    if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
    if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
    if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
    return token;
  }

  function canonicalizeToken(token) {
    const normalized = stemTerm(token);
    if (!normalized) return "";

    for (const [canonical, variants] of Object.entries(TAG_MAP)) {
      if (canonical === normalized) return canonical;
      if (variants.some((variant) => stemTerm(variant) === normalized)) {
        return canonical;
      }
    }

    return normalized;
  }

  function tokenizeQuery(query) {
    return [...new Set(
      normalizeTerm(query)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token && !STOP_WORDS.has(token))
    )];
  }

  function expandToken(token) {
    const canonical = canonicalizeToken(token);
    const variants = TAG_MAP[canonical] || [];
    return [...new Set([canonical, ...variants.map(stemTerm), ...variants.map(normalizeTerm)])].filter(Boolean);
  }

  function parseQuery(query) {
    const normalized = normalizeTerm(query);
    const rawTokens = tokenizeQuery(normalized);
    const positiveTokens = [];
    const negativeTokens = [];

    for (let index = 0; index < rawTokens.length; index += 1) {
      const token = rawTokens[index];
      const nextToken = rawTokens[index + 1];

      if ((token === "no" || token === "without") && nextToken) {
        negativeTokens.push(canonicalizeToken(nextToken));
        index += 1;
        continue;
      }

      positiveTokens.push(token);
    }

    return {
      raw: query,
      normalized,
      positive: positiveTokens.map((token) => ({
        token,
        canonical: canonicalizeToken(token),
        variants: expandToken(token)
      })),
      negative: negativeTokens.map((token) => ({
        token,
        canonical: canonicalizeToken(token),
        variants: expandToken(token)
      }))
    };
  }

  window.MotoSearchTags = {
    TAG_MAP,
    STOP_WORDS,
    normalizeTerm,
    stemTerm,
    canonicalizeToken,
    tokenizeQuery,
    expandToken,
    parseQuery
  };
})();

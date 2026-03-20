'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_DELAY_MS = 300;
const FETCH_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [500, 1000];
const FALLBACK_TITLE = 'Video';
const RAILS = [
  { key: 'justMe', aliases: ['justMe', 'me'] },
  { key: 'cooperation', aliases: ['cooperation'] },
  { key: 'mine', aliases: ['mine'] },
  { key: 'looooong', aliases: ['looooong', 'long'] }
];
const RAIL_KEYS = RAILS.map((rail) => rail.key);

function getRailEntries(payload, railKey) {
  const rail = RAILS.find((entry) => entry.key === railKey);
  const aliases = rail?.aliases || [railKey];

  for (const alias of aliases) {
    if (Array.isArray(payload?.[alias])) {
      return payload[alias];
    }
  }

  return [];
}

function isRealTitle(title) {
  const value = String(title || '').trim();
  return value && value !== FALLBACK_TITLE;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJson(filePath, fallbackValue) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch (_error) {
    return fallbackValue;
  }
}

function normalizeSourcePayload(payload) {
  if (Array.isArray(payload)) {
    return Object.fromEntries(RAIL_KEYS.map((railKey) => [railKey, railKey === 'justMe' ? payload : []]));
  }

  if (payload && typeof payload === 'object') {
    return Object.fromEntries(RAIL_KEYS.map((railKey) => [railKey, getRailEntries(payload, railKey)]));
  }

  throw new Error('morphoza-videos.json must contain either a JSON array of video IDs or an object with rail arrays');
}

function buildExistingTitleMap(existingPayload) {
  const map = new Map();

  if (Array.isArray(existingPayload)) {
    existingPayload
      .filter((entry) => entry && typeof entry.id === 'string')
      .forEach((entry) => {
        map.set(entry.id, String(entry.title || '').trim());
      });
    return map;
  }

  if (existingPayload && typeof existingPayload === 'object') {
    RAIL_KEYS.forEach((railKey) => {
      const entries = getRailEntries(existingPayload, railKey);
      entries
        .filter((entry) => entry && typeof entry.id === 'string')
        .forEach((entry) => {
          map.set(entry.id, String(entry.title || '').trim());
        });
    });
  }

  return map;
}

function mergeTitleMaps(primaryMap, secondaryMap) {
  const nextMap = new Map(primaryMap);

  secondaryMap.forEach((title, videoId) => {
    const currentTitle = nextMap.get(videoId) || '';

    if (isRealTitle(currentTitle)) return;
    if (!String(title || '').trim()) return;

    nextMap.set(videoId, String(title || '').trim());
  });

  return nextMap;
}

async function fetchVideoTitleOnce(videoId) {
  const oembedUrl = new URL('https://www.youtube.com/oembed');
  oembedUrl.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
  oembedUrl.searchParams.set('format', 'json');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'MotoSynteza Build/1.0'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`oEmbed ${response.status}`);
    }

    const payload = await response.json();
    const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
    if (!title) {
      throw new Error('Missing title');
    }

    return title;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchVideoTitleWithRetry(videoId) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const title = await fetchVideoTitleOnce(videoId);
      return { title, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAYS_MS[attempt - 1] || 1000);
      }
    }
  }

  throw lastError || new Error('Unknown fetch error');
}

async function generateMorphozaVideos({
  sourcePath,
  outputPath,
  fallbackSourcePaths = [],
  logger,
  delayMs = DEFAULT_DELAY_MS,
  preferExistingTitles = false
}) {
  const source = normalizeSourcePayload(readJson(sourcePath, []));
  const existing = readJson(outputPath, []);
  let existingMap = buildExistingTitleMap(existing);

  fallbackSourcePaths.forEach((fallbackPath) => {
    const fallbackPayload = readJson(fallbackPath, null);
    if (!fallbackPayload) return;
    existingMap = mergeTitleMaps(existingMap, buildExistingTitleMap(fallbackPayload));
  });

  const queue = [];
  RAIL_KEYS.forEach((railKey) => {
    source[railKey].forEach((rawId) => {
      const videoId = String(rawId || '').trim();
      if (!videoId) return;
      queue.push({ railKey, videoId });
    });
  });

  const result = Object.fromEntries(RAIL_KEYS.map((railKey) => [railKey, []]));
  const summary = { fetched: 0, preserved: 0, fallback: 0 };

  for (let index = 0; index < queue.length; index += 1) {
    const { railKey, videoId } = queue[index];
    const existingTitle = existingMap.get(videoId) || '';
    let title = isRealTitle(existingTitle) ? existingTitle : FALLBACK_TITLE;

    if (preferExistingTitles && isRealTitle(existingTitle)) {
      title = existingTitle;
      summary.preserved += 1;
      if (logger?.info) {
        logger.info(`[morphoza] ${videoId} ? title preserved from existing file`);
      }
      result[railKey].push({ id: videoId, title });
      continue;
    }

    try {
      const fetched = await fetchVideoTitleWithRetry(videoId);
      title = fetched.title;
      summary.fetched += 1;
      if (logger?.info) {
        logger.info(`[morphoza] ${videoId} ? title fetched from YouTube (attempt ${fetched.attempts})`);
      }
    } catch (error) {
      if (isRealTitle(existingTitle)) {
        title = existingTitle;
        summary.preserved += 1;
        if (logger?.info) {
          logger.info(`[morphoza] ${videoId} ? title preserved from existing file`);
        }
      } else {
        title = FALLBACK_TITLE;
        summary.fallback += 1;
        if (logger?.warn) {
          logger.warn(`[morphoza] ${videoId} ? fetch failed -> fallback used (${error.message})`);
        }
      }
    }

    result[railKey].push({ id: videoId, title });

    if (index < queue.length - 1) {
      await sleep(delayMs);
    }
  }

  const nextJson = `${JSON.stringify(result, null, 2)}\n`;
  const currentJson = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : null;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (currentJson !== nextJson) {
    fs.writeFileSync(outputPath, nextJson, 'utf8');
    if (logger?.info) {
      logger.info(`[morphoza] wrote ${queue.length} video entries across ${RAIL_KEYS.length} rails`);
    }
  } else if (logger?.info) {
    logger.info('[morphoza] no changes detected, skipped writing generated file');
  }

  if (logger?.info) {
    logger.info('Morphoza title generation summary:');
    logger.info(`fetched: ${summary.fetched}`);
    logger.info(`preserved: ${summary.preserved}`);
    logger.info(`fallback: ${summary.fallback}`);
  }

  return result;
}

module.exports = { generateMorphozaVideos };

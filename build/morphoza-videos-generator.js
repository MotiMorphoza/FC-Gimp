'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_DELAY_MS = 300;
const FETCH_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [500, 1000];
const FALLBACK_TITLE = 'Video';

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
  logger,
  delayMs = DEFAULT_DELAY_MS
}) {
  const ids = readJson(sourcePath, []);
  if (!Array.isArray(ids)) {
    throw new Error('morphoza-videos.json must contain a JSON array of video IDs');
  }

  const existing = readJson(outputPath, []);
  const existingMap = new Map(
    Array.isArray(existing)
      ? existing
          .filter((entry) => entry && typeof entry.id === 'string')
          .map((entry) => [entry.id, String(entry.title || '').trim()])
      : []
  );

  const result = [];
  const summary = { fetched: 0, preserved: 0, fallback: 0 };

  for (let index = 0; index < ids.length; index += 1) {
    const videoId = String(ids[index] || '').trim();
    if (!videoId) continue;

    const existingTitle = existingMap.get(videoId) || '';
    let title = isRealTitle(existingTitle) ? existingTitle : FALLBACK_TITLE;

    try {
      const fetched = await fetchVideoTitleWithRetry(videoId);
      title = fetched.title;
      summary.fetched += 1;
      if (logger?.info) {
        logger.info(`[morphoza] ${videoId} ✓ title fetched from YouTube (attempt ${fetched.attempts})`);
      }
    } catch (error) {
      if (isRealTitle(existingTitle)) {
        title = existingTitle;
        summary.preserved += 1;
        if (logger?.info) {
          logger.info(`[morphoza] ${videoId} ✓ title preserved from existing file`);
        }
      } else {
        title = FALLBACK_TITLE;
        summary.fallback += 1;
        if (logger?.warn) {
          logger.warn(`[morphoza] ${videoId} ⚠ fetch failed -> fallback used (${error.message})`);
        }
      }
    }

    result.push({ id: videoId, title });

    if (index < ids.length - 1) {
      await sleep(delayMs);
    }
  }

  const nextJson = `${JSON.stringify(result, null, 2)}\n`;
  const currentJson = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : null;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (currentJson !== nextJson) {
    fs.writeFileSync(outputPath, nextJson, 'utf8');
    if (logger?.info) {
      logger.info(`[morphoza] wrote ${result.length} video entries`);
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

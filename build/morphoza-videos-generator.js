'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_DELAY_MS = 300;
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

async function fetchVideoTitle(videoId) {
  const oembedUrl = new URL('https://www.youtube.com/oembed');
  oembedUrl.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
  oembedUrl.searchParams.set('format', 'json');

  const response = await fetch(oembedUrl, {
    headers: {
      'User-Agent': 'MotoSynteza Build/1.0'
    }
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

  for (let index = 0; index < ids.length; index += 1) {
    const videoId = String(ids[index] || '').trim();
    if (!videoId) continue;

    const existingTitle = existingMap.get(videoId) || '';
    let title = isRealTitle(existingTitle) ? existingTitle : FALLBACK_TITLE;

    try {
      title = await fetchVideoTitle(videoId);
      if (logger?.info) {
        logger.info(`[morphoza] fetched title for ${videoId}`);
      }
    } catch (error) {
      if (!isRealTitle(title)) {
        title = FALLBACK_TITLE;
      }
      if (logger?.warn) {
        logger.warn(`[morphoza] title fetch failed for ${videoId}: ${error.message}`);
      }
    }

    result.push({ id: videoId, title });

    if (index < ids.length - 1) {
      await sleep(delayMs);
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (logger?.info) {
    logger.info(`[morphoza] wrote ${result.length} video entries`);
  }

  return result;
}

module.exports = { generateMorphozaVideos };

#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const Logger = require('./logger');

const LIVE_GENERATED_URL = 'https://www.motosynteza.art/data/morphoza-videos.generated.json';

function collectIds(payload) {
  if (!payload || typeof payload !== 'object') return [];

  return Object.values(payload)
    .flatMap((entries) => Array.isArray(entries) ? entries : [])
    .map((entry) => (entry && typeof entry === 'object' ? String(entry.id || '').trim() : ''))
    .filter(Boolean);
}

async function fetchLiveGeneratedJson() {
  const response = await fetch(LIVE_GENERATED_URL, {
    headers: {
      'User-Agent': 'MotoSynteza Sync/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Live Morphoza JSON HTTP ${response.status}`);
  }

  return response.text();
}

async function main() {
  const logger = new Logger();
  const rootDir = path.resolve(__dirname, '..');
  const sourcePath = path.join(rootDir, 'data', 'morphoza-videos.json');
  const localOutputPath = path.join(rootDir, 'data', 'morphoza-videos.generated.json');
  const deployedOutputPath = path.join(rootDir, 'docs', 'data', 'morphoza-videos.generated.json');

  const liveJsonText = await fetchLiveGeneratedJson();
  const livePayload = JSON.parse(liveJsonText);
  const sourcePayload = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

  const liveIds = new Set(collectIds(livePayload));
  const sourceIds = collectIds(sourcePayload);
  const missingSourceIds = sourceIds.filter((id) => !liveIds.has(id));

  if (missingSourceIds.length) {
    logger.warn(`[morphoza] live generated file is missing ${missingSourceIds.length} source IDs; keeping live content as source of truth`);
  }

  fs.mkdirSync(path.dirname(localOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(deployedOutputPath), { recursive: true });

  fs.writeFileSync(localOutputPath, liveJsonText, 'utf8');
  fs.writeFileSync(deployedOutputPath, liveJsonText, 'utf8');

  logger.info(`[morphoza] synced live generated file into ${path.relative(rootDir, localOutputPath)}`);
  logger.info(`[morphoza] synced live generated file into ${path.relative(rootDir, deployedOutputPath)}`);
  logger.info(`[morphoza] synced ${liveIds.size} IDs from working live generated output`);
}

main().catch((error) => {
  console.error(`[morphoza] sync failed: ${error.message}`);
  process.exit(1);
});

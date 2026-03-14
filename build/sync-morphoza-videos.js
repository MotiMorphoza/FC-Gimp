#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const Logger = require('./logger');
const { generateMorphozaVideos } = require('./morphoza-videos-generator');

async function main() {
  const logger = new Logger();
  const rootDir = path.resolve(__dirname, '..');
  const sourcePath = path.join(rootDir, 'data', 'morphoza-videos.json');
  const outputPath = path.join(rootDir, 'data', 'morphoza-videos.generated.json');
  const deployedOutputPath = path.join(rootDir, 'docs', 'data', 'morphoza-videos.generated.json');

  await generateMorphozaVideos({
    sourcePath,
    outputPath,
    fallbackSourcePaths: [deployedOutputPath],
    logger,
    delayMs: 300
  });

  const generatedJson = fs.readFileSync(outputPath, 'utf8');
  const deployedJson = fs.existsSync(deployedOutputPath)
    ? fs.readFileSync(deployedOutputPath, 'utf8')
    : null;

  fs.mkdirSync(path.dirname(deployedOutputPath), { recursive: true });

  if (generatedJson !== deployedJson) {
    fs.writeFileSync(deployedOutputPath, generatedJson, 'utf8');
    logger.info('[morphoza] synced generated data into docs/data');
  } else {
    logger.info('[morphoza] docs/data already matches local generated data');
  }
}

main().catch((error) => {
  console.error(`[morphoza] sync failed: ${error.message}`);
  process.exit(1);
});

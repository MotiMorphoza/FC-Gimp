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
  const localOutputPath = path.join(rootDir, 'data', 'morphoza-videos.generated.json');
  const deployedOutputPath = path.join(rootDir, 'docs', 'data', 'morphoza-videos.generated.json');

  await generateMorphozaVideos({
    sourcePath,
    outputPath: deployedOutputPath,
    fallbackSourcePaths: [localOutputPath],
    logger,
    delayMs: 300
  });

  const deployedJson = fs.readFileSync(deployedOutputPath, 'utf8');
  const localJson = fs.existsSync(localOutputPath)
    ? fs.readFileSync(localOutputPath, 'utf8')
    : null;

  fs.mkdirSync(path.dirname(localOutputPath), { recursive: true });

  if (deployedJson !== localJson) {
    fs.writeFileSync(localOutputPath, deployedJson, 'utf8');
    logger.info('[morphoza] copied docs/data generated file into data');
  } else {
    logger.info('[morphoza] data already matches docs/data generated file');
  }
}

main().catch((error) => {
  console.error(`[morphoza] sync failed: ${error.message}`);
  process.exit(1);
});

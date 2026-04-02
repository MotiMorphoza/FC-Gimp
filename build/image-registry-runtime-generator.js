'use strict';

const fs = require('fs');
const path = require('path');

const {
  loadImageRegistry,
  buildRuntimeRegistrySnapshot
} = require('./image-registry');

function writeRuntimeRegistry({ rootDir, tempDir, logger = null }) {
  const registry = loadImageRegistry(rootDir, logger);
  const payload = buildRuntimeRegistrySnapshot(registry);
  const outputPath = path.join(tempDir, 'data', 'image-registry.generated.json');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');

  if (logger && typeof logger.info === 'function') {
    logger.info(`[registry] Generated runtime registry snapshot (${payload.summary.imageCount} images)`);
  }

  return payload;
}

module.exports = {
  writeRuntimeRegistry
};

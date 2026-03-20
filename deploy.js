'use strict';

const Logger = require('./build/logger');
const AtomicDeployer = require('./build/atomic-deployer');

async function main() {
  const logger = new Logger();
  const deployer = new AtomicDeployer(logger);
  const rootDir = process.cwd();

  try {
    logger.info('Starting deploy process');
    await deployer.deploy(rootDir);
  } catch (error) {
    logger.error(`Deploy failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

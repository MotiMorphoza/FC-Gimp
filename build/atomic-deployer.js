'use strict';

const fs = require('fs');
const path = require('path');
const Scanner = require('./scanner');

const RETRYABLE_CODES = new Set(['EPERM', 'EBUSY', 'ENOTEMPTY']);
const RETRY_DELAYS_MS = [150, 300, 600, 1200];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AtomicDeployer {
  constructor(logger) {
    this.logger = logger;
    this.buildDir = 'dist';
    this.backupDir = '.docs-backup';
    this.targetDir = 'docs';
    this.directoriesToCopy = ['css', 'js', 'images', 'partials', 'data'];
    this.rootPassthroughPatterns = [/^google[a-z0-9]+\.html$/i];
  }

  getBuildPath(rootDir) {
    return path.join(rootDir, this.buildDir);
  }

  getBackupPath(rootDir) {
    return path.join(rootDir, this.backupDir);
  }

  getTargetPath(rootDir) {
    return path.join(rootDir, this.targetDir);
  }

  isRetryable(error) {
    return Boolean(error && RETRYABLE_CODES.has(error.code));
  }

  async withRetries(label, action) {
    let lastError = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return action();
      } catch (error) {
        lastError = error;

        if (!this.isRetryable(error) || attempt === RETRY_DELAYS_MS.length) {
          throw error;
        }

        const delayMs = RETRY_DELAYS_MS[attempt];
        this.logger.warn(`${label} failed (${error.code || error.message}); retrying in ${delayMs}ms`);
        await sleep(delayMs);
      }
    }

    throw lastError || new Error(`${label} failed`);
  }

  // --------------------------------------------------
  // Initialize fresh build output directory
  // --------------------------------------------------
  initBuildDir(rootDir) {
    const buildPath = this.getBuildPath(rootDir);

    if (fs.existsSync(buildPath)) {
      fs.rmSync(buildPath, { recursive: true, force: true });
    }

    fs.mkdirSync(buildPath, { recursive: true });
    this.logger.info(`Build output directory ready: ${this.buildDir}`);

    return buildPath;
  }

  // --------------------------------------------------
  // Copy project source into build output directory
  // --------------------------------------------------
  copyToBuild(rootDir, buildDir) {
    this.logger.info(`Copying source into ${this.buildDir}`);

    const scanner = new Scanner(this.logger);
    const htmlFiles = scanner.findHtmlFiles(rootDir);

    for (const file of htmlFiles) {
      const src = path.join(rootDir, file);
      const dest = path.join(buildDir, file);

      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }

    this.copyRootPassthroughFiles(rootDir, buildDir);

    const srcProjectsDir = path.join(rootDir, 'src', 'projects');
    const legacyProjectsDir = path.join(rootDir, 'projects');
    const projectsDest = path.join(buildDir, 'projects');

    if (fs.existsSync(srcProjectsDir) && fs.statSync(srcProjectsDir).isDirectory()) {
      fs.cpSync(srcProjectsDir, projectsDest, { recursive: true });
    } else if (fs.existsSync(legacyProjectsDir) && fs.statSync(legacyProjectsDir).isDirectory()) {
      fs.cpSync(legacyProjectsDir, projectsDest, { recursive: true });
    }

    for (const dir of this.directoriesToCopy) {
      const src = path.join(rootDir, dir);
      const dest = path.join(buildDir, dir);

      if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
        fs.cpSync(src, dest, { recursive: true });
      }
    }
  }

  copyRootPassthroughFiles(rootDir, buildDir) {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });

    entries
      .filter((entry) => entry.isFile())
      .filter((entry) =>
        this.rootPassthroughPatterns.some((pattern) => pattern.test(entry.name))
      )
      .forEach((entry) => {
        const src = path.join(rootDir, entry.name);
        const dest = path.join(buildDir, entry.name);

        fs.copyFileSync(src, dest);
        this.logger.info(`[pages] Copied root passthrough file: ${entry.name}`);
      });
  }

  async removePathIfExists(targetPath, label) {
    if (!fs.existsSync(targetPath)) return;
    await this.withRetries(label, () => {
      fs.rmSync(targetPath, { recursive: true, force: true });
    });
  }

  async renamePathIfExists(fromPath, toPath, label) {
    if (!fs.existsSync(fromPath)) return false;

    await this.withRetries(label, () => {
      fs.renameSync(fromPath, toPath);
    });

    return true;
  }

  async copyBuildToTarget(buildPath, targetPath) {
    let lastError = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        if (fs.existsSync(targetPath)) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }

        fs.cpSync(buildPath, targetPath, { recursive: true, force: true });
        return;
      } catch (error) {
        lastError = error;

        try {
          if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
          }
        } catch (_cleanupError) {
          // Best-effort cleanup between retries.
        }

        if (!this.isRetryable(error) || attempt === RETRY_DELAYS_MS.length) {
          throw error;
        }

        const delayMs = RETRY_DELAYS_MS[attempt];
        this.logger.warn(`Copying ${this.buildDir} to ${this.targetDir} failed (${error.code || error.message}); retrying in ${delayMs}ms`);
        await sleep(delayMs);
      }
    }

    throw lastError || new Error(`Copying ${this.buildDir} to ${this.targetDir} failed`);
  }

  // --------------------------------------------------
  // Deploy dist -> docs with backup + rollback
  // --------------------------------------------------
  async deploy(rootDir) {
    const buildPath = this.getBuildPath(rootDir);
    const targetPath = this.getTargetPath(rootDir);
    const backupPath = this.getBackupPath(rootDir);
    let backupCreated = false;

    if (!fs.existsSync(buildPath)) {
      throw new Error(`Missing ${this.buildDir} output. Run "npm run build" first.`);
    }

    await this.removePathIfExists(backupPath, 'Removing stale docs backup');

    try {
      if (fs.existsSync(targetPath)) {
        this.logger.info('Creating backup of current docs');
        backupCreated = await this.renamePathIfExists(
          targetPath,
          backupPath,
          'Backing up docs'
        );
      }

      this.logger.info(`Copying ${this.buildDir} to ${this.targetDir}`);
      await this.copyBuildToTarget(buildPath, targetPath);

      if (backupCreated) {
        await this.removePathIfExists(backupPath, 'Removing docs backup');
      }

      this.logger.success('Deployment completed successfully');
    } catch (error) {
      this.logger.error(`Deployment failed: ${error.message}`);

      if (backupCreated && fs.existsSync(backupPath)) {
        this.logger.info('Restoring previous version');

        try {
          await this.removePathIfExists(targetPath, 'Removing partial docs');
          await this.renamePathIfExists(
            backupPath,
            targetPath,
            'Restoring docs backup'
          );
          this.logger.info('Rollback completed');
        } catch (rollbackError) {
          this.logger.error(`Rollback failed: ${rollbackError.message}`);
        }
      }

      throw error;
    }
  }

  // --------------------------------------------------
  // Cleanup build output directory manually
  // --------------------------------------------------
  cleanupBuildDir(rootDir) {
    const buildPath = this.getBuildPath(rootDir);

    if (fs.existsSync(buildPath)) {
      fs.rmSync(buildPath, { recursive: true, force: true });
      this.logger.info(`${this.buildDir} directory cleaned`);
    }
  }
}

module.exports = AtomicDeployer;

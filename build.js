'use strict';

const fs   = require('fs');
const path = require('path');

const Logger            = require('./build/logger');
const Scanner           = require('./build/scanner');
const Hasher            = require('./build/hasher');
const HtmlProcessor     = require('./build/html-processor');
const ManifestGenerator = require('./build/manifest-generator');
const HeadOrchestrator  = require('./build/head-orchestrator');
const Versioning        = require('./build/versioning');
const AtomicDeployer    = require('./build/atomic-deployer');

const { generateShopIndex }      = require('./build/shop-index-generator');
const { convertProjectImages }   = require('./build/image-converter');
const { generateMorphozaVideos } = require('./build/morphoza-videos-generator');
const { generateHumanWritesContent } = require('./build/human-writes-generator');
const { SITE_HOSTNAME } = require('./build/site-config');

class SuperBuild {

  constructor() {
    this.logger            = new Logger();
    this.scanner           = new Scanner(this.logger);
    this.hasher            = new Hasher(this.logger);
    this.htmlProcessor     = new HtmlProcessor(this.logger);
    this.manifestGenerator = new ManifestGenerator(this.logger);
    this.versioning        = new Versioning(this.logger);
    this.deployer          = new AtomicDeployer(this.logger);
    this.rootDir           = process.cwd();
  }

  collectVersionInputs(buildDir) {
    const dataDir = path.join(buildDir, 'data');
    const inputs = {};

    const walk = (currentDir) => {
      if (!fs.existsSync(currentDir)) return;

      fs.readdirSync(currentDir, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name))
        .forEach((entry) => {
          const fullPath = path.join(currentDir, entry.name);

          if (entry.isDirectory()) {
            walk(fullPath);
            return;
          }

          const relativePath = path.relative(buildDir, fullPath).replace(/\\/g, '/');
          inputs[relativePath] = fs.readFileSync(fullPath, 'utf8');
        });
    };

    walk(dataDir);
    return inputs;
  }

  async build() {
    try {

      this.logger.info('Starting build process');

      this.validateSource();
      await this.buildMorphozaVideos();
      this.buildHumanWritesContent();

      const tempDir = this.deployer.initTempDir(this.rootDir);
      this.deployer.copyToTemp(this.rootDir, tempDir);
      this.writeCustomDomainFile(tempDir);

      // ─────────────────────────────────────────────────────────────────────
      // Convert project images  JPG/PNG → WebP
      //
      // Must run AFTER copyToTemp (works on the temp copy, never touches src/)
      // and BEFORE scanProjectsFromRoot (scanner must see .webp + updated JSON)
      //
      // Handles both layouts:
      //   src/projects/  (standard)  → writes to tempDir/projects/, removes
      //                                tempDir/src/projects/ so the scanner's
      //                                getProjectsSourceDir() falls back to
      //                                tempDir/projects/ (which gets deployed
      //                                to docs/projects/).
      //   projects/      (flat)      → converts in-place inside tempDir/projects/
      // ─────────────────────────────────────────────────────────────────────
      await convertProjectImages(tempDir, this.logger);

      // ─────────────────────────────────────────────────────────────────────
      // Validate projects
      // Scanner now finds tempDir/projects/ with .webp images and updated JSON
      // ─────────────────────────────────────────────────────────────────────
      const projects = this.scanner.scanProjectsFromRoot(tempDir);
      this.logger.info(`Validated ${projects.length} projects`);

      // ─────────────────────────────────────────────────────────────────────
      // Generate manifests
      // ─────────────────────────────────────────────────────────────────────
      this.generateProjectsManifest(projects, tempDir);

      const manifestData = this.manifestGenerator.createManifestData(
        this.scanner,
        path.join(tempDir, 'images'),
        tempDir
      );

      const manifestPath = path.join(tempDir, 'js', 'image-manifest.js');
      this.manifestGenerator.generate(manifestData, manifestPath);
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const versionInputs = this.collectVersionInputs(tempDir);

      // ─────────────────────────────────────────────────────────────────────
      // Versioning (preliminary pass – before asset hashing)
      // ─────────────────────────────────────────────────────────────────────
      const prelimVersion = this.versioning.generateVersion(new Map(), manifestContent, versionInputs);
      this.versioning.createVersionFile(tempDir, prelimVersion);

      // ─────────────────────────────────────────────────────────────────────
      // Hash CSS / JS / images in tempDir/images  (NOT project images)
      // ─────────────────────────────────────────────────────────────────────
      this.hasher.hashAssets(tempDir, this.scanner);
      const renameMap = this.hasher.getRenameMap();

      // ─────────────────────────────────────────────────────────────────────
      // Final BUILD_VERSION (incorporates rename map)
      // ─────────────────────────────────────────────────────────────────────
      const BUILD_VERSION = this.versioning.generateVersion(renameMap, manifestContent, versionInputs);

      const jsDir = path.join(tempDir, 'js');
      const jsFiles = fs.readdirSync(jsDir).sort();
      const hashedVersionFile = jsFiles.find(f =>
        /^build-version\.[a-f0-9]{8}\.js$/.test(f)
      );

      if (hashedVersionFile) {
        fs.writeFileSync(
          path.join(jsDir, hashedVersionFile),
          `window.__BUILD_VERSION__ = "${BUILD_VERSION}";\n`,
          'utf8'
        );
      }

      // ─────────────────────────────────────────────────────────────────────
      // Generate shop/index.json (reads tempDir/projects/*.json – already webp)
      // ─────────────────────────────────────────────────────────────────────
      await this.buildShopIndex(tempDir, BUILD_VERSION);

      // ─────────────────────────────────────────────────────────────────────
      // Rewrite HTML
      // ─────────────────────────────────────────────────────────────────────
      const htmlFiles = this.scanner.findHtmlFiles(tempDir);
      this.htmlProcessor.processHtmlFiles(htmlFiles, tempDir, renameMap);

      // ─────────────────────────────────────────────────────────────────────
      // Rewrite partials
      // ─────────────────────────────────────────────────────────────────────
      const partialsDir = path.join(tempDir, 'partials');
      if (fs.existsSync(partialsDir)) {
        fs.readdirSync(partialsDir)
          .filter(f => f.endsWith('.html'))
          .forEach(f => {
            this.htmlProcessor.processFragment(
              path.join(partialsDir, f),
              renameMap,
              tempDir
            );
          });
      }

      // ─────────────────────────────────────────────────────────────────────
      // Rewrite CSS url()
      // ─────────────────────────────────────────────────────────────────────
      const cssDir = path.join(tempDir, 'css');
      if (fs.existsSync(cssDir)) {
        fs.readdirSync(cssDir)
          .filter(f => f.endsWith('.css'))
          .forEach(f => {
            const cssPath = path.join(cssDir, f);
            let css = fs.readFileSync(cssPath, 'utf8');
            for (const [oldPath, newPath] of renameMap.entries()) {
              const rx = new RegExp(
                oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                'g'
              );
              css = css.replace(rx, newPath);
            }
            fs.writeFileSync(cssPath, css, 'utf8');
          });
      }

      // ─────────────────────────────────────────────────────────────────────
      // Rewrite image-manifest JS
      // ─────────────────────────────────────────────────────────────────────
      const manifestFile = fs.readdirSync(jsDir).find(f =>
        /^image-manifest\.[a-f0-9]{8}\.js$/.test(f)
      );

      if (!manifestFile) throw new Error('Hashed manifest file not found');

      const manifestFullPath = path.join(jsDir, manifestFile);
      let manifestJs = fs.readFileSync(manifestFullPath, 'utf8');

      for (const [oldPath, newPath] of renameMap.entries()) {
        const rx = new RegExp(
          oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'g'
        );
        manifestJs = manifestJs.replace(rx, newPath);
      }

      fs.writeFileSync(manifestFullPath, manifestJs, 'utf8');

      // ─────────────────────────────────────────────────────────────────────
      // HEAD orchestration
      // ─────────────────────────────────────────────────────────────────────
      const assets = {
        versionScriptPath: hashedVersionFile ? `js/${hashedVersionFile}` : null,
        renameMap,
        version: BUILD_VERSION
      };

      for (const htmlFile of htmlFiles) {
        const filePath = path.join(tempDir, htmlFile);
        let html = fs.readFileSync(filePath, 'utf8');

        const orchestrator = new HeadOrchestrator({
          logger: this.logger,
          renameMap,
          manifestData,
          version: BUILD_VERSION,
          assets,
          htmlFile
        });

        html = orchestrator.buildHead(html);
        fs.writeFileSync(filePath, html, 'utf8');
      }

      // ─────────────────────────────────────────────────────────────────────
      // Verify & Deploy
      // ─────────────────────────────────────────────────────────────────────
      this.htmlProcessor.verifyReferences(htmlFiles, tempDir);
      this.deployer.deploy(this.rootDir);
      this.logger.printSummary(path.join(this.rootDir, 'docs'));

    } catch (error) {
      this.logger.error(`Build failed: ${error.message}`);
      this.deployer.cleanup(this.rootDir);
      process.exit(1);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shop index
  // ─────────────────────────────────────────────────────────────────────────
  async buildMorphozaVideos() {
    const sourcePath = path.join(this.rootDir, 'data', 'morphoza-videos.json');
    const localOutputPath = path.join(this.rootDir, 'data', 'morphoza-videos.generated.json');
    const deployedOutputPath = path.join(this.rootDir, 'docs', 'data', 'morphoza-videos.generated.json');

    await generateMorphozaVideos({
      sourcePath,
      outputPath: deployedOutputPath,
      fallbackSourcePaths: [localOutputPath],
      logger: this.logger,
      delayMs: 300
    });

    const deployedJson = fs.readFileSync(deployedOutputPath, 'utf8');
    const localJson = fs.existsSync(localOutputPath)
      ? fs.readFileSync(localOutputPath, 'utf8')
      : null;

    fs.mkdirSync(path.dirname(localOutputPath), { recursive: true });

    if (localJson !== deployedJson) {
      fs.writeFileSync(localOutputPath, deployedJson, 'utf8');
      this.logger.info('[morphoza] copied docs/data generated file into data');
    }
  }

  buildHumanWritesContent() {
    const sourceRoot = path.join(this.rootDir, 'data', 'hw');
    const outputPath = path.join(sourceRoot, 'generated', 'human-writes.generated.json');

    generateHumanWritesContent({
      sourceRoot,
      outputPath,
      logger: this.logger
    });
  }


  writeCustomDomainFile(tempDir) {
    const cnamePath = path.join(tempDir, 'CNAME');
    fs.writeFileSync(cnamePath, SITE_HOSTNAME + '\n', 'utf8');
    this.logger.info(`[pages] CNAME written for ${SITE_HOSTNAME}`);
  }

  async buildShopIndex(tempDir, BUILD_VERSION) {
    const projectsDir = path.join(tempDir, 'projects');
    const outputDir   = path.join(tempDir, 'shop');

    fs.mkdirSync(outputDir, { recursive: true });

    const { manifest } = generateShopIndex({
      projectsDir,
      outputDir,
      buildVersion: BUILD_VERSION,
      hashFilename: false
    });

    this.logger.info(
      `[shop] shop/index.json generated (${manifest.projects.length} projects)`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Projects manifest  (window.__PROJECTS__)
  // ─────────────────────────────────────────────────────────────────────────
  generateProjectsManifest(projects, tempDir) {
    const outputPath = path.join(tempDir, 'js', 'projects-manifest.js');

    const payload = projects.map(p => ({
      slug:        p.slug,
      title:       p.title,
      description: p.description || '',
      cover:       p.images[0]?.src || '',
      imageCount:  p.images.length
    }));

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(
      outputPath,
      `window.__PROJECTS__ = ${JSON.stringify(payload, null, 2)};\n`,
      'utf8'
    );

    this.logger.info('Generated projects manifest');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Source validation
  // ─────────────────────────────────────────────────────────────────────────
  validateSource() {
    for (const item of ['index.html', 'css', 'js', 'images', 'data']) {
      if (!fs.existsSync(path.join(this.rootDir, item))) {
        throw new Error(`Missing required item: ${item}`);
      }
    }
  }
}

if (require.main === module) {
  new SuperBuild().build();
}

module.exports = SuperBuild;


'use strict';

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const Logger            = require('./build/logger');
const Scanner           = require('./build/scanner');
const Hasher            = require('./build/hasher');
const HtmlProcessor     = require('./build/html-processor');
const ManifestGenerator = require('./build/manifest-generator');
const HeadOrchestrator  = require('./build/head-orchestrator');
const Versioning        = require('./build/versioning');
const AtomicDeployer    = require('./build/atomic-deployer');

const { generateShopIndex } = require('./build/shop-index-generator');

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

  async build() {

    try {

      this.logger.info('Starting build process');

      this.validateSource();

      const tempDir = this.deployer.initTempDir(this.rootDir);
      this.deployer.copyToTemp(this.rootDir, tempDir);

      // -------------------------------------------------
      // Convert source images to WebP into build/projects
      // -------------------------------------------------
      await this.buildProjectsWebp(tempDir);

      // -------------------------------------------------
      // Validate projects
      // -------------------------------------------------
      const projects = this.scanner.scanProjectsFromRoot(tempDir);
      this.logger.info(`Validated ${projects.length} projects`);

      this.generateProjectsManifest(projects, tempDir);

      const manifestData = this.manifestGenerator.createManifestData(
        this.scanner,
        path.join(tempDir, 'images'),
        tempDir
      );

      const manifestPath = path.join(tempDir, 'js', 'image-manifest.js');
      this.manifestGenerator.generate(manifestData, manifestPath);
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');

      const prelimVersion = this.versioning.generateVersion(new Map(), manifestContent);
      this.versioning.createVersionFile(tempDir, prelimVersion);

      this.hasher.hashAssets(tempDir, this.scanner);
      const renameMap = this.hasher.getRenameMap();

      const BUILD_VERSION = this.versioning.generateVersion(renameMap, manifestContent);

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

      await this.buildShopIndex(tempDir, BUILD_VERSION);

      const htmlFiles = this.scanner.findHtmlFiles(tempDir);
      this.htmlProcessor.processHtmlFiles(htmlFiles, tempDir, renameMap);

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

      this.htmlProcessor.verifyReferences(htmlFiles, tempDir);
      this.deployer.deploy(this.rootDir);
      this.logger.printSummary(path.join(this.rootDir, 'docs'));

    }

    catch (error) {

      this.logger.error(`Build failed: ${error.message}`);
      this.deployer.cleanup(this.rootDir);
      process.exit(1);

    }

  }

  // -------------------------------------------------
  // Convert JPG → WebP for projects
  // -------------------------------------------------
  async buildProjectsWebp(tempDir) {

    const srcProjects  = path.join(tempDir, 'src', 'projects');
    const buildProjects = path.join(tempDir, 'projects');

    if (!fs.existsSync(srcProjects)) return;

    fs.rmSync(buildProjects, { recursive: true, force: true });
    fs.mkdirSync(buildProjects, { recursive: true });

    const projects = fs.readdirSync(srcProjects);

    for (const project of projects) {

      const srcDir  = path.join(srcProjects, project);
      const destDir = path.join(buildProjects, project);

      if (!fs.statSync(srcDir).isDirectory()) continue;

      fs.mkdirSync(destDir, { recursive: true });

      const files = fs.readdirSync(srcDir);

      for (const file of files) {

        const srcPath = path.join(srcDir, file);

        if (file === 'project.json') {

          const json = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

          json.images = json.images.map(img => ({
            ...img,
            src: img.src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
          }));

          fs.writeFileSync(
            path.join(destDir, 'project.json'),
            JSON.stringify(json, null, 2)
          );

          continue;
        }

        if (!file.match(/\.(jpg|jpeg|png)$/i)) continue;

        const webpName = file.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        const destPath = path.join(destDir, webpName);

        await sharp(srcPath)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(destPath);

      }

    }

    this.logger.info('Projects converted to WebP');

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

  generateProjectsManifest(projects, tempDir) {

    const outputPath = path.join(tempDir, 'js', 'projects-manifest.js');

    const payload = projects.map(p => ({
      slug: p.slug,
      title: p.title,
      description: p.description || '',
      cover: p.images[0]?.src || '',
      imageCount: p.images.length
    }));

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    fs.writeFileSync(
      outputPath,
      `window.__PROJECTS__ = ${JSON.stringify(payload, null, 2)};\n`,
      'utf8'
    );

    this.logger.info('Generated projects manifest');

  }

  validateSource() {

    for (const item of ['index.html', 'css', 'js', 'images']) {

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
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
const { writeImageSearchDataset } = require('./build/image-search-generator');
const { applyProjectSeoData, buildProjectSeoMap, renderProjectSeedMarkup } = require('./build/project-seo');
const { SITE_HOSTNAME, SITE_ORIGIN } = require('./build/site-config');

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

      const buildDir = this.deployer.initBuildDir(this.rootDir);
      this.deployer.copyToBuild(this.rootDir, buildDir);

      await this.buildMorphozaVideos(buildDir);
      this.buildHumanWritesContent(buildDir);
      this.writeCustomDomainFile(buildDir);

      // ─────────────────────────────────────────────────────────────────────
      // Convert project images  JPG/PNG → WebP
      //
      // Must run AFTER copyToBuild (works on the build copy, never touches src/)
      // and BEFORE scanProjectsFromRoot (scanner must see .webp + updated JSON)
      //
      // Handles both layouts:
      //   src/projects/  (standard)  → writes to buildDir/projects/, removes
      //                                buildDir/src/projects/ so the scanner's
      //                                getProjectsSourceDir() falls back to
      //                                buildDir/projects/ (which gets copied
      //                                to docs/projects/ at deploy time).
      //   projects/      (flat)      → converts in-place inside buildDir/projects/
      // ─────────────────────────────────────────────────────────────────────
      await convertProjectImages(buildDir, this.logger);

      // ─────────────────────────────────────────────────────────────────────
      // Validate projects
      // Scanner now finds buildDir/projects/ with .webp images and updated JSON
      // ─────────────────────────────────────────────────────────────────────
      const projects = this.scanner.scanProjectsFromRoot(buildDir);
      this.logger.info(`Validated ${projects.length} projects`);
      this.logImageMetadataCoverage(projects);
      const imageSearchDataset = this.generateImageSearchDataset(projects, buildDir);
      this.pruneBuildSearchFallback(buildDir);
      const projectSeoMap = buildProjectSeoMap(projects, imageSearchDataset);
      applyProjectSeoData(projects, projectSeoMap);
      this.generateStaticProjectPages(projects, buildDir);

      // ─────────────────────────────────────────────────────────────────────
      // Generate manifests
      // ─────────────────────────────────────────────────────────────────────
      this.generateProjectsManifest(projects, buildDir);

      const manifestData = this.manifestGenerator.createManifestData(
        this.scanner,
        path.join(buildDir, 'images'),
        buildDir
      );
      applyProjectSeoData(manifestData.projects || [], projectSeoMap);

      const manifestPath = path.join(buildDir, 'js', 'image-manifest.js');
      this.manifestGenerator.generate(manifestData, manifestPath);
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const versionInputs = this.collectVersionInputs(buildDir);

      // ─────────────────────────────────────────────────────────────────────
      // Versioning (preliminary pass – before asset hashing)
      // ─────────────────────────────────────────────────────────────────────
      const prelimVersion = this.versioning.generateVersion(new Map(), manifestContent, versionInputs);
      this.versioning.createVersionFile(buildDir, prelimVersion);

      // ─────────────────────────────────────────────────────────────────────
      // Hash CSS / JS / images in buildDir/images  (NOT project images)
      // ─────────────────────────────────────────────────────────────────────
      this.hasher.hashAssets(buildDir, this.scanner);
      const renameMap = this.hasher.getRenameMap();
      this.pruneExcludedHashedAssets(buildDir, renameMap);

      // ─────────────────────────────────────────────────────────────────────
      // Final BUILD_VERSION (incorporates rename map)
      // ─────────────────────────────────────────────────────────────────────
      const BUILD_VERSION = this.versioning.generateVersion(renameMap, manifestContent, versionInputs);

      const jsDir = path.join(buildDir, 'js');
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
      // Generate shop/index.json (reads buildDir/projects/*.json – already webp)
      // ─────────────────────────────────────────────────────────────────────
      await this.buildShopIndex(buildDir, BUILD_VERSION);

      // ─────────────────────────────────────────────────────────────────────
      // Rewrite HTML
      // ─────────────────────────────────────────────────────────────────────
      const htmlFiles = this.scanner.findHtmlFiles(buildDir);
      this.htmlProcessor.processHtmlFiles(htmlFiles, buildDir, renameMap);

      // ─────────────────────────────────────────────────────────────────────
      // Rewrite partials
      // ─────────────────────────────────────────────────────────────────────
      const partialsDir = path.join(buildDir, 'partials');
      if (fs.existsSync(partialsDir)) {
        fs.readdirSync(partialsDir)
          .filter(f => f.endsWith('.html'))
          .forEach(f => {
            this.htmlProcessor.processFragment(
              path.join(partialsDir, f),
              renameMap,
              buildDir
            );
          });
      }

      // ─────────────────────────────────────────────────────────────────────
      // Rewrite CSS url()
      // ─────────────────────────────────────────────────────────────────────
      const cssDir = path.join(buildDir, 'css');
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
        const filePath = path.join(buildDir, htmlFile);
        let html = fs.readFileSync(filePath, 'utf8');

        const orchestrator = new HeadOrchestrator({
          logger: this.logger,
          renameMap,
          manifestData,
          version: BUILD_VERSION,
          assets,
          htmlFile,
          tempDir: buildDir
        });

        html = await orchestrator.buildHead(html);
        fs.writeFileSync(filePath, html, 'utf8');
      }

      this.generateRobotsAndSitemap(buildDir, projects);

      // ─────────────────────────────────────────────────────────────────────
      // Verify & summarize build output
      // ─────────────────────────────────────────────────────────────────────
      this.htmlProcessor.verifyReferences(htmlFiles, buildDir);
      this.logger.printSummary(buildDir);

    } catch (error) {
      this.logger.error(`Build failed: ${error.message}`);
      try {
        this.deployer.cleanupBuildDir(this.rootDir);
      } catch (cleanupError) {
        this.logger.warn(`Build cleanup failed: ${cleanupError.message}`);
      }
      process.exit(1);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shop index
  // ─────────────────────────────────────────────────────────────────────────
  async buildMorphozaVideos(buildDir) {
    const sourcePath = path.join(this.rootDir, 'data', 'morphoza-videos.json');
    const outputPath = path.join(buildDir, 'data', 'morphoza-videos.generated.json');
    const fallbackOutputPath = path.join(this.rootDir, 'data', 'morphoza-videos.generated.json');

    await generateMorphozaVideos({
      sourcePath,
      outputPath,
      fallbackSourcePaths: [fallbackOutputPath],
      logger: this.logger,
      delayMs: 300,
      preferExistingTitles: true
    });
  }

  buildHumanWritesContent(buildDir) {
    const sourceRoot = path.join(this.rootDir, 'data', 'hw');
    const outputPath = path.join(buildDir, 'data', 'hw', 'generated', 'human-writes.generated.json');

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
  generateStaticProjectPages(projects, tempDir) {
    const templatePath = path.join(tempDir, 'project.html');
    if (!fs.existsSync(templatePath)) {
      throw new Error('Missing project.html template for static project pages');
    }

    const template = fs.readFileSync(templatePath, 'utf8');

    projects.forEach((project) => {
      const outputPath = path.join(tempDir, `project-${project.slug}.html`);
      const seededMarkup = renderProjectSeedMarkup(project);
      let pageHtml = template.replace(
        /<body class="page-shell" data-page="project">/i,
        `<body class="page-shell" data-page="project" data-project-slug="${project.slug}">`
      );

      pageHtml = pageHtml.replace(
        /<section class="project-context"><\/section>/i,
        seededMarkup.contextHtml
      );

      pageHtml = pageHtml.replace(
        /<div class="project-gallery"><\/div>/i,
        seededMarkup.galleryHtml
      );

      pageHtml = pageHtml.replace(
        /<nav class="project-related-links" aria-label="Related galleries"><\/nav>/i,
        seededMarkup.relatedHtml
      );

      fs.writeFileSync(outputPath, pageHtml, 'utf8');
    });

    this.logger.info(`Generated ${projects.length} static project pages`);
  }

  generateImageSearchDataset(projects, tempDir) {
    return writeImageSearchDataset({
      projects,
      rootDir: this.rootDir,
      tempDir,
      logger: this.logger
    });
  }

  pruneBuildSearchFallback(tempDir) {
    const rawDatasetPath = path.join(tempDir, 'data', 'images.json');
    if (!fs.existsSync(rawDatasetPath)) return;

    fs.rmSync(rawDatasetPath, { force: true });
    this.logger.info('[search] Removed raw images dataset from build output');
  }

  pruneExcludedHashedAssets(tempDir, renameMap) {
    const excludedAssets = [
      'css/search-debug.css',
      'js/search-debug.js'
    ];

    excludedAssets.forEach((oldPath) => {
      const resolvedPath = renameMap.get(oldPath) || oldPath;
      const fullPath = path.join(tempDir, resolvedPath);

      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { force: true });
        this.logger.info(`[build] Pruned excluded asset: ${resolvedPath}`);
      }

      renameMap.delete(oldPath);
    });
  }

  escapeXml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  generateRobotsAndSitemap(tempDir, projects) {
    const today = new Date().toISOString().slice(0, 10);
    const staticPages = [
      '',
      'main.html',
      'projects.html',
      'about.html',
      'shop.html',
      'more.html',
      'human-writes.html',
      'morphoza.html'
    ];

    const pageEntries = staticPages.map((fileName) => ({
      url: fileName ? encodeURI(`${SITE_ORIGIN}/${fileName}`) : `${SITE_ORIGIN}/`,
      images: []
    }));

    const projectEntries = projects.map((project) => ({
      url: encodeURI(`${SITE_ORIGIN}/project-${project.slug}.html`),
      images: project.images.map((image) => ({
        loc: encodeURI(`${SITE_ORIGIN}/projects/${project.slug}/${image.src}`)
      }))
    }));

    const urlEntries = [...pageEntries, ...projectEntries];

    const sitemap = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      ...urlEntries.map((entry) => {
        const lines = [
          '  <url>',
          `    <loc>${this.escapeXml(entry.url)}</loc>`,
          `    <lastmod>${today}</lastmod>`
        ];

        entry.images.forEach((image) => {
          lines.push('    <image:image>');
          lines.push(`      <image:loc>${this.escapeXml(image.loc)}</image:loc>`);
          lines.push('    </image:image>');
        });

        lines.push('  </url>');
        return lines.join('\n');
      }),
      '</urlset>',
      ''
    ].join('\n');

    const robots = [
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
      `Host: ${SITE_HOSTNAME}`,
      ''
    ].join('\n');

    fs.writeFileSync(path.join(tempDir, 'sitemap.xml'), sitemap, 'utf8');
    fs.writeFileSync(path.join(tempDir, 'robots.txt'), robots, 'utf8');
    this.logger.info('[seo] Generated robots.txt and sitemap.xml');
  }

  generateProjectsManifest(projects, tempDir) {
    const outputPath = path.join(tempDir, 'js', 'projects-manifest.js');

    const payload = projects.map(p => ({
      slug:        p.slug,
      title:       p.title,
      description: p.description || '',
      tags:        Array.isArray(p.tags) ? p.tags : [],
      cover:       p.images[0]?.src || '',
      coverAlt:    p.images[0]?.alt || p.images[0]?.caption || p.title,
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
  logImageMetadataCoverage(projects) {
    const stats = projects.reduce((acc, project) => {
      (project.images || []).forEach((image) => {
        acc.total += 1;
        if (String(image?.alt || '').trim()) acc.withAlt += 1;
        if (String(image?.caption || '').trim()) acc.withCaption += 1;
      });
      return acc;
    }, { total: 0, withAlt: 0, withCaption: 0 });

    this.logger.info(
      `[seo] Image metadata coverage: alt ${stats.withAlt}/${stats.total}, captions ${stats.withCaption}/${stats.total}`
    );
  }

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


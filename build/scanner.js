const fs = require('fs');
const path = require('path');

class Scanner {
  constructor(logger) {
    this.logger = logger;
    this.excludeDirs = [
      '.git',
      '__pycache__',
      'node_modules',
      'docs',
      '.build-temp',
      '.docs-backup'
    ];

    this.imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    this.fontExtensions = ['.woff2', '.woff', '.ttf', '.otf', '.eot'];
  }

  scanDirectory(dir, extensions = [], additionalExcludes = [], rootDir = dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      return results;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (this.shouldExclude(entry.name, additionalExcludes)) continue;

        results.push(
          ...this.scanDirectory(fullPath, extensions, additionalExcludes, rootDir)
        );
      } else {
        if (
          extensions.length === 0 ||
          extensions.includes(path.extname(entry.name).toLowerCase())
        ) {
          const relative = path
            .relative(rootDir, fullPath)
            .replace(/\\/g, '/');

          results.push(relative);
        }
      }
    }

    return results.sort();
  }

  shouldExclude(name, additionalExcludes = []) {
    if (name.startsWith('.')) return true;
    if (this.excludeDirs.includes(name)) return true;
    if (additionalExcludes.includes(name)) return true;
    return false;
  }

  findHtmlFiles(rootDir) {
    if (!fs.existsSync(rootDir)) return [];

    const files = fs.readdirSync(rootDir);
    const htmlFiles = [];

    for (const file of files) {
      if (!file.endsWith('.html')) continue;

      const fullPath = path.join(rootDir, file);

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (/<head[^>]*>/i.test(content)) {
          htmlFiles.push(file);
        }
      } catch (err) {
        continue;
      }
    }

    return htmlFiles.sort();
  }

  findFonts(dir, limit = 2) {
    const allFonts = this.scanDirectory(
      dir,
      this.fontExtensions,
      [],
      dir
    );

    return allFonts.slice(0, limit);
  }

  scanImagesForManifest(imagesDir, rootDir) {
    if (!rootDir) rootDir = process.cwd();

    const manifest = {
      landing: {
        desktop: [],
        mobile: []
      },
      main: [],
      projects: []
    };

    if (fs.existsSync(imagesDir)) {
      const landingDir = path.join(imagesDir, 'landing');
      const mainDir = path.join(imagesDir, 'main');

      // ===== LANDING IMAGES =====
      if (fs.existsSync(landingDir)) {
        const desktopDir = path.join(landingDir, 'desktop');
        const mobileDir = path.join(landingDir, 'mobile');

        // new structure
        if (fs.existsSync(desktopDir) || fs.existsSync(mobileDir)) {
          manifest.landing.desktop = fs.existsSync(desktopDir)
            ? this.getImageFiles(desktopDir, imagesDir)
            : [];

          manifest.landing.mobile = fs.existsSync(mobileDir)
            ? this.getImageFiles(mobileDir, imagesDir)
            : [];
        } else {
          // fallback: old structure (images directly in landing/)
          manifest.landing.desktop = this.getImageFiles(landingDir, imagesDir);
        }
      }

      // ===== MAIN IMAGES =====
      if (fs.existsSync(mainDir)) {
        manifest.main = this.getImageFiles(mainDir, imagesDir);
      }
    }

    // ===== PROJECTS =====
    const projectsDir = path.join(rootDir, 'projects');
    if (fs.existsSync(projectsDir)) {
      manifest.projects = this.scanProjects(projectsDir);
    }

    return manifest;
  }

  getImageFiles(dir, imagesRoot) {
    if (!fs.existsSync(dir)) return [];

    let files;
    try {
      files = fs.readdirSync(dir);
    } catch (err) {
      return [];
    }

    return files
      .filter(f =>
        this.imageExtensions.includes(path.extname(f).toLowerCase())
      )
      .sort()
      .map(f =>
        'images/' +
        path
          .relative(imagesRoot, path.join(dir, f))
          .replace(/\\/g, '/')
      );
  }

  scanProjects(projectsDir) {
    return this.scanProjectsFromSource(projectsDir, projectsDir);
  }

  getProjectsSourceDir(rootDir) {
    const srcProjectsDir = path.join(rootDir, 'src', 'projects');
    if (fs.existsSync(srcProjectsDir)) return srcProjectsDir;

    return path.join(rootDir, 'projects');
  }

  scanProjectsFromRoot(rootDir) {
    const sourceDir = this.getProjectsSourceDir(rootDir);
    return this.scanProjectsFromSource(sourceDir, rootDir);
  }

  scanProjectsFromSource(sourceDir, rootDir) {
    const projects = [];

    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Projects source directory not found: ${path.relative(rootDir, sourceDir)}`);
    }

    let entries;
    try {
      entries = fs.readdirSync(sourceDir, { withFileTypes: true });
    } catch (err) {
      throw new Error(`Unable to scan projects directory: ${path.relative(rootDir, sourceDir)}`);
    }

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;

      const projectPath = path.join(sourceDir, entry.name);
      const projectJsonPath = path.join(projectPath, 'project.json');

      if (!fs.existsSync(projectJsonPath)) {
        this.logger.warn(`Skipping project folder without project.json: ${path.relative(rootDir, projectPath)}`);
        continue;
      }

      const project = this.parseProject(projectPath, entry.name, rootDir);
      projects.push(project);
    }

    return projects;
  }

  getProjectImageFiles(projectPath) {
    const allowed = new Set(['.webp', '.jpg', '.jpeg', '.png']);
    let files = [];

    try {
      files = fs.readdirSync(projectPath, { withFileTypes: true });
    } catch (err) {
      return [];
    }

    return files
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(name => allowed.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  }

  parseProject(projectPath, slug, rootDir = process.cwd()) {
    const projectJsonPath = path.join(projectPath, 'project.json');

    let metadata;
    try {
      metadata = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    } catch (err) {
      throw new Error(`Invalid JSON in ${path.relative(rootDir, projectJsonPath)}: ${err.message}`);
    }

    if (!metadata || typeof metadata !== 'object') {
      throw new Error(`Invalid project.json structure in ${path.relative(rootDir, projectJsonPath)}`);
    }

    if (typeof metadata.title !== 'string' || !metadata.title.trim()) {
      throw new Error(`Missing required "title" in ${path.relative(rootDir, projectJsonPath)}`);
    }

    const imageFiles = this.getProjectImageFiles(projectPath);
    if (!imageFiles.length) {
      throw new Error(`No image files found in ${path.relative(rootDir, projectPath)}`);
    }

    const metadataImages = Array.isArray(metadata.images) ? metadata.images : [];
    const metadataBySrc = new Map();
    const orderedImages = [];

    metadataImages.forEach((img) => {
      if (!img || typeof img !== 'object') return;
      const src = typeof img.src === 'string' ? img.src : '';
      if (!src || !imageFiles.includes(src)) return;
      metadataBySrc.set(src, img);
      if (!orderedImages.includes(src)) orderedImages.push(src);
    });

    imageFiles.forEach((filename) => {
      if (!orderedImages.includes(filename)) orderedImages.push(filename);
    });

    const images = orderedImages.map((filename) => ({
      src: filename,
      caption: typeof metadataBySrc.get(filename)?.caption === 'string'
        ? metadataBySrc.get(filename).caption
        : ''
    }));

    const description = typeof metadata.description === 'string' ? metadata.description : '';
    const tags = Array.isArray(metadata.tags)
      ? [...new Set(
          metadata.tags
            .map((tag) => typeof tag === 'string' ? tag.trim() : '')
            .filter(Boolean)
        )]
      : [];

    return {
      slug,
      title: metadata.title.trim(),
      description,
      tags,
      images
    };
  }
}

module.exports = Scanner;

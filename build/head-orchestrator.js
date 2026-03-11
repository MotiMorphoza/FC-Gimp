// build/head-orchestrator.js
'use strict';

class HeadOrchestrator {
  constructor({ logger, renameMap, manifestData, version, assets, htmlFile }) {
    this.logger       = logger;
    this.renameMap    = renameMap;
    this.manifestData = manifestData;
    this.version      = version;
    this.assets       = assets || {};
    this.htmlFile     = htmlFile;
  }

  buildHead(html) {
    const headMatch = html.match(/(<head[^>]*>)([\s\S]*?)(<\/head>)/i);
    if (!headMatch) throw new Error(`No <head> tag found in ${this.htmlFile}`);

    const [fullHead, openTag, innerContent, closeTag] = headMatch;

    const tags = [];

    tags.push('<meta charset="UTF-8">');
    tags.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
    tags.push('<meta name="theme-color" content="#000000">');

    const titleMatch = innerContent.match(/<title>[\s\S]*?<\/title>/i);
    const titleTag   = titleMatch ? titleMatch[0] : '<title>MotoSynteza</title>';
    tags.push(titleTag);

    const cleanTitle = titleTag.replace(/<\/?title>/gi, '').trim();
    const projectMeta = this.getProjectMeta();
    const effectiveTitle = projectMeta?.title
      ? `${projectMeta.title} - MotoSynteza`
      : cleanTitle;

    const description =
      (projectMeta?.description && String(projectMeta.description).trim()) ||
      this.extractMeta(innerContent, 'description') ||
      'MotoSynteza - conceptual photography and visual storytelling.';
    tags.push(`<meta name="description" content="${description}">`);

    const canonical = this.buildCanonical();
    if (canonical) tags.push(`<link rel="canonical" href="${canonical}">`);

    tags.push(`<meta property="og:title" content="${effectiveTitle}">`);
    tags.push(`<meta property="og:description" content="${description}">`);
    tags.push('<meta property="og:type" content="website">');
    if (canonical) tags.push(`<meta property="og:url" content="${canonical}">`);

    const ogImage = this.getOgImage(projectMeta);
    if (ogImage) tags.push(`<meta property="og:image" content="${ogImage}">`);

    tags.push('<meta name="twitter:card" content="summary_large_image">');
    tags.push(`<meta name="twitter:title" content="${effectiveTitle}">`);
    tags.push(`<meta name="twitter:description" content="${description}">`);
    if (ogImage) tags.push(`<meta name="twitter:image" content="${ogImage}">`);

    const mainCssPaths = this.getMainCssPaths();
    if (mainCssPaths.length) {
      mainCssPaths.forEach((href) => {
        tags.push(`<link rel="stylesheet" href="${href}">`);
      });
      tags.push(`<link rel="preload" href="${mainCssPaths[0]}" as="style">`);
    }

    const shopCss = this.getShopCss();
    if (shopCss) {
      tags.push(`<link rel="stylesheet" href="${shopCss}">`);
    }

    const moreCss = this.getMoreCss();
    if (moreCss) {
      tags.push(`<link rel="stylesheet" href="${moreCss}">`);
    }

    const humanWritesCss = this.getHumanWritesCss();
    if (humanWritesCss) {
      tags.push(`<link rel="stylesheet" href="${humanWritesCss}">`);
    }

    tags.push(...this.buildFavicons());

    const heroPreload = this.getHeroPreload();
    if (heroPreload) tags.push(heroPreload);

    const jsonLd = this.getJsonLd(projectMeta);
    if (jsonLd) {
      tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`);
    }

    if (this.assets.versionScriptPath) {
      tags.push(`<script src="${this.assets.versionScriptPath}"></script>`);
    }

    const headScripts =
      innerContent.match(/<script[^>]*src=["'][^"']+["'][^>]*><\/script>/gi) || [];
    headScripts
      .filter(s => !/build-version\./i.test(s))
      .forEach(s => tags.push(s));

    const cspPolicy = this.assets.cspPolicy || this.getDefaultCspPolicy();
    if (cspPolicy) {
      tags.push(`<meta http-equiv="Content-Security-Policy" content="${cspPolicy}">`);
    }

    const newHead =
      openTag + '\n' +
      tags.map(t => `  ${t}`).join('\n') + '\n' +
      closeTag;

    return html.replace(fullHead, newHead);
  }

  extractMeta(content, name) {
    const match = content.match(
      new RegExp(
        `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'
      )
    );
    return match ? match[1] : null;
  }

  buildCanonical() {
    const base     = 'https://motimorphoza.github.io/MotoSynteza/';
    const fileName = this.getFileName();
    return base + fileName;
  }

  getMainCssPaths() {
    const orderedPaths = ['css/core.css', 'css/layout.css', 'css/utilities.css'];

    if (this.isProjectsList() || this.isProject() || this.isShop()) {
      orderedPaths.push('css/projects.css');
    }

    return orderedPaths
      .map((oldPath) => this.renameMap.get(oldPath))
      .filter(Boolean);
  }

  getShopCss() {
    if (!this.isShop()) return null;
    return this.renameMap.get('css/shop.css') || null;
  }

  getMoreCss() {
    if (!this.isMore()) return null;
    return this.renameMap.get('css/more.css') || null;
  }

  getHumanWritesCss() {
    if (!this.isMore()) return null;
    return this.renameMap.get('css/human-writes.css') || null;
  }

  buildFavicons() {
    const tags = [];
    for (const [oldPath, newPath] of this.renameMap.entries()) {
      if (!oldPath.toLowerCase().includes('favicon')) continue;
      if (oldPath.includes('32'))         tags.push(`<link rel="icon" type="image/png" sizes="32x32" href="${newPath}">`);
      if (oldPath.includes('180'))        tags.push(`<link rel="apple-touch-icon" sizes="180x180" href="${newPath}">`);
      if (oldPath.includes('512'))        tags.push(`<link rel="icon" type="image/png" sizes="512x512" href="${newPath}">`);
      if (/favicon\.png$/i.test(oldPath)) tags.push(`<link rel="icon" href="${newPath}">`);
    }
    return tags;
  }

  getProjectMeta() {
    if (!this.isProject() || !Array.isArray(this.manifestData?.projects)) {
      return null;
    }

    const fileName = this.getFileName();

    if (fileName.startsWith('project-')) {
      const slug = fileName.replace(/^project-/, '').replace(/\.html$/i, '');
      return this.manifestData.projects.find(p => p.slug === slug) || null;
    }

    return this.manifestData.projects[0] || null;
  }

  getOgImage(projectMeta) {
    const base = 'https://motimorphoza.github.io/MotoSynteza/';

    if (projectMeta?.slug && Array.isArray(projectMeta.images) && projectMeta.images.length) {
      const firstImage = projectMeta.images[0];
      const firstSrc = typeof firstImage === 'string' ? firstImage : firstImage.src;
      if (firstSrc) {
        const rawPath = `projects/${projectMeta.slug}/${firstSrc}`;
        const resolved = this.renameMap.get(rawPath) || rawPath;
        return base + resolved;
      }
    }

    for (const [oldPath, newPath] of this.renameMap.entries()) {
      if (oldPath.includes('og-cover')) return base + newPath;
    }

    const fallbackShareImage = this.getDefaultShareImage();
    return fallbackShareImage ? base + fallbackShareImage : null;
  }

  getDefaultShareImage() {
    const preferred = [
      'images/media/favicon-512.png',
      'images/media/favicon-180.png',
      'images/media/favicon.png',
      'images/media/favicon-32.png'
    ];

    for (const oldPath of preferred) {
      const resolved = this.renameMap.get(oldPath);
      if (resolved) return resolved;
    }

    for (const [oldPath, newPath] of this.renameMap.entries()) {
      if (!oldPath.toLowerCase().includes('favicon')) continue;
      return newPath;
    }

    return null;
  }

  getHeroPreload() {
    if (this.isMain()) {
      const main = this.manifestData?.main;
      if (!Array.isArray(main) || !main.length) return null;
      const resolved = this.renameMap.get(main[0]) || main[0];
      return `<link rel="preload" href="${resolved}" as="image" fetchpriority="high">`;
    }

    if (this.isProject()) {
      const projectMeta = this.getProjectMeta();
      if (projectMeta?.slug && Array.isArray(projectMeta.images) && projectMeta.images.length) {
        const firstImage = projectMeta.images[0];
        const firstSrc = typeof firstImage === 'string' ? firstImage : firstImage.src;
        if (firstSrc) {
          const rawPath = `projects/${projectMeta.slug}/${firstSrc}`;
          const resolved = this.renameMap.get(rawPath) || rawPath;
          return `<link rel="preload" href="${resolved}" as="image" fetchpriority="high">`;
        }
      }
    }

    return null;
  }

  getJsonLd(projectMeta) {
    if (this.isProject() && projectMeta?.slug) {
      const firstImage = Array.isArray(projectMeta.images) ? projectMeta.images[0] : null;
      const firstSrc = firstImage ? (typeof firstImage === 'string' ? firstImage : firstImage.src) : null;
      const imagePath = firstSrc
        ? (this.renameMap.get(`projects/${projectMeta.slug}/${firstSrc}`) || `projects/${projectMeta.slug}/${firstSrc}`)
        : null;

      return {
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        name: projectMeta.title || 'MotoSynteza Project',
        description: projectMeta.description || 'MotoSynteza photography project',
        contentUrl: imagePath ? `https://motimorphoza.github.io/MotoSynteza/${imagePath}` : undefined,
        creator: {
          '@type': 'Person',
          name: 'Moti Morphoza'
        }
      };
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'MotoSynteza',
      url: 'https://motimorphoza.github.io/MotoSynteza/'
    };
  }

  getDefaultCspPolicy() {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.paypal.com https://paypal.com https://www.sandbox.paypal.com https://sandbox.paypal.com https://www.paypalobjects.com https://cdn.emailjs.com https://cdn.jsdelivr.net",
      "frame-src https://www.paypal.com https://paypal.com https://www.sandbox.paypal.com https://sandbox.paypal.com https://www.youtube.com https://www.youtube-nocookie.com",
      "connect-src 'self' https://www.paypal.com https://paypal.com https://www.sandbox.paypal.com https://sandbox.paypal.com https://api.emailjs.com",
      "img-src 'self' data: https://www.paypal.com https://paypal.com https://www.paypalobjects.com https://img.youtube.com https://i.ytimg.com",
      "style-src 'self' 'unsafe-inline'"
    ].join('; ');
  }

  getFileName() {
    return this.htmlFile.split(/[\\/]/).pop();
  }

  isLanding()  { return this.getFileName() === 'index.html'; }
  isMain()     { return this.getFileName() === 'main.html'; }
  isProjectsList() { return this.getFileName() === 'projects.html'; }
  isMore()     { return this.getFileName() === 'more.html'; }
  isProject()  {
    const fileName = this.getFileName();
    return fileName === 'project.html' || fileName.startsWith('project-');
  }
  isShop()     { return this.getFileName() === 'shop.html'; }
}

module.exports = HeadOrchestrator;


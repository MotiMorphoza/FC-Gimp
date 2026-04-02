'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const DEFAULT_REPORT = '.build-temp/registry-reconcile-full.json';
const DEFAULT_OUTDIR = '.build-temp/registry-review';
const DEFAULT_MANUAL_HOLDS = 'data/manual-problematic-overrides.json';
const THUMB_WIDTH = 320;
const THUMB_HEIGHT = 240;
const AMBIGUOUS_CANDIDATE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function parseArgs(argv = []) {
  const args = {
    report: DEFAULT_REPORT,
    outdir: DEFAULT_OUTDIR,
    thumbWidth: THUMB_WIDTH,
    thumbHeight: THUMB_HEIGHT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--report') {
      args.report = argv[index + 1] ? String(argv[index + 1]) : args.report;
      index += 1;
      continue;
    }

    if (token === '--outdir') {
      args.outdir = argv[index + 1] ? String(argv[index + 1]) : args.outdir;
      index += 1;
      continue;
    }

    if (token === '--thumb-width') {
      args.thumbWidth = Number(argv[index + 1] || args.thumbWidth) || args.thumbWidth;
      index += 1;
      continue;
    }

    if (token === '--thumb-height') {
      args.thumbHeight = Number(argv[index + 1] || args.thumbHeight) || args.thumbHeight;
      index += 1;
    }
  }

  return args;
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function relativeForHtml(fromFile, targetFile) {
  return path.relative(path.dirname(fromFile), targetFile).replace(/\\/g, '/');
}

function hashKey(value = '') {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadManualHolds(filePath) {
  if (!fs.existsSync(filePath)) {
    return { filePath: '', entries: [], bySitePath: new Map() };
  }

  const payload = readJson(filePath);
  const entries = Array.isArray(payload) ? payload : [];
  const bySitePath = new Map();

  entries.forEach((entry) => {
    const sitePath = String(entry?.currentSitePath || entry?.siteRelativePath || '').replace(/\\/g, '/').trim();
    if (!sitePath) return;
    bySitePath.set(sitePath, {
      currentSitePath: sitePath,
      reason: String(entry?.reason || '').trim(),
      note: String(entry?.note || '').trim()
    });
  });

  return {
    filePath,
    entries,
    bySitePath
  };
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function loadThumbCache(cachePath) {
  if (!fs.existsSync(cachePath)) return { entries: {} };

  try {
    const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (payload && typeof payload === 'object' && payload.entries && typeof payload.entries === 'object') {
      return payload;
    }
  } catch (error) {
    return { entries: {} };
  }

  return { entries: {} };
}

function saveThumbCache(cachePath, cache) {
  writeJson(cachePath, cache);
}

async function ensureThumb(sourcePath, outputPath, cache, { width, height }) {
  const stat = await fs.promises.stat(sourcePath);
  const cacheEntry = cache.entries[sourcePath];

  if (
    cacheEntry &&
    Number(cacheEntry.mtimeMs || 0) === Number(stat.mtimeMs || 0) &&
    Number(cacheEntry.size || 0) === Number(stat.size || 0) &&
    fs.existsSync(outputPath)
  ) {
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await sharp(sourcePath, { animated: false, limitInputPixels: false })
    .rotate()
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#f3efe6' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outputPath);

  cache.entries[sourcePath] = {
    mtimeMs: Number(stat.mtimeMs || 0),
    size: Number(stat.size || 0),
    outputPath
  };
}

function buildSiteAbsolutePath(report, match) {
  return path.join(report.rootDir, match.site.siteRelativePath);
}

function buildSourceAbsolutePath(report, sourcePath) {
  return path.join(report.archiveDir, sourcePath);
}

function padNumber(number, width = 3) {
  return String(number).padStart(width, '0');
}

function normalizeSetName(value = '') {
  return String(value || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function formatReviewBase(match) {
  return {
    projectSlug: match.site.projectSlug,
    currentSiteFilename: match.site.currentFilename,
    currentSitePath: match.site.siteRelativePath,
    confidence: match.status,
    proposedCameraCode: match.bestMatch?.cameraCode || '',
    proposedNewFilename: match.bestMatch?.proposedFilename || '',
    siteAlt: match.site.alt || '',
    siteCaption: match.site.caption || ''
  };
}

function buildCsv(rows = [], columns = []) {
  const escapeCell = (value) => {
    const text = String(value ?? '');
    if (/["\n,]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const lines = [columns.join(',')];
  rows.forEach((row) => {
    lines.push(columns.map((column) => escapeCell(row[column])).join(','));
  });
  return lines.join('\n');
}

function buildPageFrame({ title, subtitle, body, nav = [], extraScript = '' }) {
  const navHtml = nav.length
    ? `<nav class="top-nav">${nav.map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join('')}</nav>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f1e8;
      --panel: #fffdf8;
      --ink: #1d1a16;
      --muted: #655b4c;
      --line: #d8cdbb;
      --accent: #8a5a19;
      --exact: #235f3b;
      --strong: #4c7a1f;
      --probable: #9a6b10;
      --ambiguous: #944c25;
      --shadow: 0 12px 32px rgba(50, 35, 8, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background:
        radial-gradient(circle at top left, rgba(182, 153, 102, 0.18), transparent 32%),
        linear-gradient(180deg, #f6f2ea 0%, #eee4d2 100%);
      color: var(--ink);
    }
    .page {
      max-width: 1480px;
      margin: 0 auto;
      padding: 32px 24px 56px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 2.1rem;
      line-height: 1.1;
    }
    .subtitle {
      margin: 0 0 18px;
      color: var(--muted);
      max-width: 900px;
      line-height: 1.5;
    }
    .top-nav {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 0 0 22px;
    }
    .top-nav a {
      text-decoration: none;
      color: var(--ink);
      background: rgba(255,255,255,0.75);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 14px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 14px 16px;
      box-shadow: var(--shadow);
    }
    .stat .label {
      display: block;
      color: var(--muted);
      font-size: 0.9rem;
      margin-bottom: 6px;
    }
    .stat .value {
      font-size: 1.45rem;
      font-weight: 700;
    }
    .review-item {
      background: rgba(255,253,248,0.9);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 20px;
      margin-bottom: 18px;
      box-shadow: var(--shadow);
    }
    .review-head {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .review-no {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .bucket {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      color: #fff;
      text-transform: uppercase;
      font-size: 0.78rem;
      letter-spacing: 0.08em;
    }
    .bucket.exact { background: var(--exact); }
    .bucket.strong { background: var(--strong); }
    .bucket.probable { background: var(--probable); }
    .bucket.ambiguous { background: var(--ambiguous); }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px 16px;
      margin-bottom: 16px;
    }
    .meta-line {
      background: rgba(236, 230, 218, 0.62);
      border-radius: 14px;
      padding: 10px 12px;
    }
    .meta-line strong {
      display: block;
      font-size: 0.8rem;
      color: var(--muted);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .compare-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      align-items: start;
    }
    .thumb-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
    }
    .thumb-card img {
      width: 100%;
      display: block;
      background: #ebe1cf;
      aspect-ratio: 4 / 3;
      object-fit: contain;
    }
    .thumb-card .caption {
      padding: 10px 12px 12px;
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .thumb-card .caption strong {
      display: block;
      margin-bottom: 5px;
      font-size: 0.8rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .candidate-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-top: 10px;
    }
    .ambiguous-layout {
      display: grid;
      grid-template-columns: minmax(220px, 280px) 1fr;
      gap: 16px;
      align-items: start;
    }
    .site-rail {
      position: sticky;
      top: 18px;
    }
    .candidate-stack {
      display: grid;
      gap: 12px;
    }
    .candidate-row {
      display: grid;
      grid-template-columns: minmax(72px, 90px) 1fr;
      gap: 12px;
      align-items: start;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 12px;
    }
    .candidate-meta {
      display: grid;
      gap: 8px;
      align-content: start;
    }
    .candidate-thumb {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
    }
    .candidate-thumb img {
      width: 100%;
      display: block;
      background: #ebe1cf;
      aspect-ratio: 4 / 3;
      object-fit: contain;
    }
    .candidate-badge {
      display: inline-block;
      min-width: 2.2rem;
      padding: 6px 8px;
      margin-bottom: 8px;
      border-radius: 999px;
      background: #2e261b;
      color: #fff;
      font-weight: 700;
      text-align: center;
    }
    .small-note {
      color: var(--muted);
      font-size: 0.88rem;
      line-height: 1.5;
    }
    .manual-tools {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .manual-tools button {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fffaf1;
      color: var(--ink);
      padding: 10px 14px;
      font: inherit;
      cursor: pointer;
    }
    .manual-input {
      width: 100%;
      margin-top: 8px;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px 12px;
      font: inherit;
      background: #fff;
      color: var(--ink);
    }
    @media (max-width: 760px) {
      .page { padding: 20px 14px 36px; }
      .review-item { padding: 16px; border-radius: 18px; }
      .ambiguous-layout { grid-template-columns: 1fr; }
      .site-rail { position: static; }
      .candidate-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="page">
    ${navHtml}
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    ${body}
  </main>
  ${extraScript ? `<script>${extraScript}</script>` : ''}
</body>
</html>`;
}

function buildStatsHtml(stats = []) {
  return `<section class="stats">${stats.map((item) => `
    <div class="stat">
      <span class="label">${escapeHtml(item.label)}</span>
      <span class="value">${escapeHtml(item.value)}</span>
    </div>
  `).join('')}</section>`;
}

function metaLine(label, value) {
  return `<div class="meta-line"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
}

function thumbCard({ label, imgSrc, title, note }) {
  return `<article class="thumb-card">
    <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(title)}">
    <div class="caption">
      <strong>${escapeHtml(label)}</strong>
      <div>${escapeHtml(title)}</div>
      ${note ? `<div class="small-note">${escapeHtml(note)}</div>` : ''}
    </div>
  </article>`;
}

async function prepareThumbnailJobs(report, outdir, pageSpecs, cache, thumbOptions) {
  const thumbRoot = path.join(outdir, 'thumbs');
  const jobs = new Map();

  function registerJob(kind, absolutePath) {
    const key = `${kind}:${absolutePath}`;
    if (jobs.has(key)) return jobs.get(key);

    const ext = '.jpg';
    const outputPath = path.join(thumbRoot, kind, `${hashKey(`${kind}:${absolutePath}`)}${ext}`);
    const job = { absolutePath, outputPath };
    jobs.set(key, job);
    return job;
  }

  pageSpecs.forEach((page) => {
    page.items.forEach((item) => {
      item.siteThumbJob = registerJob('site', buildSiteAbsolutePath(report, item.match));
      if (item.match.bestMatch) {
        item.bestThumbJob = registerJob('source', buildSourceAbsolutePath(report, item.match.bestMatch.sourcePath));
      }
      (item.candidateChoices || []).forEach((candidate) => {
        candidate.thumbJob = registerJob('source', buildSourceAbsolutePath(report, candidate.sourcePath));
      });
    });
  });

  const allJobs = [...jobs.values()];
  let completed = 0;

  for (const job of allJobs) {
    await ensureThumb(job.absolutePath, job.outputPath, cache, thumbOptions);
    completed += 1;
    if (completed % 100 === 0 || completed === allJobs.length) {
      console.log(`[registry:review] thumbnails ${completed}/${allJobs.length}`);
    }
  }
}

function buildSetItems(matches, reviewPrefix, includeCandidates = false) {
  return matches.map((match, index) => {
    const reviewNumber = padNumber(index + 1);
    const reviewId = `${reviewPrefix}-${reviewNumber}`;
    const candidateChoices = includeCandidates
      ? (match.candidates || []).map((candidate, candidateIndex) => ({
          label: AMBIGUOUS_CANDIDATE_LABELS[candidateIndex] || String(candidateIndex + 1),
          ...candidate
        }))
      : [];

    return {
      reviewId,
      reviewNumber,
      match,
      candidateChoices
    };
  });
}

function buildCompanionRows(items, setKey) {
  return items.map((item) => ({
    reviewSet: setKey,
    reviewId: item.reviewId,
    reviewNumber: item.reviewNumber,
    projectSlug: item.match.site.projectSlug,
    currentSiteFilename: item.match.site.currentFilename,
    currentSitePath: item.match.site.siteRelativePath,
    confidence: item.match.status,
    manualHoldReason: item.match.manualHold?.reason || '',
    proposedCameraCode: item.match.bestMatch?.cameraCode || '',
    proposedNewFilename: item.match.bestMatch?.proposedFilename || '',
    bestSourcePath: item.match.bestMatch?.sourcePath || '',
    candidateSourcePaths: setKey === 'ambiguous'
      ? item.candidateChoices.map((candidate) => `${candidate.label}:${candidate.sourcePath}`).join(' | ')
      : (item.match.bestMatch?.sourcePath || '')
  }));
}

function buildExactLikeHtml({ title, subtitle, items, pageFile, nav, stats }) {
  const body = [
    buildStatsHtml(stats),
    ...items.map((item) => {
      const siteImgSrc = relativeForHtml(pageFile, item.siteThumbJob.outputPath);
      const sourceImgSrc = item.bestThumbJob ? relativeForHtml(pageFile, item.bestThumbJob.outputPath) : '';
      const match = item.match;
      const sourceTitle = match.bestMatch
        ? `${match.bestMatch.sourcePath} | ${match.bestMatch.cameraCode || 'no camera code'}`
        : 'No matched source';

      return `<section class="review-item">
        <div class="review-head">
          <div>
            <div class="review-no">${escapeHtml(item.reviewNumber)}</div>
            <div class="small-note">${escapeHtml(item.reviewId)}</div>
          </div>
          <span class="bucket ${escapeHtml(match.status)}">${escapeHtml(match.status)}</span>
        </div>
        <div class="meta-grid">
          ${metaLine('Project', match.site.projectSlug)}
          ${metaLine('Current Site Filename', match.site.currentFilename)}
          ${metaLine('Proposed Camera Code', match.bestMatch?.cameraCode || 'not found')}
          ${metaLine('Proposed New Filename', match.bestMatch?.proposedFilename || 'not available')}
        </div>
        <div class="compare-grid">
          ${thumbCard({
            label: 'Site image',
            imgSrc: siteImgSrc,
            title: match.site.siteRelativePath,
            note: match.site.alt || ''
          })}
          ${thumbCard({
            label: 'Matched source',
            imgSrc: sourceImgSrc,
            title: sourceTitle,
            note: match.bestMatch ? `score ${match.bestMatch.score}` : ''
          })}
        </div>
      </section>`;
    })
  ].join('\n');

  return buildPageFrame({ title, subtitle, body, nav });
}

function buildAmbiguousHtml({ title, subtitle, items, pageFile, nav, stats }) {
  const body = [
    buildStatsHtml(stats),
    ...items.map((item) => {
      const siteImgSrc = relativeForHtml(pageFile, item.siteThumbJob.outputPath);
      const match = item.match;
      const siteCard = `<article class="thumb-card">
          <div class="caption">
            <span class="candidate-badge">SITE</span>
            <div>${escapeHtml(match.site.siteRelativePath)}</div>
            <div class="small-note">${escapeHtml(match.site.alt || '')}</div>
          </div>
          <img src="${escapeHtml(siteImgSrc)}" alt="${escapeHtml(match.site.siteRelativePath)}">
        </article>`;
      const candidateRows = item.candidateChoices.map((candidate) => {
        const candidateImgSrc = relativeForHtml(pageFile, candidate.thumbJob.outputPath);
        const note = [
          `score ${candidate.score}`,
          candidate.cameraCode ? `camera ${candidate.cameraCode}` : 'camera code not found',
          candidate.proposedFilename ? `rename ${candidate.proposedFilename}` : ''
        ].filter(Boolean).join(' | ');

        return `<article class="candidate-row">
          <div class="candidate-meta">
            <span class="candidate-badge">${escapeHtml(candidate.label)}</span>
            <div class="small-note">${escapeHtml(note)}</div>
          </div>
          <div class="candidate-thumb">
            <img src="${escapeHtml(candidateImgSrc)}" alt="${escapeHtml(candidate.sourcePath)}">
            <div class="caption">
              <div>${escapeHtml(candidate.sourcePath)}</div>
            </div>
          </div>
        </article>`;
      }).join('');

      return `<section class="review-item">
        <div class="review-head">
          <div>
            <div class="review-no">${escapeHtml(item.reviewNumber)}</div>
            <div class="small-note">${escapeHtml(item.reviewId)} | reply like ${escapeHtml(item.reviewNumber)} -> A</div>
          </div>
          <span class="bucket ambiguous">ambiguous</span>
        </div>
        <div class="meta-grid">
          ${metaLine('Project', match.site.projectSlug)}
          ${metaLine('Current Site Filename', match.site.currentFilename)}
          ${metaLine('Best Proposed Camera Code', match.bestMatch?.cameraCode || 'not found')}
          ${metaLine('Best Proposed New Filename', match.bestMatch?.proposedFilename || 'not available')}
        </div>
        <div class="ambiguous-layout">
          <div class="site-rail">${siteCard}</div>
          <div class="candidate-stack">${candidateRows}</div>
        </div>
      </section>`;
    })
  ].join('\n');

  return buildPageFrame({ title, subtitle, body, nav });
}

function buildIndexHtml({ pageFile, nav, reportSummary }) {
  const body = [
    buildStatsHtml([
      { label: 'Site images in report', value: reportSummary.siteImageCount },
      { label: 'Rename-ready with camera code', value: reportSummary.matchedWithCameraCode },
      { label: 'Ambiguous', value: reportSummary.ambiguous },
      { label: 'Unmatched', value: reportSummary.unmatched }
    ]),
    `<section class="review-item">
      <div class="review-head">
        <div class="review-no">Review Sets</div>
      </div>
      <div class="small-note">Use the numbered review pages below. Numbering is stable within each set file.</div>
      <div class="top-nav">${nav.map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join('')}</div>
    </section>`
  ].join('\n');

  return buildPageFrame({
    title: 'Image Registry Visual Review',
    subtitle: 'Human-review layer generated from the current reconciliation results. No rename or apply step has been performed.',
    body,
    nav: []
  });
}

function buildRemainingHtml({ title, subtitle, items, pageFile, nav, stats }) {
  const toolbar = `<section class="review-item">
    <div class="review-head">
      <div class="review-no">Manual Camera Codes</div>
    </div>
    <div class="small-note">Enter a camera code for any remaining item, then export the structured result back to me.</div>
    <div class="manual-tools">
      <button type="button" data-export-json>Export JSON</button>
      <button type="button" data-export-csv>Export CSV</button>
      <button type="button" data-copy-json>Copy JSON</button>
    </div>
    <div class="small-note" data-manual-count>No manual camera codes entered yet.</div>
  </section>`;

  const body = [
    buildStatsHtml(stats),
    toolbar,
    ...items.map((item) => {
      const match = item.match;
      const siteImgSrc = relativeForHtml(pageFile, item.siteThumbJob.outputPath);
      const bestSourceImgSrc = item.bestThumbJob ? relativeForHtml(pageFile, item.bestThumbJob.outputPath) : '';
      const reason = match.manualHold?.reason
        || (match.status === 'unmatched'
          ? 'No candidate cleared the matching threshold.'
          : 'A likely source exists, but there is still no usable camera code / proposed new filename.');

      const sourceCard = match.bestMatch
        ? thumbCard({
            label: 'Best available source',
            imgSrc: bestSourceImgSrc,
            title: match.bestMatch.sourcePath,
            note: [
              `confidence ${match.status}`,
              `score ${match.bestMatch.score}`,
              match.bestMatch.cameraCode ? `camera ${match.bestMatch.cameraCode}` : 'camera code not found'
            ].join(' | ')
          })
        : `<article class="thumb-card">
            <div class="caption">
              <strong>No matched source</strong>
              <div>There is currently no source candidate in the report for this site image.</div>
              <div class="small-note">${escapeHtml(reason)}</div>
            </div>
          </article>`;

      return `<section class="review-item">
        <div class="review-head">
          <div>
            <div class="review-no">${escapeHtml(item.reviewNumber)}</div>
            <div class="small-note">${escapeHtml(item.reviewId)}</div>
          </div>
          <span class="bucket ${escapeHtml(match.status === 'unmatched' ? 'ambiguous' : match.status)}">${escapeHtml(match.status)}</span>
        </div>
        <div class="meta-grid">
          ${metaLine('Project', match.site.projectSlug)}
          ${metaLine('Current Site Filename', match.site.currentFilename)}
          ${metaLine('Proposed Camera Code', match.bestMatch?.cameraCode || 'not found')}
          ${metaLine('Proposed New Filename', match.bestMatch?.proposedFilename || 'not available')}
          <div class="meta-line">
            <strong>Manual Camera Code</strong>
            <span>Enter only the base code, for example DSC_1113</span>
            <input
              class="manual-input"
              type="text"
              placeholder="DSC_1113"
              data-review-id="${escapeHtml(item.reviewId)}"
              data-review-number="${escapeHtml(item.reviewNumber)}"
              data-project-slug="${escapeHtml(match.site.projectSlug)}"
              data-site-path="${escapeHtml(match.site.siteRelativePath)}"
              data-site-filename="${escapeHtml(match.site.currentFilename)}"
            >
          </div>
        </div>
        <div class="small-note" style="margin-bottom:14px">${escapeHtml(reason)}</div>
        <div class="compare-grid">
          ${thumbCard({
            label: 'Site image',
            imgSrc: siteImgSrc,
            title: match.site.siteRelativePath,
            note: match.site.alt || ''
          })}
          ${sourceCard}
        </div>
      </section>`;
    })
  ].join('\n');

  const extraScript = `
    (function () {
      const STORAGE_KEY = 'registry-review-manual-camera-codes-v2';
      const inputs = Array.from(document.querySelectorAll('.manual-input'));
      const countEl = document.querySelector('[data-manual-count]');

      function normalizeCode(value) {
        return String(value || '')
          .trim()
          .toUpperCase()
          .replace(/\\s+/g, '');
      }

      function loadState() {
        try {
          return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (error) {
          return {};
        }
      }

      function saveState(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }

      function getInputKey(input) {
        return input.dataset.sitePath || input.dataset.reviewId || '';
      }

      function pruneState(state) {
        const activeKeys = new Set(inputs.map((input) => getInputKey(input)).filter(Boolean));
        const nextState = {};

        Object.entries(state || {}).forEach(([key, value]) => {
          if (!activeKeys.has(key)) return;
          const normalized = normalizeCode(value);
          if (!normalized) return;
          nextState[key] = normalized;
        });

        return nextState;
      }

      function collectEntries() {
        return inputs
          .map((input) => {
            const manualCameraCode = normalizeCode(input.value);
            if (!manualCameraCode) return null;
            return {
              reviewId: input.dataset.reviewId || '',
              reviewNumber: input.dataset.reviewNumber || '',
              projectSlug: input.dataset.projectSlug || '',
              currentSitePath: input.dataset.sitePath || '',
              currentSiteFilename: input.dataset.siteFilename || '',
              manualCameraCode
            };
          })
          .filter(Boolean);
      }

      function updateCount() {
        const count = collectEntries().length;
        countEl.textContent = count
          ? count + ' manual camera code' + (count === 1 ? '' : 's') + ' entered.'
          : 'No manual camera codes entered yet.';
      }

      function toCsv(rows) {
        const columns = ['reviewId', 'reviewNumber', 'projectSlug', 'currentSitePath', 'currentSiteFilename', 'manualCameraCode'];
        const escapeCell = (value) => {
          const text = String(value ?? '');
          return /["\\n,]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
        };
        return [columns.join(',')].concat(rows.map((row) => columns.map((column) => escapeCell(row[column])).join(','))).join('\\n');
      }

      function download(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      const state = pruneState(loadState());
      saveState(state);
      inputs.forEach((input) => {
        const key = getInputKey(input);
        const saved = state[key];
        if (saved) input.value = saved;
        input.addEventListener('input', () => {
          const nextValue = normalizeCode(input.value);
          if (nextValue) state[key] = nextValue;
          else delete state[key];
          saveState(state);
          updateCount();
        });
      });

      document.querySelector('[data-export-json]').addEventListener('click', () => {
        const rows = collectEntries();
        download('remaining-manual-camera-codes.json', JSON.stringify(rows, null, 2), 'application/json');
      });

      document.querySelector('[data-export-csv]').addEventListener('click', () => {
        const rows = collectEntries();
        download('remaining-manual-camera-codes.csv', toCsv(rows), 'text/csv;charset=utf-8');
      });

      document.querySelector('[data-copy-json]').addEventListener('click', async () => {
        const rows = collectEntries();
        await navigator.clipboard.writeText(JSON.stringify(rows, null, 2));
      });

      updateCount();
    }());
  `;

  return buildPageFrame({ title, subtitle, body, nav, extraScript });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reportPath = path.resolve(process.cwd(), args.report);
  const outdir = path.resolve(process.cwd(), args.outdir);
  const cachePath = path.join(outdir, 'thumb-cache.json');
  const manualHolds = loadManualHolds(path.resolve(process.cwd(), DEFAULT_MANUAL_HOLDS));

  const report = readJson(reportPath);
  const thumbCache = loadThumbCache(cachePath);

  const annotatedMatches = report.matches.map((match) => {
    const manualHold = manualHolds.bySitePath.get(String(match.site?.siteRelativePath || '').replace(/\\/g, '/')) || null;
    return manualHold ? { ...match, manualHold } : match;
  });

  const exactStrongMatches = annotatedMatches.filter((match) => (match.status === 'exact' || match.status === 'strong') && !match.manualHold);
  const probableMatches = annotatedMatches.filter((match) => match.status === 'probable' && !match.manualHold);
  const ambiguousMatches = annotatedMatches.filter((match) => match.status === 'ambiguous' && !match.manualHold);
  const proposedFilenameMatches = annotatedMatches
    .filter((match) => match.bestMatch?.proposedFilename)
    .filter((match) => !match.manualHold)
    .sort((left, right) => String(left.bestMatch?.proposedFilename || '').localeCompare(String(right.bestMatch?.proposedFilename || '')));
  const remainingMatches = annotatedMatches.filter((match) => !match.bestMatch?.proposedFilename || match.manualHold);

  const pageSpecs = [
    {
      setKey: 'exact-strong',
      items: buildSetItems(exactStrongMatches, 'ES', false)
    },
    {
      setKey: 'probable',
      items: buildSetItems(probableMatches, 'P', false)
    },
    {
      setKey: 'ambiguous',
      items: buildSetItems(ambiguousMatches, 'A', true)
    },
    {
      setKey: 'proposed-filenames',
      items: buildSetItems(proposedFilenameMatches, 'N', false)
    },
    {
      setKey: 'remaining',
      items: buildSetItems(remainingMatches, 'R', false)
    }
  ];

  console.log('[registry:review] Preparing thumbnails...');
  await prepareThumbnailJobs(report, outdir, pageSpecs, thumbCache, {
    width: args.thumbWidth,
    height: args.thumbHeight
  });
  saveThumbCache(cachePath, thumbCache);

  const pageFiles = {
    exactStrong: path.join(outdir, 'review-exact-strong.html'),
    probable: path.join(outdir, 'review-probable.html'),
    ambiguous: path.join(outdir, 'review-ambiguous.html'),
    proposedFilenames: path.join(outdir, 'review-proposed-filenames.html'),
    remaining: path.join(outdir, 'review-remaining.html'),
    index: path.join(outdir, 'index.html')
  };

  const navItems = [
    { label: 'Exact + Strong', href: relativeForHtml(pageFiles.index, pageFiles.exactStrong) },
    { label: 'Probable', href: relativeForHtml(pageFiles.index, pageFiles.probable) },
    { label: 'Ambiguous', href: relativeForHtml(pageFiles.index, pageFiles.ambiguous) },
    { label: 'Proposed Names', href: relativeForHtml(pageFiles.index, pageFiles.proposedFilenames) },
    { label: 'Remaining', href: relativeForHtml(pageFiles.index, pageFiles.remaining) }
  ];

  const companionSpecs = [
    {
      setKey: 'exact-strong',
      title: 'Exact + Strong Review',
      subtitle: 'One site thumbnail next to one matched source thumbnail. Intended for final visual confirmation before the first safe batch.',
      items: pageSpecs[0].items,
      pageFile: pageFiles.exactStrong,
      buildHtml: buildExactLikeHtml,
      stats: [
        { label: 'Items', value: pageSpecs[0].items.length },
        { label: 'Confidence buckets', value: 'exact + strong' },
        { label: 'Review format', value: '1 site vs 1 source' }
      ]
    },
    {
      setKey: 'probable',
      title: 'Probable Review',
      subtitle: 'One site thumbnail next to one matched source thumbnail. Keep this set separate from final-confirmation items.',
      items: pageSpecs[1].items,
      pageFile: pageFiles.probable,
      buildHtml: buildExactLikeHtml,
      stats: [
        { label: 'Items', value: pageSpecs[1].items.length },
        { label: 'Confidence bucket', value: 'probable' },
        { label: 'Review format', value: '1 site vs 1 source' }
      ]
    },
    {
      setKey: 'ambiguous',
      title: 'Ambiguous Review',
      subtitle: 'Each item shows one site thumbnail and multiple candidate source thumbnails labeled A/B/C/D for manual selection.',
      items: pageSpecs[2].items,
      pageFile: pageFiles.ambiguous,
      buildHtml: buildAmbiguousHtml,
      stats: [
        { label: 'Items', value: pageSpecs[2].items.length },
        { label: 'Confidence bucket', value: 'ambiguous' },
        { label: 'Reply format', value: '014 -> B / 019 -> no match' }
      ]
    },
    {
      setKey: 'remaining',
      title: 'Remaining Manual Review',
      subtitle: 'All images still lacking a usable proposed filename after the currently approved match sets. This is the follow-up set for manual archive work.',
      items: pageSpecs[4].items,
      pageFile: pageFiles.remaining,
      buildHtml: buildRemainingHtml,
      stats: [
        { label: 'Items', value: pageSpecs[4].items.length },
        { label: 'No usable filename', value: pageSpecs[4].items.filter((item) => !item.match.bestMatch?.proposedFilename).length },
        { label: 'Includes', value: 'unmatched + no camera code' }
      ]
    },
    {
      setKey: 'proposed-filenames',
      title: 'Proposed Filename Review',
      subtitle: 'All matched images that already have a proposed new filename. Use this page to scan visually by the new target filename before any rename/apply step.',
      items: pageSpecs[3].items,
      pageFile: pageFiles.proposedFilenames,
      buildHtml: buildExactLikeHtml,
      stats: [
        { label: 'Items', value: pageSpecs[3].items.length },
        { label: 'Includes', value: 'all images with proposed filenames' },
        { label: 'Sort', value: 'proposed new filename' }
      ]
    }
  ];

  for (const spec of companionSpecs) {
    const html = spec.buildHtml({
      title: spec.title,
      subtitle: spec.subtitle,
      items: spec.items,
      pageFile: spec.pageFile,
      nav: navItems.map((item) => ({
        ...item,
        href: relativeForHtml(
          spec.pageFile,
          path.join(
            outdir,
            normalizeSetName(item.label) === 'exact-strong'
              ? 'review-exact-strong.html'
              : normalizeSetName(item.label) === 'probable'
                ? 'review-probable.html'
                : normalizeSetName(item.label) === 'ambiguous'
                  ? 'review-ambiguous.html'
                  : normalizeSetName(item.label) === 'proposed-names'
                    ? 'review-proposed-filenames.html'
                    : 'review-remaining.html'
          )
        )
      })),
      stats: spec.stats
    });

    writeText(spec.pageFile, html);

    const rows = buildCompanionRows(spec.items, spec.setKey);
    writeJson(path.join(outdir, `${spec.setKey}.json`), rows);
    writeText(
      path.join(outdir, `${spec.setKey}.csv`),
      buildCsv(rows, [
        'reviewSet',
        'reviewId',
        'reviewNumber',
        'projectSlug',
        'currentSiteFilename',
        'currentSitePath',
        'confidence',
        'manualHoldReason',
        'proposedCameraCode',
        'proposedNewFilename',
        'bestSourcePath',
        'candidateSourcePaths'
      ])
    );
  }

  writeText(
    pageFiles.index,
    buildIndexHtml({
      pageFile: pageFiles.index,
      nav: navItems,
      reportSummary: report.summary
    })
  );

  writeJson(path.join(outdir, 'manifest.json'), {
    generatedAt: new Date().toISOString(),
    reportPath,
    outdir,
    pages: {
      index: path.basename(pageFiles.index),
      exactStrong: path.basename(pageFiles.exactStrong),
      probable: path.basename(pageFiles.probable),
      ambiguous: path.basename(pageFiles.ambiguous),
      proposedFilenames: path.basename(pageFiles.proposedFilenames),
      remaining: path.basename(pageFiles.remaining)
    },
    counts: {
      exactStrong: pageSpecs[0].items.length,
      probable: pageSpecs[1].items.length,
      ambiguous: pageSpecs[2].items.length,
      proposedFilenames: pageSpecs[3].items.length,
      remaining: pageSpecs[4].items.length
    }
  });

  console.log(`[registry:review] Wrote ${path.relative(process.cwd(), outdir).replace(/\\/g, '/')}`);
}

main().catch((error) => {
  console.error(`[registry:review] ${error.message}`);
  process.exitCode = 1;
});

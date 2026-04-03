'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_REPORT = '.build-temp/registry-raw-review-all/raw-verification-review.json';
const DEFAULT_SELECTIONS = 'data/raw-review-all-selections.json';
const DEFAULT_HTML = '.build-temp/registry-raw-review-all/raw-verification-review.html';

function parseArgs(argv = []) {
  const args = {
    report: DEFAULT_REPORT,
    selections: DEFAULT_SELECTIONS,
    html: DEFAULT_HTML
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--report') {
      args.report = argv[index + 1] ? String(argv[index + 1]) : args.report;
      index += 1;
      continue;
    }
    if (token === '--selections') {
      args.selections = argv[index + 1] ? String(argv[index + 1]) : args.selections;
      index += 1;
      continue;
    }
    if (token === '--html') {
      args.html = argv[index + 1] ? String(argv[index + 1]) : args.html;
      index += 1;
    }
  }

  return args;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileUrlFromPath(filePath) {
  const normalized = path.resolve(filePath).replace(/\\/g, '/');
  return `file:///${encodeURI(normalized)}`;
}

function renderCandidate(candidate, label, selected = false) {
  const thumb = candidate.previewPath && fs.existsSync(candidate.previewPath)
    ? `<img src="${escapeHtml(fileUrlFromPath(candidate.previewPath))}" alt="${escapeHtml(candidate.rawRelativePath)}" loading="lazy">`
    : '<div class="missing-thumb">No embedded preview</div>';

  return `
    <div class="raw-candidate${selected ? ' selected' : ''}">
      <div class="raw-label">${escapeHtml(label)}${selected ? ' SELECTED' : ''}</div>
      <div class="raw-thumb">${thumb}</div>
      <div class="raw-meta mono small">${escapeHtml(candidate.rawRelativePath)}</div>
      <div class="raw-meta small">Type: ${escapeHtml(candidate.fileType || '')}</div>
      <div class="raw-meta small">Date: ${escapeHtml(candidate.rawDate || '') || 'n/a'}</div>
      <div class="raw-meta small">Match score: ${escapeHtml(String(candidate.score))}</div>
    </div>
  `;
}

function renderEntry(entry, index, selection) {
  const reviewNumber = String(index + 1).padStart(3, '0');
  const siteThumb = entry.absoluteSitePath && fs.existsSync(entry.absoluteSitePath)
    ? `<img src="${escapeHtml(fileUrlFromPath(entry.absoluteSitePath))}" alt="${escapeHtml(entry.siteFilename)}" loading="lazy">`
    : '<div class="missing-thumb">Missing site file</div>';
  const jpegThumb = entry.absoluteSourcePath && fs.existsSync(entry.absoluteSourcePath)
    ? `<img src="${escapeHtml(fileUrlFromPath(entry.absoluteSourcePath))}" alt="${escapeHtml(entry.sourceName)}" loading="lazy">`
    : '<div class="missing-thumb">Missing JPEG source</div>';

  let rawColumn = '';
  let decisionNote = 'No recorded decision yet.';

  if (selection) {
    if (selection.choice === 'N') {
      rawColumn = '<div class="decision decision-no-match">No RAW match approved for this item.</div>';
      decisionNote = 'Decision: No match';
    } else {
      const label = selection.choice || 'A';
      const candidateIndex = label.charCodeAt(0) - 65;
      const candidate = entry.rawCandidates[candidateIndex];
      rawColumn = candidate
        ? renderCandidate(candidate, label, true)
        : `<div class="decision decision-missing">Selection ${escapeHtml(label)} has no candidate in the current report.</div>`;
      decisionNote = `Decision: ${label}`;
    }
  } else if (entry.rawCandidates.length) {
    rawColumn = entry.rawCandidates.map((candidate, candidateIndex) =>
      renderCandidate(candidate, String.fromCharCode(65 + candidateIndex), false)
    ).join('');
  } else {
    rawColumn = '<div class="decision decision-no-match">No RAW candidate found for this item.</div>';
  }

  return `
    <article class="card">
      <div class="card-top">
        <div class="review-number">${reviewNumber}</div>
        <div class="meta-inline">
          <span class="pill">${escapeHtml(entry.cameraCode || 'NO CODE')}</span>
          <span class="mono small">${escapeHtml(entry.projectSlug)}</span>
          <span class="mono small">${escapeHtml(entry.registryStatus || '')}</span>
        </div>
      </div>
      <div class="card-path mono">${escapeHtml(entry.siteRelativePath)}</div>
      <div class="decision-line">${escapeHtml(decisionNote)}</div>
      <div class="card-grid">
        <section class="panel">
          <div class="panel-title">RAW</div>
          <div class="raw-list">${rawColumn}</div>
        </section>
        <section class="panel">
          <div class="panel-title">JPEG source</div>
          <div class="single-thumb">${jpegThumb}</div>
          <div class="mono small">${escapeHtml(entry.sourcePath || 'n/a')}</div>
          <div class="small">JPEG EXIF date: ${escapeHtml(entry.jpegDate || '') || 'n/a'}</div>
        </section>
        <section class="panel">
          <div class="panel-title">Site</div>
          <div class="single-thumb">${siteThumb}</div>
          <div class="mono small">${escapeHtml(entry.siteRelativePath)}</div>
          <div class="small">Placements: ${escapeHtml(String(entry.placementCount || 1))}</div>
        </section>
      </div>
    </article>
  `;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = readJson(path.resolve(process.cwd(), args.report), { summary: {}, entries: [] });
  const selections = readJson(path.resolve(process.cwd(), args.selections), []);
  const selectionMap = new Map((Array.isArray(selections) ? selections : []).map((entry) => [String(entry.reviewNumber || ''), entry]));

  const summary = {
    total: Number(report?.summary?.total || 0),
    withRaw: Number(report?.summary?.withRaw || 0),
    withoutRaw: Number(report?.summary?.withoutRaw || 0),
    reviewed: selectionMap.size,
    noMatch: [...selectionMap.values()].filter((entry) => String(entry.choice || '') === 'N').length
  };

  const cards = (Array.isArray(report.entries) ? report.entries : [])
    .map((entry, index) => renderEntry(entry, index, selectionMap.get(String(index + 1).padStart(3, '0'))))
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RAW verification review</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #efe7d7;
      --card: rgba(255,255,255,.88);
      --ink: #2c241d;
      --muted: #726150;
      --line: #d8c5a8;
      --accent: #8f4c1e;
      --select: #2c6b4a;
      --warn: #8c2f2f;
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Georgia, "Times New Roman", serif; background: radial-gradient(circle at top left, rgba(176,132,74,.2), transparent 32%), linear-gradient(180deg, #f8f3ea 0%, var(--bg) 100%); color: var(--ink); }
    main { max-width: 1600px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 42px; }
    p { color: var(--muted); font-size: 20px; line-height: 1.45; }
    .summary { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:14px; margin:24px 0; }
    .summary-card, .card { background: var(--card); border: 1px solid var(--line); border-radius: 24px; box-shadow: 0 10px 30px rgba(104,80,47,.10); }
    .summary-card { padding:16px 20px; }
    .summary-card .label { color: var(--muted); text-transform: uppercase; letter-spacing:.06em; font-size:13px; }
    .summary-card .value { font-size:34px; font-weight:700; margin-top:6px; }
    .cards { display:grid; gap:18px; }
    .card { padding:18px; }
    .card-top { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:8px; }
    .review-number { font-size:34px; font-weight:700; }
    .card-path { color: var(--muted); margin-bottom: 6px; word-break: break-word; }
    .decision-line { color: var(--accent); font-weight:700; margin-bottom:12px; }
    .meta-inline { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
    .pill { background: var(--accent); color:#fff; border-radius:999px; padding:6px 14px; font-weight:700; letter-spacing:.06em; }
    .card-grid { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(0,1fr) minmax(0,1fr); gap:16px; align-items:start; }
    .panel { border:1px solid var(--line); border-radius:20px; padding:12px; background: rgba(255,255,255,.7); }
    .panel-title { text-transform: uppercase; letter-spacing:.06em; color: var(--muted); font-size:13px; margin-bottom:10px; }
    .raw-list { display:grid; gap:12px; }
    .raw-candidate { border:1px solid var(--line); border-radius:18px; padding:10px; background:#fff; }
    .raw-candidate.selected { border-color: var(--select); box-shadow: 0 0 0 2px rgba(44,107,74,.15) inset; }
    .raw-label { display:inline-block; background:#3d3128; color:#fff; border-radius:999px; padding:4px 10px; font-size:12px; font-weight:700; margin-bottom:10px; }
    .raw-candidate.selected .raw-label { background: var(--select); }
    .raw-thumb, .single-thumb { min-height:180px; display:flex; align-items:center; justify-content:center; background:#fff; border-radius:14px; overflow:hidden; margin-bottom:10px; }
    img { max-width:100%; max-height:340px; display:block; border-radius:12px; }
    .missing-thumb, .decision { color: var(--muted); text-align:center; font-size:17px; padding:20px; border:1px dashed var(--line); border-radius:14px; background:#fff; }
    .decision-no-match { color: var(--warn); border-color: rgba(140,47,47,.35); }
    .decision-missing { color: var(--warn); }
    .mono { font-family: "Courier New", monospace; }
    .small { font-size:13px; line-height:1.45; word-break:break-word; }
    .raw-meta { margin-top:4px; color: var(--muted); }
    @media (max-width: 1100px) { .card-grid { grid-template-columns:1fr; } h1 { font-size:34px; } }
  </style>
</head>
<body>
  <main>
    <h1>RAW Verification Review</h1>
    <p>Updated with saved review decisions. Reviewed items now show only the approved candidate or a no-match state.</p>
    <section class="summary">
      <div class="summary-card"><div class="label">Total entries</div><div class="value">${summary.total}</div></div>
      <div class="summary-card"><div class="label">With RAW candidates</div><div class="value">${summary.withRaw}</div></div>
      <div class="summary-card"><div class="label">Without RAW candidates</div><div class="value">${summary.withoutRaw}</div></div>
      <div class="summary-card"><div class="label">Reviewed decisions</div><div class="value">${summary.reviewed}</div></div>
      <div class="summary-card"><div class="label">No match decisions</div><div class="value">${summary.noMatch}</div></div>
    </section>
    <section class="cards">${cards}</section>
  </main>
</body>
</html>`;

  fs.writeFileSync(path.resolve(process.cwd(), args.html), html, 'utf8');
  console.log(`[raw-review-selections] wrote ${args.html}`);
}

main();

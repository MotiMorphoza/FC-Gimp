'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const Scanner = require('./scanner');
const { generateImageSearchDataset } = require('./image-search-generator');

function loadSearchRuntime(rootDir) {
  const context = {
    window: {},
    document: { addEventListener() {} },
    console,
    setTimeout,
    clearTimeout,
    URL,
    fetch: async () => {
      throw new Error('Fetch is not available in golden query mode');
    }
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, 'js', 'tags.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, 'js', 'search.js'), 'utf8'), context);
  return context;
}

function buildIndex(rootDir, runtime) {
  const scanner = new Scanner({ warn() {}, info() {}, error() {} });
  const projects = scanner.scanProjectsFromRoot(rootDir);
  const dataset = generateImageSearchDataset(projects, rootDir, null);
  return dataset.map((image, index) => runtime.indexImage(runtime.normalizeImage(image, index), index));
}

function loadGoldenQueries(rootDir) {
  const source = path.join(rootDir, 'data', 'search-golden-queries.json');
  const payload = JSON.parse(fs.readFileSync(source, 'utf8'));
  return Array.isArray(payload) ? payload : [];
}

function summarize(results, limit = 5) {
  return results.slice(0, limit).map((result) => `${result.image.projectTitle} :: ${result.image.alt}`);
}

function runGolden(rootDir) {
  const runtime = loadSearchRuntime(rootDir);
  const indexedImages = buildIndex(rootDir, runtime);
  const queries = loadGoldenQueries(rootDir);

  queries.forEach((query) => {
    const state = runtime.searchImages(indexedImages, query);
    console.log(`\n[${query}] count=${state.results.length} mode=${state.mode}`);
    summarize(state.results).forEach((line) => console.log(`- ${line}`));
  });
}

runGolden(process.cwd());

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
      throw new Error('Fetch is not available in regression mode');
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

function summarizeResults(results, limit = 3) {
  return results.slice(0, limit).map((result) => `${result.image.projectTitle} :: ${result.image.alt}`);
}

function hasObjectMatch(runtime, result, query) {
  const termGroup = runtime.window.MotoSearchTags.parseQuery(query).positive[0];
  return runtime.getObjectProminence(result, termGroup) !== 'none';
}

function hasColorMatch(result, color) {
  return (result.image.visual.dominant_colors || []).includes(color);
}

function isCrowd(result) {
  return Boolean(result.image.visual.has_people) && Number(result.image.visual.people_count) >= 4;
}

function isNoPeople(result) {
  return !result.image.visual.has_people;
}

function isWoman(result) {
  return (result.image.visual.gender || []).includes('woman');
}

function isMan(result) {
  return (result.image.visual.gender || []).includes('man');
}

function isChild(result) {
  return (result.image.visual.age_group || []).includes('child');
}

function isNature(result) {
  return (result.image.visual.environment_type || []).includes('nature');
}

function isMonochromeBird(runtime, result) {
  return result.image.visual.color_mode === 'bw' && hasObjectMatch(runtime, result, 'bird');
}

function runRegression(rootDir) {
  const runtime = loadSearchRuntime(rootDir);
  const indexedImages = buildIndex(rootDir, runtime);

  const tests = [
    {
      query: 'tree',
      minCount: 10,
      validate: (results) => results.slice(0, 5).every((result) => hasObjectMatch(runtime, result, 'tree'))
    },
    {
      query: 'bike',
      minCount: 8,
      validate: (results) => results.slice(0, 5).every((result) => hasObjectMatch(runtime, result, 'bike'))
    },
    {
      query: 'bird',
      minCount: 10,
      validate: (results) => results.slice(0, 5).every((result) => hasObjectMatch(runtime, result, 'bird'))
    },
    {
      query: 'window',
      minCount: 10,
      validate: (results) => results.slice(0, 5).every((result) => hasObjectMatch(runtime, result, 'window'))
    },
    {
      query: 'woman',
      minCount: 10,
      validate: (results) => results.slice(0, 5).every(isWoman)
    },
    {
      query: 'man',
      minCount: 8,
      validate: (results) => results.slice(0, 5).every(isMan)
    },
    {
      query: 'child',
      minCount: 5,
      validate: (results) => results.slice(0, 5).every(isChild)
    },
    {
      query: 'crowd',
      minCount: 5,
      validate: (results) => results.slice(0, 5).every(isCrowd)
    },
    {
      query: 'no people',
      minCount: 25,
      validate: (results) => results.slice(0, 10).every(isNoPeople)
    },
    {
      query: 'black and white bird',
      minCount: 2,
      validate: (results) => results.slice(0, 3).every((result) => isMonochromeBird(runtime, result))
    },
    {
      query: 'blue',
      minCount: 10,
      validate: (results) => results.slice(0, 5).every((result) => hasColorMatch(result, 'blue'))
    },
    {
      query: 'nature',
      minCount: 20,
      validate: (results) => results.slice(0, 5).every(isNature)
    },
    {
      query: 'woman umbrella',
      minCount: 3,
      validate: (results) => results.slice(0, 5).every((result) => isWoman(result) && hasObjectMatch(runtime, result, 'umbrella'))
    },
    {
      query: 'child street',
      minCount: 3,
      validate: (results) => results.slice(0, 5).every((result) => isChild(result) && (result.image.visual.environment_type || []).includes('street'))
    },
    {
      query: 'no people blue',
      minCount: 5,
      validate: (results) => results.slice(0, 5).every((result) => isNoPeople(result) && hasColorMatch(result, 'blue'))
    },
    {
      query: 'cigarette',
      minCount: 8,
      validate: (results) => results.slice(0, 5).every((result) => hasObjectMatch(runtime, result, 'cigarette'))
    },
    {
      query: 'phone',
      minCount: 8,
      validate: (results) => results.slice(0, 5).every((result) => hasObjectMatch(runtime, result, 'phone'))
    },
    {
      query: 'car',
      minCount: 3,
      validate: (results) => results.slice(0, 3).every((result) => hasObjectMatch(runtime, result, 'car'))
    },
    {
      query: 'indoor window',
      exactCount: 0,
      validate: (results) => results.length === 0
    },
    {
      query: 'dog close up',
      exactCount: 0,
      validate: (results) => results.length === 0
    },
    {
      query: 'sad',
      minCount: 20,
      validate: (results) => results.slice(0, 5).every((result) => ['mood', 'tone', 'tension', 'reading'].some((field) => (result.image[field] || []).length))
    },
    {
      query: 'urban absurdity',
      minCount: 20,
      validate: (results) => results.length >= 20
    },
    {
      query: 'cold minimalism',
      minCount: 5,
      validate: (results) => results.slice(0, 5).every((result) => ['mood', 'themes', 'tone'].some((field) => (result.image[field] || []).length))
    }
  ];

  let failures = 0;

  tests.forEach((test) => {
    const state = runtime.searchImages(indexedImages, test.query);
    const results = state.results || [];
    const countOk = Number.isFinite(test.exactCount)
      ? results.length === test.exactCount
      : results.length >= (test.minCount || 0);
    const qualityOk = test.validate(results);
    const passed = countOk && qualityOk;

    console.log(`\n[${passed ? 'PASS' : 'FAIL'}] ${test.query}`);
    console.log(`count=${results.length} mode=${state.mode}`);
    summarizeResults(results).forEach((line) => console.log(`- ${line}`));

    if (!passed) {
      failures += 1;
      if (!countOk) {
        console.log(`! Count expectation failed (${Number.isFinite(test.exactCount) ? `expected exactly ${test.exactCount}` : `expected at least ${test.minCount}`})`);
      }
      if (!qualityOk) {
        console.log('! Quality expectation failed');
      }
    }
  });

  if (failures) {
    console.error(`\nSearch regression failed: ${failures} query checks failed.`);
    process.exitCode = 1;
    return;
  }

  console.log('\nSearch regression passed.');
}

runRegression(process.cwd());

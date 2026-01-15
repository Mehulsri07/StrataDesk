#!/usr/bin/env node

/**
 * StrataDesk Health Check Script
 * Verifies that all required files and dependencies are present
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, required = true) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : (required ? '❌' : '⚠️');
  const color = exists ? 'green' : (required ? 'red' : 'yellow');
  log(`${status} ${filePath}`, color);
  return exists;
}

function checkDirectory(dirPath, required = true) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  const status = exists ? '✅' : (required ? '❌' : '⚠️');
  const color = exists ? 'green' : (required ? 'red' : 'yellow');
  log(`${status} ${dirPath}/`, color);
  return exists;
}

log('\n🔍 StrataDesk Health Check\n', 'blue');

// Check core files
log('📄 Core Files:', 'blue');
const coreFiles = [
  'package.json',
  'main.js',
  'preload.js',
  'index.html',
  'splash.html',
  'README.md'
];

let coreOk = true;
coreFiles.forEach(file => {
  if (!checkFile(file)) coreOk = false;
});

// Check directories
log('\n📁 Directories:', 'blue');
const directories = [
  'js',
  'js/core',
  'js/modules',
  'js/extraction',
  'js/features',
  'styles',
  'icons',
  'docs'
];

let dirsOk = true;
directories.forEach(dir => {
  if (!checkDirectory(dir)) dirsOk = false;
});

// Check JavaScript modules
log('\n📜 JavaScript Modules:', 'blue');
const jsModules = [
  'js/app.js',
  'js/init.js',
  'js/core/config.js',
  'js/core/database.js',
  'js/core/auth.js',
  'js/core/api.js',
  'js/modules/ui.js',
  'js/modules/projects.js',
  'js/modules/files.js',
  'js/modules/map.js',
  'js/modules/search.js',
  'js/modules/tab-manager.js',
  'js/modules/extraction-tab.js'
];

let modulesOk = true;
jsModules.forEach(file => {
  if (!checkFile(file)) modulesOk = false;
});

// Check extraction modules
log('\n🔍 Extraction Modules:', 'blue');
const extractionModules = [
  'js/extraction/StrataExtractor.js',
  'js/extraction/PDFProcessor.js',
  'js/extraction/ExcelProcessor.js',
  'js/extraction/ExtractionUI.js',
  'js/extraction/index.js'
];

let extractionOk = true;
extractionModules.forEach(file => {
  if (!checkFile(file)) extractionOk = false;
});

// Check stylesheets
log('\n🎨 Stylesheets:', 'blue');
const stylesheets = [
  'styles/variables.css',
  'styles/base.css',
  'styles/components.css',
  'styles/layout.css',
  'styles/responsive.css'
];

let stylesOk = true;
stylesheets.forEach(file => {
  if (!checkFile(file)) stylesOk = false;
});

// Check icons
log('\n🖼️  Icons:', 'blue');
checkFile('icons/icon.png');
checkFile('icons/icon.ico', false);
checkFile('icons/icon.icns', false);

// Check node_modules
log('\n📦 Dependencies:', 'blue');
const nodeModulesExists = checkDirectory('node_modules');

if (nodeModulesExists) {
  const requiredPackages = [
    'electron',
    'electron-builder',
    'pdfjs-dist',
    'xlsx'
  ];
  
  requiredPackages.forEach(pkg => {
    checkDirectory(`node_modules/${pkg}`);
  });
  
  // Optional packages
  log('\n📦 Optional Dependencies:', 'blue');
  checkDirectory('node_modules/electron-reload', false);
}

// Check backend (optional)
log('\n🔧 Backend (Optional):', 'blue');
checkDirectory('backend', false);
if (fs.existsSync('backend')) {
  checkFile('backend/package.json', false);
  checkFile('backend/server.js', false);
}

// Summary
log('\n📊 Summary:', 'blue');
const allOk = coreOk && dirsOk && modulesOk && extractionOk && stylesOk && nodeModulesExists;

if (allOk) {
  log('✅ All required files present!', 'green');
  log('\n🚀 Ready to run: npm start', 'green');
} else {
  log('❌ Some required files are missing!', 'red');
  log('\n🔧 Try running: npm install', 'yellow');
}

// Check package.json scripts
log('\n📜 Available Scripts:', 'blue');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  Object.keys(pkg.scripts || {}).forEach(script => {
    log(`  npm run ${script}`, 'reset');
  });
} catch (error) {
  log('❌ Could not read package.json', 'red');
}

log('');
process.exit(allOk ? 0 : 1);

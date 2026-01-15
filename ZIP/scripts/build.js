// Build script to combine modular files into a single HTML file
const fs = require('fs');
const path = require('path');

// Read all CSS files
const cssFiles = [
  'styles/variables.css',
  'styles/base.css', 
  'styles/components.css',
  'styles/layout.css',
  'styles/responsive.css'
];

// Read all JS files
const jsFiles = [
  'js/config.js',
  'js/database.js',
  'js/auth.js', 
  'js/projects.js',
  'js/map.js',
  'js/files.js',
  'js/search.js',
  'js/ui.js',
  'js/app.js'
];

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}`);
    return '';
  }
}

function buildSingleFile() {
  console.log('🔨 Building single HTML file...');
  
  // Read the base HTML
  const baseHtml = readFile('index.html');
  
  // Combine all CSS
  let combinedCSS = '';
  cssFiles.forEach(file => {
    const content = readFile(file);
    if (content) {
      combinedCSS += `/* ${file} */\n${content}\n\n`;
    }
  });
  
  // Combine all JS
  let combinedJS = '';
  jsFiles.forEach(file => {
    const content = readFile(file);
    if (content) {
      combinedJS += `// ${file}\n${content}\n\n`;
    }
  });
  
  // Replace external CSS links with inline styles
  let html = baseHtml.replace(
    /<!-- Local Stylesheets -->[\s\S]*?<\/head>/,
    `<!-- Combined Styles -->
  <style>
${combinedCSS}  </style>
</head>`
  );
  
  // Replace external JS scripts with inline scripts
  html = html.replace(
    /<!-- Application Scripts -->[\s\S]*?<\/body>/,
    `<!-- Combined Scripts -->
  <script>
${combinedJS}  </script>
</body>`
  );
  
  // Write the combined file
  fs.writeFileSync('strata-web-built.html', html);
  
  console.log('✅ Built strata-web-built.html');
  console.log(`📊 File size: ${(fs.statSync('strata-web-built.html').size / 1024).toFixed(1)} KB`);
}

// Run if called directly
if (require.main === module) {
  buildSingleFile();
}

module.exports = { buildSingleFile };
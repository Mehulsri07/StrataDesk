// Initialization check script for debugging
(function() {
  'use strict';
  
  console.log('🔍 StrataDesk Initialization Check');
  
  // Check for required global objects
  const requiredGlobals = [
    'CONFIG',
    'UTILS', 
    'SimpleHash',
    'db',
    'auth',
    'uiManager',
    'projectManager',
    'fileManager',
    'searchManager',
    'mapManager'
  ];
  
  const missing = [];
  const available = [];
  
  requiredGlobals.forEach(name => {
    if (typeof window[name] !== 'undefined') {
      available.push(name);
    } else {
      missing.push(name);
    }
  });
  
  console.log('✅ Available modules:', available);
  if (missing.length > 0) {
    console.error('❌ Missing modules:', missing);
  }
  
  // Check for external libraries
  const libraries = [
    { name: 'bcryptjs', obj: 'bcryptjs', required: false },
    { name: 'JSZip', obj: 'JSZip', required: true },
    { name: 'Leaflet', obj: 'L', required: true }
  ];
  
  libraries.forEach(lib => {
    const available = typeof window[lib.obj] !== 'undefined';
    const status = available ? '✅' : (lib.required ? '❌' : '⚠️');
    console.log(`${status} ${lib.name}: ${available ? 'loaded' : 'missing'}`);
  });
  
  // Check DOM elements
  const requiredElements = [
    'loginPanel',
    'appPanel', 
    'username',
    'password',
    'loginBtn',
    'registerBtn',
    'guestBtn',
    'logoutBtn'
  ];
  
  const missingElements = [];
  requiredElements.forEach(id => {
    if (!document.getElementById(id)) {
      missingElements.push(id);
    }
  });
  
  if (missingElements.length > 0) {
    console.error('❌ Missing DOM elements:', missingElements);
  } else {
    console.log('✅ All required DOM elements found');
  }
  
  // Export check function for manual use
  window.checkInit = () => {
    return {
      modules: { available, missing },
      libraries: libraries.map(lib => ({
        name: lib.name,
        available: typeof window[lib.obj] !== 'undefined',
        required: lib.required
      })),
      elements: { missing: missingElements }
    };
  };
  
})();
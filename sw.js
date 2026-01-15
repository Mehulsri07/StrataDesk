// StrataDesk Service Worker for PWA functionality
const CACHE_NAME = 'strataDesk-v2.0.0';
const STATIC_CACHE = 'strataDesk-static-v2.0.0';
const DYNAMIC_CACHE = 'strataDesk-dynamic-v2.0.0';

// Files to cache for offline use
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  './styles/variables.css',
  './styles/base.css',
  './styles/components.css',
  './styles/layout.css',
  './styles/responsive.css',
  './js/config.js',
  './js/database.js',
  './js/auth.js',
  './js/projects.js',
  './js/map.js',
  './js/files.js',
  './js/search.js',
  './js/ui.js',
  './js/app.js'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/bcryptjs/2.4.3/bcrypt.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('StrataDesk SW: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('StrataDesk SW: Caching static files');
        return cache.addAll(STATIC_FILES);
      }),
      // Cache external resources
      caches.open(DYNAMIC_CACHE).then((cache) => {
        console.log('StrataDesk SW: Caching external resources');
        return cache.addAll(EXTERNAL_RESOURCES.map(url => new Request(url, { mode: 'cors' })));
      })
    ]).then(() => {
      console.log('StrataDesk SW: Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('StrataDesk SW: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('StrataDesk SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('StrataDesk SW: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request, url));
  }
});

async function handleGetRequest(request, url) {
  // For app shell files, try cache first
  if (STATIC_FILES.some(file => request.url.includes(file))) {
    return cacheFirst(request);
  }
  
  // For external resources, try cache first
  if (EXTERNAL_RESOURCES.some(resource => request.url.includes(resource))) {
    return cacheFirst(request);
  }
  
  // For map tiles, use cache with network fallback
  if (url.hostname.includes('tile') || url.pathname.includes('tile')) {
    return cacheWithNetworkFallback(request);
  }
  
  // For API calls (geocoding, etc.), network first
  if (url.hostname.includes('nominatim') || url.hostname.includes('api')) {
    return networkFirst(request);
  }
  
  // Default: network first with cache fallback
  return networkFirst(request);
}

// Cache first strategy
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('StrataDesk SW: Cache first failed:', error);
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('StrataDesk SW: Network first fallback to cache');
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

// Cache with network fallback
async function cacheWithNetworkFallback(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Return cached version and update in background
      fetch(request).then(response => {
        if (response.ok) {
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, response);
          });
        }
      }).catch(() => {}); // Ignore network errors
      
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline - Map tiles not available', { status: 503 });
  }
}

// Background sync for data backup
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-backup') {
    event.waitUntil(performBackgroundBackup());
  }
});

async function performBackgroundBackup() {
  try {
    // This would trigger a backup export
    console.log('StrataDesk SW: Background backup triggered');
    // Implementation would depend on your backup strategy
  } catch (error) {
    console.error('StrataDesk SW: Background backup failed:', error);
  }
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/badge-72.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: [
        {
          action: 'open',
          title: 'Open StrataDesk',
          icon: './icons/action-open.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: './icons/action-dismiss.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Share target (for future use)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  // Handle shared files/data
  const formData = await request.formData();
  // Process shared content
  return Response.redirect('./', 303);
}
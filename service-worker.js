// Service Worker for handling shared files from native share menu
const CACHE_NAME = 'cody-collage-share-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Handle share target requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle share target requests
  if (url.pathname.endsWith('/share') && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    // Parse the form data
    const formData = await request.formData();
    const files = formData.getAll('photos');
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';

    // Store files temporarily in cache
    const cache = await caches.open(CACHE_NAME);
    const sharedData = {
      files: [],
      title,
      text,
      timestamp: Date.now()
    };

    // Process each file
    for (const file of files) {
      if (file && file.size > 0) {
        // Create a unique key for each file
        const fileKey = `shared-file-${Date.now()}-${Math.random()}`;

        // Store file as blob in cache
        const response = new Response(file);
        await cache.put(fileKey, response);

        sharedData.files.push({
          key: fileKey,
          name: file.name,
          type: file.type,
          size: file.size
        });
      }
    }

    // Store metadata
    await cache.put('shared-data', new Response(JSON.stringify(sharedData)));

    // Redirect to the share handler page
    const redirectUrl = new URL('/#/share', self.location.origin);
    return Response.redirect(redirectUrl.href, 303);

  } catch (error) {
    console.error('Error handling share target:', error);
    // Redirect to main app on error
    return Response.redirect(self.location.origin, 303);
  }
}

// Clean up old shared files (older than 1 hour)
self.addEventListener('message', async event => {
  if (event.data && event.data.type === 'CLEANUP_SHARED_FILES') {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const now = Date.now();

    for (const request of keys) {
      const url = new URL(request.url);
      if (url.pathname.includes('shared-file-')) {
        const response = await cache.match(request);
        const timestamp = parseInt(url.pathname.split('-')[2]);

        // Delete files older than 1 hour
        if (now - timestamp > 3600000) {
          await cache.delete(request);
        }
      }
    }

    event.ports[0].postMessage({ success: true });
  }

  // Handle request for shared data
  if (event.data && event.data.type === 'GET_SHARED_DATA') {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match('shared-data');

      if (response) {
        const data = await response.json();
        const files = [];

        // Retrieve actual file blobs
        for (const fileInfo of data.files) {
          const fileResponse = await cache.match(fileInfo.key);
          if (fileResponse) {
            const blob = await fileResponse.blob();
            files.push({
              ...fileInfo,
              blob
            });
          }
        }

        // Clear the shared data after retrieving
        await cache.delete('shared-data');
        for (const fileInfo of data.files) {
          await cache.delete(fileInfo.key);
        }

        event.ports[0].postMessage({
          success: true,
          data: { ...data, files }
        });
      } else {
        event.ports[0].postMessage({
          success: false,
          error: 'No shared data found'
        });
      }
    } catch (error) {
      event.ports[0].postMessage({
        success: false,
        error: error.message
      });
    }
  }
});
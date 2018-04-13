/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const CACHE_NAME = 'v1';

self.addEventListener('message', e => {
  if (e.data.precachedIcons) {
    caches.open(CACHE_NAME).then(cache => cache.addAll(e.data.precachedIcons));
  }
});

self.addEventListener('fetch', function(event) {
  if (event.request.url.startsWith('https://external.xx.fbcdn.net/assets/')) {
    event.respondWith(
      // Cache falling back to the network
      caches.match(event.request).then(cacheResponse => {
        return (
          cacheResponse ||
          fetch(event.request).then(response => {
            const clone = response.clone();
            // write to cache
            caches
              .open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone));
            return response;
          })
        );
      }),
    );
  }
});

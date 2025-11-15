// Severance v4 service worker - path-agnostic cache
var CACHE_NAME = 'severance-cache-v4-' + (new Date()).getTime();

function resolveUrl(base, p) {
  // join base and p (p expected relative like './index_pwa.html')
  if (p.charAt(0) === '/') return p;
  return base.replace(/\/[^\/]*$/, '/') + p.replace(/^\.\//, '');
}

self.addEventListener('install', function(event) {
  var base = self.location.pathname || '/';
  // determine base folder (path portion up to last slash)
  var baseFolder = base.replace(/\/[^\/]*$/, '/');
  var ASSETS = [
    './index_pwa.html',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './sw.js'
  ];
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      var promises = ASSETS.map(function(p){ return cache.add(resolveUrl(baseFolder, p)); });
      return Promise.all(promises);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k !== CACHE_NAME) return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  var req = event.request;
  // navigation requests -> try cache then network
  if (req.mode === 'navigate' || (req.method==='GET' && req.headers.get('accept') && req.headers.get('accept').indexOf('text/html')!==-1)) {
    event.respondWith(
      caches.match(req).then(function(resp){
        return resp || fetch(req).then(function(fetchResp){
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, fetchResp.clone()); });
          return fetchResp;
        }).catch(function(){ return caches.match('./index_pwa.html'); })
      })
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(function(resp){ return resp || fetch(req).then(function(fetchResp){ if(String(req.url).indexOf(self.location.origin)===0){ caches.open(CACHE_NAME).then(function(cache){ cache.put(req, fetchResp.clone()); }); } return fetchResp; }).catch(function(){ return resp; }); })
  );
});
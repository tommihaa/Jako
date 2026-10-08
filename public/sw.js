// ── Offline-välimuisti ────────────────────────────────────────────────────────
// Strategia kahdessa kerroksessa:
//   /assets/*  → cache-first: Viten tiedostonimet sisältävät sisältöhashin, joten
//                kerran haettu tiedosto ei koskaan muutu — välimuisti on aina oikein.
//   navigaatio + muut (index.html, manifest, icon) → network-first: tuore versio
//                haetaan aina kun verkko toimii, välimuisti on vain offline-varasto.
// Esitallennus: build kirjoittaa /precache.json:iin kaikki pelit, kielet, muutoslokit ja
// äänet (scripts/precache.mjs). Lista haetaan asennuksessa ja jokaisella verkon kanssa
// tehdyllä avauksella, koska tämä tiedosto ei muutu julkaisusta toiseen eikä selain siksi
// asenna SW:tä uudelleen. Puuttuvat tallennetaan, ja listalta pudonneet assetit (vanhan
// julkaisun hashit) poistetaan. Ennen 8.10.2026 vain avatut pelit tallentuivat, ja julkaisun
// jälkeen offline-avaus antoi tyhjän ruudun.
// Sourcemappeja (.map) ei tallenneta: vain devtools hakee niitä, ja ne ovat isoja.
const CACHE = 'jako-v2';
// Vary ohitetaan: esitallennuksen haku ei lähetä Origin-otsaketta kuten selaimen moduulihaku,
// ja jos palvelin vastaa `Vary: Origin` (esim. vite preview), osuma jäisi muuten saamatta.
// Hashatulle tiedostolle otsake ei muuta sisältöä.
const MATCH = { ignoreVary: true };

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(precache());
});

self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => clients.claim())
));

// Hae verkosta ja talleta onnistunut vastaus välimuistiin.
function fetchAndCache(request) {
  return fetch(request).then(resp => {
    if (resp.ok) {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(request, copy));
    }
    return resp;
  });
}

// Tallenna listan puuttuvat tiedostot ja poista vanhentuneet assetit. Epäonnistuminen
// (ei verkkoa, lista puuttuu) jättää välimuistin ennalleen: seuraava avaus yrittää uudelleen.
// '/' haetaan tässä vain jos se puuttuu: ensimmäinen avaus ei kulje SW:n kautta, joten
// ilman tätä sovellus ei aukeaisi offline ennen toista avausta. Myöhemmin navigaation
// network-first-haara pitää sen tuoreena.
let running = null;
function precache() {
  if (running) return running;
  running = (async () => {
    const resp = await fetch('/precache.json', { cache: 'no-store' });
    if (!resp.ok) return;
    /** @type {string[]} */
    const files = await resp.json();
    const cache = await caches.open(CACHE);
    const have = new Set((await cache.keys()).map(r => new URL(r.url).pathname));
    const missing = files.filter(f => !have.has(f));
    // Yksi kerrallaan eikä addAll: yksi epäonnistunut tiedosto ei kaada muita.
    for (const f of missing) {
      try {
        const r = await fetch(f);
        if (r.ok) await cache.put(f, r);
      } catch { /* verkko katkesi kesken: loput seuraavalla avauksella */ }
    }
    const keep = new Set(files);
    for (const req of await cache.keys()) {
      const path = new URL(req.url).pathname;
      if (path.startsWith('/assets/') && !keep.has(path)) await cache.delete(req);
    }
  })().catch(() => {}).finally(() => { running = null; });
  return running;
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('.map')) return;

  if (url.pathname.startsWith('/assets/')) {
    // cache-first: hash-nimetty = muuttumaton
    e.respondWith(
      caches.match(e.request, MATCH).then(hit => hit || fetchAndCache(e.request))
    );
    return;
  }

  if (e.request.mode === 'navigate') {
    // Avaus verkon kanssa: sivu vastaukseksi heti, esitallennus taustalla perään.
    e.respondWith(
      fetchAndCache(e.request)
        .then(resp => { if (resp.ok) e.waitUntil(precache()); return resp; })
        .catch(() => caches.match(e.request, MATCH).then(hit => hit || caches.match('/', MATCH)))
    );
    return;
  }

  // network-first: tuoreus voittaa, välimuisti pelastaa offline-tilassa.
  e.respondWith(
    fetchAndCache(e.request).catch(() => caches.match(e.request, MATCH))
  );
});

// Esitallennuslista palvelutyöntekijälle (public/sw.js). Build kirjoittaa sen tiedostoon
// dist/precache.json, ja SW tallentaa listan tiedostot välimuistiin ensimmäisellä avauksella
// ja jokaisen julkaisun jälkeen. Näin kaikki pelit ja kielet toimivat ilman verkkoa, myös ne
// joita ei ole koskaan avattu. Ennen 8.10.2026 vain avatut pelit tallentuivat, ja julkaisu
// vaihtoi niiden hashatut nimet, jolloin offline-avaus antoi tyhjän ruudun.
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// public/-tiedostot joita peli ei tarvitse: SW ei tallenna itseään, robots ja lisenssit
// ovat hakukoneelle ja lukijalle.
const PUBLIC_SKIP = new Set(['sw.js', 'robots.txt', 'sfx/CREDITS.md']);

/** Polut joita SW esitallentaa. `bundleFiles` = Rollupin bundlen avaimet, `publicFiles` = public/-polut. */
export function precacheFiles(bundleFiles, publicFiles) {
  const fromBundle = bundleFiles
    .filter(f => !f.endsWith('.map') && f !== 'index.html' && f !== 'precache.json');
  const fromPublic = publicFiles.filter(f => !PUBLIC_SKIP.has(f));
  return ['/', ...[...fromBundle, ...fromPublic].sort().map(f => '/' + f)];
}

/** public/-hakemiston tiedostot suhteellisina, kauttaviivoin. */
export function listPublic(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(d => d.isFile())
    .map(d => relative(dir, join(d.parentPath, d.name)).split(sep).join('/'));
}

/** Vite-plugin joka kirjoittaa listan buildiin. */
export function precachePlugin(publicDir) {
  return {
    name: 'jako-precache',
    apply: 'build',
    generateBundle(_, bundle) {
      this.emitFile({
        type: 'asset',
        fileName: 'precache.json',
        source: JSON.stringify(precacheFiles(Object.keys(bundle), listPublic(publicDir))),
      });
    },
  };
}

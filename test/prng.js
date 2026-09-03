// Siemennetty PRNG testeille. Sama koodi oli aiemmin vain botbench.test.jsx:ssä,
// ja se siirtyi omaan tiedostoonsa kun ristiintarkistustesti tarvitsi saman
// siemenen (kompositioauditointi, päätös 4).
//
// mulberry32 + FNV-1a-siemen merkkijonosta. Sama merkkijono tuottaa saman
// lukujonon, joten sama konfiguraatio tuottaa samat pelit.

export function strSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mulberry32(seed) {
  let t0 = seed >>> 0;
  return function () {
    let t = (t0 += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

import { useState, useRef, useCallback } from 'react';

// Pelitila ja sen ajastinpeili yhtenä omistajana.
//
// Oli ennen jokaisessa pelissä käsin: useState + useRef + synkkaava useEffect ja
// sen päällä joko oma `setGS`-apuri (Moska, Paskahousu, Ristiseiska, Seiska) tai
// kirjoituspari `setG(g); gRef.current = g` auki jokaisessa kutsupaikassa
// (Kasino 14, Koputus 20 kappaletta). Kopioitu ratkaisu, jota ei ollut nimetty
// (kompositioauditointi H5).
//
// `gRef` on olemassa siksi, että ajastimesta heräävä bottisiirto tarvitsee tuoreen
// tilan renderin ulkopuolella. Siksi ref kirjoitetaan samassa lauseessa kuin state
// eikä effectissä: effect ajaisi vasta renderin jälkeen, ja ajastin ehtii ensin.
/**
 * @template G
 * @param {G} [initial]
 * @returns {{ G: G, gRef: {current: G}, setG: (g: G) => void, setGS: (g: G) => void }}
 */
export function useGameState(initial = /** @type {any} */ (null)) {
  const [G, setG] = useState(initial);
  const gRef = useRef(initial);

  // Ainoa tie tilaan. Ref ensin, jotta samassa lauseessa seuraava addLog-snapshot
  // (ks. useGameLog.commit) lukee jo uuden tilan eikä edellistä.
  const setGS = useCallback(g => { gRef.current = g; setG(g); }, []);

  // `setG` on tarkoituksella sama funktio kuin `setGS`: nimi jäi kutsupaikkoihin,
  // mutta reittiä joka kirjoittaa staten ilman refiä ei ole enää olemassa.
  return { G, gRef, setG: setGS, setGS };
}

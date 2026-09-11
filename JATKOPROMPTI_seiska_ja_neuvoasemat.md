# Jatkoprompti: Seiska-erän julkaisu ja neuvoasemien läpikäynti

Kirjoitettu 11.9.2026 myöhään illalla. **Vanhenee heti kun seuraava sessio on lukenut sen**:
arkistoi `Kaanon/saatteet/`-kansioon vanhentumisrivillä session päätteeksi. Totuus on git.

## Tila (tarkista gitistä ennen kuin uskot)

- `git -C Jako log --oneline -16`: commitit `9e3442d`..`8a332e9` ovat Mestarin opastuksen ja
  Seiskan erää. **Ei pushattu, ei julkaistu.** Tuotanto on 1.2.227.
- Tehty 11.9. illan sessiossa: sääntötason neuvotekstit 23 kieleen ja Seiskan `classifySingle`
  (`960f22e`), Seiskan erikoiskorttisääntö koodiin ja `applyAcePenalty`n sekoituskorjaus
  (`4939e39`), neuvoasemat läpikäyntiä varten (`8a332e9`). Testit 149/149, typecheck puhdas.
- Kanoni ja työlista: `Jako/docs/MESTARIN_OPASTUS.md` (työlista, testausvelkataulukko),
  `Jako/docs/MESTARIN_NEUVO.md` (sääntötaso, neuvoasemien ensimmäinen havainto).

## Mitä tehdään, järjestyksessä

1. **Botbench Seiska N=400 kolmella parilla**, jos sitä ei ole kirjattu `docs/BOTBENCH.md`:hen
   (hae otsikkoa "Seiska 11.9.2026"). Edellinen sessio ajoi sen (17 min), mutta tulos katosi:
   Bash-tulosteen ohjaus tiedostoon pudotti vitestin console.log-rivit eikä `BOTBENCH_OUT` ollut
   asetettu (kirjattu `docs/BOTBENCH.md` › Käyttö jatkossa). Aja PowerShellissä ja aseta tulostiedosto:
   `$env:BOTBENCH='1'; $env:BOTBENCH_N='400'; $env:BOTBENCH_GAMES='Seiska'; $env:BOTBENCH_OUT='docs/botbench-ajot.jsonl'; npx vitest run test/botbench.test.jsx`
   Vertailuluvut 8.9.2026: 76,0 / 53,5 / 64,5 %. Kirjaa samaan taulukkomuotoon kuin
   "Neljä peliä 8.9.2026" ja sano mitä sääntömuutos teki portaille.
2. **Neuvoasemien läpikäynti Tommin kanssa**: `Jako/docs/NEUVOASEMAT.md`. Tommi pyysi tämän
   ("generoi neuvoja asemiin, kävisin mielelläni läpi"). Yksi havainto on jo kirjattu
   `MESTARIN_NEUVO.md`:hen: Moskan `pass` sanoo "valtit säästetään" myös valtilla
   siirrettäessä. Korjausehdotus on kaksi avainta (kuten Koputuksen `swapUnknown`), mutta
   päätös on Tommin. Muutokset teksteihin 23 kieleen skillillä `i18n-kieli` kohta B.
   Regenerointi: `NEUVOASEMAT=1 npx vitest run test/neuvoasemat.gen.test.js`.
3. **Opastuksen testausvelkataulukko** (`MESTARIN_OPASTUS.md`): Ristiseiska todennettu
   11.9. (kolme saraketta, vaiheet eivät osuneet kohdalle). Auki: Koputus, Maija, Paskahousu,
   Kasino, ja Ristiseiskan pantti (vaatii Valittu-tilan) ja bonusvuoro (A tai K kaataa pinon).
   Dev: `preview_start` nimellä `jako-dev-5183` (juuren launch.json), koska 5173/5174 voivat
   olla toisen chatin käytössä. Opasta-nappi on 🎓 Opasta, purppura korostus on opastuksen,
   kullanvärinen reunus on pelattavuuden merkki.
4. Sitten `versio`-skill (bumppi 1.2.228, changelog: Seiskan erikoiskorttisääntö, sääntötason
   neuvot ja opastus), Jakon deploy-skill, Tulossa-rivi `done`. **Julkaisu vain Tommin
   kuittauksella "julkaise".**

## Mitä ei tehdä

- Ei pushia eikä julkaisua ilman sanaa "julkaise" (Jako 13, Kaanon 2+, Tyonhaku 1 committia
  odottavat).
- Ei osuman löysentämistä koodissa (päätös 11.9.: kaanoni, ei koodi).
- Ei Läpsyyn opastusta.
- Ei botbench-lukuja muistista.

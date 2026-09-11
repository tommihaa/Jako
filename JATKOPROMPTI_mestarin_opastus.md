# Jatkoprompti: Mestarin opastus, sääntötekstit ja Seiskan erikoiskorttisääntö

Kirjoitettu 11.9.2026 illalla. **Vanhenee heti kun seuraava sessio on luettu sen**: arkistoi
`Kaanon/saatteet/`-kansioon vanhentumisrivillä session päätteeksi. Totuus on git, ei tämä.

## Tila (tarkista gitistä ennen kuin uskot)

- `git -C Jako log --oneline -12`: commitit `9e3442d`..`354733b` ovat tämän aiheen. Ei
  pushattu, ei julkaistu. Tuotanto on 1.2.227.
- Kanoni ja työlista: `Jako/docs/MESTARIN_OPASTUS.md`, erityisesti lopun "Seuraavan session
  työlista" (viisi kohtaa) ja "Testausvelka"-taulukko.
- Seiskan sääntö: `Jako/SEISKA.md` ässä- ja seiskakohdat, commit `bc4de50`. Koodissa ei vielä.

## Mitä tehdään, järjestyksessä

1. Kymmenen sääntötekstiä (taulukko dokumentissa, Tommi kuittasi 11.9.) fi.js:ään ja 22
   localeen. Ankkuri pelilohkon `advice: {`, ks. skill `i18n-kieli` kohta B. Seiskan `play`
   jää ryhmätekstiksi, uudet avaimet `playOnly`, `playLeaveGroup`, `playNoPair`, `playSeen`.
2. Seiskan `getAdvice` luokittelee yksittäisen kortin haaran jälkikäteen (ehdot dokumentissa).
   `aiBestPlay`hin ei kosketa. `test/neuvo-sauma.test.js` pysyy vihreänä.
3. `docs/MESTARIN_NEUVO.md`: merkintä sääntötason vaatimuksesta.
4. Seiskan sääntö koodiin: `canSingle` (isLast-haara katsoo `discardTop.r`), `doPlay` (tyhjä
   käsi erikoiskortilla nostaa ennen voittotarkistusta, sekoitus jos pakka tyhjä, uusi
   lokiviesti 23 kielelle). Samalla `applyAcePenalty`: sekoitus silmukan sisään, ei vain ennen.
   Botbench Seiska N=400 kolmella parilla, kirjaus `docs/BOTBENCH.md`:hen:
   `$env:BOTBENCH='1'; $env:BOTBENCH_N='400'; $env:BOTBENCH_GAMES='Seiska'; npx vitest run test/botbench.test.jsx`
5. Pelitesti devissä viidessä pelaamattomassa pelissä, taulukko täyteen. Sitten `versio`- ja
   Jakon deploy-skilli, Tulossa-rivi `done`, ja julkaisu vain Tommin kuittauksella.

## Mitä ei tehdä

- Ei pushia eikä julkaisua ilman sanaa "julkaise".
- Ei osuman löysentämistä koodissa (päätös: kaanoni, ei koodi).
- Ei Läpsyyn opastusta (päätös 11.9.).
- Ei botbench-lukuja muistista: kaikki ennen 4.9.2026 mitatut ovat kuolleita.

Dev: `preview_start` nimellä `jako-dev` (launch.json), portti 5173 tai seuraava vapaa.

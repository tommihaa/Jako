# Jako – Finnish Card Game Collection

## Project
Mobile-responsive card game app (React/JSX + Vite). Dark green (#1f5a3f) + gold (#c9a84c) aesthetic.
Structure: `src/App.jsx` (entry), `src/games/*.jsx` (9 games), `src/shared/` (Card, FanStack, colors, helpers, audio, glossary).

**Pelin elinkaaren runko asuu `shared/`:ssä (3.9.2026, kompositioauditointi H1).** Ennen se
oli yhdeksänä kopiona. Uutta peliä lisätessä nämä otetaan käyttöön eikä kirjoiteta uusiksi:
`useAIScheduler` (ajastimet, tauko, katselutilan aloitus; bottisiirto ajastetaan `schedMovella` tai `schedAI`:lla ja ajastettu ikkuna `schedTickillä`, `tm` on vain UI:lle, ks. `docs/AUDITOINTI-KOMPOSITIO.md` H7), `useGameLog` (loki, aikaleima ja
katselutilan snapshot), `GameStartScreen` (aloitusnäyttö), `GameStatusBar` (tilarivi) ja
`GameLog` (lokipaneeli). Vakiot `BOT_RESULT_DELAY` ja `LOG_MAX` sekä `AI_NAMES`,
`shuffledAINames` ja `lblColored` ovat `helpers.js`:ssä. `lastPlayFade` ja `button:active`
ovat `index.html`:n globaalissa tyylissä.
Sanasto-termit + `splitWithGlossary` ovat `src/shared/glossary.js`:ssä (Lahja-kokoelman jaettu termiskeema, speksi `Kaanon/TERMIMODUULI.md`; sisarkopio Itussa). MERKISTO siirtyi samaan tiedostoon 5.9.2026 (kompositioauditointi H8).
Reference docs: `jako_projekti.md` (general), pelikohtaiset säännöt: `KOPUTUS.md`, `LAEPSY.md`, `KULTAKALA.md`, `MAIJA.md`, `KASINO.md`, `MOSKA.md`, `SEISKA.md`, `RISTISEISKA.md`, `PASKAHOUSU.md`. Dev server: `http://localhost:5173/`.
Repo: `https://github.com/tommihaa/Jako` (nimetty 5.9.2026, oli Korttipeli-kokoelma; GitHub ohjaa vanhan nimen uuteen)
Responsive: Portrait phone (~375px) + tablet landscape (~768px+)

## Sääntölogiikan muokkaus
**Ennen minkään pelin näkyvyys-, vaihto- tai muun sääntölogiikan muokkaamista lue ensin kyseisen pelin `PELI.md` ja toista sääntö minulle vahvistettavaksi** (suunnat, mitkä kortit pysyvät piilossa, kynnykset). Säännöt ovat hienovaraisia ja niitä on luettu väärin, esim. Kultakalassa pelaaja EI näe omia pöytäkorttejaan alussa, hän oppii kunkin paikan (1–5) vasta vaihtaessaan kortin siihen (vaihtoketju oikealta vasemmalle 5→4→3→2→1); tuntematon (paikka 0) ei ole vaihdettavissa ja paljastuu vain lopussa. Älä päättele sääntöä koodista tai muistista, kun dokumentti on olemassa.

**Sopimusmuutos:** kokoelman sääntö (`TYÖTAVAT.md`, "korjataanko koodi vai kaanoni") pätee
sellaisenaan, ja kaanoni on tässä projektissa kyseisen pelin `PELI.md`.

**Mestarin neuvon tekstit ovat oma pintansa:** `getAdvice` kutsuu samaa valintafunktiota kuin
botti, joten neuvon **siirto** ei voi ajautua, mutta neuvon **perustelu** voi. Tarkastuskirjanpito
ja avoimet löydökset: `docs/MESTARIN_NEUVO.md`. Kun muutat bottilogiikan lajitteluavainta, lue
sieltä väittääkö jokin neuvoteksti vanhaa avainta.

**Mestarin opastus (päätetty 11.9.2026, ei koodissa):** neuvon toinen muoto opetteluun, kupla
ilman korostusta ja palaute vasta pelaajan valinnan jälkeen, kaikissa peleissä, ja auktoriteettivaraus
näkyy siellä missä Botbench ei näytä Mestarin porrasta. Korvaa Tulossa-listan Mestarin luennon. Päätökset ja reunaehdot:
`docs/MESTARIN_OPASTUS.md`. Lue se ennen kuin kosket 🧙-nappiin tai `todoItems`-riviin.

**Pelikanonin ja koodin pinta on eri pinta kuin edellinen:** yhdeksän `PELI.md`:n sääntökuvaus
koko pelilogiikkaa vasten, eikä sillä ole koodiin mitään yhteyttä joka estäisi ajautumisen.
Tarkastuskirjanpito ja ratkaisemattomat sopimusmuutoskysymykset: `docs/PELIKANONIT.md`. Lue se
ennen kuin siteeraat `PELI.md`:tä säännön lähteenä, koska yhdeksästä kanonista kaksi on
tarkistettu puhtaaksi ja seitsemässä on nimettyjä ristiriitoja.

**Kompositioauditointi 3.9.2026:** kahdeksan havaintoa koodin rakenteesta (elinkaaren runko
yhdeksänä kopiona, katselutilan taso, kuollut tulosruutukerros, snapshot-järjestys, tilan
sijainti, asetuksen omistaja, botti vs neuvo) tiloineen ja Tommille osoitetut kysymykset:
`docs/AUDITOINTI-KOMPOSITIO.md`. Lue se ennen rakennemuutosta tai uuden pelin lisäystä.

**Porsaanreikäauditointi 8.9.2026:** botti vastaan pelaaja yhdeksässä pelissä. A-luokan
löydöksiä (botti tekee pelaajalta estetyn) on nolla; aukot ovat pelaajan puolella, ja
kokoelmatason syy on ajastettu vaiheenvaihto jossa `tm`:llä ajastettu jatko jättää UI:n
vaihe-ehdon todeksi ikkunan ajaksi. Löydökset luokittain, kuusi Tommille osoitettua
kaanonikysymystä ja mitä ei tarkistettu: `docs/AUDITOINTI-PORSAANREIAT.md`. Lue se ennen
kuin ajastat tilasiirtymän `tm`:llä tai lisäät pelaajalle klikattavan polun.

**Katselmointikriteerit (29.9.2026):** kahdeksan kriteeriä (K1–K8), jotka on johdettu Jaon
omista fix-commiteista, ja taulukko siitä mitä testit jo vartioivat. Lue `docs/KATSELMOINTI.md`
ennen kuin katselmoit diffin (`/code-review` tai käsin), ja merkitse löydös kriteerin tunnuksella.

**Ristiseiska on rakenteeltaan eri kuin muut kahdeksan (4.9.2026).** Sen säännöt, AI-valinta
ja siirtymät asuvat `src/games/ristiseiskaEngine.js`:ssä, ja komponentti on niiden kuljettaja
joka kääntää moottorin askeleet lokiriveiksi, ääniksi ja ajastimiksi. Sääntömuutos tehdään
moottoriin eikä komponenttiin. Muoto syntyi kysymyksen 4 kokeesta, ja `test/ristiseiska-saumapari.test.jsx`
vaatii että moottorin oma silmukka (`runHeadless`) ja komponentti pelaavat samasta siemenestä
saman pelin. Muissa kahdeksassa pelissä säännöt ovat yhä komponentin sisällä.

## Global settings (App.jsx → props to all games)
| Prop | Default | Selitys |
|---|---|---|
| `showLog` | true | Tapahtumaloki auki |
| `soundOn` | false | Äänet (oletuksena pois) |
| `seeAll` | false | Cheat Mode: Hero näkee kaikki kortit |
| `showLastPlay` | true | Kelluva viimeisin siirto -indikaattori |

Asetukset persistoidaan `useStickySetting`-hookilla (ks. Tech-osio). Poikkeus: `seeAll` ei tallennu (nollautuu joka latauksessa).

**Omistaja on App (päätös 3.9.2026, kompositioauditointi H6).** Peli lukee `soundOn`-,
`seeAll`- ja `showLog`-arvon propsista eikä kopioi sitä omaan tilaansa, ja pelin oma nappi
kutsuu takaisin App:iin (`onSoundOnChange`, `onSeeAllChange`, `onShowLogChange`). Siksi
Asetuksista tehty muutos näkyy pelissä heti ilman remounttia ja pelistä tehty muutos
tallentuu. Lokin kytkin kuuluu näkyvyysesiasetukseen, joten pelistä tehty muutos merkitsee
esiasetuksen `custom`-tilaan samoin kuin Asetuksissa. **Katselutilan paljastus on eri asia
kuin `seeAll`.** Pelissä on oma `revealAll`-tila jonka `startGame` asettaa arvoon
`seeAll || allBotsMode`, joten Bottien Taistelu paljastaa kortit koskematta asetukseen.
Aiemmin peli kopioi kaikki kolme omaan tilaansa `init`-etuliitteisestä propsista, jolloin
pelin nappi ei tallentunut eikä Asetusten muutos kuulunut peliin.

## Component props (kaikki 9 peliä)
App.jsx välittää saman propsijoukon kaikille peleille, mutta **jokainen peli destrukturoi vain tarvitsemansa**, yhtä kanonista signatuuria ei ole. Kaikille välitetään: `onResult, onSnapshot, game, showLog, soundOn, seeAll, onSoundOnChange, onSeeAllChange, onShowLogChange, showLastPlay, showIntention, showNextBtn, showAIKnown, isMobile, playerCount, playerNames, playerGroup, onPlayerGroupChange, aiLevel, onAiLevelChange`. `hints` on ollut listalla mutta sitä ei välitetä eikä lueta missään (kompositioauditointi H6).

Yhteiset (kaikki destrukturoivat): `onResult, showLog, soundOn, seeAll, onSoundOnChange, onSeeAllChange, onShowLogChange, showLastPlay, isMobile, playerCount, playerNames, aiLevel, onAiLevelChange, onSnapshot`.

Pelikohtaiset (vain osa ottaa):
- `game`: vain Kasino
- `showNextBtn`: vain Kasino, Moska
- `showAIKnown`: vain Koputus, Kultakala
- `showIntention: initShowIntention`: Kasino, Koputus, Maija, Seiska, Ristiseiska, Paskahousu, Moska (ei Läpsy/Kultakala)

## AI-tasot (3 kpl)
`Oppipoika | Kisälli | Mestari`
- **Mestari** = täysi strategia + muistaa pelattuja kortteja (aiempi "Yliluonnollinen"-logiikka)
- Sisäiset avaimet: `'beginner'` | `'normal'` | `'hard'`

## Verifiointi
- **Jos muutos ei näy previewissä, epäile ensin vanhentunutta dev-palvelinta tai välimuistia: älä muokkaa jo oikeaa koodia.** Käynnistä dev-palvelin uudelleen + kova reload (ja tarkista `vite-error-overlay`) ennen kuin oletat koodin olevan vialla. Kerro mitä kokeilit.
- HMR-virheet konsolipuskurissa ovat usein vanhentuneita välitiloja kaksivaiheisten editien ajalta: täysi reload on luotettava totuus.

## Deploy
Julkaisu on `git -C Jako push origin main` (Vercelin git-integraatio, todennettu 25.6.2026).
Ennen sitä käsin: changelog `src/changelogs/fi.js` vain suomeksi ja vain pelaajalle näkyvistä
muutoksista, `TODO`-taulukko `src/App.jsx`:ssä ja `package.json`in `version` patch +1 aina.
Perustelut, todennus tuotantobundlesta, hätävara ja `vercel alias` -kielto: `deploy`-skill
(`.claude/skills/deploy/SKILL.md`). Tuotantodomainit https://tommi-jako.vercel.app (ensisijainen)
ja https://tommi-jako52.vercel.app (jaettu linkki, päivittyy samasta deploysta).

## Games & Terminology
Nine games with unified Finnish UI terms:

| Peli | Tyyppi | Taso | Pelaajat |
|---|---|---|---|
| Koputus | Muistipeli | Keskitaso | 2-4 |
| Läpsy | Reaktiopeli | Helppo | 2-4 |
| Kultakala | Muistipeli | Helppo | 2-4 |
| Maija | Kaatopeli | Keskitaso | 2-4 |
| Kasino | Kaappaaminen | Keskitaso | 2-4 |
| Moska | Hyökkäily/puolustus | Vaativa | 2-4 |
| Seiska | UNO-tyyppinen | Helppo | 2-4 | <!-- UI shows "7" as icon, code name: Seiska -->
| Ristiseiska | Kiusantekopeli | Helppo | 3-4 |
| Paskahousu | Laituripeli | Keskitaso | 2-4 |

Key terms: kortti, käsi, pino, nosto, lasku, pistelasku, kierros, vuoro, jako

## Koodiviite
Navigointi, näkyvyysesiasetus (`uiPreset`), intuitiivisuus-UI, pakkatyypit ja `SFX`-äänitaulukot
ovat `docs/KOODIVIITE.md`:ssä (siirretty 12.10.2026). Nouda kun kosket valikkoon, esiasetuksiin,
pakkaluokkaan tai ääniin.

## Players
- Human player: "Hero"
- AI opponents: "Tekoäly" (1–3 bots)
- Player count per game varies: see Games table above
- Nimiryhmiä on kuusi (`porukka`, `jumalat`, `puolue`, `kansa`, `meme`, `goauld`). Viidellä on
  lyhyt selite `App.jsx`:n `GROUP_BLURB`issa, ja se **näytetään aina englanniksi eikä sitä
  käännetä**, koska se on käyttäjän oma ääni.
- **`porukka`:** ei persoonallisuuksia, puhetyylejä eikä pelitapaeroja (kunnianosoitus oikeille
  ihmisille, 19.8.2026). Vanha avain `laituri` migratoidaan `App.jsx`:ssä eikä sitä yhtenäistetä
  takaisin (21.8.2026). Perustelut: `docs/NIMIRYHMAT.md`.

## Tech
- React functional components + hooks only (no class components)
- Tailwind core utilities only (no custom compiler)
- localStorage asetuksille (lupa laajentaa 2026-06-19, kumoaa aiemman "preferenssit-vain"-linjan): kaikki Asetukset-paneelin togglet (`jako:showLog`, `jako:soundOn`, `jako:twoColorDeck`, `jako:showLastPlay`, `jako:showIntention`, `jako:showNextBtn`, `jako:showAIKnown`), näkyvyysesiasetus (`jako:uiPreset` = `beginner`|`experienced`|`custom`, ks. `docs/KOODIVIITE.md`), AI-taso (`jako:aiLevel`), nimiryhmä (`jako:playerGroup`) sekä pelikohtaiset sääntövalinnat (`jako:paskahousu:rules`, `jako:ristiseiska:rules`, `jako:kasino:rules`) persistoidaan `useStickySetting`-hookilla (`src/shared/storage.js`, `loadPref`/`savePref`, try/catch-suojattu). Lisäksi **pelikohtaiset tilastot** (`jako:stats`: pelatut/voitot/sijoitusjakauma/vaikeustaso-erittely per peli) persistoidaan suoraan `loadPref`/`savePref`-parilla (`useStickySetting` ei sovi, koska tallenne pitää yhdistää oletuksiin `normalizeStats`-migraatiolla; ks. `StatsPanel.jsx` ja 📊-nappi). **POIKKEUKSET (eivät tallennu):** `seeAll` (cheat, nollautuu joka latauksessa tahallaan) ja `godMode` (disabloitu placeholder).
- One `.jsx` component per game in `src/games/`; shared code lives in `src/shared/` (Ristiseiska also has `ristiseiskaEngine.js`)
- Touch + stylus primary input (phone + tablet), no hover-dependent interactions
- Responsive: `window.innerWidth < 600` = mobile, else tablet
- Mobile: 1-col game grid, smaller fonts (11-12px), reduced padding
- Tablet: 3-col game grid, fonts 12-14px, normal padding

## Tyyppitarkistus (`npm run typecheck`)

Koodi on JS/JSX eikä TS, ja pysyy sellaisena: `tsconfig.json` ajaa `allowJs` + `checkJs`
-tilassa ja tyypit kirjoitetaan JSDociin. `strict` on pois tarkoituksella.

Uutta koodia kirjoittaessa kaksi asiaa toistuvat, ja molemmat on halvempi merkitä heti kuin
korjata jälkikäteen:

- **Komponentin propsit** merkitään `@typedef`illä jossa valinnaiset propsit ovat
  hakasuluissa. Ilman sitä destrukturointi lukee ne pakollisiksi, ja jokainen kutsu joka
  jättää yhdenkin pois on virhe. Yhdeksän peliä destrukturoi eri osajoukon samasta
  propsijoukosta, joten pakollisuus on käytännössä aina väärä lukema.
- **Uusi ääni** lisätään `oletusSfx`- JA `hornKanteleSfx`-tauluun. `SFX` on tyypitetty
  oletustaulusta, joten puuttuva avain kaatuu tarkistuksessa.

Portti ajaa tämän ennen testejä (`.github/workflows/testit.yml`).

## Code style
- Finnish variable names for game logic (e.g. `kortti`, `pelaaja`, `vuoro`)
- English for React/component internals
- Destructure imports: `import { useState } from "react"`

## Viestit (loki/viestikupla): i18n-konventio
- **Kattavuus:** kaikissa i18n-/lokalisointitöissä varmista uusien UI-stringien kattavuus kaikissa 23 kielessä (parity-tarkistus) ja pidä terminologia yhdenmukaisena jaetun termimoduulin kanssa (`src/shared/glossary.js`, speksi `Kaanon/TERMIMODUULI.md`). Poikkeus: changelog vain suomeksi (ks. Deploy).
- **Tapahtumailmoitukset kolmannessa persoonassa** kaikille pelaajille, myös ihmiselle: `${name}: ...`, `Vuorossa ${name}.`, `${name} vei voiton`. Ihmisen nimi on aina `Hero`, joten "Vuorossa Hero.", "Hero: 7♣". Ei erillistä `isHuman ? 'Sinä…' : '${name}…'` -haaraa: yksi käännösmalli per viesti.
- **Poikkeus: säilytä toimintaohjeet/vihjeet 2. persoonassa** kun ne neuvovat ihmistä tekemään jotain (esim. Koputus/Kultakala "Nostit X. Vaihda…", Kasinon dynaaminen vihje, Ristiseiskan "…joten Passaa"). Nämä eivät ole ilmoituksia vaan ohjeita.

## Rajoitukset (kysy ennen kuin rikot)
- Splitting a game into several files (Ristiseiska's engine is the documented exception)
- Adding npm packages beyond the current `package.json`
- Designing desktop-first: the app is designed for mobile (phone portrait ~375px, tablet landscape ~768px+), but as a browser app it must also work on a desktop screen

**Poikkeus pakettikieltoon (17.8.2026): tyyppitarkistuksen työkalut.** `typescript`,
`@types/react`, `@types/react-dom` ja `@types/node` ovat devDependencyjä, eivätkä ne päädy
bundleen. Kielto on olemassa siksi, ettei ajonaikainen riippuvuuspuu kasva huomaamatta, eikä
tämä lisäys kasvata sitä. Poikkeus koskee vain näitä neljää, ja se on rajattu tarkoituksella:
seuraava devDependency on oma päätöksensä eikä seuraa tästä.

## Compact instructions
When compacting: preserve current game logic state, component structure, and any
unresolved bugs. Drop conversation filler and superseded code versions.

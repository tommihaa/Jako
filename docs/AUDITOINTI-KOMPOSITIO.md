# Kompositioauditoinnin tila

Ajettu 3.9.2026 Tommin tilauksesta, HEAD `acf80c3`. Kohde oli kompositio eikä syntaksi eikä
pelisääntöjen oikeellisuus: toisteinen tieto, sääntö kommenttina vai rakenteena, tilan
omistajuus, vastuiden paikat, saumat, riippuvuussuunta, nimeäminen ja orvot palaset.
Menetelmä oli sama kuin `DGAndroid/docs/AUDITOINTI-KOMPOSITIO.md`:ssä 31.8.2026: neljä
rinnakkaista tutkinta-agenttia (pelit Kasino, Moska, Paskahousu ja Seiska; pelit Ristiseiska,
Maija, Koputus, Kultakala ja Läpsy; App.jsx ja shared-kerros; poikkileikkaavat rakenteet eli
botit, neuvo, i18n-data ja testisaumat) sekä kantavien väitteiden tarkistus käsin koodista.
Tarkistetut väitteet on merkitty. Rivinumerot ovat auditointihetken puusta ja liikkuvat.

Auditoinnilla oli toinen tarkoitus DG:n rinnalla: testata toistuuko DG:n diagnoosi eri
stackissa. DG on Kotlin ja sealed-hierarkiat, Jako on React ja JSX ilman tyyppijärjestelmää.
Jos sama havainto toistuu, se on työtavan ominaisuus eikä kielen. Vastaus on Diagnoosi-osiossa.

Tämä tiedosto vanhenee koodin mukana. Jos tiedosto ja koodi ovat eri mieltä, koodi voittaa.

## Mentaalimalli

Malli löytyy ja se on yhdenmukainen kaikissa yhdeksässä pelissä. Peli on komponentti jolla on
aloitusruutu ja peliruutu, pelaajataulukko jossa indeksi 0 on Hero, yksi immutable `G`-tilaolio
ja sen `gRef`-peili ajastimille, `addLog` joka lokittaa ja samalla lähettää katselutilan
snapshotin, `useAIScheduler` ajastimille, moduulitason puhtaat valintafunktiot joita sekä botti
että Mestarin neuvo kutsuvat ja `onResult({ranking})` jonka jälkeen App ottaa ohjat.
App omistaa asetukset, tilastot, tulosruudun ja katselutilan toiston. `shared/` on lehtikerros.

Riippuvuussuunta pitää täydellisesti (tarkistettu): `shared/` ei importoi pelejä eikä
App.jsx:ää, pelit eivät importoi toisiaan ja `localStorage`a ei lueta `storage.js`:n ohi
kertaakaan. Sama tulos kuin DG:ssä, jossa moduulirajat pitivät ja `core-domain` oli
riippuvuudeton.

Ongelma on sama kuin DG:ssä. Malli asuu yhdeksänä kopiona eikä yhtenä rakenteena. Pelit
jakavat mallin mutta eivät koodia ja siellä missä koodi on jaettu (`useAIScheduler`,
`BotBattleBar` joka kommenttinsa mukaan korvasi kuusi kopiota, `moskaCanPass`, Paskahousun
`aiCards`) malli pitää. Siellä missä se on kopioitu, se on jo alkanut eriytyä.

Kirjoittaja-arvio kuten DG:ssä: 368 committia samalta tekijältä sessiokerrontaviestein.
Havainnot sopivat tähän. Jokainen peli on paikallisesti hiottu ja puutteet ovat pelien
välisessä mittakaavassa jota yhden pelin kokoinen työyksikkö ei tuota itsestään.

## Havainnot ja niiden tila

Kahdeksan havaintoa tärkein ensin. Kaikki ovat auki 3.9.2026 ja kohtiin joissa puutetta ei
voi erottaa valinnasta ilman Tommia viitataan Kysymykset-osioon.

- **H1 Pelin elinkaaren runko on yhdeksän kopiota ja kopiot ovat ajautuneet.** `addLog`
  aikaleimalla ja snapshotilla on 9 pelissä, `startBotBattle` 9, `togglePause` 9,
  aloitusnäyttö (otsikko, pelaajamäärä, GroupPicker, kaksi nappia) 9, loki-JSX ja tilarivi 9,
  `@keyframes lastPlayFade` 7. Moduulitasolla `AI_NAMES` ja `shuffledAINames` 8 pelissä,
  `lblColored` 9, `mkDeck` 4 vaikka `helpers.newDeck` on identtinen ja Kasino käyttää sitä.

  Ajautumat ilman kommenttia (tarkistettu grepillä): `onResult`-viive katselutilassa on
  600 ms (Koputus, Moska), 800 (Kultakala, Läpsy, Paskahousu, Ristiseiska, Seiska), 1200
  (Kasino) tai 1800 (Maija, jossa sama viive molemmissa haaroissa ja haara on siis turha).
  Lokin pituusraja on 40, 50 tai 60. `sndRef`in alkuarvo on `true`, `false` tai
  `initSoundOn` ja vaikutus on nolla koska effect synkkaa. `useAIScheduler`in oma kommentti
  perustelee `togglePause`n jättämisen peliin "pelikohtaisella logiikalla", jota yhdessäkään
  pelissä ei ole.

  Tämä on DG:n H1 ja H4 yhdessä. Kotimuoto olisi `useGameShell`-hook (start, botBattle,
  pause, log ja snapshot, result-ajoitus) sekä `GameFrame`-komponentti (aloitusnäyttö,
  tilarivi, loki, BotBattleBar) ja `AI_NAMES`, `lblColored` ja `mkDeck` helpersiin.
  Nosto ei kysy Tommilta mitään, koska yksikään kopio ei eroa tarkoituksella.

- **H2 Efektiivinen AI-taso katselutilassa on kolme eri sääntöä ilman merkintää.**
  Kaava `botLevelsRef.current?.[i] ?? aiLevelRef.current` esiintyy 17 kohdassa. Kolmessa
  pelissä siinä on lisähaara joka pakottaa kaikki botit Mestariksi kun ihmistä ei ole
  (tarkistettu: Kasino 1047, Koputus 529 ja 656, Seiska 654, 673 ja 788). Kuudessa pelissä
  ei ole. Seiska laskee ehdon eri lähteestä (`players.every(!isHuman)`) kuin Kasino ja
  Koputus (`allBotsRef`). Läpsyn `topLvl()` on neljäs muoto. Kommenttia ei ole missään, ei
  koodissa, ei `BOTBENCH.md`:ssä eikä `PELIKANONIT.md`:ssä (tarkistettu grepillä).

  Seuraus näkyy testissä: `allbots-smoke` antaa `aiLevel: 'normal'` (tarkistettu rivi 85),
  joten kolme peliä pelaa savutestissä Mestaria ja kuusi Kisälliä huomaamatta. Botbench ei
  kärsi, koska se antaa `botLevels`in aina. Katselutilan aloitusnäyttö lupaa valitun tason
  tekstissä `botBattleSub` ja kolmessa pelissä lupaus ei pidä.

  Tämä on sama vikamuoto kuin DG:n H1 lautanäkymässä: sääntö asuu 17 rivinä eikä yhdessä
  funktiossa ja kolmessa rivissä sääntö on eri kuin muissa. **Kysymys 1.**

- **H3 Edellisen arkkitehtuurin kerros on jäänyt peleihin kuolleena, noin 250 riviä.**
  `pendingResult`-tila on määritelty 9 pelissä, mutta ei-null-arvo asetetaan vain Seiskassa
  (tarkistettu grepillä: 17 kutsua, 16 on `setPendingResult(null)`). Kahdeksassa pelissä
  katselutilan overlay ehdolla `pendingResult && allBots` ei voi renderöityä ja kolmessa
  "Tulokset →" -nappi kutsuu `onResult` arvolla null. App on hoitanut saman asian
  `botResult`-bannerilla 27.5.2026 alkaen (`b09353d`) ja pelien vanha reitti jätettiin.

  Pelien omat tulosruudut ovat samassa asemassa. App renderöi `GameResult`in heti kun
  `onResult` on kutsuttu ihmispelissä ja pelikomponentti unmountataan (tarkistettu App.jsx
  1557–1568). Pelin `screen === 'gameover'` -ruutu näkyy siis vain jos `onResult` viivästyy
  ja ihmispolussa se on synkroninen kaikissa paitsi Maijassa ja Läpsyssä. Kahdessa pelissä
  (Maija, Läpsy) `setScreen('gameover')`-kutsua ei ole edes olemassa.

  **Kultakalan tasapelin noppa-arvonta on tämän kerroksen sisällä.** `DiceRoll`-komponentti
  (206–253) renderöidään vain pelin omassa tulosruudussa, jonne päädytään 2000 ms viiveellä
  sen jälkeen kun `onResult` on jo kutsuttu synkronisesti (tarkistettu 610–620). Pelaaja ei
  näe arvontaa koskaan ja `GameResult` näyttää tasapelaajille saman sijan. `KULTAKALA.md`
  ei mainitse noppaa eikä tasapeliä (tarkistettu grepillä), joten arvonta on koodin oma
  keksintö eikä kaanonin sääntö. Todennettava selaimessa ennen kuin väitetään bugiksi, mutta
  koodipolku on suora. **Kysymys 3.**

  Kääntämätön suomi (`🔮 Uusi katselutila`, `Tulokset →`) asuu Läpsyssä, Paskahousussa ja
  Ristiseiskassa tämän kuolleen koodin sisällä ja on elävää vain Seiskassa (1239).
  Pariteettitesti ei näe niitä, koska ne eivät kulje `t()`:n kautta.

  Sama muoto kuin DG:n K1-fossiili, mutta kahdeksankertaisena. Kotimuoto on poisto, ja
  `GameResult` on jo se yksi koti.

- **H4 Snapshot on lokin sivuvaikutus ja kutsujärjestys pettää.** Snapshot otetaan
  `addLog`in sisällä ja lukee `gRef.current`. Kaikissa yhdeksässä pelissä `addLog` kutsutaan
  usein ennen `setGS`iä (tarkistettu Moska 609 vs 616; agentit nimesivät saman Kasinosta,
  Paskahoususta, Seiskasta, Ristiseiskasta, Koputuksesta, Maijasta ja Kultakalasta), joten
  katselutilan frame kuvaa edellisen siirron tilaa uuden siirron tekstillä. Tilamuutos ilman
  lokiriviä ei tuota snapshotia lainkaan. Sama lag koskee Botbenchin `siirtorekisteri`-dataa.

  Snapshotin kenttäjoukko on kopioitu 9 kertaa ja Maijan ja Moskan `extraText: 'Valtti: '`
  on kääntämätön suomi i18n:n ohi. Invariantti "snapshot kuvaa tilaa lokirivin jälkeen" asuu
  kutsujärjestyksessä eikä rakenteessa. Kotimuoto olisi `commit(g, msg)` joka tekee `setGS`,
  `addLog` ja snapshot yhdessä tässä järjestyksessä.

- **H5 Tilan sijaintia ei ole sovittu ja siitä seuraa ref-kaksosia ja puuttuvia
  vartijoita.** Vaihe ja vuoro asuvat `G`:ssä neljässä pelissä (Ristiseiska, Moska,
  Paskahousu, Seiska), `G`:n vieressä erillisinä useStateina neljässä (Kasino, Maija,
  Koputus, Kultakala) ja Läpsyllä ei ole `G`:tä lainkaan. Seuraukset:

  - Ref-kaksosia (state + ref samalle tiedolle, synkattu effectillä ja lisäksi käsin) on
    7–11 paria per peli. Kasinossa on 14 käsin kirjoitettua `setG(g); gRef.current = g`,
    Koputuksessa 20, kun muut käyttävät `setGS`-apuria. Ratkaisu on kopioitu eikä nimetty.
  - Mestarin neuvon vanhenemisen `useEffect`-riippuvuuslista on eri joka pelissä (`[G]`,
    `[G, phase, table]`, `[G, phase, drawn]`, `[G, phase, held, swapIdx]`) ja uusi
    ulkokehän useState pudottaa neuvon vanhenemisen hiljaa.
  - `getAdvice`-signatuurin ariteetti vaihtelee yhdestä viiteen ja mittaa suoraan kuinka
    paljon tilaa asuu `G`:n ulkopuolella.
  - Gameover-vartija on eri paikassa joka pelissä. Koputuksen `advance` ei tarkista
    gameoveria, Kultakalan tarkistaa (tarkistettu 365–370 vs 378–381).
  - Kultakalan `aiChainSwap` (468–470) mutatoi `G.players[idx]`-oliota paikallaan. Kaikki
    muut polut ovat immutaabeleja. Kultakalan `drawnFromDeck` asetetaan seitsemän kertaa
    eikä lueta kertaakaan.

  Tämä on DG:n taito 2 (ruudun tila yhtenä koneena) sellaisenaan. Kotimuoto olisi
  `useGameState` joka palauttaa `[G, commit, gRef]` ja kantaa vaiheen `G`:ssä. Ristiseiskan
  malli on lähimpänä.

- **H6 Asetuksen omistajuus on kahdessa paikassa eikä kumpikaan tiedä toisesta.** App
  omistaa persistoinnin ja peli elävän arvon. `soundOn`, `seeAll` ja `showLog` kopioidaan
  `init`-etuliitteisestä propsista paikalliseen tilaan 9/9 pelissä eikä synkronoida takaisin.
  Pelin oma äänikytkin ei tallennu ja Asetuksista tehty muutos ei kuulu peliin ennen
  remounttia. Oletukset eroavat: App `useStickySetting('soundOn', false)`, pelien signatuuri
  `initSoundOn = true`. Kolme asetusta (`soundTheme`, `twoColorDeck`, `lang`) kulkee
  moduulimutaationa eikä propseina, joten CLAUDE.md:n otsikko "props to all games" on
  yhdeksän kahdestatoista.

  "Mitkä propsit peli saa" asuu 14 kopiossa (App:n JSX, 9 signatuuria, CLAUDE.md kahdesti,
  kaksi testiä) ja ajautuu jo: `hints` on CLAUDE.md:ssä kahdessa listassa ja koodissa 0 osumaa
  (tarkistettu), `showCounts` destrukturoidaan 9/9 pelissä ja luetaan 0 kertaa (tarkistettu)
  vaikka sillä on paneelin toggle, sticky-avain ja preset-arvo ja `botLevels` destrukturoidaan
  9/9 mutta App ei välitä sitä koskaan. App.jsx:n kommentti 1547–1553 kirjaa jaetun
  `GameProps`-typedefin puuttumisen tietoiseksi lykkäykseksi. Hinta on yllä. **Kysymys 2.**

- **H7 Botti ja Mestarin neuvo kutsuvat samaa funktiota 7/9 pelissä ja taukovahti on
  valinnainen.** `MESTARIN_NEUVO.md` sanoo "jokaisen pelin getAdvice kutsuu samaa
  valintafunktiota". Se pitää seitsemässä. Kasinon `getAdvice` on 48 rivin peilikuva
  `runAI`n hard-haarasta omalla prioriteettijärjestyksellään ja sama kynnys `<= 0.5` on
  kirjoitettu kahdesti (286 ja 1130). Moskan puolustussilmukka on kopio `runAI`sta, ja
  lisäyskynnys 268 on kovakoodattu kopio rivistä 764, minkä kommentti sanoo ääneen. Läpsy on
  eri laji perustellusti. Neuvon perusteluteksti on sidottu valintaan vain merkkijonolla
  `'games.X.advice.' + type` ja kaikki 54 avainta löytyvät koodista (0 orpoa) mutta mikään
  testi ei tarkista sitä.

  `useAIScheduler` tarjoaa taukovahditun `schedAI`n ja vahdittoman `tm`:n. Bottisiirroista
  suurin osa käyttää vahditonta (tarkistettu grepillä `aiTmr.current = tm(` vs `schedAI(`):
  Kasino 8 vs 3, Moska 11 vs 5, Maija 6 vs 0, Ristiseiska 5 vs 0, Paskahousu 2 vs 12. Seiska
  teki oman `aiTm`in perustellusti, jolloin hookin vahti jää käyttämättä. Invariantti "botti
  ei liiku tauolla" on hookin kommentissa eikä rakenteessa. Kotimuoto olisi että hook palauttaa
  bottisiirroille vain vahditun ajastimen ja UI-animaatioille eri nimisen.

- **H8 Pienemmät saman lajin kohdat.** App.jsx kantaa noin 17 vastuuta joista vain
  `GAMES`-rekisteri on aito solmu; `MERKISTO`, `TODO`, 23 inline-SVG-lippua ja Replay ovat
  samassa tiedostossa sijainnin eikä rakenteen takia. `SANASTO` on siirretty `glossary.js`:ään
  mutta `MERKISTO` ei ja pariteettitesti tuntee poikkeuksen nimeltä. Audion sääntö "uusi ääni
  lisätään molempiin tauluihin" on puoliksi rakenne: `SFX` on tyypitetty `oletusSfx`ista,
  `hornKanteleSfx` ei ole tyypitetty sen avaimilla (tarkistettu audio.js 167–196), joten
  puuttuva avain torvi-kannel-teemassa on ajonaikainen TypeError eikä käännösvirhe. Kommentti
  sanoo "20 ja 20 (mitattu 17.8.2026)" eli mitattu kerran, ei valvottu. Koputus ja Kultakala
  ovat sisarpelejä jotka jakavat käsitteet (`UNKNOWN_EV = 7` kahdesti, sama gain-vertailu,
  identtinen poistopakan JSX) mutta eivät koodia. `isHuman` lasketaan rankingissa kolmella
  tavalla (tarkistettu). `useLayoutEffect` importataan 9/9 pelissä ja käytetään 0 kertaa
  (tarkistettu). `PlayerSetup.jsx` on shared-kerroksessa ja sitä käyttää vain Seiska, ja
  vain sen `slotsToPlayers`.

## Mitä pitää, eikä kannata koskea

Riippuvuussuunta (0 käänteistä importtia). Storage-fasadi (0 ohitusta). i18n-avainten
pariteetti testinä ja 0 avainta koodissa joita fi.js:ssä ei ole. Tulosolion ydin
`{name, place, isHuman, score?}` sama 9/9 ja laajennukset `revealCards` ja `scoreBreakdown`
perusteltu `GameResult.jsx`:n kommentissa. Bottilogiikka ja neuvo puhtaina moduulitason
funktioina seitsemässä pelissä, perusteltuina kommenteilla. `moskaCanPass` esimerkkinä siitä
miten sääntö siirretään kommentista rakenteeseen ja kommentti dokumentoi että kolme kopiota
eriytyivät ennen yhtenäistystä. Sama tarina on nyt toistumassa H2:ssa ja H7:ssä.

## Diagnoosi

**DG:n diagnoosi toistuu Jakossa sellaisenaan ja se ratkaisee auditoinnin toisen
kysymyksen.** Ykköstaito on sama: toiston lukeminen tietona ja säännön antaminen yhdelle
omistajalle. H1, H2, H4 ja puoli H8:sta ovat sen ilmentymiä, kuten DG:ssä H1, H4, H5 ja
puoli H6:sta. Myös DG:n kolme seuraavaa taitoa toistuvat: kerroksen sopimuksen suunnittelu
(H6, asetuksen omistaja ja `GameProps`), ruudun tilan mallinnus yhtenä koneena (H5, vaihe
`G`:ssä tai sen vieressä) ja testisauman suunnittelu rajapinnoin (Botbench kulkee komponentin
läpi jsdomissa ja fake-timereilla, koska `runAI` kirjoittaa Reactin tilaa eikä sitä ole
irrotettu; sauma tehtiin sinne missä funktio oli jo puhdas ja jäi sieltä missä se olisi
vaatinut irrotusta). Koska stack on eri, kyse on työtavan ominaisuudesta eikä Kotlinin.
Opeteltava taito ei kapene, se vahvistuu.

**Yksi asia on Jakossa eri ja se on väline eikä taito.** Kotlinissa sääntö rakenteena
tarkoitti sealed-hierarkiaa ja tyhjentävää `when`iä, joka kaatoi käännöksen. JS:ssä `strict`
on pois ja rakenteita on kolme: JSDoc-typedef (`GameProps`, `hornKanteleSfx`), hook joka
kantaa säännön (`useGameShell`, `commit`) ja testi joka greppaa (kuten DG:n `Failure.text()`
-mitta). Mikään niistä ei kaada käännöstä yhtä kovaa kuin Kotlin, joten Jakossa testi on
useammin se ankkuri. Botbench ja `allbots-smoke` ovat jo tässä roolissa ja ovat Jakon paras
turvaverkko rakennemuutoksille.

**Toinen Jakon oma piirre on kuollut kerros (H3).** Kun App otti vastuun tulosruudusta
27.5.2026, kahdeksan pelin vanha reitti jäi paikalleen, koska mikään ei ilmoita
saavuttamattomasta JSX:stä. DG:ssä vastaava oli yksi fossiili, Jakossa kahdeksan. Syy on
yhdeksänkertaisuus: sama siivous pitäisi tehdä yhdeksään paikkaan ja sessio tekee sen
yhteen. Se on H1:n hinta toisessa muodossa.

## Kysymykset Tommille 3.9.2026

Kolme kohtaa joissa puutetta ei voi erottaa valinnasta ilman Tommia ja yksi
suuntapäätös. Muut havainnot ovat nostoja jotka eivät kysy mitään.

1. **Katselutilan taso (H2).** Kasino, Koputus ja Seiska pakottavat kaikki botit Mestariksi
   kun ihmistä ei ole, kuusi muuta peliä kunnioittavat valittua tasoa. Onko hard-pakotus
   valinta (silloin se kirjataan `BOTBENCH.md`:hen ja viedään yhdeksään) vai virhe (silloin
   se poistetaan kolmesta)? Botbench ei muutu kummassakaan, savutesti ja katselutila muuttuvat.
2. **Asetuksen omistaja (H6).** Omistaako App äänet, huijaustilan ja lokin (peli lukee
   propsin suoraan ja pelin nappi kutsuu takaisin App:iin, jolloin pelin nappi tallentuu) vai
   omistaako peli (peli lukee `useStickySetting`-avaimen itse ja App ei välitä sitä)?
   Nykytila on molemmat ja se on ainoa vaihtoehto joka ei kelpaa.
3. **Kultakalan tasapeli (H3).** Koodissa on noppa-arvonta jota pelaaja ei näe, ja
   `KULTAKALA.md` ei tunne tasapeliä. Onko oikea tila jaettu sija ilman arvontaa (silloin
   `DiceRoll` poistetaan) vai arvonta (silloin se siirtyy `GameResult`iin ja kaanoniin)?
   Sopimusmuutosprotokolla: kaanoni ensin.
4. **Testisauma (Diagnoosi).** Onko `runAI`n irrottaminen komponentista puhtaaksi funktioksi
   tavoite, jolloin Botbench voisi ajaa pelin ilman DOMia ja fake-timereita vai hautakivi,
   jolloin `BOTBENCH.md`:hen kirjataan miksi komponentin läpi kulkeva sauma riittää?

## Mitä ei tarkistettu

Selaimessa ei ajettu mitään. H3:n Kultakala-väite on koodipolusta luettu ja todennetaan
previewissä ennen korjausta. Agenttien rivinumeroista tarkistettiin käsin ne jotka on merkitty
tarkistetuiksi; muut ovat agenttien lukemia. i18n-orpolaskenta (3 avainta 652:sta) on alaraja,
koska 13 prefiksikäyttöä merkitsee kaikki prefiksin alla olevat avaimet käytetyiksi.

## Päätökset 3.9.2026

Tommin vastaukset Kysymykset-osioon. Rivi kertoo päätöksen ja sen tilan koodissa.

1. **Katselutilan taso (H2): hard-pakotus on virhe, poistettu kolmesta.** Kaava on nyt
   `botLevelsRef.current?.[i] ?? aiLevelRef.current` kaikissa yhdeksässä pelissä (Kasino
   1047, Koputus 529 ja 656, Seiska 654, 673 ja 788). Seiskan oma ehtolähde
   `players.every(!isHuman)` poistui samalla, joten neljättä muotoa ei enää ole. Läpsyn
   `topLvl()` jäi aluksi, koska se näytti eri asialta. H3:n poiston yhteydessä selvisi
   ettei sitä kutsuta mistään, ei myöskään auditointihetken puussa, joten se oli kuollut
   funktio eikä neljäs sääntö. Se on nyt poistettu. Botbench ei muutu, koska se antaa
   `botLevels`in aina. `allbots-smoke` ajaa nyt kaikki yhdeksän Kisällillä. Testit 132
   läpi. `BOTBENCH.md` ei tarvitse merkintää, koska sääntö on nyt yksi eikä poikkeusta ole.
2. **Asetuksen omistaja (H6): App omistaa kaikki kolme, tehty.** Pelit lukevat `soundOn`-,
   `seeAll`- ja `showLog`-arvon propsista, ja `initSoundOn`- ja `initSeeAll`-kopiot poistuivat
   yhdeksästä signatuurista. App välittää `onSoundOnChange`, `onSeeAllChange` ja
   `onShowLogChange`, ja lokin kytkin merkitsee esiasetuksen `custom`-tilaan samoin kuin
   Asetuksissa. Katselutilan paljastus erotettiin asetuksesta omaksi `revealAll`-tilakseen,
   jonka `startGame` asettaa arvoon `seeAll || allBotsMode`, joten `setDebug(true)` poistui
   yhdeksästä `startBotBattle`sta. Nimi `debugOpen` vaihtui `revealAll`iksi, koska se ei ole
   debug-lippu vaan näkymätila. Konfliktit jotka sulkivat vaihtoehdon "peli omistaa" ovat
   Konfliktit-osiossa alla.

   Todennettu previewissä peli käynnissä. Pelin äänikytkin kirjoitti `jako:soundOn`-arvon
   `true`, Asetuksista tehty muutos vaihtoi pelin napin `🔇`-tilaan ilman remounttia, pelin
   lokikytkin kirjoitti `jako:showLog`-arvon ja `jako:uiPreset`-arvon `custom`, ja Bottien
   Taistelun jälkeen aloitettu ihmispeli avautui paljastus pois päältä eli asetus ei
   likaantunut. Ei konsolivirheitä.
3. **Kultakalan tasapeli (H3): jaettu sija ilman arvontaa, tehty.** Kaanoni ensin, eli
   `KULTAKALA.md` sai Tasapeli-osion. Sen jälkeen koodista poistuivat `DiceRoll`,
   `NoppaVaihe`-typedef, `showDice`, `tiedPlayers`, `M.tieBreaker` ja käyttämättä jäänyt
   `minScore`. Orvot i18n-avaimet poistettiin 23 localesta
   (`games.kultakala.msg.tieBreaker`, `games.kultakala.ui.showResults`, `ui.shared.tie`,
   `ui.shared.points`). `doReveal`in `ranking` laski jaetun sijan jo ennestään
   (`place = count(total < oma) + 1`), joten `GameResult` ei muuttunut. H3:n muu kuollut
   kerros poistettiin samana päivänä, ks. H3 kuollut kerros poistettu 3.9.2026 alla.
4. **Testisauma: molemmat saumat.** `allbots-smoke` jää komponenttisaumaksi
   korrektiusverkoksi ja Botbench siirtyy puhtaalle saumalle määrää varten. Toteutus ei ole
   oma projektinsa vaan H4:n ja H5:n hyväksymiskriteeri, ks. Testisauman vaihtoehdot alla.
   Päätöksestä seuraa yksi uusi vaatimus, eli ristiintarkistustesti joka pitää kaksi saumaa
   samaa mieltä. Ilman sitä päätös rappeutuu kahdeksi eri totuudeksi.

### H1 elinkaaren runko yhtenäistetty 3.9.2026

Yhdeksästä pelistä poistui 921 riviä ja tilalle tuli 501, ja `shared/` kasvoi 297
rivillä. Nettona koodia on 118 riviä vähemmän ja runko asuu yhtenä rakenteena eikä
yhdeksänä kopiona. Tehty neljässä osassa, jokainen erikseen todennettuna.

**Osa 1, moduulitason kopiot ja taukotila.** `AI_NAMES` ja `shuffledAINames` (8 kopiota),
`lblColored` (8) ja `mkDeck` (3 kappaletta jotka olivat merkki merkiltä sama kuin
`helpers.newDeck`) siirtyivät helpersiin. Kasinon oma `lblColored` ei ollutkaan
värillinen vaan sama kuin `helpers.lbl`, joten se vaihtui siihen; Kasinon loki on
tekstiä eikä HTML:ää. Paskahousun `mkDeck` jäi omakseen, koska se ottaa
`hardTwos`-parametrin. Parit `paused`, `allBots` ja `aiDelayMs` sekä `togglePause`
siirtyivät `useAIScheduler`iin. Hookin oma kommentti perusteli niiden jäämistä
"pelikohtaisella logiikalla", jota oli vain Seiskassa, ja se on nyt `onResume`-optio.
Kolme ajautumaa sai yhden säännön: `BOT_RESULT_DELAY` (oli 600, 800, 1200 tai 1800),
`LOG_MAX` (oli 40, 50 tai 60) ja `sndRef`in alkuarvo (oli `true`, `false` tai
`soundOn`). Läpsyn ja Maijan pidempi ihmispolun viive jäi ja on nyt kommentoitu, koska
se on eri asia kuin katselutilan viive.

**Osa 2, loki ja snapshot.** `useGameLog`-hook korvasi yhdeksän `addLog`-kopiota, ja
`GameLog`-komponentti yhdeksän lokipaneelin JSX-kopiota. Pelikohtaista jäi vain
`snapshot`-optio joka lukee sen pelin oman tilan. `enterBotBattle` meni
`useAIScheduler`iin, ja kolmesta pelistä poistui turha `allBotsRef`-asetus jonka
`startGame` teki heti perään. `lastPlayFade` (7 kopiota) ja `button:active` (9)
siirtyivät `index.html`:n globaaliin tyyliin; kopiot olivat ajautuneet, koska
Paskahousu ja Ristiseiska sammuttivat 70 prosentissa muiden 85:n sijaan ja Läpsy
skaalasi 0.96 muiden 0.97 sijaan.

**Osa 3, aloitusnäyttö.** `GameStartScreen` korvasi yhdeksän kopiota. Propseiksi jäivät
tunnus, nimi, otsikon koko pitkillä nimillä ja sallitut pelaajamäärät; pelikohtaiset
sääntövalinnat tulevat lapsina ja `onStart` on propsi, koska Seiska rakentaa
istuinlistan ennen aloitusta. Samalla poistuivat käyttämättömät importit, ja niiden
joukossa `useLayoutEffect` joka oli 9/9 eikä sitä kutsuttu kertaakaan (H8).

**Osa 4, tilarivi.** `GameStatusBar` korvasi yhdeksän kopiota. Kolme pitkää nappityyliä
oli kirjoitettu auki jokaisessa pelissä ja on nyt yksi funktio jonka korostusväri tulee
propsina. Nappien kääre, joka oli ennen vain kahdessa pelissä, on nyt kaikilla.

**Mitä H1:stä jäi.** `startGame` itse jäi pelikohtaiseksi, koska sen sisältö on pelin
alustus eikä runko. Lokiviestin kaksi renderöintitapaa jäivät, eli Kasinon
tekstiviesti ja säännöllinen lauseke muiden HTML:n rinnalle; yhtenäistäminen koskisi
jokaista viestiä yhdeksässä pelissä. Se on kirjattu `GameLog.jsx`:n kommenttiin.

### H3 kuollut kerros poistettu 3.9.2026

Yhdeksän peliä siivottu, 441 riviä pois peleistä ja 92 riviä orpoja i18n-avaimia
23 localesta. Poistettu neljässä osassa.

- **`pendingResult`-kerros kahdeksasta pelistä.** Tila, katselutilan overlay ja
  "Tulokset →" -napit. Seiskan `pendingResult` jäi, koska se on ainoa elävä: siellä
  ihmispeli jättää pelinäkymän paikalleen ja pelaaja klikkaa itse tulokseen. Seiskan
  kääntämätön `Tulokset →` vaihtui avaimeksi `ui.result.results`.
- **Pelien omat tulosruudut kahdeksasta pelistä.** Viisi oli ehdon `screen === 'gameover'`
  takana (Kasino, Koputus, Kultakala, Läpsy, Maija) ja kolme ehdon
  `screen === 'game' && G?.phase === 'gameover'` takana (Moska, Paskahousu, Ristiseiska).
  Jälkimmäistä kolmea auditointi ei nimennyt erikseen, ja ne löytyivät vasta poiston
  aikana. Kaikissa kahdeksassa ihmispolun `onResult` on synkroninen samassa
  tapahtumakäsittelijässä, joten App vaihtaa `GameResult`iin samassa commitissa eikä
  pelin oma ruutu ehdi renderöityä. Mukana poistuivat niitä syöttäneet
  `setScreen('gameover')`-kutsut ja kolme vieritysefektiä jotka vierittivät poistettuun
  ruutuun.
- **Kasinon kuollut haara.** Kun ottelu ratkesi ihmispelissä, JSX tarjosi napin uuteen
  otteluun. App oli jo vaihtanut tulosruutuun, joten haara poistui ja jäljelle jäi
  katselutilan teksti.
- **Läpsyn `topLvl()` ja `finishOrder`.** `topLvl` osoittautui kutsumattomaksi jo
  auditointihetken puussa (`acf80c3`), joten H2:n väite neljännestä muodosta oli väärä:
  se ei ollut neljäs sääntö vaan kuollut funktio. Sen viereinen kommentti väitti muistin
  ylläpidon menevän istuinten korkeimman tason mukaan, mikä ei pidä paikkaansa, koska
  ylläpito on ehdoton ja portti on lukuhetkellä. Kommentti korjattiin. `finishOrder`-tila
  jäi kuolleeksi tulosruudun poiston myötä ja `finishOrderRef` kantaa saman tiedon.
- **Orvot i18n-avaimet.** `ui.result.newWatch`, `ui.start.changePlayers`,
  `ui.shared.spectatorEnded` ja `games.kasino.ui.newMatch` poistettiin 23 localesta.

Todennettu previewissä. Kultakalan ihmispeli pelattiin loppuun ja `GameResult` avautui
sijoituksineen ja paljastettuine kortteineen, ja Ristiseiskan katselutila ajettiin loppuun
ja App:n bottibanneri Toisto-nappeineen tuli näkyviin pelinäkymän päälle. Ei
konsolivirheitä. Testit 132 läpi, typecheck puhdas.

Jäljelle jäi kaksi kohtaa jotka näyttävät samalta mutta kuuluvat muihin havaintoihin.
Kultakalan `drawnFromDeck` asetetaan seitsemän kertaa eikä lueta kertaakaan (H5) ja
Seiskan `setPlayerSlots` ei ole kutsuttu (H8, `PlayerSetup`).

### Kultakalan noppaväitteen todennus (kysymys 3)

Väite tarkentui koodista eikä previewistä, ja se vahvistui. Raportti nojasi yhteen haaraan
(App unmounttaa pelin heti `onResult`ista, joten 2000 ms myöhempi `setScreen('gameover')` ei
ehdi). Toinen haara sulkeutuu rivillä 656: pelin oma tulosruutu on ehdon
`screen === 'gameover' && G && !allBotsRef.current` takana, eli katselutilassa se on
nimenomaisesti suljettu pois. Molemmat polut ovat siis kiinni ja `DiceRoll` on
saavuttamaton kaikissa tiloissa. Preview-ajo ei voi näyttää arvontaa eikä siten todistaa
väitettä; se näyttäisi vain että `GameResult` tulee heti. Siksi todennus tehtiin koodista.

### Konfliktit asetuksen omistajuudessa (kysymys 2)

Kolme asetusta eivät ole sama tapaus, ja kaksi niistä ei kelpaa vaihtoehtoon "peli
omistaa". Kysymyksen kaksi vaihtoehtoa eivät siis päde kaikkiin kolmeen.

- **`seeAll` ei voi olla pelin omistama.** Kaanoni sanoo että cheat-tila ei tallennu
  (`storage.js` 4–5, `CLAUDE.md` 49 ja 188). Sen päälle jokaisen pelin `startBotBattle`
  kutsuu `setDebug(true)` (tarkistettu 9/9), eli peli kirjoittaa arvoa muusta syystä kuin
  käyttäjän valinnasta. Sticky-avain jäisi päälle yhden katselutilan jälkeen. Omistajat
  ovat jo eri mieltä samassa tilassa: App piilottaa seeAll-togglen katselutilassa
  (`!isAllBots`, App 1122) samaan aikaan kun peli pakottaa sen päälle. Seuraus valinnalle
  "App omistaa": katselutilan paljastus pitää erottaa asetuksesta omaksi käsitteekseen
  (`revealAll = seeAll || allBots`), muuten takaisinkutsu jättäisi huijaustilan päälle.
- **`showLog` ei voi olla pelin omistama.** Se kuuluu näkyvyysesiasetukseen
  (`UI_PRESETS` App 778–781, `applyPreset` asettaa sen, toggle on merkitty `preset: true`
  rivillä 1129). Jos avain olisi pelin, App joutuisi silti kirjoittamaan sitä, eli
  omistaja olisi yhä App.
- **`soundOn` on ainoa vapaa valinta.** App ei soita ääniä itse: se lukee arvoa vain
  äänivalitsimen näkyvyyteen (1144 ja 1216). Pelikohtaisille sticky-avaimille on
  ennakkotapaus (`kasino:rules`), mutta ne ovat pelikohtaisia asetuksia ja ääni on yksi
  globaali arvo, joten App-omistus on luonteva.

Konfliktit siis ratkaisevat kysymyksen: **App omistaa kaikki kolme, peli lukee propsin ja
pelin nappi kutsuu takaisin.** Vaihtoehto "peli omistaa" on suljettu kahdelta kolmesta
kaanonin ja preset-koneiston takia. Päätöstä odotetaan silti Tommilta, koska hinta on
kolme uutta takaisinkutsupropsia yhdeksään signatuuriin.

### Testisauman vaihtoehdot (kysymys 4)

Nykytila: Botbench renderöi oikean komponentin jsdomissa, korvaa `Math.random`in
siemennetyllä PRNG:llä, tynkää `AudioContext`in, ajaa fake-timereilla ja lukee tuloksen
`onResult`- ja `onSnapshot`-propseista. Sauma on siis komponentin propsirajapinta.

Kysymys ei ole itsenäinen. `runAI` ei ole useimmissa peleissä valitsija vaan kuljettaja:
se ajastaa, kirjoittaa Reactin tilaa, soittaa äänet ja lokittaa. Puhdas
`chooseMove(G, level)` on jo olemassa moduulitason funktiona seitsemässä pelissä (H7), eli
puuttuva pala on puhdas `applyMove(G, move) → G` ja silmukka. Se on sama työ kuin H5
(vaihe ja vuoro `G`:hen) ja H4 (`commit`). **Kysymys 4 on siis H1, H4 ja H5 -nostojen
hyväksymiskriteeri eikä erillinen projekti.** Jos nostot tehdään kunnolla, puhdas sauma
putoaa niistä ulos. Jos ne tehdään puolittain, ei putoa.

Kolme vaihtoehtoa eikä kahta:

- **Tavoite.** Puhdas sauma antaa nopeuden, ja nopeus on Botbenchissa tarkkuutta: enemmän
  pelejä per pari kaventaa voittoprosentin luottamusväliä. Hinta on H4 ja H5 kokonaan.
- **Hautakivi.** Komponenttisauma testaa sitä ohjelmaa jota pelaaja ajaa, ajastimet mukaan
  lukien. Puhdas sauma testaisi eri ohjelmaa, jolloin ajastinvirhe jäisi kiinni
  ottamatta. Tämä on aito peruste eikä laiskuuden verho.
- **Molemmat.** `allbots-smoke` jää komponenttisaumaksi korrektiusverkoksi ja Botbench
  siirtyy puhtaalle saumalle määrää varten. Hinta on että kaksi saumaa pitää saada
  sanomaan samaa, mikä vaatii oman ristiintarkistustestin. Tämä vaihtoehto ei ollut
  raportin kysymyksessä.

# Porsaanreikäauditointi: botti vastaan pelaaja

Ajettu 8.9.2026 Tommin tilauksesta, HEAD `cc335ea` (1.2.226). Tilaus oli yksi lause:
*"Jako tarvitsee porsaanreikä-tarkistuksen ettei botit pääse tekemään temppuja, mitkä
pelaajilta on estetty, eikä kumpikaan kiertämään sääntöjä."* Liipaisin oli saman päivän
löytö Kultakalasta (`KULTAKALA.md` 8.9.2026, `docs/BOTBENCH.md` › Katselu 8.9.2026): botti
vaihtoi poistopakan kortin suoraan mihin tahansa paikkaan, kun ihminen aloittaa aina
paikasta 5. Vika oli koodissa ensimmäisestä commitista asti ja löytyi vasta katselutilassa.
Kysymys oli, montako samanlaista on muualla.

Menetelmä oli sama kuin `AUDITOINTI-KOMPOSITIO.md`:ssä 3.9.2026: kolme rinnakkaista
tutkinta-agenttia (Kasino, Kultakala ja Läpsy; Moska, Maija ja Koputus; Paskahousu, Seiska
ja Ristiseiska), jokaiselle sama kysymyslista, ja kantavien väitteiden tarkistus käsin
koodista. Käsin tarkistetut on merkitty. Yhtään löydöstä ei ajettu selaimessa, joten
tilanteet ovat koodinluvun päätelmiä eivätkä toistettuja. Rivinumerot ovat HEAD `cc335ea`:n
puusta ja liikkuvat.

Tämä tiedosto vanhenee koodin mukana. Jos tiedosto ja koodi ovat eri mieltä, koodi voittaa.

**Korjaukset 8.9.2026 illalla, Tommin kuittauksella *"tee korjaukset"*.** Kolmetoista
löydöstä korjattiin samana iltana: KA-1, KA-2, L-1, L-2, M-1, KO-1, KO-2 (kaikki kuusi
kohtaa), KO-4, P-1, P-2, S-1, S-2, S-4 ja S-5. Jokainen korjaus on koodissa kommentilla
jossa on löydöksen tunnus ja päivä. Tyyppitarkistus ja 149 testiä menivät läpi. S-1
todennettiin selaimessa (♠4 päällä, valinta ♦3 ♣3 ♠3, loki *3♠ 3♦ 3♣ → 3♣*). Muut on
todennettu koodinluvulla ja testeillä, ei pelaamalla. Kokoelmatason korjausmuoto oli kaksi:
lukko ajastuksen ajaksi (`lockRef` Koputuksessa, `lappuWin` Seiskassa) tai ehto UI:n
vaihe-ehtoon (`awaitingPlayerContinue` Moskassa). Läpsyssä ajastettu jatko lukee
`gRef.current`-tilan ajastushetken argumenttien sijaan. Korjaamatta jäivät D-luokan
symmetriset kohdat ja kuusi kaanonikysymystä alla.
Botbench-tarkistus Koputukselle korjausten jälkeen (N=400, 4.9. kartta hakasuluissa):
hard vs beginner 97,2 % [96,0], hard vs normal 68,1 % [67,9], normal vs beginner 90,0 %
[84,6]. Botit eivät käytä erityiskortteja (KO-3), joten KO-1 ei voi näkyä bottien
välisessä pelissä; kolmannen parin siirtymä tulee KO-4:stä, joka muuttaa pakan
järjestystä rangaistuksen jälkeen. Porras ei kaventunut.

## Neljä luokkaa

Jokainen agentti kävi jokaisen pelin toiminnot läpi samalla listalla: missä pelaajan polku
tarkistaa laillisuuden, kutsuuko botin polku samaa tarkistusta, mitä tilaa botti lukee, ja
onko koodissa sääntö jonka kanoni sanoo toisin.

| Luokka | Mitä tarkoittaa |
|---|---|
| A | Botti tekee siirron joka pelaajalta on estetty (Kultakalan laji) |
| B | Botti lukee tilaa jota kanonin mukaan se ei näe |
| C | Pelaaja pääsee tekemään siirron jonka kanoni kieltää tai jota botti ei voi tehdä |
| D | Koodi ja kanoni ovat eri mieltä tai kanoni on vaiti; koskee kumpaakin |

## Päätulos

**A-luokan löydöksiä on nolla yhdeksässä pelissä.** Kultakalan korjatun vian lajia ei ole
muualla. Kaikissa yhdeksässä botin siirto kulkee saman laillisuusfunktion läpi kuin pelaajan
(`canPlay`, `canSingle` ja `canGroup`, `isPlayable`, `canBeat`, `canPartition`, `getAddable`)
tai botin siirtojoukko on pelaajan sallittujen osajoukko.

**Suunta on päinvastainen kuin tilaus oletti.** Löydökset ovat lähes kaikki C-luokkaa:
pelaajan polulta puuttuu tarkistus jonka botin polku tekee, tai pelaaja pääsee klikkaamaan
ikkunassa jota botilla ei ole. Yksi B-luokan löydös on Koputuksessa.

| Peli | A | B | C | D |
|---|---|---|---|---|
| Kasino | 0 | 0 | 1 | 4 |
| Kultakala | 0 | 0 | 0 | 2 huomiota |
| Läpsy | 0 | 0 | 2 | 2 |
| Moska | 0 | 0 | 1 | 2 |
| Maija | 0 | 0 | 0 | 1 |
| Koputus | 0 | 1 | 1 (kuusi kohtaa) | 3 |
| Paskahousu | 0 | 0 | 3 | 2 |
| Seiska | 0 | 0 | 3 | 3 |
| Ristiseiska | 0 | 0 | 0 | 2 |

## Kokoelmatason löydös: ajastettu vaiheenvaihto

Kuudessa pelissä toistuu sama rakenne. Se selittää suurimman osan C-löydöksistä. Tila
committoidaan ja vaihe jätetään ennalleen. Jatko (`openReaction`, `advanceTurn`,
`giveCenter`, `maybeAIFlip`) ajastetaan `tm`:llä satojen millisekuntien tai sekuntien päähän.
Ikkunan ajan UI:n vaihe-ehto on yhä tosi, joten pelaaja voi klikata toisen kerran tai tehdä
toisen siirron. Botilla ei ole klikattavaa polkua, joten ikkuna on yksinomaan pelaajan
käytettävissä. Sama mekanismi eri nimillä:

| Peli | Ikkuna | Mitä siinä voi tehdä |
|---|---|---|
| Koputus | 200–2800 ms | vaihtaa nostetun kortin kahteen paikkaan, poistaa saman kortin kahdesti, katsoa J:llä kaksi korttia, vaihtaa Q:lla kahdesti, K-ohituksen jälkeen kurkata |
| Seiska | 4000 ms (Lappu) | lyödä toisen kortin ja voittaa ennen muiden vuoroa |
| Moska | rajaton (Seuraava kierros -nappi) tai 600 ms | oton jälkeen siirtää tai kaataa vanhalla pöydällä |
| Läpsy | 100–1600 ms | väärän läpsyn sakko peruuntuu kun ajastin kirjoittaa vanhan pinon päälle |
| Kasino | ei ikkunaa | `commit(phase 'idle')` sulkee tuplaklikin, ks. Ei löydöstä |
| Kultakala | ei ikkunaa | vartijat lukevat `gRef.current`ia |

`AUDITOINTI-KOMPOSITIO.md` H7 sanoo että bottisiirto ajastetaan `schedMovella` ja `tm` on
vain UI:lle. Tämä löydös on sen jatko: `tm`:llä ajastettu tilasiirtymä on UI:ta vain jos
vaihe on jo vaihdettu ennen ajastusta. Korjaus on yksi muoto joka toistetaan kuudessa
paikassa, ei kuusi eri korjausta.

## Löydökset peleittäin

Merkintä **[tarkistettu]** tarkoittaa että rivit on luettu käsin koodista tämän tiedoston
kirjoittajan toimesta. Muut ovat agentin raportin varassa.

### Kasino (`src/games/Kasino.jsx`, `KASINO.md`)

**KA-1, luokka C [tarkistettu, korjattu 8.9.2026].** Pelaaja voi käyttää oman rakennelman kaappaajan muuhun
kaappaukseen ja jättää rakennelman roikkumaan. `hasOwnBuild`-tarkistus on vain
parirakennelmassa (1067) ja jätössä (1084), ei pöytäkaappauksessa (1097) eikä
pöytäkorttirakennuksessa (1066). Kanoni rivillä 21: rakennelma on kaapattava seuraavalla
vuorolla. Botti lunastaa oman rakennelmansa aina ensimmäisenä (319–322). Jatkoseuraus: kun
kaappaaja on käytetty ja pöytä tyhjenee, pelaajalla ei ole yhtään laillista siirtoa ennen
kuin vastustaja varastaa rakennelman.

**KA-2, luokka D [tarkistettu, korjattu 8.9.2026].** Pakkosiirto (yksi kortti, tyhjä pöytä) lukee vain
`g2.table.length` (768), ei rakennelmia. Kun pöytä on tyhjä mutta vastustajan rakennelma on
pöydällä ja pelaajan viimeinen kortti täsmää siihen, pakkosiirto jättää kortin pöytään
varastamisen sijaan. Botti samassa tilanteessa varastaa. Ihmiseltä estetään sallittu.

**KA-3, luokka D.** Tikkien nollaus (903–905): kun kaikilla muilla on vähintään yksi tikki,
kaikkien tikit nollataan. Kanoni 44–46 kuvaa vain pistelaskun ehdon. Symmetrinen lisäsääntö
jota kanoni ei mainitse.

**KA-4, luokka D, epäily.** Erikoiskortti ei kaappaa samanarvoistaan: `handVal` antaa
ässälle 14 ja `tableVal` 1 (52–53), joten A kädessä ei kaappaa A:ta pöydältä, ♠2 ei
kakkosta eikä ♦10 kymppiä. Kanoni 12 sanoo oman kortin arvon vastaavan pöydän yhden kortin
arvoa. Symmetrinen. Voi olla tarkoitettu.

**KA-5, luokka D.** Kierroksen lopussa pöydälle jääneet kortit ja purkamattomat rakennelmat
menevät viimeiselle kaappaajalle (794–803). Kanoni on vaiti. Vakiosääntö, symmetrinen.

Näkyvyys: botti lukee kaikkien pelaajien `captured`-kasat (150–158). Kanoni 66 sanoo kasat
näkyviksi mutta 76–78 sanoo ettei AI laske niitä. Kanoni on ristiriidassa itsensä kanssa,
koodi ei riko näkyvyyttä.

### Kultakala (`src/games/Kultakala.jsx`, `KULTAKALA.md`)

Ei A-, B- eikä C-löydöksiä. Tänään korjatun `aiDoSwap`-oikaisun kaltaista suoraa
`row[i] =` -kirjoitusta ei ole muualla. Kaksi huomiota.

**K-1, luokka D.** Oppipojan ketjuraja 3 koskee vain pakasta nostettua korttia (400);
poistopakasta nostettu ketjuttaa ilman rajaa (391). Kanoni ei mainitse ketjurajaa. Heikkous
jota kanoni ei dokumentoi ja joka on epäjohdonmukainen nostolähteen mukaan.

**K-2, luokka C, ei hyödynnettävissä.** `humanSwapRow` (484–514) ei tarkista että
`rowIdx === g.swapIdx`. Ainoa kutsu on `swapIdx`:llä (736) eivätkä rivin kortit ole
klikattavia. Vartija puuttuu funktiosta itsestään. Jos rivin kortit tehdään joskus
klikattaviksi, tämä avaa saman oikaisun joka botilta suljettiin.

### Läpsy (`src/games/Lapsy.jsx`, `LAEPSY.md`)

**L-1, luokka C [tarkistettu, korjattu 8.9.2026].** Ihminen jolla ei ole kortteja voi läpsäistä täsmäyksessä ja
palata peliin kasan kanssa. `humanSlap`in täsmäyshaara (444–445) ei tarkista
`piles[0].length`; tyhjän pinon tarkistus on vain väärän läpsyn haarassa (431). Botti
ohittaa tyhjän pinon (354). 👋-nappi on aina käytössä (702). Kanoni 263–264: pudonneet
jatkavat sijoituksista poistumisjärjestyksessä. Lisäseuraus: `fullOrder` (521–523) voi
sisältää saman pelaajan kahdesti.

**L-2, luokka C [korjattu 8.9.2026].** Väärän läpsyn sakko peruuntuu kun ajastettu bottisiirto kirjoittaa tilan
vanhoista argumenteista. `doFlip` ja `giveCenter` laskevat uuden tilan parametreistaan
eivätkä `gRef.current`ista (247–257, 478, 505). Jos ihminen läpsäisee väärin raossa
(500 ms, haasteessa 100–180 ms, epäonnistuneen haasteen 1600 ms), sakkokortti palaa pinoon
kun ajastin kirjoittaa vanhan tilan päälle. Myöhästynyt läpsy on Läpsyn tavallisin virhe,
joten rako osuu oikeassa pelissä. Sama mekanismi kuin kokoelmatason löydöksessä.

**L-3, luokka D.** Kaksintaistelun puolitus (160–174, 491–500): kahden pelaajan tilanteessa
30 s kuluttua seuraava kasan tyhjennys puolittaa pinot. Kanoni ei mainitse sääntöä.
Symmetrinen. Sivuhuomio: `knownBottoms` (485–488) ei päivity puolituksessa, joten Mestarin
muisti on sen jälkeen väärässä.

**L-4, luokka D, tulkinta.** Kanonin reaktioviivetaulukko (281) ei sisällä
`anticipationBonus`- ja `predictBonus`-vähennyksiä (374–376), joten Mestarin alaraja on
150 ms eikä 500 ms. Kanoni nimeää kyvyt muttei niiden millisekuntivaikutusta.

### Moska (`src/games/Moska.jsx`, `MOSKA.md`)

**M-1, luokka C [tarkistettu, korjattu 8.9.2026].** Oton jälkeen pöytä ja käsi jäävät klikattaviksi.
`resolveRound` (593) jättää vaiheen `defend`-tilaan ja puolustajan ennalleen. `isMyDef`
(1093) ei tarkista `awaitingPlayerContinue`a. Vain Otto-nappi piilotetaan. Kun ihminen ottaa
7♠:n, `moskaCanPass` on tosi (juuri nostettu 7♠ kädessä, `passChain` tyhjennetty) ja Siirrä
vie saman kortin pöytään toistamiseen. Vaihtoehtoisesti pöydän kortin voi kaataa kädestä,
jolloin otto muuttuu puolustusvoitoksi. Ikkuna on rajaton kun Seuraava kierros -nappi on
käytössä. Botilla vastaavaa polkua ei ole.

**M-2, luokka D.** Siirto (passaus) ei valvo puolustajan käden kokoa (`doPass` 665–684),
vaikka hyökkäyspolku valvoo (895, 162). Kanonin siirtoehdot eivät toista rajaa. Ihminen voi
siirtää monta korttia (`selPass` ei rajaa määrää, 939–942), botti yhden (849). Sopimuskysymys.

**M-3, luokka D, epäily.** Kanonin siirtoehto 3 puhuu kortista yksikössä. Jos yksikkö on
tarkoitettu, ihminen saa enemmän kuin botti. M-2:n toinen puoli.

### Maija (`src/games/Maija.jsx`, `MAIJA.md`)

Ei A-, B- eikä C-löydöksiä. Hyökkäys, kaato, osittainen kaato ja otto kulkevat samoista
funktioista. Ajoitusikkunassa (1200 ms) pöytäkortit eivät ole klikattavia eikä ottonappeja
renderöidä.

**MA-1, luokka D, lievä.** Näkyvyysosio ei mainitse poistopakkaa, jota Mestarin
valttihyökkäys lukee (76–78). Poistopakan kortit ovat olleet pöydällä näkyvissä, joten kyse
on muistista. Kanonin kaksi osiota eivät sano samaa.

### Koputus (`src/games/Koputus.jsx`, `KOPUTUS.md`)

**KO-1, luokka B [tarkistettu, korjattu 8.9.2026].** Botti lukee todellisen kortin paikasta jonka ihminen
vaihtoi Q:lla tai K:lla botin näkemättä. `handleQTarget` (455–465) ja `handleKSwap`
(484–497) vaihtavat kortin botin paikkaan koskematta botin `known`-joukkoon. Botin
päätökset lukevat `known`-indekseistä todellisen arvon (koputusarvio 85, poistopäätös
100–102, vaihtokohde 111–114, reaktio 522). Viesti on nimenomaan `swapDoneHidden`. Botti
lyö näkemättömän kortin oikein reaktiossa ja laskee koputusarvionsa kortista jota se ei ole
nähnyt. Peilikuva: Mestarin neuvo laskee Heron `known`-joukosta samat arvot. Heron
`known` sisältää Q-vaihdon jälkeen paikan jota Hero ei enää tunne. Vuoto neuvon kautta.

Tämä on auditoinnin ainoa löydös jossa botti saa tietoa jota sillä ei kanonin mukaan ole.
Se ei ole tahallinen kurkkaus vaan päivittämättä jäänyt muisti, mutta vaikutus on sama.

**KO-2, luokka C [tarkistettu humanSwap, korjattu 8.9.2026], kuusi kohtaa.** Viivästetty vaiheenvaihto jättää
toiminnot kahdesti klikattaviksi: `humanSwap` (416–429, 600 ms), `humanDiscard` (430–439,
200 ms), `handleJ` (441–448, 2800 ms), `handleQTarget` (455–467, 800 ms), `handleKSkip`
(498–502, 800 ms) ja `handleKSwap` (484–497, 1200 ms). Pahin on `humanSwap`: nostettu kortti
kahteen paikkaan ja kaksi korttia poistopakkaan, jolloin sama kortti on pöydässä kahdesti.
Kanoni: Jätkä yhden kortin, Rouva yhden vaihdon, Kuningas yhden kortin. Sama mekanismi kuin
kokoelmatason löydöksessä.

**KO-3, luokka D.** Botti ei koskaan käytä erityiskortteja (690–695 ei haaraudu J/Q/K:lla),
ihminen käyttää. Lisäksi ihminen voi nostaa J/Q/K:n poistopakasta ja laukaista sen heti
(397–402, 435–437). `PELIKANONIT.md` kohta 2 nimesi laukeamisehdon aukoksi; tämä täydentää:
aukko on epäsymmetrinen, koska vain toinen osapuoli käyttää sitä.

**KO-4, luokka D, symmetrinen [korjattu 8.9.2026].** Rangaistuksen toinen kortti katoaa pakasta kun tilaa on
vain yhdelle (573–575, 619–621): `deck.slice(2)` riippumatta siitä montako sijoitettiin.

**KO-5, luokka D, lievä.** Ihmisen viimeinen reaktiokortti päättää pelin heti (596–609),
botin ei (535–543). Käytännön vaikutus pieni, polku eri.

### Paskahousu (`src/games/Paskahousu.jsx`, `PASKAHOUSU.md`)

**P-1, luokka C [tarkistettu, korjattu 8.9.2026].** Pelaaja voi lyödä eriarvoisia kakkosia yhtenä ryhmänä.
Ryhmäehto (909) vertaa vain numeroa `r`, ei arvoa `v`; vakiosäännöllä ♥2 on 2 ja ♠2 on 15
(43). `humanPlay` tarkistaa vain `selected[0]` (917). Botti vaatii saman `r`:n ja `v`:n
(257). Kädessä ♥2 ja ♠2: kasaan menee molemmat, päällimmäiseksi ♠2, kahdesta eriarvoisesta
kortista yhdellä vuorolla.

**P-2, luokka C [korjattu 8.9.2026].** Vaihdon oletusnappi lyö kaikki eligible-kortit kerralla riippumatta
arvosta (1166). Eligible kootaan kortti kerrallaan (573–584), joten se voi sisältää eri
arvoja. Botin `aiSwapChoice` (273–275) palauttaa aina yhden arvon ryhmän.

**P-3, luokka C [ratkaistu 8.9.2026, ei koodimuutosta; vahvistettu uudelleen 9.9.2026].**
Vapaus on sääntö eikä aukko, ks. päätöstaulukon kohta 2 ja `PASKAHOUSU.md` kohta 6. Tommi
vahvisti kasan noston osuuden 9.9.2026 omin sanoin, kun tämä lohko oli jäänyt merkitsemättä
ja johti kysymään jo päätettyä. Alkuperäinen havainto sellaisenaan:
Pelaaja saa koputtaa tai nostaa kasan vaikka kädessä on
pelattava kortti (`canKnock`, `canTake` 980–981; `myPlayable` lasketaan muttei rajoita).
Kanoni: jos ei voi pelata, nosta. Botti koputtaa vain kun ei ole pelattavaa (879), ja
Mestarin neuvo samoin (301). Tilanne: päällä K, kädessä ♠2 ja pikkukortteja, pelaaja ei halua
tuhlata mustaa kakkosta ja kokeilee pakkaa, joka voi kaataa kasan ilmaiseksi. Onko
vapaaehtoinen koputus tarkoitettu sääntö, on Tommin päätös.

**P-4, luokka D, matala.** Neljä samaa ei kaada jos arvo on 2, 10 tai A (81). Kanonin
kaatotaulukko ei rajaa. Kympillä ja ässällä merkityksetön, `hardTwos`-kotisäännöllä neljä
kakkosta ei kaada. Symmetrinen.

**P-5, luokka D, kanoni epätarkka.** Rangaistuskortti otetaan kasasta (733 `pile.pop()`),
kanoni sanoo "nostaa" täsmentämättä mistä. Symmetrinen.

### Seiska (`src/games/Seiska.jsx`, `SEISKA.md`)

**S-1, luokka C [korjattu 8.9.2026, todennettu selaimessa].** Pelaaja voi jättää yhdistävän kortin päällimmäiseksi ryhmälyönnissä.
`canGroup` (40) vaatii vain että jokin kortti täsmää. `humanToggle` (888–896) ottaa
ensimmäiseksi minkä tahansa. Kanoni: yhdistävä kortti pelataan ensin ja jää alimmaiseksi.
Päällä ♠5, kädessä ♠9 ja ♥9: klikkaa ensin ♥9 ja sitten ♠9. Päällimmäiseksi jää ♠9.
Pelaaja pääsi ♥9:stä eroon maata vaihtamatta. Botti järjestää yhdistävän ensimmäiseksi
(119–120). Ässäbonuksessa ihmiseltäkin vaaditaan järjestys (904).

**S-2, luokka C [tarkistettu, korjattu 8.9.2026].** Lapun 4 sekunnin ikkunan aikana pelaaja voi tehdä toisen
siirron. `pendingLappu` asetetaan ja `advanceTurn` ajastetaan 4000 ms päähän (711–713), mutta
vaihe pysyy `play`-tilassa ja `canAct` (998) on tosi. Päällä ♥5, kädessä ♠5 ja ♠9: lyö ♠5,
Lappu-banneri, lyö ♠9 ja voita ennen kuin kukaan ehti vuoroon. Lisäseuraus: toinen `doPlay`
kutsuu `advanceTurn`ia, jonka `applyLappu` sakottaa jo voittaneen. Ajastin kutsuu sitä
vielä kerran. Sama ikkuna `humanChooseSuit` (941) ja `humanSkipAceBonus` (927) -poluilla.

**S-3, luokka C [ratkaistu 8.9.2026, ei koodimuutosta].** Vapaus on sääntö eikä aukko, ks.
päätöstaulukon kohta 2 ja `SEISKA.md` kohta 4. Alkuperäinen havainto sellaisenaan:
Pelaaja saa nostaa vaikka kädessä on pelattava kortti
(`canDraw` 1002). `hasValid` (1001) lasketaan muttei käytetä missään. Kanoni: jos ei pysty
lyömään, on pakko nostaa. Botti nostaa vain kun ei ole siirtoa (868). Sääntötulkinta Tommille.

**S-4, luokka D, botin eduksi [korjattu 8.9.2026].** Kolmannen epäonnistuneen noston jälkeen ihmiseltä viedään
laillinen siirto, botilta ei. Ihmisen haara (799–801) tarkistaa vain nostetun kortin, botin
haara (783–786) koko käden. Kanoni: jos kolmannenkaan noston jälkeen mikään ei käy, vuoro
siirtyy. "Mikään" tarkoittaa kättä.

**S-5, luokka C, käänteinen B [korjattu 8.9.2026].** Loki paljastaa ihmiselle botin käteen jääneen kortin:
`aiDrawFail` (785, 788, 791) lokittaa kortin ilman `revealAll`-ehtoa, kun `aiDraws` (752)
on ehdollinen. Sama ässärangaistuksessa (507). Kanoni: muiden kädet ovat piilossa.
Kortinlaskijalle täsmällistä tietoa vastustajan kädestä.

**S-6, luokka D.** Kanonin lupaama kortinlaskuri puuttuu koodista. `aiBestPlay` (114–172)
ei lue `discardPile`a; tasojen ainoa ero on `aiShouldFumble` ja `pickBestAce`. Kanoni
kuvaa Kisällille kortinlaskurin ja Mestarille kasan muistin. Korjataanko koodi vai kanoni.

### Ristiseiska (`src/games/Ristiseiska.jsx`, `ristiseiskaEngine.js`, `RISTISEISKA.md`)

Ei A-, B- eikä C-löydöksiä. Lyönti, passaus, bonusvuoro ja pantin anto kulkevat saman
moottorin läpi (`applyMove` 323). Kummankin kuljettajan laillisuustarkistus on sama.
Puhtain yhdeksästä.

**R-1, luokka D.** Antajaksi ei kelpaa pelaaja jolla on täsmälleen yksi kortti (moottori
110, `hand.length > 1`). Kanoni: antaja on edellinen pelaaja jolla on kortteja.
Todennäköisesti tarkoitettu (estää voiton antamalla), mutta kanoni ei sano sitä.

**R-2, luokka D, lievä.** Bottien välinen panttikortti näkyy ihmisen lokissa (383–385).
Kanoni ei sano onko pantti avoin vai suljettu siirto.

## Mitä ei tarkistettu

Yhtään löydöstä ei ajettu selaimessa. Ajoitusikkunat on luettu koodista, ei mitattu.
Näkyvyystarkistus koski botin lukemaa tilaa; se ei kata Mestarin neuvon lukemaa tilaa
muuten kuin KO-1:n peilikuvana. UI-tekstien vastaavuutta kanoniin ei tarkistettu
(`PELIKANONIT.md`:n rajaus). Kolme agenttia luki 9 874 riviä pelikoodia ja 976 riviä
kanonia; kattavuus on toimintotasolla eikä rivitasolla. Jokaisen agentin raportissa on
"Ei löydöstä" -osio jonka sisältö on yhtä lailla tulos.

## Päätökset jotka odottavat Tommia

**Kaikki kuusi ratkesivat 8.9.2026 illalla.** Kultakalan Oppipojan kynnys (+3 → +5,
`docs/BOTBENCH.md`) ratkesi samalla. Kaanoni kirjattiin ensin, koodi sen jälkeen, ja
Botbench ajettiin neljälle muuttuneelle pelille (tulos alla). Päätökset ja kodit:

| Kohta | Päätös | Kaanoni | Koodi |
|---|---|---|---|
| 1 kokoelmatason korjaus | peli kerrallaan, sama muoto | ei muutosta | tehty aiemmin illalla |
| 2 P-3 ja S-3 vapaaehtoinen nosto | sallittu kaikille | `PASKAHOUSU.md` kohta 6, `SEISKA.md` kohta 4 | ei muutosta; botti ei käytä vapautta, Botbench-ehdokas |
| 3 S-6 kortinlaskuri | koodi kanonin mukaiseksi | `SEISKA.md` Tasot, mitä laskuri tekee | `pickBySeen` Seiskassa |
| 4 KA-4 ässän arvo | tarkoitettu | `KASINO.md` Kaappaaminen | ei muutosta |
| 5 M-2 ja M-3 siirron korttimäärä | sama vapaus botille | `MOSKA.md` ehto 3 ja taulukko | `aiPickPass` palauttaa kaikki samanarvoiset |
| 6 KO-3 erityiskortit boteille | puute | `KOPUTUS.md` Erityiskortit ja taulukko | `koAISpecial` Koputuksessa |

Alkuperäinen lista säilyy alla historiana.


1. **Kokoelmatason korjaus vai peli kerrallaan.** Ajastettu vaiheenvaihto (Koputus, Seiska,
   Moska, Läpsy) on yksi muoto. Korjaus on vaihtaa vaihe ennen ajastusta tai lukita
   klikkaukset `awaitingRef`-lipulla, sama tapa joka Kasinossa jo on (`commit(phase 'idle')`).
2. **P-3 ja S-3, vapaaehtoinen nosto.** Kanoni sanoo "jos ei voi pelata, nosta". Onko
   pelaajan vapaaehtoinen nosto tai koputus sääntö vai aukko? Botti ei tee sitä kummassakaan.
3. **S-6, Seiskan kortinlaskuri.** Kanoni lupaa kyvyn jota koodissa ei ole. Koodi vai kanoni.
4. **KA-4, ässän arvo Kasinossa.** Kiinteä 14 kädessä ja 1 pöydällä estää A:n kaappaamasta
   A:ta. Tarkoitettu vai ei.
5. **M-2, siirron korttimäärä Moskassa.** Kanonin siirtoehto ei toista puolustajan käden
   rajaa. Onko raja tarkoitettu myös siirrolle.
6. **KO-3, erityiskortit boteille.** Kanoni ei rajaa erityiskortteja ihmiselle, mutta botti
   ei käytä niitä. Onko se taso-ominaisuus vai puute.

Selvät korjaukset ilman kaanonikysymystä tehtiin 8.9.2026 illalla, ks. alku. Kohta 1 yllä
ratkesi samalla: korjaus tehtiin peli kerrallaan mutta samalla muodolla.

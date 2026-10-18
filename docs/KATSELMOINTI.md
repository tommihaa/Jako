# Katselmointikriteerit Jaon omasta bugihistoriasta

Yleinen katselmointi etsii yleisiä vikoja. Tämä lista kertoo mistä Jako on oikeasti hajonnut,
jotta AI-katselmointi (`/code-review`) katsoo niitä kohtia ensin. Menetelmä on Aleksi Partasen
(AI Kanava -podcast, syyskuu 2026): kriteerit johdetaan omista korjauksista eikä yleisestä
tarkistuslistasta.

**Aineisto.** Kaikki Jaon commitit 29.3.–8.9.2026, joiden otsikossa on fix, korjaa tai
regressio: 57 committia. Niistä 15 koski pelkkiä dokumentteja ja kolme tekstin muotoa
(kommentti, ajatusviivat, sisennys), joten koodikorjauksia jäi 39. Luokittelu on luettu
commitviesteistä ja muutetuista tiedostoista. Suluissa on luokan committien määrä, ja yksi
commit voi kuulua useaan luokkaan. Luokkien ulkopuolelle jäi kymmenkunta yksittäistä
UI-korjausta, joilla ei ole toistuvaa muotoa.

**Käyttö.** Katselmoija lukee tämän ennen diffin katselmointia ja käy läpi ne kriteerit
joita diff koskee. Löydös merkitään kriteerin tunnuksella (K1–K8), jotta nähdään mitkä
kriteerit tuottavat osumia ja mitkä ovat kuolleita.

## Jo deterministisesti vartioitu

Näitä ei tarvitse etsiä käsin. Testiportti (`Kaanon/tyokalut/testiportti.sh`) ajaa ne ennen
jokaista koodicommittia.

| Vika historiassa | Vartija |
|---|---|
| Bottisiirto ohittaa tauon (`49cd5c3`, `086cde0`) | `test/taukovahti.test.js` |
| Botti ja neuvo valitsevat eri siirron | `test/neuvo-sauma.test.js` |
| Lokaalin avain eri muodossa kuin fi:ssä (`8b50bcc`) | `test/i18n-parity.test.js` |
| Näkyvä kortti kahdessa kädessä, negatiivinen määrä | `test/allbots-smoke.test.jsx` |
| Tyyppivirhe | `tsc --noEmit` |
| Maasymboli kuuluu ruudunlukijalle emojina (auditointi J-8) | `test/ruudunlukija-maat.test.jsx` |
| Sama App-tason näkymissä: yläpalkki, tulosruutu, tilastot (J-37) | `test/ruudunlukija-app.test.jsx` |
| Botin viesti nimeää piilokortin (J-36) | `test/kultakala-piilokortit.test.jsx`, `test/koputus-piilokortit.test.jsx` |

Tauon vartija katsoo vain `aiTmr.current = tm(` -kirjoitusmuodon. Uusi ajastustapa voi
kiertää sen, joten K3 koskee yhä ajastettuja ikkunoita.

## Kriteerit

### K1. Sääntö luetaan pelin kanonista, ei muistista (7)

Kun diff koskee sääntölogiikkaa, vertaa sitä kyseisen pelin `PELI.md`:hen (`KASINO.md` jne.).
Lue ensin `docs/PELIKANONIT.md`, koska seitsemässä kanonissa on nimettyjä ristiriitoja.
Tarkista erityisesti:

- Vertailu tehdään kortin arvolla (`c.v`) eikä merkinnällä (`c.r`). Musta kakkonen on
  Paskahousussa arvoltaan 15 ja punainen 2 (`a5e1bf4`).
- Botti noudattaa samaa laillisuutta kuin ihminen. Seiskan ässäbonuksessa botti sai laskea
  ensin kortin joka ihmiseltä oli kielletty (`10a72fa`, `5abd81c`).
- Pistelasku ja voittoehto toteutetaan kanonin esimerkeillä, ei yleistyksellä (`624d412`,
  `ca3fbf6`).

Historia myös: `2c483a7`, `7d5b8dc`.

### K2. Vaiheen loppu ja peruutus laskevat johdetun tilan uudelleen (6)

Kun vaihe päättyy tai siirto vaihdetaan tai perutaan, jokainen siitä johdettu lippu lasketaan
nykyisestä tilasta eikä jätetä edellisestä voimaan. Kysy:

- Julistetaanko torjunta vain kun jokainen pöytäkortti on lyöty (`00062ff`)?
- Saako puolustaja vuoron lisäysvaiheen jälkeen (`444571b`, `e67e6d0`)?
- Jääkö `skipNext` tai vastaava rangaistus voimaan, kun sen aiheuttanut kortti palasi käteen
  (`bd57d29`)?
- Voiko nollan kortin pelaaja jäädä aktiiviseksi (`00e0e42`, Moskan lykätty nosto)?
- Tyhjeneekö botin muisti kun kortti vaihtaa paikkaa (`8fa7fbf`, Koputus KO-4)?

Jumitilan voi kartoittaa listaamalla tilamuuttujien yhdistelmät ja etsimällä ne arvot, joilla
mikään ulospääsyn ehto ei osu. Esimerkiksi `i > 0` ja `i === 0` eivät kata arvoa `i = -1`.

### K3. Ajastettu ikkuna on lukittu pelaajalta (1 commit, 13 löydöstä)

Kun tilasiirtymä ajastetaan (`tm`, `schedMove`, `schedAI`), UI:n vaihe-ehto on tosi koko
odotuksen ajan. Pelaaja voi klikata väliin, ellei ikkunaa ole lukittu (`lockRef`,
`awaitingPlayerContinue` tai vastaava). Ajastimen takaisinkutsu lukee tilan `gRef.current`:sta
eikä sulkeuman muuttujasta. Historia: `8fa7fbf` (Kasino, Läpsy, Moska, Koputus, Paskahousu ja
Seiska). Tausta: `docs/AUDITOINTI-PORSAANREIAT.md`.

### K4. Kortit eivät katoa eivätkä monistu (1 commit, 4 vikaa)

Kun diff koskee jakoa, pakan läpikäyntiä tai kortin siirtoa pinosta toiseen, laske että kaikki
52 korttia ovat jossain. Savutesti ei näe nostopakkaa eikä keskuspinoa, joten tämä jää
katselmoinnille. Historia `00e0e42`: Ristiseiskan kolmen pelaajan jaossa jäi kortti jakamatta,
Seiskan aloituskorttiluuppi hävitti seiskat ja ässät, Koputuksen reagoitu kortti katosi ja
Läpsyn sakkokortti jäi lukittuun pariin.

### K5. Neuvon perustelu nimeää saman avaimen kuin koodi (3)

Neuvo-saumatesti takaa että neuvo ja botti valitsevat saman siirron, mutta perustelutekstiä se
ei lue. Kun diff muuttaa bottilogiikan lajitteluavainta, etsi lokaaleista neuvoteksti joka
lupaa vanhaa avainta. Maija lupasi "eniten matalaa" vaikka koodi valitsi pisimmän maan, ja
Moska lupasi pienimpiä ei-valtteja vaikka ensisijainen avain oli `goneCount` (`283c7c6`).
Historia myös: `7d5b8dc`, `ece3d2d`. Kirjanpito: `docs/MESTARIN_NEUVO.md`.

### K6. Muutos yhdessä pelissä koskee yhdeksää (5)

Elinkaaren runko on yhdeksänä kopiona (`docs/AUDITOINTI-KOMPOSITIO.md`). Kun diff muuttaa
propsia, apuria tai alustusta yhdessä pelissä, hae sama kohta muista kahdeksasta. Propsin
jakaminen kahtia rikkoi lokin oletuksen kaikissa yhdeksässä, koska jokainen alusti sen
vanhasta propsista (`useState(hints)`, `b0f4ebd`). `tm()`-apurin rekursio oli kaikissa
yhdeksässä yhtä aikaa (`086cde0`). Historia myös: `1fa31f6`, `9c486a0`, `283c7c6`.

### K7. Katselutilan haara on toinen koodipolku (4)

`allBots`-tila renderöi osin eri komponenteilla kuin ihmisen peli. Kun diff lisää näkyvän
ominaisuuden tai korostuksen, tarkista että se on kytketty myös katselutilan haaraan.
Koputuksen `showAIKnown`-korostus ei koskaan aktivoitunut katselutilassa, koska se ei käytä
`PlayerGrid`iä (`283c7c6`). Kultakalan pelaaja 0 puuttui bottien joukosta (`9c486a0`).
Historia myös: `1fa31f6`, `ea70ae3`.

### K8. Näkymä: merkkijono, rinnakkaistaulukko ja varattu tila (8)

- Väritetty kortti renderöidään JSX:nä eikä HTML-merkkijonona (`63ef915`, `2d473b3`,
  `ea70ae3`).
- Kaksi rinnakkaista taulukkoa samalla indeksillä ajautuu. Tulossa-lista näytti väärän
  tilan, kun `todoItems` ja `TODO` olivat eri järjestyksessä (`466ca00`).
- Suomenkielinen UI-teksti ei ole kovakoodattuna `.jsx`:ssä vaan `t()`-avaimena (`00e0e42`).
- Komponentti määritellään moduulitasolla. Komponentin sisällä määritelty komponentti
  remountataan joka renderillä (`00e0e42`).
- Ehdollinen sisältö varaa tilansa, ettei näkymä nytkähdä. Seiskan ja Paskahousun näkymä
  hyppäsi kun korttiviuhka korvautui tyhjällä (`283c7c6`, `1d70a41`, `c5b32c0`).

## Yksittäiset, tarkista vain jos diff koskee

- Buildissa ajettu git-komento antaa Vercelin matalassa kloonissa väärän arvon (`3c8854e`).
- `public/`-kansioon jäänyt luonnos menee tuotantoon (`00e0e42`, `color-preview.html`).
- Hakupuu ilman kokorajaa jäätyy isolla pöydällä (`00e0e42`, Kasinon vihje).
- Bottikyky päätyy väärälle tasolle. Maijan Oppipoika sai Kisällin monikorttihyökkäyksen
  (`aa5f94c`). Tasomuutos mitataan Botbenchillä (`docs/BOTBENCH.md`).

## Ylläpito

Kun uusi fix-commit ei osu mihinkään kriteeriin, lisää se sopivaan luokkaan tai uudeksi
kriteeriksi. Kriteeri joka ei ole tuottanut osumaa kolmessa katselmoinnissa ja jonka luokassa
ei ole uusia korjauksia, on poistoehdokas.

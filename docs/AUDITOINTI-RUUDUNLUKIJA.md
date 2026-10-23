# Ruudunlukija-auditointi: merkinnät virallisia lähteitä vasten

Ajettu 14.10.2026 Tommin tilauksesta, HEAD `4452258` (Tilanne-komento, keskeneräinen).
Liipaisin, lähteet ja menetelmä ovat samat kuin Itun auditoinnissa
(`SanaMix/docs/AUDITOINTI-RUUDUNLUKIJA.md`): koodinluku [APG](https://www.w3.org/WAI/ARIA/apg/)n,
[WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/)n ja [ARIA in HTML](https://www.w3.org/TR/html-aria/)n
mukaan, ei kuuntelua ruudunlukijalla. Yhteiset komponentit (`src/shared/`, `App.jsx`) katsottiin
kokonaan. Pelikohtaisista tiedostoista haettiin vain ARIA-merkinnät. Rivinumerot ovat HEAD
`4452258`:n puusta.

Kunnossa: ilmoitusjono (`shared/Announcer.jsx`), kortin nimi puhuttuna ja maa sanana
(`shared/Card.jsx:69–73`). Klikattava kortti noudattaa APG:n button-mallia (`role="button"`,
`tabIndex`, Enter ja Space).

## Löydökset

**J-1. Sivun kieli on aina suomi.** Tila: korjattu 14.10.2026, 1.2.233. `LangProvider` (`shared/i18n.jsx`) kirjoittaa aktiivisen kielen `<html lang>`:iin joka vaihdossa. Todennettu dev-previewissä: `?lang=de` antaa `de`, ja kielivalitsimesta vaihto ruotsiin ja suomeen antaa `sv` ja `fi`. Alkuperäinen havainto: `index.html` on `<html lang="fi">`, eikä
koodi muuta sitä kielenvaihdossa (haku `documentElement` ja `lang =` `src/`:stä: 0 osumaa).
Ruudunlukija valitsee puheäänen `lang`-attribuutista, joten 22 muuta kieltä luetaan suomen
ääntämyksellä. WCAG 3.1.1 (Language of Page). Superjatsissa sama on tehty (`strings.ts:45`).

**J-2. Valittu kortti näkyy vain siirtymänä.** Tila: korjattu 14.10.2026, 1.2.234. Klikattava kortti saa `aria-pressed`:n silloin kun peli antaa `selected`-propsin, joten suoraan pelattava kortti ei muutu kytkimeksi. Todennettu dev-previewissä Paskahousussa: valittu kortti `true`, muut `false`. Alkuperäinen havainto: `shared/Card.jsx:43` ja `:95–97`:
`selected` nostaa korttia 8 px, mutta ruudunlukijalle ei kerrota mitään. Monivalinnassa
(Kasino, Paskahousu) pelaaja ei kuule mitkä kortit ovat valittuina. Virallinen muoto on
`aria-pressed` napissa (APG toggle button).

**J-3. Kielivalitsin on listbox ilman listboxin näppäimistöä.** Tila: korjattu 14.10.2026, 1.2.234, disclosure-mallilla. Listbox- ja option-roolit ja avausnapin `aria-haspopup` poistettiin, valittu kieli on `aria-current="true"`, ja ryhmät ovat `role="group"` nimellä. Näkyvä ryhmäotsikko on `aria-hidden`, jottei nimi kuulu kahdesti. Todennettu dev-previewissä: kaksi ryhmää (15 ja 8 kieltä), yksi valittu. Alkuperäinen havainto:
`App.jsx:408–424`: `role="listbox"` lupaa nuolinäppäimet ja yhden kohdistuksen, mutta
vaihtoehdot ovat `<button role="option">` joihin siirrytään Tabilla. Ryhmäotsikot ovat
listboxin sisällä roolittomia `<div>`ejä, mitä ARIA 1.2 ei salli (listboxin lapsi on option tai
group). Yksinkertaisin virallinen muoto on APG:n
[disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/): rooliton lista tavallisia
nappeja, valittu `aria-current="true"`, ja ryhmät `role="group"` + `aria-label`.

**J-4. Kasinon valintaikkuna ei siirrä kohdistusta.** Tila: korjattu 14.10.2026, 1.2.233. Ikkuna saa kohdistuksen auetessa (`tabIndex={-1}`), Tab ja Shift+Tab kiertävät sen napeissa, ja Esc tai ✕ palauttaa kohdistuksen avausnappiin. Avausnappi sai nimen ja `aria-haspopup="dialog"`, koska puhelimella siinä on pelkkä 📋. Todennettu dev-previewissä näppäintapahtumilla, ei ruudunlukijalla. Alkuperäinen havainto: `games/Kasino.jsx:1734`:
`role="dialog"` ja `aria-modal="true"` ovat oikein, ja Escape sulkee (`:573–575`). APG:n
[dialog-malli](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) vaatii lisäksi, että
kohdistus siirtyy ikkunaan avattaessa ja palaa avausnappiin suljettaessa. Nyt ruudunlukija jää
ikkunan taakse, jota `aria-modal` käskee olemaan lukematta.

## Kuuntelu 15.10.2026

Tommi kuunteli tuotantoversion 1.2.235 TalkBackilla Pixelillä, pystytilassa.

*Toimii:* kielivalitsin kertoo valitun kielen (J-3:n `aria-current`).

**J-5. Kieliryhmien nimet eivät kuulu.** Tila: korjattu 15.10.2026, julkaistu 1.2.236. J-3:n
korjaus antoi ryhmälle nimen `aria-label`illa ja piilotti näkyvän otsikon (`aria-hidden`),
jottei nimi kuuluisi kahdesti. TalkBack ei sano ryhmän nimeä ollenkaan, joten nimi ei kuulunut
kertaakaan. Korjaus: näkyvä otsikko on luettava teksti, ja ryhmä viittaa siihen
(`aria-labelledby`). Todennettu dev-previewissä: kaksi ryhmää, nimet "Vérifiées" ja "Non
vérifiées" näkyvissä saavutettavuuspuulle. Ei kuunneltu.

**J-6. Ranska valittuna otsikkorivi kuuluu suomalaisella äänellä.** Tila: korjattu
15.10.2026, julkaistu 1.2.236. Osa teksteistä (esim. vinkki uudelle) kuului ranskaksi, mutta
otsikkorivi suomeksi, myös sivun uudelleenlatauksen jälkeen. Syy (päätelmä, ei mitattu):
J-1:n korjaus kirjoittaa kielen `<html lang>`:iin efektissä eli ensimmäisen renderin jälkeen,
ja TalkBack pitää jo piirretyille teksteille niiden alkuperäisen kielen. Uudelleen piirretyt
tekstit saavat uuden kielen. Korjaus: kieli kirjoitetaan `<html lang>`:iin moduulin latautuessa
ennen ensimmäistä renderiä. Rajoitus: kesken käynnin tehty kielenvaihto ei välttämättä vaihda
ääntä teksteille, joita ei piirretä uudelleen. Uudelleenlataus vaihtaa. Ei kuunneltu.

**J-7. Versioleima kuuluu numerosarjana.** Tila: korjattu 15.10.2026, julkaistu 1.2.236. Valikon
alalaidan "v1.2.235 · 15.10.2026 16.05" kuului numeromössönä ilman kontekstia. Korjaus:
ruudunlukijalle oma teksti `ui.a11y.version` 23 kielellä ("Versio 1.2.235, julkaistu
15.10.2026 klo 16.05"), ja näkyvä leima on `aria-hidden`. Todennettu dev-previewissä. Ei
kuunneltu.

*Paskahousu:* kortin valinta kertoo tilan (J-2 toimii), ja kohdistus jää korttiin.

**J-8. Maa kuuluu "emojina" näkyvissä teksteissä.** Tila: korjattu 15.10.2026, julkaistu 1.2.236.
Kortit ja ilmoitukset sanoivat maan nimeltä (`cardName`, `Announcer.toPlain`), mutta muu näkyvä
teksti kirjoitti kortin symbolilla ja TalkBack luki symbolin "emojiksi". Dev-previewin haku
(pelin alku ja yksi valinta, 15.10.2026) löysi symbolin ainakin näistä: Paskahousun Pelaa-nappi
("Pelaa (2♠)") ja kasan päällimmäinen, Kultakalan Vaihda- ja Heitä-napit, Ristiseiskan pöydän
rivit, Seiskan Lyö-nappi, tavoiterivi ja vaadittu maa, Kasinon pöytä ja "Valittu: 4♠ = 4",
Maijan ja Moskan valttimaa.

Korjaus: näkyvä symboli on `aria-hidden` ja ruudunlukija saa saman tekstin sanoina
(`shared/Spoken.jsx`: `Spoken` tekstille ja `SpokenHtml` pelien HTML-viesteille, muunnos
`helpers.spokenSuits`, jota myös live-alue käyttää). Itse piirretyt kortinkuvat saivat kortin
nimen samoin kuin `Card` (`role="img"`). Ohimenevä "viimeisin siirto" -merkki ja Läpsyn
käännön animaatio ovat `aria-hidden`, koska live-alue on jo sanonut saman. Koristesymbolit
(aloitusnäytön maarivi, pelien tunnukset valikossa, Maijan Q♠-kuvake ja Ristiseiskan ♣
viestilaatikossa) ovat `aria-hidden`. Ristiseiskan pöydän rivi kuuluu yhtenä tekstinä ("risti
5–9"). Pelien ulkopuolelta korjattiin lisäksi sääntörivit ja sanasto (`renderSelitys`),
tulosruutu, toistonäkymä ja asetusten "Kaksivärinen pakka".

Kohdat löydettiin testillä eikä listasta, koska lista näki vain alkutilanteen.
`test/ruudunlukija-maat.test.jsx` pelaa jokaista peliä ihmisenä satunnaisilla painalluksilla
(400 askelta, kolme siementä) ja lukee jokaisen välitilan: tekstisolmu, jota ei peitä
`aria-hidden` eikä nimen korvaava `aria-label`, ei saa sisältää maasymbolia. Sama testi avaa
valikon säännöt, sanaston ja asetukset. Testi vartioi jatkossa uudet tekstit. Rajoitus: jsdom
ei laske näkyvyyttä, joten testi ei tiedä, mitä Chrome lopulta antaa TalkBackille. Testin
ensimmäinen ajo löysi 144 erilaista vuotavaa tekstiä, kun kortit yhdistettiin yhdeksi muodoksi.
Ne syntyivät paljon harvemmasta koodikohdasta, koska esimerkiksi Mestarin neuvon kupla tuotti
yksin kymmeniä.

Todennettu dev-previewissä 15.10.2026 (Chrome, äänet pois): Paskahousun alku, jako ja
korttivalinta sekä Ristiseiskan alku ilman yhtään paljasta symbolia. Pelaa-nappi on
näkyvästi "Pelaa (10♥)" ja ruudunlukijalle "Pelaa (hertta 10)". Ulkoasu ennallaan. Ei kuunneltu.

**J-9. "Vastustajat vuorojärjestyksessä" kuuluu kahdesti.** Tila: korjattu 16.10.2026 ja todennettu Pixelillä dev-versiolla, julkaistu 1.2.237 (todennettu tuotantobundlesta). Kuunneltu ok 17.10.2026: vastustajat kuuluvat kerran (alla › *Kuuntelu 17.10.2026 klo 21.50*). Syy mitattiin (alla › *Pixelin mittaus 16.10.2026*). Korjausyritys 15.10.2026 ei auttanut (kuuntelu 1.2.236:ssa, alla),
julkaistu 1.2.236. Live-alueeseen ilmoitus menee kerran (todennettu previewissä). Syy (päätelmä, ei
mitattu): ilmoitusalue jäi sisältöineen saavutettavuuspuuhun, joten sivun läpi pyyhkäisy luki
viimeisimmän ilmoituksen uudelleen. Korjaus: alue tyhjenee arvioidun puheajan jälkeen
(`Announcer.jsx`), ennen seuraavaa ilmoitusta. Todennettu dev-previewissä: alue vuorottelee
ilmoituksen ja tyhjän välillä. Testi `announcer.test.jsx` › "tyhjentää alueen puheajan jälkeen".
Ei kuunneltu, joten päätelmä vahvistuu vasta kun toistoa ei enää kuulu.

**J-10. Pelin alussa "nimetön, nimetön…" muiden pelaajien korttien kohdalla.** Tila:
korjattu 15.10.2026, julkaistu 1.2.236. Syy (päätelmä, ei mitattu): pelin alun sekoitusanimaatio
(`ShuffleOverlay`) piirtää kymmenen kortinselkää SVG-kuvina ilman nimeä ja niistä neljä lentää
pelaajien paikoille. Chrome antaa nimettömän SVG:n ruudunlukijalle kuvana, jonka TalkBack lukee
"nimetön". Aiempi haku etsi rooleja ja klikattavia elementtejä, eikä SVG:n implisiittinen
kuvarooli osunut siihen. Korjaus: animaatio on `aria-hidden` ja kortinselkien SVG:t
(`BACKS.jsx`) ovat `aria-hidden` kaikkialla, myös pinoissa (`FanStack`). Todennettu
dev-previewissä: jaon aikana ja sen jälkeen piilottamattomia SVG:itä on nolla. Ei kuunneltu.

**J-11. Aloitusnäytön valinnat eivät kerro valittua.** Tila: korjattu 15.10.2026,
julkaistu 1.2.236. Paskahousun sääntörivit kuuluivat, mutta ei sitä, mikä vaihtoehto on valittuna:
valinta näkyi vain kultaisena kehyksenä. Sama rakenne oli Kasinon ja Ristiseiskan
sääntövalinnoissa sekä yhteisen aloitusnäytön (`GameStartScreen.jsx`, `GroupPicker.jsx`)
pelaajamäärässä ja nimiryhmissä. Korjaus: jokaisessa vaihtoehdossa on `aria-pressed`
(APG toggle button). Pelaajamäärä ja nimiryhmät ovat lisäksi `role="group"`, joka viittaa
näkyvään otsikkoonsa (`aria-labelledby`), kuten J-5:ssä. Paskahousun "Kovat kakkoset"
-vaihtoehto kuuluu sanoina "pata 2, risti 2" (J-8). Todennettu dev-previewissä: 18
vaihtoehtoa, valitut `true` ja muut `false`. Ei kuunneltu.

## Laitemittaus 15.10.2026

Mitattu Pixel 8a:lla Tommin luvalla, ennen julkaisua. Menetelmä on DGAndroidin
(`DGAndroid/docs/TOINEN-ASIAKAS.md` › Mitattu TalkBack päällä): TalkBack kytkettiin adb:llä,
puhelimen Chrome avasi koneen dev-palvelimen (`adb reverse`, launch-konfiguraatio
`jako-dev-adb`, koska Vite kuuntelee Windowsissa oletuksena vain IPv6:ta), ruutuja selattiin
TalkBackin eleillä ja jokaisesta ruudusta otettiin saavutettavuuspuu `uiautomator dump`illa.
Puu on se, minkä TalkBack lukee. Puhetta ei nauhoitettu, koska TalkBack ei kirjaa sitä lokiin
oletusasetuksilla. Lopuksi TalkBack kytkettiin pois ja todennettiin (`Bound services:{}`).
Raakadata: `raakasivut/talkback-15-10/` (ei versioida). Tulokset:

- **J-8:** valikon pelinapit ilman koristemaata ("Ristiseiska"), "Kovat kakkoset" -vaihtoehto
  "pata 2, risti 2", vihje "Valittu: pata 10. Paina Pelaa…" ja nappi "Pelaa (pata 10)". Kasan
  päällimmäinen "risti 5 (arvo 5)". Puissa ei ole yhtään maasymbolia pelin teksteissä.
- **J-9:** ilmoitusalue on puussa tyhjä, kun peli on levossa (`06-valittu.xml`). Pyyhkäisy ei
  siis löydä siitä vanhaa ilmoitusta.
- **J-10:** jaon aikana (`03-jako-sekoitus.xml`) puussa ei ole nimettömiä kuvia. Koesivulla
  nimetön SVG näkyi nimettömänä kuvana (`Image`, NAF) ja sen sisäinen ⊕ omana tekstinään ja
  `aria-hidden`-SVG puuttui puusta. Mekanismi on siis vahvistettu. Se, että juuri tämä kuului
  kuuntelussa, on yhä päätelmä.
- **J-11:** aloitusnäytön vaihtoehdot ovat Chromessa ToggleButtoneita, joilla on valintatila.

*Sivuhavainto:* ilmoitusalue laahaa pelin alussa perässä. Kun vuorossa oli jo Hero, alueella
oli vielä "Vuorossa Fortuna." (`05-kortit-korjattu.xml`), koska ilmoitukset jonotetaan
arvioidun puheajan mukaan. Ei korjattu. Kuuntelu kertoo, häiritseekö viive.

**J-12. Pelattavalla kortilla ei ole nimeä TalkBackissa.** Tila: korjattu 15.10.2026,
julkaistu 1.2.236. Laitemittauksessa pelattavat kortit olivat nimettömiä ToggleButtoneita (NAF), kun
taas pelaamattomat kortit (`role="img"`) kantoivat nimeään. Koesivu erotti syyn: Chrome
Androidilla `aria-pressed` tekee elementistä ToggleButtonin ja silloin `aria-label` putoaa
puusta. Näin kävi myös natiivilla `<button>`illa ja silloin, kun lapsi oli näkyvissä. Nimi
säilyi vain, kun se tuli sisällöstä. Vika syntyi J-2:n korjauksessa 14.10.2026 (julkaistu
1.2.234). Paskahousun kuuntelussa valinnan tila kuului, mutta nimen puuttumista ei kirjattu.
Korjaus: kortin nimi on napin sisällä `sr-only`-tekstinä eikä `aria-label`issa (`Card.jsx`).
Testi `ruudunlukija-maat.test.jsx` kieltää `aria-pressed`in ja `aria-label`in samassa
elementissä. Todennettu laitteella: kortit "pata 10", "ruutu 8" jne. ToggleButtoneina ja
valittu `checked=true` (`05`, `06`). Ei kuunneltu.

*Havainto:* Tommin mukaan TalkBackin ranskalainen ääni kuulostaa paljon luontevammalta kuin
suomalainen. Se on puhemoottorin ominaisuus eikä Jaon.

## Kuuntelu 1.2.236:ssa 15.10.2026 klo 22.35

Tommi kuunteli tuotantoversion 1.2.236 TalkBackilla Pixel 8a:lla, pystytilassa. TalkBack
kytkettiin adb:llä kuuntelun ajaksi ja pois heti (`Bound services:{}`). Saavutettavuuden
äänenvoimakkuus oli 7/15. Kulku: valikko, Paskahousun aloitusnäyttö, pelin alku, omat kortit ja
koko sivun läpipyyhkäisy. Tommin vastaukset sanatarkasti ja Clauden tarkennuskysymysten
vastaukset:

- **J-8 toimii:** valikko *"ok"*, ja kortit ja Pelaa-nappi *"ok"*.
- **J-11 toimii:** aloitusnäytön valittu vaihtoehto kertoi tilansa (tarkennuskysymys: *"Kyllä"*).
- **J-12 toimii:** kortit kuuluvat nimellä (*"ok"*).
- **J-10 toimii:** *"ei nimetöntä"*.
- **J-9 ei korjaantunut.** *"vastustajat vuorojärjestys toistui"*, *"paljon toistoa
  sanomisissa"* ja *"toistoa on"*. Tarkennus: rivi kuului toiseen kertaan **sekä heti perään
  itsestään että pyyhkäistessä**. Muusta toistosta ilmoitukset toistuivat (Tommin valinta
  vaihtoehdoista: ilmoitukset, kortin nimi, tilasanat, viive). Tila palautetaan auki.
  Alueen tyhjentäminen puheajan jälkeen ei siis riittänyt. Toisto heti perään viittaa siihen,
  että TalkBack lukee ilmoituksen kahdesti jo saapuessaan (päätelmä, ei mitattu).

## J-9:n mittaussuunnitelma (15.10.2026, kesken)

Tila: suunnitelma, mittausta ei ajettu. Tommi pysäytti työn ennen kuin TalkBack kytkettiin.

**Mitattu jo.** Selaimessa (dev-preview, MutationObserver pelin alussa) sivulla on kaksi
live-aluetta: `Announcer` (`aria-live="polite"`, `aria-atomic="true"`) ja TurnPromptin
`role="status"`. Ilmoitusalueeseen kirjoitetaan jokainen ilmoitus kerran: "Vastustajat…"
424 ms:n kohdalla, tyhjennys 4,8 s:n kohdalla ja seuraava ilmoitus kerran. Sivu ei siis lähetä
mitään kahdesti. Toisto syntyy Chromen ja TalkBackin välissä (päätelmä mittauksesta).

**Hypoteesit.** (1) Chrome Android merkitsee solmun live-alueeksi ja lähettää lisäksi
ilmoituksen, jolloin TalkBack puhuu molemmat. (2) `aria-atomic="true"` saa Chromen ilmoittamaan
sekä lisätyn tekstin että koko alueen. (3) Uuden tekstisolmun lisäys tyhjään alueeseen
käyttäytyy eri tavalla kuin olemassa olevan solmun tekstin vaihto.

**Mittaus.** Koesivu `docs/koesivut/live-alue.html` (viisi muunnelmaa napin takana, ilmoitus
2,5 s napin jälkeen): A polite ja atomic, tyhjennys ja uusi teksti (Jaon nykyinen); B polite
ilman atomicia; C `role="status"`; D polite ja atomic, saman tekstisolmun arvon vaihto ilman
tyhjennystä; E kaksi vuorottelevaa aluetta. Ajo:

1. Tarjoa sivu: `python -m http.server 5176 --bind 127.0.0.1` sivun kansiossa ja
   `adb reverse tcp:5176 tcp:5176`. Jaon oma vertailu: launch-konfiguraatio `jako-dev-adb`
   (127.0.0.1:5175).
2. TalkBackin puheloki TalkBackin ollessa pois: TalkBack-asetukset › Lisäasetukset ›
   Kehittäjäasetukset › lokitaso Verbose (polku todennettu 15.10. Kehittäjäasetuksiin asti).
3. TalkBack päälle adb:llä, `logcat -c`, kunkin muunnelman nappi eleillä (napautus kohdistaa,
   kaksoisnapautus aktivoi), ja `logcat -d` jokaisen jälkeen. Lasketaan, montako kertaa
   "Koe X yksi" puhutaan.
4. TalkBack pois ja todennus (`Bound services:{}`), lokitaso takaisin oletukseen.

Korjaus valitaan muunnelmasta, joka puhuu kerran. Ennen Tommin kuuntelua chattiin tulostetaan
sanatarkasti, mitä pitäisi kuulua. Lupa: Tommi antoi 15.10. luvan kytkeä TalkBack mittauksen
ajaksi ja puhelokin päälle, mutta pysäytti työn ennen ajoa.

## Tabletin mittaus 16.10.2026

Galaxy Tab S7+:lla (Samsungin TalkBack 13.5, Chrome 155), koska Pixel ei ollut kiinni. Tommi
antoi tabletin mittaukseen (*"tablet on vapaa"*). TalkBack kytkettiin adb:llä jokaisen ajon ajaksi
ja pois heti, ja jokainen purku todennettiin (`Bound services:{}`).

**Menetelmästä kolme havaintoa.**

- `uiautomator events` ei yksinään näe sivun tapahtumia, koska Chrome rakentaa sivun puun vasta
  oikealle ruudunlukijalle. TalkBackin rinnalla ajettuna se taas vaimentaa TalkBackin
  (puhemoottori irtosi heti). Tapahtumat ja puhe on siis mitattava erikseen.
- Samsungin TalkBack ei kirjaa puhetta lokiin edes tasolla VERBOSE, joka oli jo valmiiksi päällä.
  Puhemoottorin loki (`SamsungTTS`) kirjaa jokaisen puhepyynnön salattuna. Salaus on
  deterministinen, joten saman tekstin toisto näkyisi samana merkkijonona.
- Kehittäjäasetus *Näytä puhe* piirtää puhutun tekstin ruudun alareunaan, ja se luettiin
  kaappauksista puolen sekunnin välein. Asetus palautettiin pois mittauksen jälkeen ja todennettiin.

**Tulokset.**

- Koesivun viisi muunnelmaa: jokainen live-alueen teksti puhuttiin kerran. Chrome lähetti
  jokaisesta muutoksesta kolme `TYPE_WINDOW_CONTENT_CHANGED`-tapahtumaa, mutta ei
  `TYPE_ANNOUNCEMENT`ia. Hypoteeseista 1–3 mikään ei tuottanut toistoa tällä laitteella.
- Tuotannon 1.2.236 Paskahousu, Aloita: puhuttiin järjestyksessä *Avaa oma etusivu, Painike*,
  napin vihje, *Vastustajat vuorojärjestyksessä: Osku, Marko, Tinja.* ja *Paskahousu alkaa!
  Marko aloittaa (pienin kortti).* Kukin kerran. **J-9 ei toistu tabletilla.**

**Uusi hypoteesi (päätelmä, ei mitattu Pixelillä).** Kun Aloita-nappi katoaa, kohdistus lähtee
siltä. Tabletilla se meni Chromen kotinappiin (*Avaa oma etusivu*). Ilmoitusalue
(`<Announcer />`) oli pelisivun ensimmäinen elementti. Jos Pixelin TalkBack vie kohdistuksen sivun
alkuun, se osuu alueeseen, jossa lukee juuri vastustajarivi. Kohdistettu teksti luetaan ja
live-ilmoitus myös, joten rivi kuuluu kahdesti heti perään. Pyyhkäisy alkaa samasta kohdasta.
Tämä sopii Tommin kuvaukseen (*sekä heti perään itsestään että pyyhkäistessä*) ja siihen, että
toisto koski nimenomaan pelin ensimmäistä ilmoitusta.

**Korjaus (16.10.2026, ei julkaistu).** Ilmoitusalue on pelisivun viimeinen elementti
(`App.jsx`). Sivun alussa on nyt *Valikko*-nappi. Testit ja `verify.py` menevät läpi.
Todennus vaatii Pixelin: ensin tuotanto ennen korjausta, jotta nähdään osuuko kohdistus
alueeseen, sitten dev-palvelin (`jako-dev-adb`) korjauksen kanssa, *Näytä puhe* päällä.

## Pixelin mittaus 16.10.2026

Pixel 8a (TalkBack 17.0.1, Chrome 155), Tommin sormella. TalkBackin asetus *Näytä puhe*
(Visuaalinen-osiossa) piirtää puhutun tekstin ruudun alareunaan, ja se luettiin kaappauksista
noin 0,7 sekunnin välein. TalkBack kytkettiin adb:llä kummankin ajon ajaksi ja pois heti
(`Bound services:{}`). Adb:n napautus ei kelpaa tähän: se jättää TalkBackin kohdistuksen koko
verkkonäkymään, joten oikea kulku (napautus kohdistaa Aloitaan, kaksoisnapautus aloittaa)
syntyy vain sormella.

**Tuotanto 1.2.236.** Ensin live-ilmoitus yksinään: *Vastustajat vuorojärjestyksessä: Jukka,
Sune, Simo.* Heti perään TalkBack luki koko pelisivun yhtenä kohteena (vihreä kehys koko sivun
ympärillä), ja luku alkoi samalla rivillä: *Vastustajat vuorojärjestyksessä: Jukka, Sune,
Simo.. Paskahousu. tila. 🃏. Paskahousu alkaa! … 🤖 . Jukka. 🤖 . Sune … KASA. Rivinkeskinen
piste. tyhjä. PAKKA · 28 korttia … 👤 Hero · 6 korttia kädessä. Tavoite:. Välilyönti. …*
**Syy on mitattu:** painettu Aloita katosi aloitusnäytön mukana, kohdistus putosi sivun
juureen, ja juuren luku alkoi ilmoitusalueesta. Tabletin hypoteesi piti, mutta mekanismi oli
juuren kokonaisluku eikä yksittäinen kohdistus alueeseen.

**Korjaus.** Ilmoitusalueen siirto sivun loppuun ei yksin riittäisi, koska juuren luku kävisi
yhä koko sivun läpi. Aloita ja Bottien Taistelu vievät siksi kohdistuksen otsikkorivin pelin
nimeen (`GameStartScreen.jsx` › `thenFocusTitle`, `App.jsx` › `GameHeader`, jonka nimi on nyt
`h1` ja `tabIndex={-1}`). Testi `kohdistus-alussa.test.jsx`.

**Dev-versio korjauksella.** Puhe järjestyksessä: *Vastustajat vuorojärjestyksessä: Tryhard,
Noob, Lurker.*, *Paskahousu. otsikko 1*, *Paskahousu alkaa! Noob aloittaa (pienin kortti).*,
*Vuorossa Noob.*, *Noob: risti 3.*, *Vuorossa Lurker.*, *Lurker: ruutu 3.* ja *Vuorossa Hero.*
Kukin kerran. *Lurker: ruutu 3.* näkyi kahdessa kehyksessä 0,57 sekunnin päässä, siirtyneenä
10 pikseliä. Se on yhden lausuman sisällä, ja ilmoitusalue ei lähetä samaa tekstiä kahdesti,
joten se on sama puhe. Koko sivun lukua ei tullut. **J-9 on korjattu dev-versiossa.** Tommin
kuuntelu julkaistulla versiolla on tekemättä.

**J-13. Koristeemojit kuuluvat puheessa.** Tila: auki. Tommi kuuli tuotannon ajossa emojit
(*"emojit puheessa"*), ja koko sivun luku näytti ne: 🃏 pelin tilan kohdalla, 🤖 jokaisen
botin nimen edessä ja 👤 Heron edessä. Samasta luvusta kuului myös *Rivinkeskinen piste*
(`·`-erotin) ja *Välilyönti*. Korjaus poisti kokonaisluvun pelin alusta, mutta samat kohteet
kuuluvat yhä, kun sivua pyyhkäisee läpi. Korjaustapa olisi `aria-hidden` koristeille, kuten
aloitusnäytön tunnuksessa. Ei vielä kartoitettu koko sivulta.
*Napit korjattu 16.10.2026 klo 20.30* (Tommin kuuntelu: *"kun painikkeessa on emoji niin
emojia ei tarvitse lausua"*). Kaikkien yhdeksän pelin ja valikon napeissa emoji on nyt
`aria-hidden`: joko kääre JSX:ssä tai `Spoken`, joka piilottaa merkkijonon emojit samalla
tavalla kuin maasymbolit. Äänen ja avointen korttien tila kulki emojissa (🔊/🔇, 🔍/🙈), joten
napit saivat `aria-pressed`in. Vahti: `ruudunlukija-maat.test.jsx` kaataa napin, jonka
puhutussa muodossa on emoji. Kolme testiä tunnisti Bottien Taistelun napin nimen 🔮:sta, ja
ne lukevat sen nyt näkyvästä tekstistä. Tila: napit korjattu, muu teksti (lokirivit,
pelaajarivien 🤖 ja 👤) yhä auki.

*Kartoitus 18.10.2026* (HEAD `4e5ae29`, 1.2.241, dev-preview `?lang=fi`). Menetelmä: sivun
DOMista haettiin tekstisolmut ja `aria-label`/`title`/`alt`-arvot, joissa on emoji tai
symboli (`EMOJI` sekä `· → ← › ● ★ ✓ ×` ja numeronäppäin), ja ohitettiin `aria-hidden`,
näkymätön ja nimetyn napin sisällä oleva teksti. Haku ajettiin valikossa, Asetuksissa ja
Infossa sekä jokaisessa yhdeksässä pelissä aloitushetkellä (loki ja Tilanne auki) ja
Bottien Taistelussa noin 36 sekuntia. Kartoitus kertoo mitä selain antaa ruudunlukijalle.
Kuuntelua ei tehty, joten symbolin sanamuoto TalkBackissa on päätelmä, paitsi `·`, jonka
Tommi kuuli (*Rivinkeskinen piste*). Ryhmät:

1. *Pelaajarivien 🤖 ja 👤, kaikki yhdeksän peliä.* Koriste: rooli kuuluu jo nimestä
   (Hero tai botin nimi). Koodissa 23 riviä pelikomponenteissa, esim.
   `Kultakala.jsx:619`, `Paskahousu.jsx:1070`, `Seiska.jsx:1174`. Sama `🤖` on Bottien
   Taistelun bannerissa (`🤖 KATSELUTILA`, `fi.js:204`).
2. *Vuoron ja roolin merkit, tietoa eikä koristetta.* `●` vuorossa olevan perässä
   (Kultakala, Läpsy, Kasino, Koputus), `►` vuorossa olevan edessä (Paskahousu, Ristiseiska),
   `⚔️`/`🛡️` hyökkääjä ja puolustaja (Maija, Moska, Kasinon `⚔ 11`). Pelkkä `aria-hidden`
   hävittäisi tiedon, joten nämä tarvitsevat puhutun sanan (`Spoken say=`).
3. *Viestirivin pelikuvake.* Pelin oma emoji viestin edessä (🐟 👋 🪙 🤜 🃏 ⚔️), kuuluu
   ennen jokaista viestiä kun riviä pyyhkäisee. Live-alue ei sano sitä (`spokenHtml` poistaa
   emojit), mutta näkyvä rivi sanoo. Seiskassa ja Ristiseiskassa kuvaketta ei tullut esiin.
4. *Erottimet ja nuolet näkyvässä tekstissä.* `·` tilariveillä (`PÖYTÄ · tyhjä`,
   `KASA · 0 kpl`, `Hero · 6 korttia kädessä`, Seiskan Tilanne), valikon pelitilastossa
   (`0V / 1P · 0%`) ja Bottien Taistelun napissa (`4 bottia · Mestari`). `→` lokissa
   (Kultakalan vaihtoketju, Moskan `hyökkää → puolustaa`), Ristiseiskan torneissa (`[6→A]`)
   ja Läpsyn `Käännä →` -napissa. `←` Valikko-napissa ja Kasinon kaappausrivillä. `›`
   LOKI-napissa ja Asetusten ja Infon avautuvissa riveissä. `✓` Moskan pöytärivillä
   (`✓ 1 kaadettu`) ja `×3` Paskahousussa.
5. *Infon napit, jotka nappikorjaus ohitti.* Tilastot 📊, Ruudunlukijalle 🔊, Lisää Jako
   aloitusnäytölle 📲, Muutosloki 📋 ja Tulossa 🗺. Teksti tulee käännösavaimesta suoraan
   (`fi.js:127–175`) eikä `Spoken`in kautta, toisin kuin Asetusten vastaavat rivit.
   Vahtitesti ei katso Info-paneelia.
6. *Yksittäiset.* Seiskan lokin `🔮 Katsomotila`, Koputuksen irrallinen `⚡` ja `·`.
   Valikon `★` on roolittomassa `<span aria-label>`issa (sama malli kuin Itun I-5):
   Chrome näyttää nimen *Suosittu peli*, TalkBackin käytös kuulematta.

Ei kartoitettu: tulosruutu, Tilastot-paneelin sisältö, Sanasto ja Merkistö (siellä kuvake on
itse selitettävä asia) sekä muut kielet kuin suomi. Avoimet päätökset Tommille: puhutaanko
ryhmän 2 merkit sanoina (esim. *vuorossa*, *hyökkää*, *puolustaa*), ja piilotetaanko ryhmän 4
erottimet ja nuolet kokonaan vai vaihdetaanko osa sanaksi (lokin nuoli kertoo
vaihdon järjestyksen, joka on sisältöä).

*Korjattu dev-versiossa 18.10.2026, ei kuunneltu* (ryhmät 1, 2, 3, 5 ja 6; Tommin valinta: ryhmän
2 merkit sanoina). `Spoken.jsx`:ään tuli `Deco` (koriste piiloon), `TurnMark` (● näkyy,
*vuorossa* kuuluu) ja `RoleWord` (*hyökkää* tai *puolustaa* nimen perään). Paskahousun ⚠
kuuluu *menettää vuoronsa*. Uudet avaimet `ui.shared.srTurn`, `srAttacks`, `srDefends` ja
`srSkips` 23 kielellä; hyökkää, puolustaa ja menettää vuoronsa on johdettu kunkin kielen
Moskan `newAttack`- ja Paskahousun `skipNoCard`-tekstistä, *vuorossa* on käännetty erikseen.
Vahtitesti `ruudunlukija-maat.test.jsx` tarkistaa nyt emojin myös muusta tekstistä kuin
napeista. Ensimmäinen ajo löysi selainkartoitusta enemmän, koska se pelaa ihmisenä ja käy
läpi enemmän tiloja: lokirivit ilman maata (`GameLog` ja `SpokenHtml` antoivat puhutun muodon
vain maasta, nyt myös emojista), Kasinon viestirivi, rakennelmarivit ja otsikot, Läpsyn
ennätys, Koputuksen koputusbanneri, Kultakalan 😱, Maijan ⚠ ja valikon paneelien otsikot.
Merkistön kuvakkeet piilotettiin, koska selitys on vieressä. Selaimessa todennettu: Moskan
rivi kuuluu *"Mikael, hyökkää"* ja *"Hero, puolustaa · 6 korttia kädessä"*, Kultakalan
*"Hero, vuorossa"*. Ryhmä 4 (erottimet ja nuolet) on yhä auki.

*Ryhmä 4 korjattu dev-versiossa 18.10.2026, ei kuunneltu* (Tommin valinta: ehdotuksen mukaan).
`helpers.js`:n `spokenSymbols` muuttaa puheen: sanojen välinen `·` tai `→` kuuluu pilkkuna,
pelkkä suuntamerkki (`← Valikko`, `Käännä →`, `›`) ja `✓` jäävät pois, ja `×3` kuuluu "3".
Sitä käyttävät `Spoken` (myös annettu `say`), `SpokenHtml`, viestirivi, loki ja live-alue.
JSX:n keskellä oleva väli-piste on `Sep` (näkyy `·`, kuuluu pilkku). Erikseen sanoiksi:
valikon tilasto (`ui.statSpoken`: *"Kultakala, voitot 0, pelit 1, 0 prosenttia"*),
Kultakalan vaihtoketju (nuolen tilalla *sitten*, `ui.shared.srThen`) ja Ristiseiskan tornit
(*"alapino kuutosesta ässään, 7, yläpino kasista kuninkaaseen"*,
`games.ristiseiska.ui.srLowerRange`/`srUpperRange`). Toistonäkymän nimettömät ←/→-napit
saivat nimet (`ui.replay.prev`/`next`). Uudet avaimet 23 kielellä. Samalla korjattiin
pelinapin ja Bottien Taistelun napin nimi, joissa kaksi riviä liimautui yhteen
(*"Kultakalavoitot"*, *"Bottien Taistelu4 bottia"*). Vahtitesti tarkistaa nyt myös merkit
`· ← → › ✓ ×`. Testin pelit eivät ole täysin toistettavia (botit arpovat siemenen ohi):
Kasinon mökkirivi *"🏠 MÖKKI"* vuoti yhdessä viidestä ajosta ja korjattiin. Selaimessa
todennettu valikon tilasto, Bottien Taistelun nappi, Ristiseiskan tornit, ← Valikko ja LOKI.
Kultakalan *sitten* on todennettu vain koodista. Tila: J-13 korjattu kokonaan dev-versiossa,
kuuntelu tekemättä.

## Kuuntelu 1.2.237:llä 16.10.2026 klo 19.13

Tommi kuunteli julkaistun 1.2.237:n Pixelillä: *"kuulosti hyvältä, kunnes pelasin yhden
kortin ja alkoi pitkä tarina"*. Pelin alku toimi siis, mutta sama vika toistui ensimmäisen
pelatun kortin jälkeen. Syy (päätelmä, ei kaapattu): kortti ja Pelaa-nappi katosivat,
kohdistus putosi sivun juureen ja TalkBack luki koko sivun.

**J-14. Kohdistus putoaa, kun painettu nappi katoaa.** Tila: korjattu dev-versiossa
16.10.2026, testattu selaimessa, ei kuunneltu eikä julkaistu. Tommin päätökset
monivalinnoista: kohdistus menee oman käden pienimpään valittavaan korttiin, ja jos
yhtäkään ei voi valita (heti oman siirron jälkeen), käden pienimpään korttiin.
Toteutus: `shared/focusRescue.js` (asennetaan `App.jsx`:ssä) muistaa viimeksi napautetun tai
kohdistetun elementin. Kun se katoaa ja kohdistus jää tyhjään, kohdistus siirtyy
`rescueTarget`iin. `Card`-propsi `mine` merkitsee ihmispelaajan kortit (`data-mine`,
`data-value` pelin omasta arvosta `card.v`), ja valitsematon oma kortti saa `tabIndex={-1}`.
Merkitty seitsemään peliin: Kasino, Maija, Moska, Paskahousu (käsi ja vaihtovaihe),
Ristiseiska ja Seiska. Kultakalassa ja Koputuksessa omat kortit ovat kuvapuoli alas, ja
Läpsyssä kättä ei valita, joten niissä kohdistus menee pelin nimeen. Testit
`kohdistus-alussa.test.jsx` (4). Selaimessa: Paskahousu, ♥2 pelattu, kohdistus siirtyi
*hertta 3*:een (käden pienin, ei valittava).

## Turvaverkon tarkistus 16.10.2026 klo 19.30

Edellisen kohdan kolme tarkistettavaa ajettiin dev-previewissä (Chrome, ei ruudunlukijaa):
napin kohdistus, painallus ja 250 ms myöhemmin luettu `document.activeElement`.

| Reitti | Ennen | Korjauksen jälkeen |
|---|---|---|
| Asetukset auki ja kiinni pelissä | pienin kortti (*pata 3*) | Asetukset |
| Mestarin kupla ✕ | pienin kortti | Kysy Mestarilta |
| Asetukset, Info, Jaa valikossa | sivun juuri | avausnappi |
| Kielivalitsin, kielen valinta | kunnossa | kunnossa |
| Opasta, Tilanne, Loki, Avoimet kortit | kunnossa (nappi pysyy) | kunnossa |
| Kortti valittu, Pelaa | käden pienin | käden pienin (ennallaan) |
| Kortti valittu, Peruuta (Maija) | ei mitattu | valittu kortti |
| Bottien Taistelu, bottien siirrot | pelin nimi pysyy | pelin nimi pysyy |
| Bottien Taistelu, Tauko ja Jatka | kunnossa | kunnossa |
| ← Valikko | sivun juuri | pelin oma ruutu (J-15) |

**Korjaus 1, paneelin avaaja.** Sulkunappi katoaa paneelin mukana, ja turvaverkko vei
kohdistuksen käteen. APG:n disclosure- ja dialogimallissa kohdistus palaa avaajaan. Korjaus on
turvaverkossa eikä paneeleissa, koska paneeleja on ainakin kuusi: napautuksen samassa tahdissa
lisätyt solmut muistavat napautetun elementin, ja kadonneen napin vanhempiketjusta löytyy
avaaja. Pelaa-napin avaaja on valittu kortti, joka katoaa itsekin, joten J-14:n tapaus menee
yhä käteen. Testi `kohdistus-alussa.test.jsx` (5), joka kaatuu vanhalla turvaverkolla.

**Korjaus 2, Maija.** Maijalla on oma `Card`, joka ei lukenut `mine`-propsia. Maijan kortit
eivät saaneet `data-mine`-merkintää, joten J-14:n turvaverkko vei kohdistuksen siellä pelin
nimeen, vaikka edellinen kohta luettelee Maijan merkityksi. `npm run typecheck` kaatui tähän
(J-14:n commit `163fa8d`). Nyt: *Lyö kortti* vie kohdistuksen *hertta 3*:een.

**J-15. Paluu valikkoon pudottaa kohdistuksen sivun juureen.** Tila: korjattu dev-versiossa
16.10.2026, testattu selaimessa, ei kuunneltu eikä julkaistu. ← Valikko katoaa pelin mukana,
eikä valikossa ole korttia eikä pelin nimeä, joten TalkBack luki koko valikon. Sama vikaluokka
kuin J-9 ja J-14. Tommin valinta: kohdistus menee sen pelin ruutuun, josta palattiin.
Paluureittejä on neljä (otsikon ← Valikko, tulosruutu, Bottien Taistelun tulos ja takaisin-ele),
joten `App.jsx` siirtää kohdistuksen `active`-tilan muutoksesta eikä napeista. Ruudun nappi on
`data-game-tile`. Selaimessa: Maija, Moska (pelin alettua) ja takaisin-ele Kasinosta päätyivät
oman pelin ruutuun. Tulosruutujen reittejä ei ajettu selaimessa, ne kulkevat saman tilamuutoksen
kautta. Testi `kohdistus-alussa.test.jsx` (6), joka kaatuu ilman siirtoa.

**J-16. Nimettömät ✕-napit.** Tila: korjattu dev-versiossa 16.10.2026, ei kuunneltu eikä
julkaistu. Valinnan perumisnappi Paskahousussa, Seiskassa, Moskassa (kaksi) ja
Ristiseiskassa (kaksi) sekä Kasinon infolaatikon ja uusinnan sulkija olivat pelkkä ✕ ilman
`aria-label`ia. TalkBack lukee merkin nimen eikä toimintoa. Nimet tulevat olemassa olevista
avaimista `ui.action.cancelSelection` (*Peruuta valinta*) ja `ui.shared.close` (*Sulje*), jotka
ovat kaikissa 23 kielessä. Mestarin kuplan ✕:n nimi oli `ui.info.close` eli *"✕ Sulje"*, jolloin
merkin nimi kuului ennen sanaa, ja se vaihdettiin `ui.shared.close`en. Vahti:
`ruudunlukija-maat.test.jsx` kaataa napin, jonka näkyvässä tekstissä ei ole kirjainta eikä
numeroa ja jolta puuttuu `aria-label`. Vanhalla koodilla se kaatoi viisi peliä. Selaimessa
Paskahousun *Peruuta valinta* palautti kohdistuksen valittuun korttiin.

**J-17. Yläindeksi ⁹ kuuluu nimessä.** Tila: korjattu dev-versiossa 16.10.2026, ei kuunneltu.
Tommin toive: kun ruudunlukija sanoo nimen Jako, yläindeksiä 9 ei tarvitse sanoa. Valikon
otsikon luku on nyt `aria-hidden`, Jaa-napin nimi on *Jaa Jako* ja Infon *Lisää Jako⁹
aloitusnäytölle* -otsikon ⁹ on `aria-hidden` (`App.jsx`, `silentNine` ja `withSilentNine`).
Selaimessa: otsikon saavutettava teksti *JAKO*, napin nimi *Jaa Jako*.

## Kuuntelu dev-versiolla 16.10.2026 klo 20.15

Tommi kuunteli J-14–J-17:n Pixelillä (`localhost:5186`, juuren `launch.json`in `jako-dev-adb`).

| Kohta | Tulos |
|---|---|
| J-17 nimi ilman yhdeksikköä | ok |
| Paneelien sulku valikossa (Asetukset, Info) | ok |
| Kortin pelaaminen (J-14) | siirtyy, mutta ks. alla |
| Maija Lyö kortti | ok |
| Mestarin kupla | teksti ei kuulunut, kohdistus palasi nappiin |
| Peruuta valinta (J-16) | kohdistus palaa valittuun korttiin |
| Paluu valikkoon (J-15), myös takaisin-ele | ok |

**Kortin pelaaminen.** Tommi: kohdistus valitsi valtin, *"tämä on mielestäni väärin koska
valtit ovat arvokkaita vaikka olisikin pieni kortti"*. Korjattu: `Card`in `mineValue` antaa
turvaverkolle pelin oman järjestyksen, ja Maijassa ja Moskassa valtti saa +100. Toinen
huomio: kohdistus menee pienimpään korttiin ilman kontekstia, ja sama toistuu jokaisen oman
siirron jälkeen. Mitattu selaimessa: kohdistus pysyi 30 s paikallaan ilman omaa siirtoa,
joten toisto ei ole turvaverkon vika vaan valitun kohdan seuraus. Tommin valinta: kohdistus
menee pelin viestiriville. Toteutus: `SpokenHtml`in `gameMessage` tekee viestistä
kohdistettavan kääreen (`data-game-message`, kahdeksan peliä), Kasinossa sama merkintä on
viestin `<p>`:ssä, ja turvaverkko suosii sitä. Kortti ja pelin nimi jäävät varalle.
Selaimessa: Maijan *Lyö kortti* vei kohdistuksen viestiin *"Hipster puolustaa, 1 kortti
kaadettavana."*, Paskahousun *Pelaa* viestiin *"Hero jatkaa vuoroaan."* Ei kuunneltu:
ilmoitusjono voi sanoa saman tapahtuman, jolloin se kuuluu kahdesti.

**Mestarin kupla.** `role="status"` ei ilmoita sisältöä, joka lisätään yhdessä alueen kanssa.
Korjattu: *Kysy Mestarilta* vie kohdistuksen kuplan ✕:ään, ja napin nimi on neuvo ja sana
*Sulje* (`aria-labelledby`). Opastuksen kupla ilmestyy vuoron mukana eikä siirrä kohdistusta.
Selaimessa: kohdistus ✕:ssä, nimi *"Mestari: Kaada pata ässä kortilla ruutu 4. … Sulje"*,
sulkeminen palaa Mestari-nappiin.

**Kohta 6.** TalkBack sanoi kirjaimellisesti *"sulje painike tila mestari"*: *tila* on
`role="status"` ja *Mestari* kuplan tekstin alku. Korjattu: rooli poistettu, koska sulkunappi
kantaa nyt neuvon. Opastuksen kupla, joka ilmestyy ilman napin painallusta, menee
ilmoitusjonoon (`announce`).

**Seuraavaksi:** Tommin kuuntelu Pixelillä dev-versiolla (`jako-dev-adb`), sitten julkaisu.
Kuunneltavat: kortin pelaaminen (J-14), Asetusten ja Mestarin kuplan sulkeminen pelissä,
paluu valikkoon (J-15), valinnan peruminen ✕-napilla (J-16) ja nimi ilman yhdeksikköä (J-17).
Toinen kierros: oman siirron jälkeen viestirivi, Mestarin kupla ilman tila-sanaa ja
emojittomat napit (J-13).

## Toinen kuuntelu dev-versiolla 16.10.2026 klo 21

**J-18. Kortin numero kuuluu taivutettuna.** Tila: korjattu dev-versiossa 16.10.2026, ei
kuunneltu. Tommi: kun ruudunlukija kertoo kortin, se taivuttaa usein numeron, vaikka kaivattu
on perusmuoto, esimerkiksi *"ruutu viiteen"* ja *"risti kolmesta"*. Syy: korttinimi oli muotoa
*ruutu 5*, ja TalkBackin puhesyntetisaattori päättelee numeron sijamuodon ympäröivistä
sanoista. Korjaus: suomessa `cardName` sanoo numeron sanana (*ruutu viisi*, `RANK_WORD`,
`helpers.js`). Kun näkyvässä tekstissä on numeron perässä sijapääte (*7♣:llä*), numero jää
numeroksi (*risti 7:llä*), koska pääte kertoo oikean muodon. Karjala (`krl`) ja muut kielet
pitävät numeron, koska taivutusta ei ole kuultu niissä. Testit: `announcer.test.jsx` (*ruutu
kymmenen* ja *risti 7:llä* samassa viestissä) ja `kohdistus-alussa.test.jsx`.

Tommin kuuntelu klo 22 (puhetulostus näkyvissä):

| Kohta | Tulos |
|---|---|
| Viestirivi oman siirron jälkeen | kohdistus siirtyy oikein, mutta lyödyt kortit kuuluvat kolmesti |
| Mestarin kupla | neuvo ja *Sulje* kuuluvat, kohdistus palaa oikein, mutta alussa kuuluu *emoji* |
| Emojittomat napit (J-13) | napin puhetuloste *"Kysy Mestarilta. Painike"*, emoji ei kuulu |

**J-19. Murtoluku kuuluu numeroina.** Tila: korjattu dev-versiossa 16.10.2026, kuunneltu ok.
Tommi: kun kaato ei onnistu, *0/2* pitäisi sanoa *nolla kahdesta* ja *0/1* *nolla yhdestä*.
Korjaus: `spokenFractions` (`helpers.js`) sanoo suomessa murtoluvun sanoina, ja `needsSpoken`
antaa viestille puhutun muodon myös ilman maata. Kahtatoista suuremmat jäävät numeroiksi.
Testi: `announcer.test.jsx`.

**J-20. Kuplan sulkunappi sanoo *emoji* ennen neuvoa.** Tila: korjattu dev-versiossa
16.10.2026, kuunneltu ok. Tommi kuuli *emoji* ennen sanaa *Mestari*. Ensimmäinen arvaus oli
kuplan 🧙, ja sen piirtäminen CSS:llä ei auttanut (Tommin kuuntelu klo 22.20). Puhetuloste
näytti syyn: TalkBack sanoo ensin pelkän ✕:n omana lausumanaan ja sitten *"Mestari: … Sulje.
Painike"*. Androidilla `aria-labelledby` ei korvaa napin omaa tekstiä (`uiautomator`: teksti
*✕*), toisin kuin `aria-label`, joten muut ✕-napit kuuluivat oikein (J-16). Korjaus: kuplan
✕ on `aria-hidden`-kääreessä, ja CSS-velho on peruttu.

**J-22. Lyödyt kortit kuuluvat kolmesti.** Tila: korjattu dev-versiossa 16.10.2026,
kuunneltu ok (Paskahousu: oma kortti kerran, *Vuorossa Hero* kuuluu). Tommi: Paskahousussa kaatamaton kortti kuuluu *"Hero risti 4, Hero risti
4, Hero risti 4, vuorossa Kukkahattutäti"*. Puhetuloste Pixelillä: kohdistettu viestirivi
sanoo viestin heti (ilman pistettä), ja TalkBack lukee rivin uudelleen sen tekstin vaihtuessa.
Live-alue sanoo saman viestin pisteen kanssa, ja sen jono laahaa sekunteja jäljessä.

Ensimmäinen korjaus (Tommin valinta: live-alue hiljaa, kun kohdistus on rivillä) poisti
toiston, ja oma kortti kuului kerran. Tommi kuitenkin huomasi, että Heron vuoron alun tunnisti
vain hiljaisuudesta. Puhetuloste näytti syyn: TalkBack ei lue kohdistetun rivin jokaista
muutosta. Kierroksen yhdeksästä viestistä kuului neljä, eikä *Vuorossa Hero* ollut niiden
joukossa.

Toinen korjaus (Tommin valinta: rivi jäädytetään): `GameMessageRow` (`Spoken.jsx`) jäädyttää
rivin ruudunlukijalle kohdistuksen saadessaan. Se sanoo oman siirron kerran ja pysyy samana
seuraavaan omaan siirtoon asti, ja näkyvä viesti on silloin `aria-hidden`. Samalla se ohittaa
live-alueen jonon (`skipAnnouncements`), jossa oma siirto odottaa. Live-alue sanoo kaikki
myöhemmät viestit, ja ensimmäinen viesti odottaa 150 ms, jotta turvaverkko (50 ms) ehtii
ensin. Kasino käyttää samaa komponenttia. Puhetuloste Pixelillä: *"Hero: pata kaksi"* kerran,
sitten seitsemän bottien viestiä järjestyksessä live-alueelta. Testit: `announcer.test.jsx`
ja `kohdistus-alussa.test.jsx`.

**J-23. Botin vaihto kuuluu kahdesti.** Tila: korjattu dev-versiossa 16.10.2026,
kuunneltu ok. Tommi: kun joku muu vaihtaa kortin, vaihto kuuluu kahdesti, ja ensimmäinen on
liikaa. Puhetuloste: *"Veeti vaihtaa!"* ja heti perään *"Veeti vaihtaa! hertta seitsemän
kasaan."* Paskahousun `doAISwap` kirjasi erillisen `aiSwaps`-rivin ennen `applySwap`ia, joka
kirjaa vaihdon kortteineen. Rivi ja käyttämätön avain poistettu (23 kieltä). Muutos näkyy
myös lokissa, jossa sama vaihto oli kahdella rivillä.

**Kaksoisnapauta pitkään.** TalkBackin vihje *"kaksoisnapauta ja pidä painettuna"* kertoo,
että kohteella on pitkän painalluksen toiminto. Pelisivulla yksikään Jaon solmu ei ole
pitkään painettava (`uiautomator`, `long-clickable`), mutta Chromen sivualue on. Tommi kuuli
vihjeen, kun napautin adb:llä valikon versioleimaa, joka ei ole kohdistettava: TalkBack
kohdisti sivualueen. Ei Jaon vika.

**J-21. Versionumero kuuluu päivämääränä.** Tila: korjattu dev-versiossa 16.10.2026,
kuunneltu ok. Tommi kuuli *"versio ensimmäinen toista kaksisataakolmekymmentäseitsemän julkaistu
kuudestoista kymmenettä 2026 kello 19:49"*: syntetisaattori lukee *1.2.237*:n päivämääränä.
Korjaus: suomen `ui.a11y.version` sanoo pisteet sanoina (*Versio 1 piste 2 piste 237*).
Päivämäärän lukutapa on tavallinen suomi ja jää.

## Julkaisu 1.2.238 17.10.2026

J-13–J-23 julkaistu (Jako `d0b7db4`). Todennettu tuotantobundlesta selaimella noin minuutti
pushin jälkeen: molemmat domainit tarjoavat `index-UozljuaL.js`:n, joka on sama kuin paikallinen
build. Bundlessa on `"1.2.238"`, `data-game-message`, *kahdesta* ja *piste*, eikä `aiSwaps`ia.
Muutoslokin chunkissa (`changelog-fi-C7qBwt5J.js`) on 17.10.2026:n merkintä. Ensimmäinen haku
näytti vielä 1.2.237:n, koska palvelutyöntekijä tarjosi vanhaa sivua; ohi välimuistin haettu
sivu näytti uuden.

**Seuraavaksi:** Tommin kuuntelu tuotannossa, jonka jälkeen työjonon kohta 46 sulkeutuu ja
kohdan 47 kirje voi lähteä.

## Kuuntelu tuotannossa 1.2.238:lla 17.10.2026 klo 02.50

Tommi kuunteli 1.2.238:n Pixelillä tuotannosta (`tommi-jako.vercel.app`). Hän kuuli *Jako*-sanan
perässä 9:n. Versiorivi kuului muodossa *"v ensimmäinen toista…"* eikä *"Versio 1 piste 2…"*.
Versiorivi tuli sivua pyyhkäistäessä heti Chromen *Muokkaa ja hallinnoi Google Chromea*
-napin jälkeen. Androidin saavutettavuuspuussa (`uiautomator dump`) otsikko on *JAKO* ilman 9:ää.
Jaa-nappi on puussa *Jaa Jako* ja versiorivi *Versio 1 piste 2 piste 238, julkaistu…*, joten
J-17 ja J-21 ovat puussa oikein. Syitä on kaksi, ja molemmat mitattiin TalkBackin puhetulosteesta.

**J-24. Napin title kuuluu nimen perässä.** Tila: korjattu dev-versiossa 17.10.2026,
kuunneltu ok Pixelillä klo 03.20 (Jaa-nappi *"Jaa Jako. Painike."*, kielinappi ja jokainen
kieli kerran, versiorivi sanoina), ei julkaistu. Jaa-nappi sanoo *"Jaa Jako. Painike. Jaa Jako⁹"*: Chrome antaa
`title`-attribuutin TalkBackille lisätietona, joka luetaan nimen jälkeen. J-17 poisti ⁹:n
`aria-label`ista mutta ei `title`stä. Tommin valinta: tooltip pois. Se poistettiin Jaa-napista,
kielinapista (*"Kieli: Suomi"* + *Suomi*) ja kielivalikon kielistä, joissa nimi olisi kuulunut
kahdesti. Vahti: `ruudunlukija-maat.test.jsx` kaataa valikon napin, jolla on `title`. Vanhalla
koodilla se kaatoi 25 nappia. Auki: `GameStatusBar`in Tilanne-napin `title="H"` kertoo
pikanäppäimen ja kuuluu samalla tavalla *H*:na nimen perässä. Se on eri päätös, koska
title kantaa siinä tietoa.

**Tekstintunnistus lukee verkkonäkymän kuvana.** Ei Jaon vika, eikä sivu voi estää sitä.
Kun pyyhkäisy siirtyy Chromen työkalupalkista sivulle, kohdistus osuu ensin koko verkkonäkymään.
TalkBack sanoo silloin *"Jako · Tommin kokoelma. Verkkonäkymä"* ja perään *"Havaittu: Teksti,
"JAKO 9 ★ Uusi peleissä? … V1.2.238 17.10.2026 00.02""*. Tämä on TalkBackin tekstintunnistus:
se lukee ruudulla näkyvän tekstin kuvasta eikä saavutettavuuspuusta, joten `aria-hidden` ja
`sr-only` eivät vaikuta siihen. Tommin *v ensimmäinen toista* ja otsikon 9 tulivat sieltä.
Päätelmä, ei mitattu: J-9:n ja J-14:n *koko sivun luku* voi olla samaa tunnistusta silloin, kun
kohdistus putoaa verkkonäkymään. Tunnistuksen voi kytkeä pois TalkBackin asetuksista, ja se on
Tommin laitteen asetus.

Mittaus tehtiin adb-napautuksilla ja pyyhkäisyillä, ja puhetuloste kaapattiin puhelimen omalla
`screencap`-silmukalla, joka on nopeampi kuin adb-haku. Yksi napautus avasi Asetukset ja
takaisin-näppäin sulki tuotantovälilehden, minkä jälkeen välilehti avattiin uudelleen.

**J-25. Maijan botin nosto kuuluu kahdesti, eikä kortteja nimetä.** Tila: korjattu
dev-versiossa 17.10.2026, kuunneltu ok Pixelillä (kaadot ja nostot kerran korttien kanssa),
ei julkaistu. Tommi: kun puolustaja joutuu nostamaan
kaatamattomia kortteja, viesti toistuu. Pixelin loki: *"Setämies kaataa 0/2 ja nostaa 2
korttia."* ja sekuntia myöhemmin *"Setämies nosti 2 korttia kaatamatta jääneistä."* Botti
sanoi noston päätöksen hetkellä (`runAIDefend`), ja `resolveDefenseLoss` kirjasi saman teon
uudelleen. Ihmisen *Ota kaikki* kulkee vain jälkimmäistä reittiä, joten Heron nosto kuului
kerran. Tommin toive: näkövammainen pelaaja haluaa tietää, millä korteilla kaadettiin ja mitä
nostettiin. Tommin valinnat: kaato ja nosto ovat eri viestit, ja myös Heron nosto nimeää
kortit. Nyt botti sanoo *"Arttu kaatoi ruutu kaksi kortilla risti seitsemän."* (kaikki
kaadettuina *"kaatoi kaikki: …"*) ja *"Juuso nostaa pata rouva."*, ja Hero *"Hero nosti pata
kaksi, pata neljä kaatamatta jääneistä."* `resolveDefenseLoss` ei kirjaa botin nostoa toista
kertaa. Avaimet `aiPartialBeat` ja `defenderWinRound` korvattiin avaimilla `beatPair`, `aiBeats`,
`aiBeatsAll` ja `aiTake` (23 kieltä, muodot kunkin kielen *Hero kaatoi* -viestistä). Testi
`maija-nosto-kerran.test.jsx` pelaa Bottien Taistelun ja kaatuu tuplanostoon. Vanhalla koodilla
se kaatui yhdeksään. Selaimessa nähtiin täyskaato, botin nosto ja Heron nosto korttien kanssa.
Osittaista kaatoa, jossa samassa vuorossa on kaato ja nosto, ei nähty selaimessa.

**J-26. Heron nosto ei nimeä kortteja.** Tila: korjattu dev-versiossa 17.10.2026, ei
kuunneltu eikä julkaistu (ks. toteutus taulukon jälkeen). Kartoitettu 17.10.2026 ja siirretty
seuraavaan sessioon Tommin päätöksellä (iso urakka). Tommi: kun Hero nostaa, kortit pitäisi
kertoa, myös Maijan pakasta nostossa ja muiden pelien nostoissa. Bottien nostoja ei nimetä,
koska niiden kortit ovat salaisia. Kartoitus koodista:

| Peli | Heron nosto | Nykyinen viesti |
|---|---|---|
| Maija | täydennys pakasta viiteen (`drawHand`) | ei viestiä |
| Maija | Ota kaikki (`resolveDefenseLoss`) | nimeää kortit (J-25) |
| Paskahousu | täydennys pakasta lyönnin jälkeen (`fillHand`, rivit 542 ja 661) | ei viestiä |
| Paskahousu | kasan nosto (`tookPile`) | vain määrä |
| Paskahousu | tyhjälle lyöty 10 tai A (`emptyPenalty`), seuraava nostaa | nostettua ei nimetä |
| Moska | täydennys kuuteen (`playerDrew`, rivit 548 ja 1027) | vain määrä |
| Moska | pöydän otto (`defenderTook`) | pöytä nimetään jo |
| Seiska | unohtunut Lappu, +3 korttia (`forgotLappu`) | vain määrä |
| Seiska | nosto ja ässärangaistus (`humanDraws`, `aceDrawn`) | nimeää kortin |
| Koputus, Kultakala | nosto pakasta tai poistopakasta | nimeää kortin |
| Ristiseiska | pantti (`passGiveRandom`) | nimeää kortin |

Läpsyssä pinot ovat kuvapuoli alas eikä kättä ole, joten nostettavaa nimettävää ei ole.
Kasinon uusi jako ei ole nosto, ja se jäi kartoituksen ulkopuolelle. Toteutus: Heron versio
viestistä kortteineen (`lblColored`, kuten J-25), uudet avaimet 23 kieleen, testit ja kuuntelu
Pixelillä. Ennen toteutusta kysytään muoto, esimerkiksi *"Hero nosti pakasta hertta kuusi,
risti ässä."*, ja se, nimetäänkö Paskahousun suuri kasa kokonaan.

*Toteutus 17.10.2026.* Tommin valinnat: muoto on määrä ja kortit (*"Hero nosti 2 korttia:
hertta kuusi, risti ässä."*), ja Paskahousun kasa nimetään kuuteen korttiin asti. Isompi kasa
kerrotaan määränä (*"Hero nostaa 7 kortin kasan."*), koska käden voi lukea erikseen. Raja 6 on
kysymyksen esimerkkiluku, ja se on vakio `PILE_NAME_MAX`.

Kartoitusta korjattiin kahdesti koodia vasten. Paskahousun tyhjän pöydän rangaistus nimesi
kortin jo ennestään. Rangaistu nostaa vuorollaan ja `skipCard` sanoo silloin *"Hero nostaa
(risti ässä) ja menettää vuoronsa."* Sen sijaan sokkokoputus, joka ei käy (`blindBad`), siirtää
koko kasan käteen nimeämättä. Sitä ei ollut taulukossa. Nyt sitä seuraa sama kasarivi kuin
*Nosta kasa* -napista.

Muutokset: Maijan `drawHand` kirjaa Heron täydennyksen kaikilla kolmella polulla (hyökkäys,
täyskaato ja nosto). Paskahousu kirjaa täydennyksen lyönnin ja koputuksen jälkeen, kasan noston
ja sokkokoputuksen kasan. Moskan kumpikin nostopolku käyttää `M.drew`-funktiota, joka nimeää
vain Heron kortit. Seiskan Lappu-sakko nimeää Heron sakkokortit. Uudet avaimet `heroDrew`
(Maija, Moska, Paskahousu), `tookPileCards` ja `forgotLappuCards` ovat 23 kielessä. Ne on
johdettu kunkin kielen nykyisestä viestistä lisäämällä kortit kaksoispisteen jälkeen.
Englannin Lappu-sakko on kirjoitettu käsin, koska siinä oli jo kaksoispiste.

Testi `heron-nosto.test.jsx`: Bottien Taistelussa neljässä pelissä mikään nostorivi ei nimeä
kortteja. Hero lyö ja ottaa Maijassa, Moskassa ja Paskahousussa, ja täydennysrivin korttien
lukumäärä vastaa ilmoitettua määrää. Paskahousun kasarivi nimeää kortit kuuteen asti ja on sen
yli pelkkä määrä. Testi meni läpi seitsemän kertaa peräkkäin. Selaimessa Paskahousu näytti
kasan noston kortteineen (1–6 korttia), seitsemän kortin kasan määränä ja sokkokoputuksen
jälkeisen kasarivin. Maijan ja Moskan täydennys nähtiin vain testissä. Seiskan Heron
Lappu-sakkoa ei nähty selaimessa eikä testissä.

*Kuuntelu Pixelillä 17.10.2026 (dev, portti 5186).* Tommi kuunteli TalkBackilla kahdeksan
kohtaa. Kunnossa: Paskahousun pieni ja iso kasa, täydennys lyönnin jälkeen, Seiskan Lappu-sakko
ja se, ettei botin nostoa nimetä. Pettivät: Maijan ja Moskan täydennyksen kortit eivät
kuuluneet, eikä sokkokoputuksen kortti kuulunut (kasarivi kuului).

Syy mitattiin selaimessa Maijan hyökkäyksellä. Oma siirto vie kohdistuksen viestiriville, ja
rivi sanoi vain viimeisimmän viestin (*"Chad puolustaa, 1 kortti kaadettavana."*). Samalla se
tyhjensi ilmoitusjonon, joten oma lyönti ja täydennysrivi katosivat kuulumatta. Viesti ei siis
puuttunut vaan hukkui. Paskahousussa täydennys sattui olemaan viimeinen rivi. Korjaus:
`skipAnnouncements` palauttaa jonon, ja rivi sanoo kaikki jonossa odottaneet viestit
järjestyksessä (`announcer.test.jsx`). Korjattua ei ole vielä kuunneltu.

Kuuntelussa nousi neljä uutta havaintoa, ne ovat J-27–J-30.

**J-27. Moskan pöytäkuvaus lausuu emojin.** Tila: korjattu dev-versiossa 17.10.2026, ei kuunneltu.
Kun puolustus ei onnistu, kaatamattoman kortin perässä on ❌ (`resolveRound`, `tableDesc`), ja
TalkBack lukee sen. Kaadettu pari on muotoa `atk→def`, ja nuolikin voi kuulua. Tommin valinta:
sanat parin ja tilan mukaan (*"pata viisi, kaatajana hertta seitsemän; risti yhdeksän
kaatamatta"*). Näkyvä muoto pysyi. Apuri `eyeAndEar` (`helpers.js`) antaa viestin osalle eri
muodon silmälle ja korvalle, ja `spokenHtml` jättää näkyvän osan pois. Avaimet `beatenBy` ja
`unbeaten` ovat 23 kielessä.

*Toinen kuuntelu 17.10.2026.* Pöytäkuvaus kuului oikein. Puolustusvuoron rivi kuului silti
*"0 emoji 2 emoji"*, koska kaadettujen ja kaatamattomien määrä (`{beaten}🛡️/{unbeaten}⚔️`)
oli käännöspohjassa kahdessa avaimessa (`defendHumanCards`, `statusOnTable`). Pohja on nyt
`{tally}`, ja korvalle se on *"0 kaadettu, 2 kaatamatta"* (avain `tally`, 23 kieltä). Parien
väliin tuli korvalle puolipiste, koska pilkuin erotettuna parin raja hämärtyi (selaimessa
kuultu muoto *"ruutu neljä, kaatajana ruutu kahdeksan, risti kahdeksan, …"*).

*Kolmas kuuntelu 17.10.2026.* Emoji ei enää kuulunut, mutta puhe taivutti luvun
kaatamatta-sanan mukaan (*"kahdetta kaatamatta"*). Suomessa ja karjalassa sana on nyt ennen
lukua (*"kaadettu 0, kaatamatta 2"*). Sivustalyöntivaiheen alkurivi luetteli vain
hyökkäyskortit, vaikka puolustuskorttienkin arvoilla saa lyödä sivusta. Rivi kertoo nyt pöydän
pareittain samalla funktiolla kuin kierroksen loppu (`describeTable`).

*Neljäs kuuntelu 17.10.2026.* Puolustusvuoro, tilarivi ja sivustalyöntivaiheen alku kuuluivat
oikein. Kesken jääneen kaadon tilarivi kuului kuitenkin *"kaatamatta yhdellä pöydällä"*,
koska puhe taivutti luvun seuraavan sanan mukaan. Suomessa ja karjalassa paikka on nyt ennen
määriä (*"pöydällä kaadettu 2, kaatamatta 1"*). Säännöksi tästä: suomenkielisessä
ruudunlukijatekstissä numeroa ei kirjoiteta taivutetun sanan eteen, koska TalkBack taivuttaa
luvun sen mukaan.

*Viides kuuntelu 17.10.2026.* Kesken jääneen kaadon tilarivi kuului oikein. Uusi havainto:
pelin alussa valttivaihdon rivi (*"💫 {name}: 2♦ ↔ {kortti} (valttivaihto)"*) kuului emojeineen.
Korjaus on yleinen: `spokenHtml` jättää emojit pois kaikista peliviesteistä, kuten `Spoken`
napeista jo J-13:ssa, joten käännöspohjaan jäänyt emoji ei kuulu missään pelissä. Lauseke
`EMOJI` siirtyi `helpers.js`:ään. Korvalle rivi on nyt *"Hero: ruutu kaksi ruutu kymmenen
(valttivaihto)"*. Nuoli jää siis sanomatta, ja vaihdon suunnan kertoo vain sana valttivaihto.

**J-28. Seiskan kahden kortin lyönti sanoo jälkimmäisen kahdesti.** Tila: korjattu dev-versiossa 17.10.2026, ei kuunneltu.
Ryhmälyönnin rivi on `kortit → päällimmäinen`. Nuoli kertoo näkevälle, mikä jää päällimmäiseksi,
mutta ruudunlukija kuulee vain saman kortin uudestaan. Tommin valinta: kahden, kolmen tai neljän
kortin lyönnissä päällimmäinen kerrotaan sanalla. Korvalle rivi on *"Hero: hertta viisi, pata
viisi. Päällimmäinen: pata viisi."* Se käyttää olemassa olevaa avainta `topCard`.

**J-29. Aloita-nappi ei saa kohdistusta pelin aloitussivulla.** Tila: korjattu dev-versiossa
17.10.2026, ei kuunneltu. Tommin valinta: kohdistus Aloita-nappiin, ja napin nimessä on peli
(*"Aloita Moska"*), koska se kertoo samalla mikä peli avautui. Näkyvä teksti *"Aloita →"* pysyi.
Selaimessa todennettu: valikosta tultaessa kohdistus on napissa ja nimi on *"Aloita Moska"*.
Avain `beginNamed` on 23 kielessä.

**J-30. Kohdistus Lyö-nappiin kortin valinnan jälkeen (Paskahousu ja Seiska).** Tila:
hylätty 17.10.2026 Tommin päätöksellä. Kohdistus jää korttiin, koska toisen samanarvoisen
kortin valinta vaatisi muuten paluun käteen.

**J-31. Moskan sivustalyönti paljasti botin käsikortit.** Tila: korjattu dev-versiossa
17.10.2026, ei kuunneltu. Tommi huomasi kuuntelussa, että rivi *"{name} voi lyödä sivusta:
{cards}"* luetteli botin kaikki sivustalyöntiin kelpaavat käsikortit. Se rikkoi kaanonia
(`MOSKA.md` › Pelaajien näkyvyys: muiden kädet ovat piilossa), ja tieto näkyi myös näkevälle
lokissa. Rivi ja avain `aiCanAdd` poistettiin. Lyöty kortti kuuluu yhä `doAdd`in rivillä
(*"… löi sivusta: risti kahdeksan."*), ja se on julkinen. Selaimessa todennettu Bottien
Taistelussa.

**J-32. Sivun otsikko oli "Jako · Tommin kokoelma".** Tila: korjattu dev-versiossa 17.10.2026,
ei kuunneltu. Tommin valinta: kieliversioitu *"Jako · korttipelikokoelma"* (avain `docTitle`,
23 kieltä). App kirjoittaa otsikon kielen mukaan. `index.html` ja `manifest.json` ovat
suomeksi, koska manifestia ei käännetä lennossa.

**J-33. Valikon alaraita oli numeromössöä näkevällekin.** Tila: korjattu dev-versiossa
17.10.2026. Näkyvä teksti on nyt samaa muotoa kuin ruudunlukijan (*"Versio 1.2.239, julkaistu
17.10.2026 klo 18.44"*) kullakin kielellä. Vain suomen korvamuoto sanoo version pisteineen.
Selaimessa todennettu.

**Pitkä viesti (havainto, ei toimenpidettä).** Tommi: viestirivin pitkä pötkö on haastava.
Moskassa sivustalyöntivaihe katkaisee sen sopivasti. Muissa peleissä katkaisua ei vielä ole
mietitty.

**Seuraavaksi:** kohta 46 odottaa Tommin kuuntelua tuotannossa. J-26–J-33 on kuunneltu
Pixelillä dev-versiona ja julkaistu 1.2.240:ssä. Valttivaihdon emoji kuunnellaan tuotannossa
Tommin päätöksellä.

## Julkaisu 1.2.240 17.10.2026

J-26–J-33 julkaistu (Jako `1d0f7db`, push klo 20.30). Tuotantobundlesta todennettu selaimella
pushin jälkeen. Molemmat domainit tarjoavat `index-DA79-NG-.js`:n, jossa on `"1.2.240"`,
`eyeAndEar`in merkintä `data-v aria-hidden` ja avain `beginNamed`. Hash on sama kuin paikallisen
buildin. Pääosoitteen HTML:n otsikko on *"Jako · korttipelikokoelma"*.

## Julkaisu 1.2.239 17.10.2026

J-24 ja J-25 julkaistu (Jako `dcbe43a`, push klo 03.57). Tuotantobundlesta todennettu
selaimella noin kaksi minuuttia pushin jälkeen. Molemmat domainit tarjoavat `index-B1OeUDL_.js`:n,
jossa on `"1.2.239"`, Maijan `aiBeatsAll`-kutsu ja suomen `{name} nostaa {cards}.`. Siinä ei ole
`aiPartialBeat`ia eikä Jaa-napin `title`a. Muutoslokin chunkissa (`changelog-fi-ComlPMQ7.js`) on
uusi merkintä. Paikallisen buildin hash oli eri (`BZFD7XTk`), mikä deploy-skillin mukaan ei ole
virhe. Pääosoite näytti ensin 1.2.238:n palvelutyöntekijän välimuistista, kuten 1.2.238:n
julkaisussa.

## Kuuntelu 17.10.2026 klo 21.50

**J-9 kuuluu kerran.** Tommi: *"vastustajat kuuluu kerran"*. Kohdan 46 J-9-osa on kuunneltu.
J-14 kuunneltiin samalla kierroksella (alla).

**Uusi portti.** Valttivaihdon emoji kuului viidennessä kuuntelussa `localhost:5186`:ssa, eikä
korjausta (`f6ba6b0`) ole kuunneltu. Jotta kuunneltava versio on varmasti uusin, dev-palvelin
käynnistettiin juuren `launch.json`in uudella `jako-dev-adb-5188`-merkinnällä HEAD:sta `469f586`
(1.2.240), ja Pixelille avattiin `adb reverse tcp:5188`. Selaimessa todennettu:
`spokenHtml` antaa valttivaihdon rivistä *"Hero: ruutu kaksi ruutu kymmenen (valttivaihto)"*.

**Valttivaihto kuuluu ilman emojia.** Tommi kuunteli `localhost:5188`:ssa: emoji ei kuulu.
`localhost:5186`:ssa emoji kuului yhä, myös sivun uudelleenlatauksen jälkeen. Syy (päätelmä,
ei mitattu): 5186:n palvelin ei ollut käynnissä eikä Pixelillä ollut sille `adb reverse`ia
(tarkistettu 17.10. klo 21.50), joten verkkohaku epäonnistui. Palvelutyöntekijä (`public/sw.js`)
on rekisteröity myös dev-palvelimella, ja se antaa epäonnistuneen haun tilalle välimuistista
viimeksi haetut moduulit. Pixel ajoi siis 5186:n vanhaa versiota, ja uudelleenlataus sai
saman välimuistin. Kuolleesta dev-portista kuuntelija saa vanhan version ilman virhettä.
Tommin päätös 17.10.2026: palvelutyöntekijä jää dev-palvelimelle ennalleen, ja epävarmassa
tilanteessa kuunnellaan uudessa portissa.

**J-14 kuunneltu ok** (`localhost:5188`, koodi sama kuin julkaistu 1.2.240, `git diff
1d0f7db HEAD -- src public index.html` on tyhjä). Kaikki neljä reittiä toimivat: kortin pelaaminen
vie viestiriville, Asetusten sulku palaa Asetuksiin, Mestarin kuplan ✕ palaa Mestari-nappiin ja
paluu valikkoon osuu pelin kohdalle. Koko sivun lukua ei kuulunut. Kohta 46 suljettu.

## Valikon kuvausvirke ja ensikertalaisen ryhmä 17.10.2026

**Ensikertalaisen nimiryhmä** (Jako `f6a19d6`, Tommin päätös): suomeksi porukka (*Paikalliset*),
muilla kielillä Meme-jengi. Porukan lyhyet suomalaiset etunimet ovat korvalle kevein ryhmä.
Selain ei kerro sivulle ruudunlukijasta, joten valinta tehdään kielen perusteella. Tallennettu
valinta ei muutu. Selaimessa todennettu tyhjällä tallennuksella: `?lang=fi` antaa `porukka`,
`?lang=en` antaa `meme`.

**Kuvausvirke** (J-33:n jatko, Tommin ajatus: sivu kerrotaan proosana, koska TalkBack ohitti
sivulle kohdistettaessa napit ja asetukset). Valikon yläreunan virke kertoo, mitä sivulla on ja
mitä on valittuna: *"Jako on yhdeksän perinteisen korttipelin kokoelma. Ylhäällä ovat kielen
valinta, jakaminen, Info ja Asetukset. Vastustajat tulevat ryhmästä Paikalliset ja taso on
Kisälli. Valitse peli listasta. Tähdellä merkityistä peleistä on hyvä aloittaa."* Ryhmä ja taso
luetaan asetuksista, ja ryhmän nimestä jätetään emoji pois. Tommin päätökset: ensikertalainen
(ei yhtään pelattua peliä) näkee virkkeen, ruudunlukija kuulee sen aina, ja palaava näkevä
kävijä avaa sen linkistä *Mitä sivulla on?*, jota ei piiloteta ruudunlukijalta. Virke korvaa
★-vihjeen (avain `startHere` poistettu 23 kielestä). Tähti on neuvo eikä mitattu suosio, ja
suomalaisuusväite jätettiin pois. Avaimet `ui.menu.intro` ja `introToggle` 23 kielellä;
karjala, saame, romani ja latina ovat parhaan kyvyn käännöksiä kuten muutkin `untested`-kielet.
Selaimessa todennettu: ensikertalaisella näkyvä virke ilman linkkiä, palaavalla `sr-only`-virke
ja linkki (`aria-expanded="false"`), avattuna vain näkyvä virke (`true`). Ei kuunneltu.

*Kuuntelu Pixelillä 17.10.2026 (`localhost:5188`).* Virke kuului oikein. Linkkiä ei ollut,
koska Pixelin 5188:n tilastossa ei ollut loppuun pelattua peliä (J-14:n kokeilupelit jäivät
kesken), joten sivu oli ensikertalaisen tilassa. Tämä on suunniteltu toiminta. Tommi muotoili
kaksi lausetta uudelleen. Nykyiset valinnat kerrotaan sanalla *nyt* eikä *oletuksena*, koska
virke luetaan valinnoista ja vaihdetun ryhmän kohdalla *oletuksena* olisi väärin (Tommin valinta).
Nyt virke on *"… Vastustajasi ja heidän tasonsa voit valita, nyt ne ovat Paikalliset ja taso
Kisälli. Valitse peli listasta. Tähdellä merkityistä peleistä sopii aloittaa."* Muutos tehtiin
kaikkiin 23 kieleen. Pixelin ruudulta luettu teksti vastaa tätä. Palaavan kävijän linkkiä ei
ole vielä kuunneltu.

**J-34. Moskan puolustusviesti sanoo *kaadettu nolla*.** Tila: korjattu dev-versiossa 17.10.2026,
ei kuunneltu. Tommi kuuli *"On vuorosi puolustautua. Pöydällä: … (kaadettu nolla, kaatamatta
…)"*. Nolla kaadettua ei kerro mitään, ja kortit luetellaan jo viestissä. Korjaus: kun yhtään
korttia ei ole kaadettu, korva kuulee pelkän *kaatamatta N* (uusi avain `tallyUnbeaten`, 23
kieltä, johdettu kunkin kielen `tally`-avaimen jälkiosasta). Silmä näkee yhä `0🛡️/1⚔️`. Sama
`M.tally` on myös lyönnin tilarivissä, joten korjaus koskee sitäkin. Testit `announcer.test.jsx`.

## Julkaisu 1.2.241 17.10.2026

Kuvausvirke, ensikertalaisen ryhmä ja J-34 julkaistu (Jako `7d9823a`, push klo 23.32, Tommin
*julkaise kaikki*). Tuotantobundlesta todennettu selaimella pushin jälkeen. Molemmat domainit
tarjoavat `index-Cd-muPF0.js`:n, jossa on `"1.2.241"` sekä avaimet `introToggle` ja
`tallyUnbeaten`. Paikallisen buildin hash oli eri (`DiATmYJI`), mikä deploy-skillin mukaan ei
ole virhe. Kuvausvirkkeen palaavan kävijän linkkiä ja J-34:ää ei ole kuunneltu.


## Julkaisu 1.2.242 18.10.2026

J-13 julkaistu kokonaan (ryhmät 1–6, Jako `b15bb40`, push klo 23.57, Tommin *julkaise J-13:n
korjaukset, kuunnellaan tuotannossa*). Tuotantobundlesta todennettu selaimella pushin jälkeen.
Molemmat domainit tarjoavat `index-DRqXQ7d6.js`:n, jossa on `"1.2.242"` sekä avaimet `srTurn`,
`statSpoken` ja `srLowerRange`. Paikallisen buildin hash oli eri (`BZ_LjooG`), mikä
deploy-skillin mukaan ei ole virhe. Kuuntelu tekemättä: J-13:n korjaukset, kuvausvirkkeen
palaavan kävijän linkki ja J-34. Pixelin tuotantotallennuksessa oli 18.10. klo 23 nolla
pelattua peliä, joten linkki tulee näkyviin vasta yhden loppuun pelatun pelin jälkeen.

## Kuuntelu tuotannossa 19.10.2026

Tommi kuunteli Pixelillä tuotanto-osoitteessa. Versioleima sanoi 1.2.241, ja Pixelin
Jako-välilehti ajoi bundlea `index-DttMCpf-.js` (1.2.241) vaikka 1.2.242 oli julkaistu.
Palvelutyöntekijä antoi vanhan version välimuistista, kuten 1.2.238:n ja 1.2.239:n
julkaisuissa. Kuuntelu koski siis 1.2.241:tä, eikä J-13:n korjauksia ole vielä kuultu.

- *J-34 kuunneltu ok:* Moska sanoi *"kaatamatta kaksi"*.
- *Palaavan kävijän linkki ok* (kohta 2): Kultakalan loppuun pelatun pelin jälkeen.
- *Valikon tilasto* kuului *"Kultakala nolla volttia yksi p nolla prosenttia"*. Se on
  1.2.241:n muoto, jonka 1.2.242 korjasi (`ui.statSpoken`). Kuunneltava uudelleen.
- *Pelaajarivit:* Tommi kuuli *vuorossa* ja *puolustaa* oikein eikä emojeja. Koska versio oli
  1.2.241, sanat tulivat todennäköisesti viesteistä eivätkä 1.2.242:n riveistä (päätelmä).
- *Moskan Ohita* toisti kerran *"Ohita, painike"* useita kertoja. Tommi yritti toistaa sitä
  useamman kerran, eikä se toistunut. Kirjattu toistumattomana, syy tuntematon.
- *Kultakalan vaihto tuntui kankealta.* Tarkempi kuvaus puuttuu.

**J-35. Lopun korttiluettelo sanoo jokaisen kortin perään "kuva".** Tila: korjattu
dev-versiossa 19.10.2026, ei kuunneltu. Tulosruudun paljastetut kortit (Kultakala, Koputus)
olivat kukin oma `role="img"`. Nyt pelaajan rivi kuuluu yhtenä lauseena
(*"Jens: pata kuusi, risti neljä, …"*), ja näkyvä rivi on `aria-hidden`.

**J-36. Kultakalan botin vaihtoviesti paljastaa botin piilokortit.** Tila: korjattu
dev-versiossa 19.10.2026 Tommin vahvistuksella, ei kuunneltu. Tommi kuuli bottien kaikki kortit, vaikka Avoimet kortit oli pois.
Viesti `aiSwapChain` nimeää jokaisen kortin, jonka botti vaihtaa piilossa oleviin paikkoihin
(*"Jens vaihtaa: paikka 5: pata kuusi → paikka 4: risti neljä, pata kuningas poistopakkaan"*).
Sama näkyy myös ruudulla, joten vuoto koskee näkevääkin. KULTAKALA.md:15: *"Muiden pelaajien
kortit ovat piilossa koko pelin ajan."* Koodi rikkoo kaanonia. Tommin toive: kuulla vain
poistopakkaan menevä kortti ja vaihtojen paikat. Ehdotettu muoto: *"Jens vaihtaa: paikka 5,
sitten paikka 4, pata kuningas poistopakkaan"*, ja Avoimet kortit tai Bottien Taistelu
näyttää kortit kuten nyt.

*J-36:n korjaus 19.10.2026.* Ilman Avoimia kortteja ketju kertoo vain paikat (uusi avain
`games.kultakala.msg.slotPos` 23 kielellä, johdettu `slotItem`ista). Näkyvyys luetaan refistä
(`revealAllRef`), koska botin ajastettu siirto voi nähdä vanhan tilan. Testi
`kultakala-piilokortit.test.jsx` pelaa kolme peliä molemmissa tiloissa: piilossa ketjussa ei ole
korttia, avoimena on. Testi kaatui ilman korjausta (tarkistettu). Selaimessa todennettu Bottien
Taistelussa: *"Janus vaihtaa: paikka 5: risti neljä, sitten paikka 4: ruutu viisi, …"*, mikä
todentaa samalla Kultakalan *sitten*-sanan.

## Julkaisu 1.2.243 19.10.2026

J-35 ja J-36 julkaistu (Jako `6e7af78`, push klo 1.26, Tommin *julkaise*). Tuotantobundlesta
todennettu selaimella pushin jälkeen: molemmat domainit tarjoavat `index-esyo7-Ef.js`:n, jossa on
`"1.2.243"` ja avain `slotPos`. Hash on sama kuin paikallisen buildin. Kuuntelu tekemättä:
J-13 (1.2.242), J-35 ja J-36. Pixelillä vanha versio tulee palvelutyöntekijän välimuistista,
joten ennen kuuntelua tarkistetaan versioleima.

## Oikaisu 19.10.2026: Pixelin vanhan version syy

Kaksi yllä olevaa merkintää (*Kuuntelu tuotannossa 19.10.2026* ja *Julkaisu 1.2.243*)
väittävät, että Pixelin 1.2.241 tuli palvelutyöntekijän välimuistista. Väite ei pidä
sellaisenaan. `public/sw.js` hakee navigoinnin verkosta ensin (`fetchAndCache`), ja
välimuisti vastaa vain kun haku epäonnistuu. Verkon toimiessa uusi lataus saa siis uuden
`index.html`:n ja sen myötä uuden bundlen. Välimuisti ei selitä vanhaa versiota.

Todennäköisempi syy on päätelmä, ei mittaus: Pixelin Jako-välilehti avattiin 18.10. klo 22.58,
ennen kuin 1.2.242 julkaistiin (push klo 23.57), eikä välilehteä ladattu sen jälkeen uudelleen.
Avoin välilehti ajaa sitä bundlea jonka se latasi. Välilehden latausaikaa ei luettu laitteelta,
joten päätelmää ei ole todennettu.

Seuraus käytäntöön ei muutu: ennen kuuntelua luetaan laitteen ajama versio. Deploy-skilliin
lisättiin samana päivänä askel, joka lukee bundlen ja versioleiman laitteelta DevTools-yhteydellä
ja vertaa niitä tuotantoon, ennen kuin Tommi kuuntelee. Alkuperäinen teksti jää ennalleen.

## Vahtien laajennus 19.10.2026

Retron kolme vahtimuutosta (Tommin valinta 19.10.2026):

- *Toistettavuus.* `ruudunlukija-maat.test.jsx` ja `kultakala-piilokortit.test.jsx` siementävät
  `Math.random`in pelin ja kierroksen mukaan. Ennen siementä vuoto *"🏠 MÖKKI"* näkyi vain
  yhdessä viidestä ajosta. Kahden ajon tulos oli sama. Kultakalan kerätyt vaihtoketjut olivat
  tavulleen samat. Kasinon siemenet 0–11 ajettiin erikseen, eikä *MÖKKI*-vuotoa tullut yhdelläkään.
  Se on todennäköisesti poistunut J-13:n korjauksissa (päätelmä), mutta alkuperäistä ajoa ei voi
  toistaa.
- *Koputuksen piilokortit.* `koputus-piilokortit.test.jsx` yleistää J-36:n testin. KOPUTUS.md:
  muiden kortit ovat piilossa koko pelin, poistopakka näkyy kaikille. Botin viesti saa nimetä vain
  poistopakkaan menevän kortin, eikä bottien pöytäkortti saa kuulua. Vuotoja ei löytynyt kolmessa
  pelissä. Kontrolli: Avoimet kortit näyttää bottien kortit, jolloin sama tunnistin löytää ne.
- *App-tason näkymät.* `ruudunlukija-app.test.jsx` renderöi Appin ja käy pelin yläpalkissa,
  tulosruudussa paljastetuilla korteilla ja tilastopaneelissa. Tunnistin (`suitLeaks`) siirtyi
  tiedostoon `test/ruudunlukija-vuodot.js`, jotta molemmat vahdit tarkistavat saman säännön.

**J-37. Tulosruudun mitali ja tilastopaneelin pelikuvake kuuluvat emojina.** Tila: korjattu
dev-versiossa 19.10.2026, ei kuunneltu. Uusi App-vahti löysi ne ensimmäisellä ajolla. Tulosruudun
sija oli pelkkä 🥇, 🥈 tai 🥉, joten TalkBack sanoi mitalin nimen eikä sijaa. Tilastopaneelin
jokaisen pelin rivi alkoi pelin kuvakkeella (👋, 🤜, ♣ jne.). Pelatun pelin rivi on nappi,
jonka nimeen kuvake tuli. Sijoitusjakauman rivit alkoivat samoilla mitaleilla. Korjaus J-13:n
mallilla: kuvake on koriste (`Deco`). Mitali näkyy mutta kuuluu sijana (*"1."*). Testi kaatui
ilman korjausta (tarkistettu).

## Julkaisu 1.2.244 19.10.2026

J-37 ja retron tarkistimet (`b76509d`) julkaistu (Jako `4edaeca`, push klo 2.24, Tommin
*julkaise Jako 1.2.244*). Tuotantobundlesta todennettu selaimella: molemmat domainit tarjoavat
`index-DkXP64nJ.js`:n, jossa on `"1.2.244"`, ja hash on sama kuin paikallisen buildin.
Kuuntelu tekemättä: J-13, J-35, J-36 ja J-37. Ennen kuuntelua luetaan laitteen versio
deploy-skillin vaiheen 8 mukaan.

## Kuuntelu 1.2.244:llä 19.10.2026 aamulla

Laitteen versio luettiin ennen kuuntelua deploy-skillin vaiheen 8 apurilla. Pixelin Chromessa
oli neljä Jako-välilehteä: `?v=237` ajoi tuotannon bundlea `index-DCUN4w3P.js` (1.2.244), kolme
muuta 1.2.236:ta, 1.2.238:aa ja 1.2.241:tä. Tommi kuunteli `?v=237`-välilehdellä. Tuotannon hash
oli eri kuin yllä kirjattu `DkXP64nJ`, mutta versio sama. Syy on päätelmä: pelkkä docs-commit
`9239b93` käynnisti Vercelissä uuden buildin. Apuri hälytti oikeastakin välilehdestä, koska
leima on puhuttu muoto (*"1 piste 2 piste 244"*). Korjattu: `Tyokalut` `8d87135`.

Tulokset Clauden kuunteluohjeen kohdista:

- *Valikon tilasto* (J-13 ryhmä 4): ok.
- *Kultakalan botin vaihto ilman Avoimia kortteja* (J-36, *sitten*): ok.
- Kohdat 3–6 (J-35, J-37, pelaajarivit) jäivät kuulematta, koska kuuntelu pysähtyi alla
  oleviin kahteen löydökseen.

**J-38. Kultakalan poistopakasta ei voi nostaa ruudunlukijalla.** Tila: korjattu
dev-versiossa 19.10.2026, ei kuunneltu. Tommi: *"tuli tilanne missä haluaisin nostaa
poistopakasta, mutta UI ei anna"*. KULTAKALA.md:9 sallii noston poistopakasta. Syy koodista:
poistopakka oli pelkkä klikattava `div`, jolla ei ollut roolia, nimeä eikä näppäimistöä.
TalkBack näki siitä vain kortin kuvan. Pakka oli nappi (*Nosta pakasta*). Koputuksen
poistopakka oli jo nappi, mutta Kultakalaan sitä ei viety. Korjaus Koputuksen mallilla:
nostovuorossa, kun poistopakassa on kortti, se on `role="button"`, nimi
`ui.shared.drawDiscardAria` (*Nosta poistopakasta*, valmiina 23 kielellä) ja Enter tai Space
nostaa. Testi `kultakala-poistopakka.test.jsx` kaatui ilman korjausta (tarkistettu).
Selaimessa todennettu: pelin alussa poistopakka ei ole nappi (tyhjä), Heron toisella
vuorolla on *Nosta poistopakasta*, ja Enter nosti kortin (*"Nostit ruutu jätkä (11 p)
poistopakasta. Vaihto on pakollinen…"*). Samalla havaittiin, että DOM-kohdistus putoaa
`body`yn noston jälkeen, koska nappi jää sivulle mutta menettää roolinsa, eikä
`focusRescue` reagoi siihen. Pakasta nostaessa käy samoin jo tuotannossa. TalkBackin
kohdistukseen vaikutusta ei ole mitattu.

**J-39. Vaihda-nappi kuuluu "paikan neljään korttiin".** Tila: korjattu dev-versiossa
19.10.2026 Tommin sanamuodolla, ei kuunneltu. Tommi kuuli Kultakalassa *"Vaihda ruutu kymmenen paikan neljään
korttiin"* ja sanoi sen lausuttavan väärin. Nimi tulee avaimesta
`games.kultakala.ui.swapTo` (*Vaihda {card} paikan {n} korttiin*), ja puhesyntetisaattori
taivuttaa numeron seuraavan sanan mukaan, kuten J-18:ssa. J-36:n *"paikka 5"* kuului
oikein, koska numero on perusmuodossa lauseen lopussa.

*J-39:n korjaus.* Claude ehdotti muotoa *"Vaihda ruutu kymmenen, paikka neljä"*. Tommi
hylkäsi sen ja valitsi *"vaihda ruutu kymmenen paikan neljä korttiin"*: lause pysyy ennallaan,
mutta numero sanotaan perusmuodossa sanana. Uusi `spokenNumber` (`helpers.js`) käyttää J-18:n
`RANK_WORD`-taulua, johon lisättiin *yksi*. Muut kielet pitävät numeron. Näkyvä teksti on
ennallaan (*"Vaihda 4♠ paikan 4 korttiin"*). Testi `kultakala-poistopakka.test.jsx` kaatui ilman
korjausta (tarkistettu). Selaimessa todennettu: *"Vaihda risti jätkä paikan viisi korttiin"* ja
vaihdon jälkeen *"Vaihda pata neljä paikan neljä korttiin"*. Puhesyntetisaattorin käytös
perusmuotoisen numerosanan kanssa on kuulematta.

## Julkaisu 1.2.245 19.10.2026

J-38 ja J-39 julkaistu (Jako `c360435`, push klo 6.06, Tommin *julkaise Jako 1.2.245*).
Tuotantobundlesta todennettu: molemmat domainit tarjoavat `index-CsXA1bhm.js`:n, jossa on
`"1.2.245"`, ja hash on sama kuin paikallisen buildin. Pixelillä on enää yksi Jako-välilehti
(`?v=237`), ja se ajoi pushin jälkeen yhä 1.2.244:ää (`DCUN4w3P`), joten se pitää ladata
uudelleen ennen kuuntelua. Kuuntelu tekemättä: J-35, J-37, J-38, J-39 ja pelaajarivit (J-13).

## Kuuntelu 1.2.245:llä 19.10.2026 aamulla

Pixelin välilehti `?v=237` ladattiin uudelleen, ja apuri luki ennen kuuntelua bundlen
`index-CsXA1bhm.js` ja leiman *1.2.245, julkaistu 19.10.2026 klo 06.06* (exit 0). Tommi pelasi
Kultakalan loppuun ja yhden Moskan.

- *J-35 kuunneltu ok:* lopun korttiluettelossa ei kuulu *kuva*.
- *J-37:* sija kuuluu, mutta Tommin mukaan se *"voisi kuulua järjestysnumerona"*. Ehdotus,
  ei vika. Avoin.
- *Moska:* *"kuulosti aika hyvältä"*. Kierroksen jälkeen kohdistus siirtyi
  Seuraava kierros -nappiin.
- *J-38 ja J-39:* Tommi ei maininnut niitä ensin. Kysyttäessä: molemmat kuuluivat oikein.
  J-38 ja J-39 kuunneltu ok.
- *Moskan kohdistus Seuraava kierros -nappiin:* Tommin mukaan oikea paikka.
- *J-37:n järjestysluku:* Tommi vahvisti tulkinnan (*ensimmäinen, toinen, kolmas, neljäs*)
  ja valitsi kaikki kielet, ei vain suomea.
- *Yleisarvio:* *"ruudunlukijassa on paljon toistoa ja kohdistuksen siirtyminen oikeaan
  paikkaan on haastava rasti"*. Yksittäisiä kohtia ei nimetty.

*J-37:n järjestysluku 19.10.2026.* Tila: korjattu dev-versiossa, ei kuunneltu. Uusi avain
`ui.placeOrdinal` 23 kielellä (funktio, sijat 1–4, muuten numero ja piste). Tulosruudun sija
(myös mitaliton, jonka näkyvä *4.* ei aiemmin saanut puhuttua muotoa) ja tilastopaneelin
sijoitusjakauma kuuluvat järjestyslukuna: *ensimmäinen, toinen, kolmas, neljäs*. Näkyvä mitali ja
numero ovat ennallaan. Karjalan (*ensimmäine, toine, kolmas, nelläs*), pohjoissaamen (*vuosttaš,
nubbi, goalmmát, njealját*) ja romanin (*angluno, dujto, trinto, štarto*) muodot ovat Clauden
omasta kielitiedosta eikä lähteestä tarkistettuja. Romanin murre-erot ovat suurimmat.
`ruudunlukija-app.test.jsx` tarkistaa suomen järjestysluvut tulosruudusta ja tilastoista, ja
se kaatui ilman korjausta (tarkistettu).

## Julkaisu 1.2.246 19.10.2026

J-37:n järjestysluku julkaistu (Jako `afd1f10`, push klo 6.35, Tommin *julkaise Jako 1.2.246*).
Tuotantobundlesta todennettu: molemmat domainit tarjoavat `index-DlHmFh0-.js`:n, jossa on
`"1.2.246"` ja avain `placeOrdinal`, ja hash on sama kuin paikallisen buildin. Kuuntelu
tekemättä. Ennen kuuntelua luetaan laitteen versio deploy-skillin vaiheen 8 mukaan.

## Kuuntelu dev-versiolla 23.10.2026 klo 22.10

Pixel 8a, Chrome, `localhost:5174` (Jako `17021be`: korttiryhmät ja asetus *Botti odottaa
ilmoitukset*, ei julkaistu). Asetus kytkettiin päälle ennen kuuntelua. Tommi pelasi
Ristiseiskaa 3 bottia vastaan. TalkBack purettiin heti Tommin raportin jälkeen.

- *Botin odotus kuunneltu ok.* Tommi: *"botit kuulosti hyvältä"*. Live-alueen loki näyttää
  bottien vuorot noin neljän sekunnin välein, eikä jono kasvanut kierroksen aikana.
- *Korttiryhmät kuuntelematta.* Tommi ei löytänyt Tilanne-nappia (J-40), joten Tilannetta ei
  kuultu. Kaapattu teksti oli *"Käsi: pata kuusi, yhdeksän, rouva, kuningas, hertta kaksi,
  kolme, …"*.

**J-40. Tilanne-nappia ei löydä koskettamalla.** Tila: korjattu dev-versiossa 23.10.2026,
ei kuunneltu eikä julkaistu. Tommin valinta: nappi näkyväksi tilarivin vasempaan reunaan
(vaihtoehto oli toimintorivi). Pixelin kaappauksessa se on Lyö-napin alla, 57 × 24 CSS-pikseliä.
`title="H"` poistettiin (J-24), ja ohjeen maininta *näkyy vain ruudunlukijalle* korvattiin
sijainnilla 23 kielellä. Havainto ennen korjausta: Tommi: *"en löydä Tilanne-nappia"*
ja myöhemmin *"Tilanne nappi hävisi taas jonnekin"*. Nappi on `sr-only` (`GameStatusBar.jsx`),
eli noin 20 × 11 pikselin kokoinen ruudun vasemmassa alakulmassa, joten kosketuksella siihen
ei osu. Pyyhkäisyjärjestyksessä se on Opasta-napin jälkeen ja ennen Ääni-nappia. Kun kohdistus
hyppää lyönnin jälkeen (J-42), paikka on taas haettava. Ratkaisu on Tommin päätös
(esim. näkyvä nappi tai sama paikka aina).

**J-41. Kortin valinta kuuluu tilana *valinta poistettu*.** Tila: korjattu dev-versiossa
23.10.2026 ja kuunneltu ok, ei julkaistu. Korjaus ja mittaus alla omana jaksonaan. Havainto ennen
korjausta: Tommi: ensimmäinen
kaksoisnapautus lyötävään korttiin kuului *"valinta poistettu, pata yhdeksän, kaksoisnapauta
laittaaksesi päälle pois"*. Kortti oli kuitenkin valittuna: CDP-luennassa (Chrome DevTools
-yhteys laitteelle) heti kuuntelun jälkeen pata yhdeksällä oli `aria-pressed="true"`.
Arvaus, jota ei ole mitattu: TalkBack lukee tilan ennen kuin React on päivittänyt sen.
Mittaamatta myös se, koskeeko tämä muita pelejä joissa kortilla on `aria-pressed` (J-2).

**J-42. Lyönnin jälkeen kuuluu ensin verkkonäkymä.** Tila: auki. Tommi: lyönnin jälkeen kuului
*"Jako korttipelikokoelma verkkonäkymä, valinta poistettu, Hero ruutu jätkä pelaa yläpinoon"*,
kun pelkkä *"Hero ruutu jätkä pelaa yläpinoon"* riittäisi. Pelaa-nappi katoaa, kun vuoro
vaihtuu, ja kohdistus putoaa ensin sivun juureen ennen kuin turvaverkko (J-14) vie sen
eteenpäin. Välissä kuuluva *valinta poistettu* on luultavasti käden kortti, johon turvaverkko
vie kohdistuksen, mutta tätä ei ole mitattu.

## Toinen kuuntelu ja J-41:n mittaus 23.10.2026 klo 22.30–23.10

Pixel 8a, `localhost:5174`, Ristiseiska. TalkBack kytkettiin adb:llä kunkin kierroksen ajaksi ja
purettiin heti. TalkBackin lokitaso oli mittauksen ajan VERBOSE (TalkBack-asetukset ›
Lisäasetukset › Kehittäjäasetukset › Lokiin tallennuksen lähtötaso, vahvistusikkuna
*Otetaanko monisanainen loki käyttöön?*) ja palautettiin ERRORiin. Puhe luettiin `logcat`in
riveiltä `SpeechControllerImpl: Speaking fragment`.

- *J-40 kuunneltu ok.* Tommi: *"nappi löytyi"*.
- *Korttiryhmät kuunneltu ok.* Tommi: *"ryhmittely ok"*.

**J-41:n mekanismi, mitattu.** Sivulle asennettiin CDP:llä kirjuri, joka merkitsi
`focusin`-, `pointerdown`-, `click`- ja `aria-pressed`-muutokset aikaleimoineen.

- Kun DOM-kohdistus oli valmiiksi kortissa (asetettu CDP:llä `focus()`), kaksoisnapautus antoi
  yhden klikkauksen, `aria-pressed` vaihtui 19 ms:ssa ja TalkBack sanoi *"valittu"*.
- Kun Tommi kosketti korttia ja kaksoisnapautti, Chrome siirsi DOM-kohdistuksen korttiin
  (`focusin` ennen `pointerdown`ia). TalkBack sanoi *"valittu"*, mutta Chromen
  `TYPE_VIEW_FOCUSED`- ja `TYPE_VIEW_ACCESSIBILITY_FOCUSED`-tapahtumat saivat sen lukemaan
  kortin uudelleen keskeytystilassa (`QUEUE_MODE_INTERRUPT`): *"ruutu viisi. Valitsin.
  Kaksoisnapauta laittaaksesi päälle/pois"*. Uudelleenluku ei sano tilaa, joten Tommi kuuli
  pelkän kortin.
- Hylätty korjaus: `onMouseDown`-tapahtuman `preventDefault` ei estänyt kohdistusta, koska Chrome
  kohdistaa kortin ennen hiiritapahtumia. Peruttu ennen committia.
- Adb:n `input tap` ohittaa TalkBackin eleet ja klikkaa suoraan, joten eleen mittaus vaatii
  Tommin kosketuksen.

**Korjaus (Tommin valinta, vaihtoehdot: valittu nimeen, molemmat tilat nimeen, ei nyt):**
valittu kortti sanoo tilan nimessään (*"ruutu viisi, valittu"*), ja valitsematon kuulostaa
kuten ennen. Uusi avain `ui.a11y.selected` 23 kielellä. Romanin *alosardi* ja pohjoissaamen
*válljejuvvon* ovat Clauden omasta kielitiedosta eikä lähteestä tarkistettuja. Testi
`kortin-valinta.test.jsx`. Puheloki korjauksen jälkeen: *"valittu"*, sitten *"ruutu viisi,
valittu. Valitsin"*. Tommi: *"nyt meni oikein"*.

J-42 (verkkonäkymä lyönnin jälkeen) on yhä auki ja mittaamatta.

## Julkaisu 1.2.249 23.10.2026

Korttiryhmät, *Botti odottaa ilmoitukset*, J-40 ja J-41 julkaistu (Jako `ffa0517`, push klo 23.02,
Tommin *julkaise*). Tuotantobundlesta todennettu selaimessa: molemmat domainit tarjoavat
`index-B7aCxERp.js`:n, jossa on `"1.2.249"`, `waitSpeech` ja `selected:"valittu"`. Kaikki neljä
kuunneltiin dev-versiolla ennen julkaisua. J-42 on auki.

Mittauksen sivuvaikutus: Pixelin välilehti aktivoitiin kerran `/json/activate`illa, mikä on
deploy-skillin nimeämä ansa. Välilehti latautui uudelleen ja peli katosi, mutta muuta haittaa
ei tullut.

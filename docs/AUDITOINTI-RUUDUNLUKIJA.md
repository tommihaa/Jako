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

**J-9. "Vastustajat vuorojärjestyksessä" kuuluu kahdesti.** Tila: korjattu 16.10.2026 ja todennettu Pixelillä dev-versiolla, julkaistu 1.2.237 (todennettu tuotantobundlesta). Tommin kuuntelu julkaistulla versiolla on tekemättä. Syy mitattiin (alla › *Pixelin mittaus 16.10.2026*). Korjausyritys 15.10.2026 ei auttanut (kuuntelu 1.2.236:ssa, alla),
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
joten toisto ei ole turvaverkon vika vaan valitun kohdan seuraus. Kohdan vaihto odottaa
Tommin valintaa.

**Mestarin kupla.** `role="status"` ei ilmoita sisältöä, joka lisätään yhdessä alueen kanssa.
Korjattu: *Kysy Mestarilta* vie kohdistuksen kuplan ✕:ään, ja napin nimi on neuvo ja sana
*Sulje* (`aria-labelledby`). Opastuksen kupla ilmestyy vuoron mukana eikä siirrä kohdistusta.
Selaimessa: kohdistus ✕:ssä, nimi *"Mestari: Kaada pata ässä kortilla ruutu 4. … Sulje"*,
sulkeminen palaa Mestari-nappiin.

**Kohta 6, tulkinta auki.** Tommi: *"sulje painike tila mestari"*. Kysytään.

**Seuraavaksi:** Tommin kuuntelu Pixelillä dev-versiolla (`jako-dev-adb`), sitten julkaisu.
Kuunneltavat: kortin pelaaminen (J-14), Asetusten ja Mestarin kuplan sulkeminen pelissä,
paluu valikkoon (J-15), valinnan peruminen ✕-napilla (J-16) ja nimi ilman yhdeksikköä (J-17).
Toinen kierros: Mestarin kupla, valtti Maijassa ja emojittomat napit (J-13).

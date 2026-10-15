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

**J-5. Kieliryhmien nimet eivät kuulu.** Tila: korjattu 15.10.2026, ei julkaistu. J-3:n
korjaus antoi ryhmälle nimen `aria-label`illa ja piilotti näkyvän otsikon (`aria-hidden`),
jottei nimi kuuluisi kahdesti. TalkBack ei sano ryhmän nimeä ollenkaan, joten nimi ei kuulunut
kertaakaan. Korjaus: näkyvä otsikko on luettava teksti, ja ryhmä viittaa siihen
(`aria-labelledby`). Todennettu dev-previewissä: kaksi ryhmää, nimet "Vérifiées" ja "Non
vérifiées" näkyvissä saavutettavuuspuulle. Ei kuunneltu.

**J-6. Ranska valittuna otsikkorivi kuuluu suomalaisella äänellä.** Tila: korjattu
15.10.2026, ei julkaistu. Osa teksteistä (esim. vinkki uudelle) kuului ranskaksi, mutta
otsikkorivi suomeksi, myös sivun uudelleenlatauksen jälkeen. Syy (päätelmä, ei mitattu):
J-1:n korjaus kirjoittaa kielen `<html lang>`:iin efektissä eli ensimmäisen renderin jälkeen,
ja TalkBack pitää jo piirretyille teksteille niiden alkuperäisen kielen. Uudelleen piirretyt
tekstit saavat uuden kielen. Korjaus: kieli kirjoitetaan `<html lang>`:iin moduulin latautuessa
ennen ensimmäistä renderiä. Rajoitus: kesken käynnin tehty kielenvaihto ei välttämättä vaihda
ääntä teksteille, joita ei piirretä uudelleen. Uudelleenlataus vaihtaa. Ei kuunneltu.

**J-7. Versioleima kuuluu numerosarjana.** Tila: korjattu 15.10.2026, ei julkaistu. Valikon
alalaidan "v1.2.235 · 15.10.2026 16.05" kuului numeromössönä ilman kontekstia. Korjaus:
ruudunlukijalle oma teksti `ui.a11y.version` 23 kielellä ("Versio 1.2.235, julkaistu
15.10.2026 klo 16.05"), ja näkyvä leima on `aria-hidden`. Todennettu dev-previewissä. Ei
kuunneltu.

*Paskahousu:* kortin valinta kertoo tilan (J-2 toimii), ja kohdistus jää korttiin.

**J-8. Maa kuuluu "emojina" näkyvissä teksteissä.** Tila: auki. Kortit ja ilmoitukset
sanovat maan nimeltä (`cardName`, `Announcer.toPlain`), mutta muu näkyvä teksti kirjoittaa
kortin symbolilla, ja TalkBack lukee symbolin "emojiksi". Dev-previewin haku (pelin alku ja
yksi valinta, 15.10.2026) löysi symbolin ainakin näistä: Paskahousun Pelaa-nappi ("Pelaa
(2♠)") ja kasan päällimmäinen, Kultakalan Vaihda- ja Heitä-napit, Ristiseiskan pöydän rivit,
Seiskan Lyö-nappi, tavoiterivi ja vaadittu maa, Kasinon pöytä ja "Valittu: 4♠ = 4", Maijan ja
Moskan valttimaa. Koputuksesta ja Läpsystä ei löytynyt. Lista ei ole täydellinen, koska haku
näki vain alkutilanteen.

**J-9. "Vastustajat vuorojärjestyksessä" kuuluu kahdesti.** Tila: auki. Live-alueeseen
ilmoitus menee kerran (todennettu previewissä). Päätelmä, ei mitattu: ilmoitusalue jää sisältöineen
saavutettavuuspuuhun, joten sivun läpi pyyhkäisy lukee viimeisimmän ilmoituksen uudelleen.

**J-10. Pelin alussa "nimetön, nimetön…" muiden pelaajien korttien kohdalla.** Tila: auki,
syy tuntematon. Vastustajien selkäpuoliset kortit ovat `aria-hidden`, eikä previewin haku
löytänyt nimettömiä rooleja eikä klikattavia elementtejä ilman nimeä (jaon aikana 50, 300 ja
800 ms sekä valmiissa näkymässä).

**J-11. Aloitusnäytön valinnat eivät kerro valittua.** Tila: auki. Paskahousun sääntörivit
kuuluvat, mutta ei sitä, mikä vaihtoehto on valittuna: valinta näkyy vain kultaisena kehyksenä.
Sama rakenne on Kasinon (`Kasino.jsx:1275`) ja Ristiseiskan (`Ristiseiska.jsx:537`)
sääntövalinnoissa sekä yhteisen aloitusnäytön (`GameStartScreen.jsx`) pelaajamäärässä ja
nimiryhmissä: yhdessäkään ei ole `aria-pressed`ia. Paskahousun "Kovat kakkoset" -vaihtoehto on
lisäksi symboleina (♠2 ♣2), ks. J-8.

*Havainto:* Tommin mukaan TalkBackin ranskalainen ääni kuulostaa paljon luontevammalta kuin
suomalainen. Se on puhemoottorin ominaisuus eikä Jaon.

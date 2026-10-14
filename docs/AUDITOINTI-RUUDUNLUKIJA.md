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

**J-1. Sivun kieli on aina suomi.** Tila: avoin. `index.html` on `<html lang="fi">`, eikä
koodi muuta sitä kielenvaihdossa (haku `documentElement` ja `lang =` `src/`:stä: 0 osumaa).
Ruudunlukija valitsee puheäänen `lang`-attribuutista, joten 22 muuta kieltä luetaan suomen
ääntämyksellä. WCAG 3.1.1 (Language of Page). Superjatsissa sama on tehty (`strings.ts:45`).

**J-2. Valittu kortti näkyy vain siirtymänä.** Tila: avoin. `shared/Card.jsx:43` ja `:95–97`:
`selected` nostaa korttia 8 px, mutta ruudunlukijalle ei kerrota mitään. Monivalinnassa
(Kasino, Paskahousu) pelaaja ei kuule mitkä kortit ovat valittuina. Virallinen muoto on
`aria-pressed` napissa (APG toggle button).

**J-3. Kielivalitsin on listbox ilman listboxin näppäimistöä.** Tila: avoin.
`App.jsx:408–424`: `role="listbox"` lupaa nuolinäppäimet ja yhden kohdistuksen, mutta
vaihtoehdot ovat `<button role="option">` joihin siirrytään Tabilla. Ryhmäotsikot ovat
listboxin sisällä roolittomia `<div>`ejä, mitä ARIA 1.2 ei salli (listboxin lapsi on option tai
group). Yksinkertaisin virallinen muoto on APG:n
[disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/): rooliton lista tavallisia
nappeja, valittu `aria-current="true"`, ja ryhmät `role="group"` + `aria-label`.

**J-4. Kasinon valintaikkuna ei siirrä kohdistusta.** Tila: avoin. `games/Kasino.jsx:1734`:
`role="dialog"` ja `aria-modal="true"` ovat oikein, ja Escape sulkee (`:573–575`). APG:n
[dialog-malli](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) vaatii lisäksi, että
kohdistus siirtyy ikkunaan avattaessa ja palaa avausnappiin suljettaessa. Nyt ruudunlukija jää
ikkunan taakse, jota `aria-modal` käskee olemaan lukematta.

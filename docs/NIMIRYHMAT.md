# Nimiryhmät: `porukka`

Siirretty `CLAUDE.md`:stä 17.9.2026 sanasta sanaan (konfiguraatioauditointi: `CLAUDE.md`
latautuu joka sessioon, ja tämä on päätöksen perustelu eikä ohje). Ohje itse on yhä
`CLAUDE.md`:n Players-osiossa: ryhmälle ei anneta luonnetta, ja avainta ei yhtenäistetä takaisin.

**`porukka` on kunnianosoitus oikeille ihmisille, ei arkkityyppiryhmä (kirjattu 19.8.2026).**
Nimet ovat niiden ihmisten nimiä joiden parissa Tommi oppi monet kokoelman peleistä, ja
hänen omin sanoin 19.5.2026: *ne on vain nimiä että niille ei ole mitään persoonallisuuksia
mutta kunniaosoituksena.* **Seuraus koodiin:** ryhmälle ei anneta persoonallisuuksia,
puhetyylejä eikä pelitapaeroja, toisin kuin `meme`lle tai `goauld`ille. Se on ainoa ryhmä
jonka merkitys katoaa jos siihen lisätään luonnetta. Muiden ryhmien alkuperää ei ole kirjattu
eikä tarvitse kirjata. Lähde: `Lahteet/louhinnat/04-pelit-ja-pelisuunnittelu.md` kohta 6.
**Avain vaihtui 21.8.2026 (`laituri` → `porukka`), ja syy on eri kuin kunnianosoitus.** Vanha
avain ja nimilappu (*Laiturin tyypit* ja sen 22 käännöstä) kertoivat julkisessa repossa myös
**missä** nuo ihmiset on tavattu, ja `SUBSTANSSI.md` kertoo Laiturista muuta. Nimet ovat
oikeita, eivätkä nuo ihmiset ole itse kirjanneet mitään mihinkään, joten linkki katkaistiin
ryhmän nimestä. **Nimilista itse ei muuttunut**, eikä kunnianosoitus muutu: se muuttuu
yksityiseksi. Vanha avain migratoidaan `App.jsx`:ssä, koska se voi olla localStoragessa.
Tätä ei pidä yhtenäistää takaisin.

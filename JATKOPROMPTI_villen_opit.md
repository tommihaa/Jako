# Jatkoprompti: Villen korttipelien opit Jakoon (22.10.2026)

**Tämä saate vanhenee heti kun kohdat 1–3 on suljettu, eikä se ole toimintaohje ennen kuin tila
on luettu gitistä.** Tila on kirjattu 22.10.2026 klo 22.45 (järjestelmän kello). Aja ensin
`git -C Jako log --oneline -15` ja `git -C Jako status`: jos jokin kohta on jo tehty, se ei ole
enää auki.

Tausta ja lähteet ovat versioituina, eikä niitä toisteta tässä:
- `Jako/docs/VERTAILU-ACCESSIBLEBRIDGE.md`: mitä Ville Lammisen AccessibleBridgestä luettiin,
  kahdeksan opittavaa kohtaa, Maijan ja Ristiseiskan säännöt rinnakkain ja Tommin tilaus
  kaatotavasta.
- `Kaanon/docs/YHTEYDENOTTO_NKL.md` › Yhdeksästoista luonnos: Tommin pelikokemus sanatarkasti
  ja vastausluonnos Villelle. Tarkista Gmailista, onko vastaus lähtenyt (haku `subject:(Lautapelin laudan lukeminen)
  newer_than:2d`, Claude in Chrome; nimeä selain vasta ikkunalistan luettuasi). Jos kirje
  lupasi jotain, se on toteutuksen ehto.

## Järjestys ja mitä kukin vaatii

Tommin järjestys on kaatotapa ensin (*"ehdottomasti"*). Kohdat 2 ja 3 ovat Clauden arvio
hyödystä, ja ne kysytään Tommilta ennen aloitusta.

### 1. Kaatotapa Maijaan ja Moskaan (Tommin tilaus)

**Tavoite:** puolustaja valitsee kaatavat kortit kerralla ja painaa Kaada, ja peli parittaa ne
pöydän kortteihin. Kaatamatta jääneet nostetaan. Nyt valitaan ensin pöydän kortti
(`selDefTargetIdx` `Maija.jsx`:ssä, `selDefTarget` `Moska.jsx`:ssä) ja sitten kaatava kortti,
ja Tommi koki sen TalkBackilla raskaaksi.

**Ennen koodia** (Jaon `CLAUDE.md` › Sääntölogiikan muokkaus): lue `MAIJA.md` ja `MOSKA.md` ja
toista sääntö Tommille. Kysy samalla nämä, monivalintana ja Tommin sanoin:
1. Paritus kun valinta sopii usealla tavalla (sama kortti kaataisi kaksi pöydän korttia).
   Villen palvelimen tapaa ei nähty. Ehdotus: peli etsii parituksen joka kaataa eniten, ja jos
   yhtä hyviä on useita, se kertoo valitun parituksen ilmoituksessa.
2. Valinta joka ei kaada kaikkea valittua (valittu kortti jolle ei löydy paria): estetäänkö
   vai nostetaanko kortti takaisin käteen ilmoituksella.
3. Säilyykö kahden vaiheen tapa näkijälle rinnalla, vai korvataanko se kokonaan.
4. Moskan siirtäminen (`isPassSel`): kulkeeko se saman valinnan kautta vai omana tekonaan.

**Todennus:** testit (`npm test`), Botbench ei muutu koska botti ei käytä UI-polkua (tarkista
`docs/BOTBENCH.md`), ja TalkBack-kuuntelu Pixelillä. Kuunneltava teksti tulostetaan chattiin
sanatarkasti ennen kierrosta, ja TalkBack puretaan heti kuuntelun jälkeen. Ohjeteksti ja
i18n kaikkiin 23 kieleen samassa commitissa.

### 2. Botin viive odottaa ilmoituksen lukuajan

**Tavoite:** bottisiirto ei ajastu ennen kuin jonossa olevat ilmoitukset ovat ehtineet kuulua.
Villellä palvelin lisää robotin viiveeseen edellisen ilmoituksen arvioidun lukuajan. Jaossa
`useAIScheduler` ja `Announcer.jsx` ovat erillään, ja jono kasvaa (Läpsyn punninta,
`Kaanon/docs/YHTEYDENOTTO_NKL.md`).

**Kysyttävä ennen koodia:** koskeeko viive vain silloin kun ruudunlukija on käytössä
(Jako ei tiedä sitä suoraan), vai aina. Näkijälle aina hidastuva peli on muutos jota Tommi ei
ole tilannut. Läpsy on rajattu ruudunlukijan lupauksesta pois, joten se jää tämän ulkopuolelle.

**Älä ota mukaan Villen kiireellistä kanavaa** (vastaus omaan komentoon katkaisee kesken olevan
ilmoituksen): Tommi ei pitänyt siitä, että uusi tapahtuma keskeytti edellisen lukemisen.

### 3. Saman maan kortit ryhmitellään puheessa

**Tavoite:** *"pata 2, 3, 4, hertta 10"* nykyisen *"risti neljä, risti viisi, risti
kymmenen"* sijaan. Koskee Tilannetta (`src/shared/a11yStatus.js`, `spokenCards`) ja muita
paikkoja joissa luetaan korttilista. Etsi kaikki kohdat ennen kuin tarjoat muutosta.

**Kysyttävä:** numerot numeroina (Villen tapa, syntetisaattori ääntää) vai sanoina (nykyinen).
Vaikutus Heidin taivutusvirheisiin on mittaamatta, ja Ville suositteli Mikropuhetta Heidin
sijaan. Tämä mitataan NVDA:lla ennen päätöstä, jos Mikropuhe on saatavilla.

## Ei tässä sessiossa ilman Tommin erillistä päätöstä

- Maijan sääntöerot Villeen (aloittaja, pelaajamäärä 2–5, viiden kortin hyökkäysraja):
  kirjattu vertailuun, ei tilattu.
- Näppäinkomennot (maa ja arvo valitsee kortin, Alt-lukukomennot): Ville antoi luvan käyttää,
  mutta Tommi ei ole tilannut niitä.
- Vuoron merkkiääni: Tommi lisää ääniä säästeliäästi, koska hän kuuntelee pelatessaan radiota
  tai podcasteja ja ääni häiritsee jaetussa tilassa.

## Julkaisu

Push on Jaossa deploy (Jaon `CLAUDE.md` › Deploy). Vain Tommin julkaise-sanalla, ja sen jälkeen
todennus tuotantobundlesta `deploy`-skillin mukaan.

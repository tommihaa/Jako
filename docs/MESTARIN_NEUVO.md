# Mestarin neuvo: dokumentti- ja koodipinta

**Mitä tämä dokumentti on.** Mestarin neuvon (🧙) neuvotekstien ja bottikoodin välisen pinnan
tarkastuskirjanpito. Se vastaa kysymykseen *sanooko neuvoteksti sen mitä koodi oikeasti tekee*.

**Miksi tämä pinta on erikseen.** Neuvon siirto ja neuvon perustelu voivat ajautua toisistaan, ja
vain jälkimmäinen on näkymätön testeille. Vika on lauennut tuotannossa kerran: `283c7c6`
(21.7.2026) korjasi Maijan ja Moskan hyökkäystekstit jotka nimesivät väärän lajitteluavaimen.
Siirto oli molemmissa oikea, ja perustelu opetti väärää strategiaa. Löytäjä oli ihmisen pelitesti,
eikä mikään olemassa oleva testi olisi nähnyt sitä.

## Rakenne suojaa siirron, ei perustelua (auditoitu 18.8.2026)

Jokaisen pelin `getAdvice` kutsuu samaa valintafunktiota kuin botti (`aiBestPlay`,
`maijaPickAttack`, `aiPickAttackSN`, `koSwapTarget`, ...) tasolla `hard`. Siitä seuraa kaksi asiaa:

- **Neuvon siirto ei voi ajautua bottikoodista**, koska se on sama koodi eikä kopio.
- **Neuvon perustelu voi ajautua vapaasti**, koska se on lokalisoitu merkkijono jolla ei ole
  yhteyttä lajitteluavaimiin.

Ajautuma osuu siis aina perusteluun, ja se on aina samaa muotoa: oikea siirto väärällä syyllä.

## Auditointi 18.8.2026

Luettu 52 pelikohtaista neuvotekstiä (`src/locales/fi.js`, yhdeksän `advice`-lohkoa) kunkin pelin
`getAdvice`-funktiota ja sen kutsumaa valintalogiikkaa vasten. Kolme ajautumaa, kuusi peliä puhdas.

**Kaikki kolme on korjattu 18.8.2026** samana päivänä kun ne löytyivät, versiossa 1.2.209.
Löydökset jätetään tähän näkyviin korjausmerkintöineen, koska tämä on tarkastuskirjanpito eikä
työjono: poistettu löydös ei todista mitään, korjattu todistaa sekä vian että sen korjauksen.

### 1. Moska `beat`: ensisijainen avain jää nimeämättä

Teksti: *"Pienin voittava kortti riittää, isot talteen."*

`aiPickDefense` (`src/games/Moska.jsx`) lajittelee **ensin ei-valtti ennen valttia** ja vasta
sitten arvon mukaan. Jos ainoa ei-valttikaato on kuningas ja kädessä on valttikakkonen, koodi
valitsee kuninkaan. Teksti lupaa siis pienimmän voittavan, ja koodi säästää valtin.

Maijan vastaava teksti sanoo saman asian oikein: *"Pienin voittava riittää, valtit vasta pakon
edessä."*

**Korjattu 18.8.2026.** Moskan teksti sai Maijan muotoilun kaikissa 23 kielessä, ja käännös
kopioitiin kunkin lokaalin omasta Maija-tekstistä eikä tuotettu uudelleen. Lause on sama, joten
uutta käännöstyötä ei tarvittu eikä uutta käännösvirhettä voinut syntyä.

### 2. Koputus `swapSlot`: varma pienennys luvataan sokkopaikasta

Teksti: *"Vaihda nostettu kortti korostettuun korttiin, se pienentää summaasi eniten."*

`koSwapTarget` (`src/games/Koputus.jsx`) voi valita **tuntemattoman** paikan odotusarvolla
(`UNKNOWN_EV = 7`, kynnys 3, ja vain jos se voittaa tunnetun vaihdon hyödyn). Silloin korostettu
kortti on sellainen jota pelaaja ei näe, eikä summa välttämättä pienene lainkaan. Valinta on
oikea, mutta perustelu esittää odotusarvon varmuutena.

**Korjattu 18.8.2026 jakamalla neuvo kahtia, ei sanamuotoa pehmentämällä.** `getAdvice` palauttaa
nyt `swapSlot`in vain tunnetulle paikalle ja uuden `swapUnknown`in tuntemattomalle. Vanha teksti
on siis oikein siinä haarassa jossa se nyt näytetään, ja tuntemattomalle paikalle sanotaan ääneen
ettei korttia näe ja että peruste on keskiarvo. Muoto on talon oma: Kultakalassa sama jako on
tehty jo aiemmin (*"Ketju kannattaa vs. vaihtoa ei voi pysäyttää: eri syy, eri neuvo"*).

Sama muoto lievempänä Kultakalan `drawDiscard`-tekstissä: *"näkyvä pikkukortti"* on
yksinkertaistus, koska `kkDrawDecision`in kynnys on suhteellinen omaan huonoimpaan korttiin eikä
absoluuttinen. Tätä ei ole laskettu löydökseksi eikä korjattu.

### 3. Ristiseiskan porttisääntö: kanoni ja koodi eri mieltä, eikä kumpaakaan ole valittu

Tämä on ainoa löydös joka ei rajoitu neuvotekstiin.

| Lähde | Mitä sanoo |
|---|---|
| `RISTISEISKA.md` › AI-strategia | *"Vältä porttikortteja (6 ja 8), käytä ne vain välttämättä"* |
| Neuvoteksti `play` | *"portit (6 ja 8) vasta pakon edessä"* |
| `aiBestCard`, taso `hard` | Pidättelee porttia **vain jos** kädessä on jokin kortti jonka `distanceToPlay >= 3` |

Koodin poikkeus on tehty tarkoituksella ja perusteltu koodikommentissa: porttikortti on
placeholder, jota kannattaa pihdata vain niin kauan kuin kädessä on huonoja kortteja joista
haluaa päästä eroon panttina. Kanoni ja neuvoteksti sanovat silti vanhaa, eli kyse on
sopimusmuutos-protokollan tapauksesta: korjataanko koodi kanonin mukaiseksi vai kanoni koodin.

**Tommin oma kanta 18.8.2026, sanatarkasti:** *"itse ajattelen, että pidättelen porttia, jos
minulla on enintään 1 sitä maata kaukana pelattavuudesta, toivoen että saisin antaa kaukana
pelattavuudesta olevan kortin jollekin korttipanttina"*.

Tämä on kolmas sääntö eikä kumpikaan taulukon riveistä, joten valinta ei sulkeudu ilman sitä.
**Tarkennus samana päivänä:** *"portti ja yksi kortti kyseistä maata"*, eli laskettava joukko on
**kyseisen maan** kortit eikä koko käsi.

Sitä ei ole viety koodiin, koska päätös oli kirjata eikä korjata, ja koska ero nykykoodiin on
suurempi kuin miltä se näyttää. Koodi pidättelee portin kun kädessä on **jokin** kaukainen kortti
mistä tahansa maasta, Tommin sääntö kun kaukaisia kortteja on **kyseisessä maassa enintään yksi**.
Ehdot osoittavat siis eri suuntiin: koodi pidättelee sitä useammin mitä enemmän roskaa kädessä on,
Tommin sääntö sitä useammin mitä vähemmän sitä on siinä maassa.

**Ratkaistu 18.8.2026: ehto on *enintään yksi*, eli nolla kelpaa.** Silloin pidättely on puhdas
blokkaus ilman omaa hintaa, koska pantiksi tarjottavaa ei ole eikä lukon pitäminen maksa mitään.
Sääntö on kirjattu `RISTISEISKA.md`:n kohtaan 2 ennen koodia (sopimusmuutos-protokolla) ja viety
`aiBestCard`iin tasolle `hard`. Neuvoteksti kirjoitettiin uudelleen kaikkiin 23 kieleen: se kertoo
nyt portin olevan lukko ja avautuvan vasta kun kaukaisia kortteja on samassa maassa vähintään
kaksi.

**Mittaamatta jäi bottivoima.** Muutos koskee Mestarin tasoa, joten se voi liikuttaa
`docs/BOTBENCH.md`:n lukuja. Ristiseiskalla ei ole mitattua kyvykkyysporrasta (`FLAT_AI_GAMES`),
joten vertailukohtaa ei ole valmiina, eikä N=400-ajoa tehty tässä yhteydessä.

**Mitattu 18.8.2026 myöhemmin, ja tulos oli myönteinen.** N=400 per pari:
`hard vs beginner` 55,8 %, `hard vs normal` 55,0 %, verrokki `normal vs beginner` 51,3 %
eli muuttumaton. Kirjaus perusteluineen on `docs/BOTBENCH.md`:n osiossa
"Ristiseiska 18.8.2026". Yllä oleva väite vertailukohdan puuttumisesta oli väärä: mitattua
kyvykkyysporrasta ei ole, mutta 21.7.2026 mitatut N=400-luvut kelpasivat vertailukohdaksi
sellaisenaan. Vaihtoehdon poissulkeminen ilman tarkistusta oli virhe, ja se jätetään yllä
näkyviin.

### Puhtaat

Seiska (8 tekstiä), Maija (5), Läpsy (3), Kasino (7), Paskahousu (7), Kultakala (5, ks. huomio
löydöksessä 2). Tarkastetut väitteet ovat lajitteluavaimia ja sääntölupauksia, esimerkiksi Seiskan
*"vaadi maaksi se, jota sinulla on eniten"* (`aiSuit`), Maijan *"hyökkää sillä maalla jota sinulla
on eniten"* (`maijaPickAttack`, valtit ja Maija suljettu pois) ja Kasinon *"sinulla on toinen
kortti jolla kaappaat sen seuraavaksi"* (`findAIBuild` vaatii kaappaajan olemassaolon).

## Sääntötaso: vaatimus kiristyi 11.9.2026

Mestarin opastus antaa palautteen "Eri valinta" kun pelaajan kortti ei ole Mestarin kortti.
Seiskan pelitestissä palaute rankaisi säännöstä jota teksti "Lyö K♠." ei ollut opettanut, ja
Tommi päätti että korjaus on kaanoni eikä koodi: osuma pysyy avainten yhtäsuuruutena, ja
jokainen kortin nimeävä teksti kertoo säännön jolla kortti erottui vaihtoehdoista.

Vaatimus on siis tiukempi kuin 18.8.2026 auditoinnin. Silloin riitti ettei teksti väitä väärää
avainta; nyt tekstin on nimettävä avain. Sitä vasten luettuna 52 tekstistä seitsemän jäi vajaaksi
(Seiska `play` yksittäinen kortti ja `aceBonusPlay`, Moska `add` ja `pass`, Kasino `capture` ja
`trail`, Ristiseiska `play`), ja yllä "Puhtaat"-kohdassa puhtaaksi luettu Seiska ja Kasino ovat
puhtaita vain vanhalla vaatimuksella. Taulukko avaimineen ja Tommin kuittaamat tekstit ovat
`MESTARIN_OPASTUS.md`:n kohdassa "Osuma ja sääntötaso".

Toteutus 11.9.2026: kymmenen tekstiä 23 kieleen, ja Seiskan `getAdvice` nimeää yksittäisen
kortin haaran jälkikäteen (`classifySingle`: `playOnly`, `playLeaveGroup`, `playNoPair`,
`playSeen`) samoilla ehdoilla ja samassa järjestyksessä kuin `aiBestPlay`. Luokittelu ei
valitse mitään, joten tämän dokumentin rakennesuoja (sama valintafunktio) säilyy: uusi
ajautumapinta on se, että `classifySingle`n ehdot eroaisivat `aiBestPlay`n ehdoista. Kun
muutat `aiBestPlay`n yksittäisen kortin haaraa, muuta `classifySingle` samassa muutoksessa.

**Läpikäyntiaineisto:** `docs/NEUVOASEMAT.md` on generoitu otos arvotuista asemista ja niiden
neuvoteksteistä (`NEUVOASEMAT=1 npx vitest run test/neuvoasemat.gen.test.js`, siemen vakio).
Tommi pyysi sen 11.9.2026 tekstien läpikäyntiä varten. Ensimmäinen havainto samasta
otoksesta: Moskan `pass` sanoo "valtit säästetään" myös silloin kun siirto tehdään valtilla,
koska `aiPickPass` siirtää valtilla jos muuta samanarvoista ei ole. Teksti on väärä siinä
haarassa, ja korjaus odottaa Tommin läpikäyntiä (todennäköisesti kaksi avainta kuten
Koputuksen `swapUnknown`).

### Läpikäynti 11.9.2026 myöhäisillalla: neljä havaintoa, kaksi avainta jokaiseen

Koko otos luettiin. Kaksi epäilyä osoittautuivat oikeiksi säännöiksi eivätkä vaadi mitään:
Ristiseiskassa 8 vaatii 6:n ensin (`isPlayable`), ja Kasinossa 10♦ on kädessä 16, joten se ei
kaappaa 10♣:ää. Neljässä kohdassa kortti oli oikea mutta teksti ei nimennyt sääntöä jolla se
valittiin. Tommin päätös: kaksi avainta jokaiseen. Toteutettu samana iltana 23 kieleen.

| Kohta | Otoksessa | Vanha teksti sanoi | Koodi teki | Uusi avain |
|---|---|---|---|---|
| Moska `pass` | 3/4 | valtit säästetään | siirto valtilla, koska muuta samanarvoista ei ollut | `passTrump` |
| Seiska `playSeen` | 2/4 | nähty eniten | tasapeli, ja `pickBySeen` ottaa käden ensimmäisen | `playSeenTie` |
| Seiska `playSavePair` | 2/4 | säästää parisi | yksittäisten välillä ratkaisi nähtyjen laskuri | `playSavePairSeen` |
| Seiska `aceBonusSkip` | 1/4 | ei kannata | bonusmaan korttia ei ollut | `aceBonusNone` |

Tasapelin tunnistus toistaa `pickBySeen`-pisteytyksen (`seenTie`) samoille ehdokkaille kuin
`aiBestPlay`, eli se on samaa lajia kuin `classifySingle`: luokittelu eikä valinta ja sama
ylläpitosääntö koskee sitä. Kaksi asiaa jää kirjattavaksi. `playSeenTie` sanoo "mikä tahansa
käy", mutta opastuksen osuma on yhä avainten yhtäsuuruus, joten tasapelin toisella kortilla tulee
"Eri valinta"; se on osuma-päätöksen tunnettu hinta eikä uusi. `pickBySeen` laskee nähtyihin myös
oman käden samat arvot ja maat, joten "nähty" on tekstissä lavea muttei väärä. Regeneroitu otos
(`NEUVOASEMAT.md`) näyttää jaon: `playSeenTie` osuu tasapeleihin ja `passTrump` valttisiirtoihin.

## Miksi tästä ei tehty konetarkistinta

Neuvoteksti on proosaa ja sen väite on tarkoitus, ei merkkijono. `Kaanon/TYÖTAVAT.md`:n portin
kelpoisuusehdon tarkistus 1 (kohde on merkkijono eikä tarkoitus) ja 3 (väärä hälytys on
poissuljettava) eivät täyty, joten portti hälyttäisi väärin ja sen ohittamisesta tulisi tapa.
Tämä pinta tarkastetaan siis lukemalla, ja tämä dokumentti on sen kirjanpito.

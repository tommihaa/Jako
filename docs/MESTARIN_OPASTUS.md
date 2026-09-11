# Mestarin opastus: neuvo opettelun välineenä

**Mitä tämä dokumentti on.** Päätöskirjaus ja toteutuksen tila (koodissa 11.9.2026, ks. Toteutus). Se korvaa
Tulossa-listan rivin *Mestarin luento* (`src/locales/fi.js`, `todoItems`), joka oli neuvon
rinnalle kirjoitettava selitys siitä miksi Mestari suosittelee siirtoa. Luento hylättiin
11.9.2026, ja tilalle päätettiin opastus. Sopimusmuutos-protokollan mukaisesti päätös on
kirjattu tähän ennen koodia.

## Miksi luento hylättiin

Kaksi syytä, molemmat `docs/MESTARIN_NEUVO.md`:n auditoinnista 18.8.2026.

- Rakenne suojaa siirron muttei perustelua. Neuvon siirto tulee samasta valintafunktiosta kuin
  botin, perustelu on lokalisoitu merkkijono ilman yhteyttä lajitteluavaimiin. Luento olisi
  perustelupintaa moninkertaisesti enemmän, joten sama ajautumavika (oikea siirto väärällä
  syyllä) kasvaisi samassa suhteessa.
- Vastaus syö perustelun. Kun purppura kortti ja kupla näkyvät yhtä aikaa, opettelija painaa
  korttia eikä lue kuplaa. Selityksen lisääminen ei muuta sitä.

Vertailukohta on backgammon-bottien historia: ne kertoivat parhaan siirron equity-lukuna
eivätkä syytä, ja pelaaja oppi vertaamalla omaa siirtoaan botin siirtoon. Sanalliset periaatteet
tulivat ihmisiltä, botti antoi mittarin.

## Päätös 11.9.2026 (Tommi)

Opastus on neuvon toinen muoto: sama kupla ilman korostusta, ja palaute vasta pelaajan oman
valinnan jälkeen. Pelaaja lukee säännön, päättelee siirron itse ja näkee sitten osuiko se
Mestarin valintaan.

| Kysymys | Päätös |
|---|---|
| Kytkentä | Toinen nappi 🧙-napin rinnalla. Pelaaja valitsee vuoroittain neuvon tai opastuksen. |
| Palaute kun valinta erosi | Kupla "Mestari olisi pelannut X" ja lisäksi Mestarin kortti purppuralla siinä paikassa jossa se oli ennen siirtoa, jos kortti on yhä näkyvissä. Jos kortti lähti kädestä eikä sitä enää näy, pelkkä kupla. |
| Palaute kun valinta osui | Lyhyt kuittaus kuplassa. |
| Pelit | Kahdeksan valintapeliä, Läpsy ei (ks. Toteutus). Peleissä joissa Botbench ei näytä Mestarin porrasta Kisälliin opastus sanoo auktoriteettivarauksen ääneen. |

### Auktoriteettivaraus tulee Botbenchistä

Ensimmäinen ehdotus oli rajata opastus mitattuihin peleihin. Tommi päätti 11.9.2026 samana
päivänä toisin: opastus kelpaa myös peleissä joissa porrasta ei ole, mutta silloin varaus
sanotaan pelaajalle. Peruste: opettelun välineenä neuvo on todistetusti hyödyllinen vain siellä
missä Mestari on Kisälliä parempi. Muualla se opettaa Mestarin tapoja, ja pelaajan on saatava
tietää se.

Varauksen pelilista ei ole tämän dokumentin päätös vaan `docs/BOTBENCH.md`:n viimeisimmän
mittauksen tulos, ja se luetaan sieltä joka kerta kun listaa päivitetään.

Tilanne kirjaushetkellä (mittaukset 4.9. ja 8.9.2026, N=400 tai 800, pari `hard vs normal`):

| Porras mitattu (z yli 2) | Ei porrasta |
|---|---|
| Koputus, Maija, Moska, Läpsy, Kasino, Ristiseiska, Kultakala | Seiska (53,5 %, z 1,4), Paskahousu (49,7 %, z −0,2) |

Seiska putosi portaallisten listalta 8.9.2026 kortinlaskurin mittauksessa, joten lista elää.

## Mitä opastus tekee ajautumalle

Opastus ei lisää neuvotekstejä, koska se käyttää samoja 52 auditoitua tekstiä 23 kielellä.
Uutta lokalisoitua tekstiä tulee vain palautekuplaan (jaettu `ui.advice`, arviolta kaksi
avainta), joten ajautumapinta ei kasva.

Opastus on lisäksi ajautuman testi. Jos teksti sanoo "maata jota sinulla on eniten" ja
Mestari valitsee muuta, pelaaja huomaa sen valintansa jälkeen. Jokainen opastustilan pelaaja
tekee saman työn jonka ihmisen pelitesti teki 21.7.2026 löytäessään Maijan ja Moskan väärät
syyt (`283c7c6`). Tämä on syy pitää opastuksen palaute näkyvänä eikä pelkkänä pisteenä.

## Toteutuksen reunaehdot

- Opastus kutsuu samaa `getAdvice`-funktiota kuin neuvo. Ero on siinä mitä UI näyttää ja
  milloin, ei laskennassa. Botbench-luvut eivät saa liikkua, ja se todennetaan siemenvertailulla
  kuten neuvon käyttöönotossa (`docs/MESTARIN_NEUVO.md`, kultainen sääntö).
- Monivaiheisissa peleissä (Moska, Maija, Kasino, Paskahousu) opastus koskee sitä vaihetta jonka
  `getAdvice` tunnistaa, ja palaute annetaan vaiheen siirron jälkeen.
- Palautteen korostus käyttää samaa `advice`-proppia ja `C.botMode`-väriä kuin neuvo.
- Auktoriteettivaraus näkyy opastuksen kuplassa niissä peleissä joissa porrasta ei ole. Sen
  teksti on yksi jaettu `ui.advice`-avain, ja pelilista on koodissa vakio jonka lähde on
  Botbench-osion päiväys.

## Toteutus 11.9.2026

Koodissa samana päivänä kuin päätös, ei julkaistu. Runko on `src/shared/MestariNeuvo.jsx`:n
`useOpastus`-koukku, ja jokainen peli tekee kolme asiaa:

- `computeAdvice` laskee saman olion neuvolle ja opastukselle ja lisää siihen vertailuavaimen
  (`opastusAvain`, siirron laji ja korttien tunnisteet lajiteltuna). `askAdvice` ja `askGuide`
  eroavat vain siinä kumpaan tilaan olio menee.
- Pelaajan käsittelijä kutsuu `opastus.answer(avain)` ennen tilamuutosta. Osuma on avainten
  yhtäsuuruus, joten "Mestari olisi pelannut toisin" ei ole tulkinta vaan merkkijonovertailu.
- Palaute on oma tilansa jota `G`:n muutos ei tyhjennä, koska bottien siirrot tulevat heti
  perään. Se kestää 8 sekuntia tai ✕:ään. Korostus tulee samasta `adv`-oliosta kuin neuvon.
- Neuvo opastuksen päällä näyttää vain korostuksen. Tommin havainto Moska-testissä 11.9.2026:
  🧙 opastuksen jälkeen toisti saman tekstin, ja siitä oli hyötyä vain korostus. Sääntöteksti
  pysyy opastuskuplassa, ja opastus jää odottamaan valintaa. Todennettu Seiskassa devissä.

Todennettu dev-palvelimella 11.9.2026: Seiskassa opastus ilman korostusta ja varausteksti,
osuma, eri valinta jossa Mestarin kortti korostui purppuralla; Kultakalassa nostokohteen osuma.
Botbench-lukuja ei mitattu uudelleen, koska valintafunktioihin ja `getAdvice`-runkoihin ei
koskettu (`neuvo-sauma`-testi vihreä). Muut seitsemän peliä on integroitu samalla kaavalla
mutta todennettu vain buildilla, typecheckillä ja testeillä, ei pelaamalla.

**Läpsy jää ilman opastusta (Tommin päätös 11.9.2026).** Sen neuvo (`lapsyAdvice`) on huomion
ohjaus (ennakoitu kortti, hälytys, käännä), ei valinta vaihtoehtojen välillä, joten "sama vai
eri valinta" ei ole siinä määriteltävissä. Päätöstaulukon "kaikki yhdeksän" tarkoittaa siis
kahdeksaa valintapeliä, ja Läpsyllä on edelleen vain 🧙-neuvo.

Tulossa-listan rivi on vaihdettu luennosta opastukseksi (`src/todo.js`, `fi.js`), tila `open`
kunnes julkaistaan.

## Testausvelka (Tommin merkintä 11.9.2026)

Opastus on harppaus: yhdeksän tiedostoa, kahdeksan pelin käsittelijät ja uusi jaettu tila
yhdessä sessiossa. Siksi tämä kohta pysyy auki kunnes alla oleva taulukko on täynnä, eikä yksi
pelitesti sulje sitä. Rivi kuitataan päivämäärällä ja sillä mitä pelattiin.

| Peli | Opastus ilman korostusta | Osuma | Eri valinta ja korostus | Vaiheet (jos on) |
|---|---|---|---|---|
| Seiska | 11.9. Claude, dev | 11.9. | 11.9. | |
| Kultakala | 11.9. Claude, dev | 11.9. | | vaihto ja pysäytys |
| Ristiseiska | | | | pantti ja bonusvuoro |
| Koputus | | | | nosto, vaihto, koputus |
| Maija | | | | hyökkäys, puolustus, otto |
| Moska | 11.9. Tommi, dev | 11.9. | 11.9. | 11.9. kaikki vaiheet toimivat |
| Paskahousu | | | | vaihto, koputus, nosto |
| Kasino | | | | kaappaus, rakennus, jättö, rakennelma |

Tuotantotesti on eri rivi kuin dev-testi, joten julkaisun jälkeen sama taulukko täytetään
uudelleen livestä ainakin kolmen pelin osalta.

## Osuma ja sääntötaso (Tommin päätös 11.9.2026: kaanoni, ei koodi)

Seiskan testissä Tommi pelasi Mestarin ehdottaman maan eri kortin ja sai "Eri valinta".
Mestarin mittarilla valinta oli eri (`aiBestPlay` suosii paritonta korttia ja sen jälkeen
kortinlaskurin arvoa), mutta teksti "Lyö K♠." ei kertonut sääntöä, joten palaute rankaisi
säännöstä jota ei opetettu.

Vaihtoehdot olivat osuman löysentäminen koodissa (sama maa kelpaa) tai tekstien nosto
sääntötasolle. **Päätös: kaanoni.** Osuma pysyy avainten yhtäsuuruutena, koska löysempi osuma
olisi uusi arvostelukerros botin laskennan ulkopuolella ja sanoisi "sama valinta" silloinkin
kun Mestarin laskuri sanoo toista. Sen sijaan jokainen kortin nimeävä teksti kertoo säännön
jolla kortti valittiin vaihtoehtojen joukosta. Neuvossa kortin nimeäminen on jo nyt
tarpeetonta (kortti korostuu), joten sääntöteksti palvelee molempia muotoja.

### Auditointi 11.9.2026: 52 tekstiä sääntötason vaatimusta vasten

Vaatimus on tiukempi kuin 18.8.2026 auditoinnin (oikea siirto oikealla syyllä): teksti ei saa
vain olla väittämättä väärää, sen on nimettävä avain jolla kortti erottui vaihtoehdoista.

| Peli | Teksti | Tila | Koodin avain |
|---|---|---|---|
| Seiska | `play` yksi kortti | **puuttuu** | 3–5 kortin käsi: jätä samanarvoinen ryhmä; muuten pariton kortti; loput kortinlaskuri (`pickBySeen`, arvo painaa 4×, maa 1×) |
| Seiska | `aceBonusPlay` | **puuttuu** | ryhmä tai pieni käsi (≤ 2 jää) eikä kukaan yhden kortin päässä |
| Moska | `add` | **puuttuu** | pienin ei-valtti, pariton ensin (`aiPickAddCard`) |
| Moska | `pass` | **puuttuu** | pienin sopiva, valttia säästäen (`aiPickPass`) |
| Kasino | `capture` | osittain | pistekortit (♦10 2, ♠2 1, A 1, mökki 1), sitten padat, sitten määrä (`aiCardScore`) |
| Kasino | `trail` | osittain | pienin varastusriski, pistekortit ja ässät pois poolista (`pickTrail`) |
| Ristiseiska | `play` | osittain | pienin arvo porttisäännön jälkeen (`aiBestCard`) |
| muut 45 | | riittää | sääntö on tekstissä tai valinta on kaksiarvoinen |

### Tekstiehdotukset (fi, Tommi kuittasi 11.9.2026, toteutus seuraavassa sessiossa)

Seiskan `play` jaetaan neljäksi, koska sääntö riippuu haarasta. Haara luetaan `getAdvice`ssa
valitun kortin ehdoista jälkikäteen (ei uutta valintaa, vain luokittelu), joten `aiBestPlay`
ei muutu eikä Botbench liiku.

| Avain | Ehdotus |
|---|---|
| seiska `playOnly` | Lyö {card}. Se on ainoa käypä kortti. |
| seiska `playLeaveGroup` | Lyö {card}. Käteen jää samanarvoinen ryhmä, jonka voit lyödä kerralla. |
| seiska `playNoPair` | Lyö {card}, sillä ei ole paria kädessä. Parit säästetään ryhmälyöntiin. |
| seiska `playSeen` | Lyö {card}. Sen arvoa on nähty eniten, joten muilla on vähiten vastattavaa. |
| seiska `aceBonusPlay` | Käytä bonusvuoro: lyö {cards}. Kannattaa kun ryhmä lähtee kerralla tai käsi on jo pieni eikä kukaan ole yhden kortin päässä. |
| moska `add` | Lyö {card} sivusta: pienin ei-valtti, jolla ei ole paria. Puolustajalla riittää kortteja, paina päälle. |
| moska `pass` | Siirrä hyökkäys eteenpäin kortilla {cards}. Pienin sopiva riittää, valtit säästetään. |
| kasino `capture` | Kaappaa {targets} kortilla {card}. Arvokkain kaappaus: ensin pistekortit (♦10, ♠2, ässät), sitten padat, sitten määrä. |
| kasino `trail` | Jätä {card} pöytään. Kannattavaa kaappausta ei ole, ja tämä on kortti jonka vastustaja epätodennäköisimmin kaappaa. Pistekortit ja ässät pysyvät kädessä. |
| ristiseiska `play` | Lyö {card}, pienin pelattava. Portti (6 tai 8) jää käteen lukoksi, ja se avataan vasta kun samassa maassa on vähintään kaksi korttia joita et pääse pian pelaamaan. |

Seuraavan session työlista (kaikki kuitattu 11.9.2026, mitään ei ole aloitettu koodissa):

1. Nämä kymmenen tekstiä fi.js:ään ja 22 muuhun localeen (insert-after-anchor pelilohkon
   `advice: {` sisään; Seiskan `play` jää ryhmätekstiksi).
2. Seiskan `getAdvice` luokittelee yksittäisen kortin haaran jälkikäteen: ainoa käypä →
   `playOnly`; 3–5 kortin käsi ja jää samanarvoinen ryhmä → `playLeaveGroup`; pariton
   kandidaatti kun parillisiakin oli → `playNoPair`; muuten `playSeen`. Ei muutosta
   `aiBestPlay`hin.
3. `MESTARIN_NEUVO.md`: merkintä sääntötason vaatimuksesta ja tämä auditointi.
4. Erillinen sääntötyö `SEISKA.md` (commit bc4de50): erikoiskortti viimeisenä vain saman
   erikoiskortin päälle, lyöjä nostaa kortin. Koodi `canSingle` (isLast-haara katsoo
   `discardTop.r`) ja `doPlay` (tyhjä käsi erikoiskortilla → nosto ennen voittotarkistusta,
   sekoitus jos pakka tyhjä, uusi lokiviesti 23 kielelle). Koskee botteja, joten Seiska
   mitataan Botbenchillä N=400 kolmella parilla ennen julkaisua.
5. Sivulöydös samalta lukukerralta: `applyAcePenalty` sekoittaa pakan vain kerran ennen
   nostosilmukkaa, joten pakan viimeisen kortin jälkeen loput rangaistusnostot jäävät
   tekemättä vaikka lyöntipakassa olisi kortteja. Kanoni sanoo että nosto ei jää väliin.
   Korjaus kuuluu samaan Seiska-erään.

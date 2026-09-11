# Mestarin opastus: neuvo opettelun välineenä

**Mitä tämä dokumentti on.** Päätöskirjaus ominaisuudesta joka ei ole vielä koodissa. Se korvaa
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
| Pelit | Kaikki yhdeksän. Peleissä joissa Botbench ei näytä Mestarin porrasta Kisälliin opastus sanoo auktoriteettivarauksen ääneen. |

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

## Tila

Kirjattu 11.9.2026. Ei koodissa. Tulossa-listan rivi vaihdetaan luennosta opastukseksi
koodivaiheessa samalla kun ominaisuus tehdään.

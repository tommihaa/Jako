# Vertailu: Ville Lammisen AccessibleBridge

Ville Lamminen (Näkövammaisten liitto, sokea ruudunlukuohjelmien tehokäyttäjä) lähetti
21.10.2026 linkin omaan korttipelialustaansa (`Kaanon/docs/YHTEYDENOTTO_NKL.md` › Villen
toinen vastaus). Osoite on hänen viestissään eikä tässä. Claude luki 22.10.2026 sivut,
ohjeet ja selainpuolen skriptit (`maija.js`, `ristiseiska.js`, `hertta.js`, `kortit.js`).
**Peliä ei pelattu**, koska pöydän luonti olisi kirjoittanut hänen palvelimelleen. Palvelimen
koodi ei näy selaimeen, joten bottien tekoälystä ei tiedetä mitään.

Ville antoi luvan hyödyntää näppäinkomentoja vapaasti. Koodin lisenssiä ei ole kerrottu, joten
alla on tapoja eikä kopioitavaa koodia.

## Mitä alustalla on

| Peli | Kieli | Pelaajat | Tallennus |
|---|---|---|---|
| Bridge | englanti | 4 ihmistä tai robottia, lisäksi katsoja (kibitzer) | jaon tallennus ja tuonti PBN-tiedostona, double dummy -katselu tikki kerrallaan |
| Hertta | englanti | 4 | kierrosten pistetaulukko, tallennettu pöytä jatkuu myöhemmin |
| Musta Maija | suomi | 2–5 | ei tallennusta |
| Ristiseiska | suomi | 2–8 | ei tallennusta |

## Vastustajat: ihmisiä ja robotteja samassa pöydässä

Moninpeli on ensisijainen. Pöydän luoja saa nelinumeroisen pöytäkoodin ja linkin, muut liittyvät
koodilla ja nimellä, ja palvelin (Node ja socket.io, Azure) välittää tapahtumat. Robotit
täyttävät tyhjät paikat, mutta vähintään yhden pelaajan on oltava ihminen. Luoja lisää ja
poistaa robotit ja aloittaa pelin. Jos luojan yhteys on poikki yli viisi minuuttia, oikeudet
siirtyvät pisimpään pöydässä olleelle. Sivun uudelleenlataus palauttaa samaan pöytään ja
samalle paikalle. Pöydissä on chat.

Tämä on se mitä Villen bridge-tarve vaati: sokea pelaa näkevien kanssa samassa pöydässä.
Jako pelataan botteja vastaan yhdellä laitteella. Seiskassa voi myös vuorotella samalla
ruudulla (`P3_PASS_AND_PLAY.md`, peittokuva `Seiska.jsx`:ssä). Verkon yli pelattavaa pöytää ei
ole, joten ero on tarkoituksen eikä toteutuksen.

## Siirtojen merkintä: ei shakin tai backgammonin kaltaista

Bridgessä on alan oma standardi PBN (Portable Bridge Notation), ja Ville käyttää sitä sekä
viennissä että tuonnissa. Maijassa, Ristiseiskassa ja Hertassa merkintää ei ole. Tapahtumat
kirjoitetaan luonnollisena lauseena lokiin (enintään 100 riviä), esimerkiksi *"Kalle löi
pelaajalle Liisa 3 korttia: pata 2, 3, 4"*. Loki on sama teksti jonka ruudunlukija kuulee.
Näille peleille ei ole yleistä merkintästandardia, eikä Ville ole sellaista keksinyt.

Jaon `ReplayView` (kehykset nuolinäppäimillä) on siis pidemmällä kuin Villen kolme
korttipeliä. PBN:n vastinetta ei kummassakaan ole.

## Opittavaa Jakoon

Järjestys on arvio hyödystä. Mikään ei ole päätös.

1. **Robotin viive sisältää edellisen ilmoituksen lukuajan.** Palvelin arvioi lukuajan
   samalla kertoimella kuin selain (45 ms merkiltä) ja lisää sen robotin odotukseen. Siksi
   jono ei kasva pelin aikana. Jaossa bottiajastus (`useAIScheduler`) ja ilmoitusjono
   (`Announcer.jsx`, 75 ms merkiltä, vähintään 1 s ja 700 ms tauko) ovat erillään, ja Läpsyn
   punninta osoitti jonon kasvavan (`Kaanon/docs/YHTEYDENOTTO_NKL.md` › Läpsyn perustelu).
   Sama kytkentä korjaisi viiveen kaikissa peleissä eikä vain Läpsyssä.
2. **Kaksi kanavaa.** Pelitapahtumat menevät jonoon (`announce`). Vastaus pelaajan omaan
   komentoon (lukukomento, valinta, virhe) menee jonon kärkeen ja katkaisee kesken olevan
   (`respond`). Oma siirto ja sen välittömät seuraukset (pakka loppui, pääsi pois, peli
   päättyi, seuraava vuoro) kootaan yhdeksi ryhmäksi ja luetaan heti. Jaossa sama tehdään
   siirtämällä kohdistus viestiriville (`skipAnnouncements`), ja se on jo kerran hukannut
   viestejä (J-22, J-26).
3. **Saman maan kortit ryhmitellään:** *"pata 2, 3, 4, hertta 10"*. Jaon Tilanne sanoo
   *"risti neljä, risti viisi, risti kymmenen"*. Villen 14.10. ohje oli riittävä tieto
   mahdollisimman lyhyesti, ja tämä on hänen oma toteutuksensa siitä. Arvot hän kirjoittaa
   numeroina ja jättää ääntämisen syntetisaattorille. Vaikuttaako tämä Heidin
   taivutusvirheisiin, on mittaamatta.
4. **Kortin valinta kahdella näppäimellä:** maa ja arvo (S 2 = pata 2), maa kahdesti valitsee
   maan kaikki kortit, L lyö. Maat ovat bridgen englantilaiset S H D C, arvot A K Q J, T tai 1
   ja 2–9. Jaossa korttiin päästään vain Tabilla ja Enterillä (`Card.jsx`).
5. **Lukukomennot Alt-näppäimillä**, yksi asia kerrallaan: omat padat, hertat, ruudut, ristit
   (Alt+A, S, D, F), koko käsi (Alt+G), kenen vuoro (Alt+V), viimeisin tapahtuma (Alt+P),
   yhteenveto (Alt+Y, Jaon Tilannetta vastaava) ja viimeisimmän ilmoituksen toisto (Alt+I).
   Ristiseiskassa ylärivi Q W E R kertoo mitä kuhunkin maahan voi pöytään lyödä, ja sen alla
   A S D F lukee oman käden samassa maajärjestyksessä. Jaon pelinäkymän ainoa lukukomento on
   H (Tilanne, `GameStatusBar.jsx`).
6. **Ohje käskee käyttämään lomaketilaa** (NVDA Insert+Välilyönti, JAWS Insert+Z), jotta
   yhden näppäimen komennot menevät peliin. Sama ongelma kuin Jaon H-näppäimellä, joka toimii
   vain kohdistustilassa. Villen ratkaisu on ohje eikä koodi.
7. **Vuoron alku kuuluu ja näkyy:** 660 Hz merkkiääni, sininen palkki ja välilehden otsikko
   *"▶ Sinun vuorosi"*.
8. **Ristiseiska ei kerro mitkä kortit ovat lyötävissä**, vaan pelaaja päättelee sen itse. Alt+Q–R
   kertoo pöydän avoimet paikat, joten kuulijalla on sama tieto kuin näkijällä (pöydän
   keltaiset merkit) eikä enempää. Sama periaate kuin Villen 14.10. *"kunhan siitä ei saa
   pelillistä etua"*.

Ristiseiskan sääntö on sama kuin Jaossa: kortin pyytää edelliseltä pelaajalta jolla on
kortteja (`RISTISEISKA.md` › Pantti). Jaossa antotapa on aloitusnäytön valinta, Villellä antaja
valitsee aina.

## Maijan säännöt rinnakkain

Tommi 22.10.2026: monissa peleissä on paikallisia muunnelmia, ja Maija on kiva vertailla, koska
säännöt näyttävät samoilta. Villen puoli on luettu hänen ohjeestaan (`maija/ohje.html`), koska
palvelimen koodi ei näy. Jaon puoli on luettu `MAIJA.md`:stä ja `src/games/Maija.jsx`:stä
22.10.2026.

| Kohta | Ville | Jako | Sama? |
|---|---|---|---|
| Pelaajia | 2–5 | 2–4 (`counts={[2, 3, 4]}`) | ei |
| Käsi | 5 korttia | 5 korttia | kyllä |
| Valtti | pakan pohjimmaisen maa, nostetaan viimeisenä | sama | kyllä |
| Pata valttina | ei voi olla, tapaa ei kerrota | ei voi olla, pakka sekoitetaan uudelleen (`initGame`) | sääntö kyllä, tapa tuntematon |
| Hyökkäys | 1–5 saman maan korttia, enintään vastaanottajan käden verran | saman maan kortteja, enintään vastaanottajan käden verran; viiden rajaa ei ole | lähes: ero näkyy vain kun hyökkääjällä on yli viisi samaa maata ja vastaanottajalla yli viisi korttia |
| Kaato | saman maan suuremmalla tai valtilla, valtin vain suuremmalla valtilla | sama (`canBeat`) | kyllä |
| Musta Maija | ei voi kaataa eikä sillä voi kaataa | sama | kyllä |
| Kaatamatta jääneet | kaatajan käteen | sama | kyllä |
| Seuraava hyökkääjä | kaiken kaatanut lyö; muuten vuoro ohittaa kaatajan | sama (`nextAttDef`) | kyllä |
| Täydennys | viiteen niin kauan kuin pakkaa on | hyökkääjä heti lyönnin jälkeen, kaataja kaadon jälkeen | ajoitus Villellä kertomatta |
| Loppukiri | pakan loputtua korteista eroon päässyt pääsee pois | sama | kyllä |
| Häviäjä | viimeiseksi jäänyt pitää pata rouvaa | Maijan viimeinen omistaja | kyllä |
| Aloittaja | jakovuoro kiertää, jakajaa seuraava aloittaa, ensimmäinen jakaja arvotaan | Hero hyökkää aina ensin (`attackerIdx:0`) | ei |

**Erot ovat kolme:** pelaajamäärä, aloittaja ja viiden kortin hyökkäysraja. Aloittajan ero
on suurin, koska Jaossa ihminen saa aina ensimmäisen hyökkäyksen. Pelitapa itse on sama.
Onko jokin eroista muutettava, on Tommin päätös, eikä mitään ole muutettu (`CLAUDE.md` ›
Sääntölogiikan muokkaus).

## Ristiseiskan säännöt rinnakkain

Tommi 22.10.2026 nimesi eron: Jaossa ensimmäisellä kierroksella ei anneta panttia. Villen ohje
ei mainitse poikkeusta, joten hänellä kortti pyydetään heti ensimmäisestä passista. Muu on
luettu kuten Maijassa: Villen ohje vasten `RISTISEISKA.md`:tä ja `ristiseiskaEngine.js`:ää.

| Kohta | Ville | Jako | Sama? |
|---|---|---|---|
| Pelaajia | 2–8 | 3–4 (`counts={[3, 4]}`) | ei |
| Aloitus | ristiseiskan haltija, seiska pelataan automaattisesti | ristiseiskan haltija lyö sen | kyllä, Villellä automaattinen |
| Pöydän rakentuminen | 6 vaatii 7, 8 vaatii 7 ja 6, sitten 5–A alas ja 9–K ylös | sama | kyllä |
| Ässä ja kuningas | saa lyödä vielä yhden tai lopettaa | ei-pakollinen bonusvuoro | kyllä |
| Pakko lyödä | jos voi, on lyötävä | passaus vain jos ei käy | kyllä |
| Pantti ensimmäisellä kierroksella | pyydetään | ei anneta | **ei** |
| Antaja | edellinen pelaaja; yhden kortin haltija ohitetaan | edellinen jolla on yli yksi kortti (`prevWithCards`) | kyllä |
| Antotapa | antaja valitsee | aloitusnäytön valinta: antaja valitsee tai arvotaan | Jaossa lisävalinta |
| Saatu kortti | ei lyödä samalla vuorolla | pantti päättää vuoron | kyllä |
| Lyötävien näyttö | peli ei kerro | (ei verrattu) | |

**Kaanonin ja koodin ero löytyi samalla:** `RISTISEISKA.md` sanoo antajan olevan edellinen
pelaaja *jolla on vielä kortteja*, mutta `prevWithCards` vaatii yli yhden kortin, kuten
Villellä. Tommi päätti 22.10.2026 korjata kaanonin koodin mukaiseksi, ja `RISTISEISKA.md` ›
Pantti on korjattu.

## Tommin tilaus 22.10.2026: kaatotapa Maijaan ja Moskaan

Tommi pelasi Villen Maijaa ja totesi Jaon Maijan ja Moskan raskaiksi TalkBackilla. Hänen
sanansa: *"ehdottomasti pitää ottaa Jako-koodiin"*. Jaossa puolustaja valitsee ensin pöydän
kortin (`selDefTargetIdx`, `Maija.jsx`, ja `selDefTarget`, `Moska.jsx`) ja sitten kaatavan
kortin. Villellä puolustaja valitsee kaatavat kortit kerralla ja painaa L, ja peli parittaa ne
pöydän kortteihin. Kaatamatta jääneet nostetaan. Monivalinnassa Tommi valitsi Villen tavan,
eikä vaihtoehtoa *seuraava kaatamaton kortti automaattisesti kohteeksi*.

**Päätetty 23.10.2026** (Tommin vastaukset monivalintaan): eniten kaatava paritus ja
tasatilanteessa pienin pöydän kortti ensin, koska nostettavaksi jäävät mieluiten suuret.
Pariton valittu kortti jää käteen ilmoituksella. Kahden vaiheen tapa poistuu kokonaan. Moskassa
sama valinta kulkee Kaada- ja Siirrä-napille. Säännöt: `MAIJA.md` ja `MOSKA.md` › Ihmisen
kaatotapa.

**Toteutettu ja kuunneltu 23.10.2026** (commit `3e09d26`, ei vielä julkaistu). Tommi kuunteli
Maijan puolustuksen TalkBackilla Pixel 8a:lla dev-palvelimelta: pöydällä hertta 7, kaatavina
hertta 9 ja hertta 10. Tommin arvio: *"kuului ok"*. Moskaa ei kuunneltu laitteella, vain
jsdom-testi (`test/kaatotapa.test.jsx`) ja paritusfunktion yksikkötestit.

Toinen havainto samalta pelikerralta: Villen pelissä uusi tapahtuma keskeytti edellisen
lukemisen, eikä Tommi pitänyt siitä. Kohdan 2 ilmoitusten kärkeen nostaminen on siis
punnittava, eikä sitä oteta sellaisenaan.

## Mitä Villelle voisi tarjota

Tommin ajatus 22.10.2026: Jaon julkinen repo (`github.com/tommihaa/Jako`) voisi olla Villelle
hyödyllinen. Vastaus ja sen sisältö on Tommin päätös.

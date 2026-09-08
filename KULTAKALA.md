# Kultakala

## Pelitapa

Jokaiselle jaetaan 1 tuntematon + 5 pöytäkorttia. 

Yrität saada omiin pöytäkortteihisi mahdollisimman pieniä, A = 1 … K = 13.

Nosta vuorollasi kortti pakasta tai poistopakasta. Voit vaihtaa sen paikalle 5 rivin oikeaan päähän, sitten paljastuneen kortin paikan 4 korttiin jne. Tuntematon ei ole vaihdettavissa ja paljastuu vasta pelin lopussa, kun korttien pisteet lasketaan yhteen. Pienin summa voittaa.

## Pelaajakohtainen näkyvyys

- Jokainen pelaaja oppii **omat pöytäkorttinsa** (paikat 1-5) vasta vaihtaessaan kortin kuhunkin paikkaan: alussa nekin ovat häneltä piilossa
- Jokainen pelaaja näkee **oman tuntemattoman kortin** (paikka 0) vasta pelin lopussa
- Muiden pelaajien kortit ovat **piilossa** koko pelin ajan
- Poistopakka on **näkyvä kaikille** (ylin kortti)
- Nostopakan koko on **näkyvä kaikille**

## Pakan koko ja kierrosten määrä

- **4 pelaajaa**: 28 korttia = ~7 kierrosta
- **3 pelaajaa**: 34 korttia = ~11 kierrosta
- **2 pelaajaa**: 40 korttia = ~20 kierrosta

Mitä vähemmän kierroksia, sitä kriittisempiä ovat päätökset.

## Tasapeli

Tasapelissä samat pisteet saaneet jakavat sijan. Arvontaa ei ole.

Kirjattu 3.9.2026 Tommin päätöksellä. Koodissa oli tähän asti noppa-arvonta jota pelaaja
ei nähnyt kertaakaan, koska se renderöityi vain saavuttamattomassa tulosruudussa
(kompositioauditointi H3). Ranking laski jo jaetun sijan, joten kaanoni vahvistaa sen mitä
pelaaja on aina nähnyt, ja arvonta poistetaan koodista.

## AI-strategia

AI voi nähdä vain:
- Omat pöytäkortit (tunnetut paikat)
- Pakan koon (kierrosten määrä)
- Ylin poistopakkakortti

AI **ei voi nähdä**:
- Muiden pelaajien kortteja
- Kenen pistemäärä on paras/huonoin
- Tuntemattomia kortteja

**Päätöslogiikka (nostopäätös poistopakan ylimmästä):**
1. Jos kortti on parempi kuin pahin tunnettu oma kortti → nosta se
2. Muuten: jos kortti on hyvä ja rivissä on tuntematon paikka → nosta se
3. Muuten nosta pakasta

**Nosto ja vaihto ovat eri päätökset. Vaihto kulkee aina paikan 5 kautta (8.9.2026).**
Botti vaihtaa nostetun kortin samalla tavalla kuin ihminen: ensin paikkaan 5, sitten
paljastunut kortti paikkaan 4 ja niin edelleen. Poistopakasta nostettu on pakko vaihtaa
paikkaan 5. Kohdat 1 ja 2 sanovat siis milloin poistopakan kortti kannattaa nostaa, eivät
mihin se laitetaan. Tähän asti botti vaihtoi kohdan 1 kortin suoraan pahimman tunnetun
tilalle mihin tahansa paikkaan, mikä oli ristiriidassa Pelitapa-osion kanssa ja etu jota
ihmisellä ei ollut. Katselutilassa 8.9.2026 se ratkaisi pelin (A♣ suoraan paikkaan 1,
ks. `docs/BOTBENCH.md` › Katselu 8.9.2026). Tommin päätös: kaanoni korjataan ja botti
aloittaa paikasta 5 kuten ihminen.

**Kyvykkyysporras.** Tasot eroavat kyvyiltään eivätkä satunnaisuudelta. Kohta 2 on
tasokohtainen, ja vain Mestari lukee kierrosten määrää:

| Taso | Kohdan 1 kynnys | Kohta 2: milloin tuntemattomaan |
|---|---|---|
| Oppipoika | pahin tunnettu **+3** (ottaa liian herkästi, esim. 9:n 7:n tilalle) | ei täytä tuntemattomia |
| Kisälli | pahin tunnettu | ei täytä tuntemattomia |
| Mestari | pahin tunnettu, ja verrataan kumpi hyöty on suurempi | arvo **≤ 4**, ja **≤ 6** kun kierroksia on enintään kaksi |

Tuntemattoman paikan odotusarvo on **7**, joten Mestarin ehto tarkoittaa vähintään kolmen
pisteen odotettua hyötyä, ja loppupelissä vähintään yhden. **Myöhäispelissä siis
aggressiivisempi**, koska täyttämättä jäänyt tuntematon paikka jää tuntemattomaksi eikä
korjaukselle jää enää vuoroja. Kynnys lukee vain nostopakan kokoa ja botin omaa riviä.

**Vaihtojen järjestys:**
- Vaihdetaan paikkoihin 5, 4, 3, 2, 1 järjestyksessä
- Ei oikaista tuntemattomaan paikkaan

**Ketjuvaihto on Mestarilla arvolaskenta, muilla säännöstö (7.9.2026).** Oppipoika ja Kisälli
lukevat taulukkoa, jossa kortin arvo ratkaisee vaihdetaanko paikkaan. Mestari laskee sen sijaan
askelen odotetun pistesäästön ketjun loppuun asti ja vaihtaa vain kun summa on positiivinen.
Paikan arvo on tunnetulla paikalla sen oma arvo ja tuntemattomalla 7, ja lopettaminen on
arvoltaan nolla, koska pakasta nostetun kortin saa heittää poistopakkaan. Laskenta lukee vain
botin omaa riviä ja sen tunnettuja paikkoja, joten näkyvyyssääntö pätee ennallaan.

Muutos korjaa kaksi kohtaa, joissa vanha säännöstö pelasi Mestarilla väärin. Se ei verrannut
nostettua korttia paikan tunnettuun arvoon, joten viitonen meni kakkosen tilalle aina kun
edessä oli tuntemattomia. Eikä se verrannut vaihtoa vaihtoehtoon lopeta. Sama laskenta ajaa
Mestarin neuvon Herolle, joten neuvo muuttui samalla.

Mitattu N=400:lla 7.9.2026: `hard vs normal` 52,6 → 60,6 % ja `hard vs beginner` 62,1 →
70,9 %, kun verrokki `normal vs beginner` pysyi bitilleen samana. Ks. `docs/BOTBENCH.md`.

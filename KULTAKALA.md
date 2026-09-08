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

**Nosto ja vaihto ovat eri päätökset. Vaihto kulkee aina paikan 5 kautta (8.9.2026).**
Botti vaihtaa nostetun kortin samalla tavalla kuin ihminen: ensin paikkaan 5, sitten
paljastunut kortti paikkaan 4 ja niin edelleen. Poistopakasta nostettu on pakko vaihtaa
paikkaan 5. Nostopäätös sanoo siis vain kannattaako poistopakan kortti nostaa. Se verrataan
paikan 5 korttiin eikä pahimpaan tunnettuun, koska vain paikkaan 5 se voi mennä. Tähän asti
botti vaihtoi poistopakan kortin suoraan pahimman tunnetun tilalle mihin tahansa paikkaan,
mikä oli ristiriidassa Pelitapa-osion kanssa ja etu jota ihmisellä ei ollut. Katselutilassa
8.9.2026 se ratkaisi pelin (A♣ suoraan paikkaan 1, ks. `docs/BOTBENCH.md` › Katselu
8.9.2026). Tommin päätös: kaanoni korjataan ja botti aloittaa paikasta 5 kuten ihminen.

*Se oli koodissa alusta asti.* Ensimmäinen commit 6.5.2026 vei poistopakan kortin suoraan
pahimman tunnetun tilalle. Sama kutsu eli jokaisen välivaiheen läpi (vaikeustasojen hionta
18.7., Mestarin neuvo 19.7., kompositioauditointi 3.9.) tämän päivän committiin asti. Tommi
muisti sen estetyksi kuukausia sitten. Muisti osui 16.5.2026 committiin, jossa ketjuvaihto
sai järjestyksen 5, 4, 3, 2, 1 ja yllä olevan rivin *ei oikaista tuntemattomaan paikkaan*. Se
esti oikaisun pakasta nostetulla kortilla. Poistopakasta nostettu kulki eri funktion kautta.
Se jäi koskematta. Lokirivi *vaihtaa: paikka 2: A♣ sisään* näyttää normaalilta, ellei
tiedä ettei ihminen voi tehdä samaa. Siksi se löytyi vasta lokia ihmisen vaihtokoodiin
vertaamalla eikä pelaamalla. Todennettu gitistä 8.9.2026 (`git log -S aiDoSwap`).

**Päätöslogiikka (nostopäätös poistopakan ylimmästä):**
1. Jos paikka 5 on tunnettu ja kortti on sitä parempi → nosta poistopakasta
2. Muuten: jos paikka 5 on tuntematon ja kortti on hyvä → nosta poistopakasta (vain Mestari)
3. Muuten nosta pakasta

**Kyvykkyysporras.** Tasot eroavat kyvyiltään eivätkä satunnaisuudelta. Kohta 2 on
tasokohtainen, ja vain Mestari lukee kierrosten määrää:

| Taso | Kohdan 1 kynnys | Kohta 2: milloin tuntemattomaan paikkaan 5 |
|---|---|---|
| Oppipoika | paikan 5 kortti **+5** (ottaa liian herkästi, esim. 11:n 7:n tilalle; oli +3 8.9.2026 asti) | ei täytä tuntemattomia |
| Kisälli | paikan 5 kortti | ei täytä tuntemattomia |
| Mestari | ketjun arvo paikasta 5 loppuun asti on positiivinen | odotettu hyöty **≥ 3** (arvo ≤ 4), ja **≥ 1** (arvo ≤ 6) kun kierroksia on enintään kaksi |

Mestari laskee nostopäätöksen samalla ketjuarvolla kuin vaihdon (alla), pakollinen ensimmäinen
askel mukaan luettuna. Tuntemattoman paikan odotusarvo on **7**, joten kohdan 2 kynnys
tarkoittaa vähintään kolmen pisteen odotettua hyötyä, ja loppupelissä vähintään yhden.
**Myöhäispelissä siis aggressiivisempi**, koska täyttämättä jäänyt tuntematon paikka jää
tuntemattomaksi eikä korjaukselle jää enää vuoroja. Kynnys lukee vain nostopakan kokoa ja
botin omaa riviä.

**Ensimmäinen 8.9.2026 versio piti vanhan vertailun (pahin tunnettu) ja vaihtoi silti
paikkaan 5.** Botbench näytti kaksi pattia ja verrokkiparin romahduksen (67,6 → 53,9 %):
pieni kortti kiersi paikan 5 kautta pelaajalta toiselle, koska sääntötasojen vaihtosääntö ei
vertaa korttia paikan 5 tunnettuun arvoon. Vertailukohta vaihdettiin paikkaan 5 samana päivänä.

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

**Oppipojan kynnys +3 → +5 (Tommin päätös 8.9.2026 illalla).** Kun vaihto alkoi kulkea
paikan 5 kautta (yllä), Kisällin porras Oppipoikaan kapeni 67,6:sta 56,5 prosenttiin, koska
liikaherkkyys +3 ei enää maksanut paljon. Kynnys +5 mitattiin N=1600:lla: porras leveni
52,4:stä 59,5 prosenttiin (muutoksen z 4,05), viikon ensimmäinen ei-nollatulos. Muutos
tekee Oppipojasta heikomman eikä Kisällistä parempaa. Luvut `docs/BOTBENCH.md` › Kisällin
porras 8.9.2026 illalla.

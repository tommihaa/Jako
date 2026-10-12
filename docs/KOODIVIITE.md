# Jako: koodiviite

Siirretty `CLAUDE.md`:stä 12.10.2026 sanatarkasti, jotta session alussa latautuva tiedosto
pysyy alle 200 rivin. Tämä on hakuteos: luetaan kun kosketaan valikkoon, esiasetuksiin,
pakkaluokkaan tai ääniin.

## Navigation
Valikko (päävalikko) → Peli (suoraan, ei välinäyttöä)
- `playerCount` valitaan kunkin pelin aloitusnäytöllä (Pelaajia 2/3/4); App.jsx välittää vain oletuksen (4) propsina, ei globaalia säädintä. Asetukset → Pelaajat sisältää enää vastustajien nimiryhmän valinnan.
- Ristiseiska: `Math.max(playerCount, game.minPlayers)` varmistaa min 3 pelaajaa

## Näkyvyysesiasetus ja intuitiivisuus-UI

**Näkyvyysesiasetus (`uiPreset`):** Peliasetusten alussa segmented-valinta *Aloittelija/Kokenut* asettaa kuusi opastustoggea kerralla (`UI_PRESETS`-kartta App.jsx:ssä); yksittäiset togglet ovat "Lisäasetukset"-taitoksen takana (`showLisaasetukset`). Manuaalinen toggle-muutos → `uiPreset='custom'`.

**Intuitiivisuus-UI (kesäkuu 2026):** Päävalikon pelikorteissa suosikit (`g.suosikki`) merkitään ★:llä + ensikäynnin "aloita tästä" -vyö (näkyy kun yhtään peliä ei pelattu, `stats`-summasta). Säännöt avautuvat selkeästä "Säännöt"-pillistä (ei enää matalakontrastinen ℹ, sillä ℹ tarkoittaa nyt vain yläpalkin sovellus-Infoa); laajennuksessa linkki Sanastoon. Jaetut komponentit: `shared/GroupPicker.jsx` (vastustajaryhmän valinta jokaisen pelin aloitusnäytöllä, data `shared/playerGroups.js` = `NAME_GROUPS`/`POOL_BY_GROUP`; App välittää `playerGroup`+`onPlayerGroupChange` kaikille peleille) ja `shared/TurnPrompt.jsx` (pysyvä "👉 Sinun vuorosi: <toiminto>" -banneri pelinäkymän yläosassa, kytketty kunkin pelin ihmisvuoro-ehtoon; tekstit `ui.turn.*`).

## Pakkatyypit

Kolme tyyppiä, näkyy päävalikossa pelikorteissa:

| Tyyppi | Koodi | Pelit |
|---|---|---|
| Täysin jaettu | `jaettu` | Läpsy, Ristiseiska |
| Täydennetty | `taydennetty` | Kultakala, Maija, Moska, Paskahousu, Koputus, Kasino |
| Kierrätetty | `kierratetty` | Seiska |

Erikoistapaukset (silti yllä olevissa luokissa):
- **Koputus**: Koputus käynnistää viimeisen kierroksen, nostopakkaa voi jäädä huomiotta
- **Seiska**: Voittaja pääsee korteistaan eroon ensin, nostopakkaa voi jäädä huomiotta
- **Kasino**: 16 pistettä ensin saanut voittaa; pisteet lasketaan nostopakan ehdyttyä pelatun kierroksen päätyttyä; tasapeli on mahdollinen

## SFX (`src/shared/audio.js`: `SFX` objekti)
Korttitoiminnot:
| Funktio | Käyttötilanne |
|---|---|
| `flip` | nosto / käännös |
| `play` | kortin pelaus, hyökkäys |
| `capture` | korttien otto pöydältä |
| `leave` | lasku / syöttö / passi |
| `swap` | korttien vaihto |
| `reveal` | piilokorttien paljastus |
| `take` | pakkootto (tappio) |
| `beat` | torjunta onnistuu |
| `build` | rakennus (Kasino) |

Erityistapahtumat:
| Funktio | Käyttötilanne |
|---|---|
| `tikki` | mokki / tikki (Kasino) |
| `maija` | Maija-kortti (Maija) |
| `slap` | läpsäys (Läpsy) |
| `wrongSlap` | väärä läpsäys (Läpsy) |
| `winPile` | pino voitettu |
| `challenge` | haaste (Läpsy) |
| `reactWin` | reaktio onnistui |
| `reactWrong` | reaktio epäonnistui |
| `lastCardWin` | viimeinen kortti pelattu voittoon |

Virstanpylväät:
| Funktio | Käyttötilanne |
|---|---|
| `score` | pistemerkki |
| `fanfare` | voitto |

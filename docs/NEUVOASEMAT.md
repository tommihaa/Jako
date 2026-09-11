# Neuvoasemat: Mestarin neuvo arvotuissa asemissa

Generoitu `test/neuvoasemat.gen.test.js`:llä (siemen vakio, `NEUVOASEMAT=1`). Jokainen asema on
arvottu eikä pelattu, joten se voi olla pelissä epätodennäköinen; neuvo on silti se jonka
`getAdvice` antaisi. Tarkoitus on lukea sanooko teksti säännön jolla kortti valittiin
(`docs/MESTARIN_NEUVO.md` › Sääntötaso). Enintään neljä asemaa per neuvotyyppi.

## Seiska

### `aceBonusNone` (4)

**1.** Käsi: K♦ K♣ · Päällimmäinen: A♠ · Ässän bonusvuoro, bonusmaa ♠ · Nähty kasassa: 2♠ 7♦ 5♠ 3♦ 7♥ 9♦ · Vastustajilla 6 ja 1 korttia
   Neuvo: Jätä bonusvuoro käyttämättä. Kädessä ei ole bonusmaan korttia.

**2.** Käsi: 4♠ 9♥ K♥ 8♦ 10♦ · Päällimmäinen: A♣ · Ässän bonusvuoro, bonusmaa ♣ · Nähty kasassa: J♦ J♠ 5♦ 10♠ K♣ 2♥ 2♣ A♠ · Vastustajilla 7 ja 5 korttia
   Neuvo: Jätä bonusvuoro käyttämättä. Kädessä ei ole bonusmaan korttia.

**3.** Käsi: 8♠ 10♦ · Päällimmäinen: A♣ · Ässän bonusvuoro, bonusmaa ♣ · Nähty kasassa: K♥ 5♣ 2♣ 9♠ 8♦ · Vastustajilla 7 ja 4 korttia
   Neuvo: Jätä bonusvuoro käyttämättä. Kädessä ei ole bonusmaan korttia.

**4.** Käsi: 3♠ J♠ K♣ · Päällimmäinen: A♦ · Ässän bonusvuoro, bonusmaa ♦ · Nähty kasassa: 2♦ 7♦ 6♠ 4♠ 9♦ J♥ 10♥ 5♦ 7♥ · Vastustajilla 7 ja 4 korttia
   Neuvo: Jätä bonusvuoro käyttämättä. Kädessä ei ole bonusmaan korttia.

### `aceBonusPlay` (4)

**1.** Käsi: 4♠ 9♠ 10♠ 4♥ · Päällimmäinen: A♠ · Ässän bonusvuoro, bonusmaa ♠ · Nähty kasassa: 2♣ 10♦ K♠ 5♠ 8♠ 8♥ Q♣ · Vastustajilla 6 ja 3 korttia
   Neuvo: Käytä bonusvuoro: lyö 4♠, 4♥. Kannattaa kun ryhmä lähtee kerralla tai käsi on jo pieni eikä kukaan ole yhden kortin päässä.

**2.** Käsi: Q♥ 8♦ · Päällimmäinen: A♦ · Ässän bonusvuoro, bonusmaa ♦ · Nähty kasassa: 6♠ Q♣ J♣ A♣ 3♠ 6♣ 9♠ 6♦ · Vastustajilla 4 ja 5 korttia
   Neuvo: Käytä bonusvuoro: lyö 8♦. Kannattaa kun ryhmä lähtee kerralla tai käsi on jo pieni eikä kukaan ole yhden kortin päässä.

**3.** Käsi: 2♠ 6♠ J♠ J♥ 2♦ Q♦ · Päällimmäinen: A♠ · Ässän bonusvuoro, bonusmaa ♠ · Nähty kasassa: 8♣ 2♥ J♦ 9♥ 5♣ A♣ K♥ 9♣ · Vastustajilla 4 ja 4 korttia
   Neuvo: Käytä bonusvuoro: lyö 2♠, 2♦. Kannattaa kun ryhmä lähtee kerralla tai käsi on jo pieni eikä kukaan ole yhden kortin päässä.

**4.** Käsi: 6♥ Q♥ · Päällimmäinen: A♥ · Ässän bonusvuoro, bonusmaa ♥ · Nähty kasassa: 2♥ 3♣ 5♦ J♠ 8♠ 4♥ 9♦ · Vastustajilla 7 ja 3 korttia
   Neuvo: Käytä bonusvuoro: lyö 6♥. Kannattaa kun ryhmä lähtee kerralla tai käsi on jo pieni eikä kukaan ole yhden kortin päässä.

### `aceBonusSkip` (4)

**1.** Käsi: Q♥ J♦ 6♣ 10♣ · Päällimmäinen: A♥ · Ässän bonusvuoro, bonusmaa ♥ · Nähty kasassa: A♠ 6♥ 3♣ J♥ K♠ 2♣ 4♦ 3♥ · Vastustajilla 4 ja 1 korttia
   Neuvo: Jätä bonusvuoro käyttämättä, se ei kannata nyt.

**2.** Käsi: 4♠ 8♠ 7♥ 2♣ · Päällimmäinen: A♠ · Ässän bonusvuoro, bonusmaa ♠ · Nähty kasassa: 8♦ K♠ 4♥ 6♣ 3♦ 10♠ J♦ A♣ 3♣ · Vastustajilla 4 ja 1 korttia
   Neuvo: Jätä bonusvuoro käyttämättä, se ei kannata nyt.

**3.** Käsi: 9♠ 4♥ 2♦ 8♦ A♣ J♣ · Päällimmäinen: A♦ · Ässän bonusvuoro, bonusmaa ♦ · Nähty kasassa: J♠ A♠ Q♣ 8♠ 5♥ 10♥ 5♦ · Vastustajilla 3 ja 1 korttia
   Neuvo: Jätä bonusvuoro käyttämättä, se ei kannata nyt.

**4.** Käsi: J♠ 2♥ 10♥ 10♦ 3♣ · Päällimmäinen: A♣ · Ässän bonusvuoro, bonusmaa ♣ · Nähty kasassa: 10♠ 3♦ A♦ 8♥ 8♣ K♣ · Vastustajilla 4 ja 6 korttia
   Neuvo: Jätä bonusvuoro käyttämättä, se ei kannata nyt.

### `draw` (4)

**1.** Käsi: J♠ 6♣ · Päällimmäinen: Q♦ · Nähty kasassa: K♠ 2♠ 7♥ J♣ K♦ · Vastustajilla 4 ja 2 korttia
   Neuvo: Mikään korttisi ei käy. Nosta pakasta.

**2.** Käsi: A♦ 2♣ 10♣ · Päällimmäinen: J♠ · Nähty kasassa: Q♠ · Vastustajilla 6 ja 4 korttia
   Neuvo: Mikään korttisi ei käy. Nosta pakasta.

**3.** Käsi: 3♦ 5♦ 8♣ · Päällimmäinen: 10♠ · Nähty kasassa: 4♣ 3♥ J♣ 6♠ 5♣ J♦ 9♣ 3♣ K♥ 6♦ 2♦ · Vastustajilla 3 ja 6 korttia
   Neuvo: Mikään korttisi ei käy. Nosta pakasta.

**4.** Käsi: K♥ 3♦ 5♦ 5♣ · Päällimmäinen: 7♣ (vaadittu maa ♠) · Nähty kasassa: 5♥ 2♠ 4♦ 3♠ 4♥ 5♠ 2♣ 9♦ K♦ 10♥ Q♥ · Vastustajilla 3 ja 5 korttia
   Neuvo: Mikään korttisi ei käy. Nosta pakasta.

### `play` (4)

**1.** Käsi: 2♠ K♦ 5♣ Q♣ K♣ · Päällimmäinen: 5♦ · Nähty kasassa: ei mitään · Vastustajilla 4 ja 6 korttia
   Neuvo: Lyö ryhmä K♦, K♣. Useampi kortti kerralla tyhjentää kättä nopeimmin.

**2.** Käsi: A♠ 6♠ 7♥ 8♥ J♥ 3♣ J♣ · Päällimmäinen: J♦ · Nähty kasassa: Q♣ · Vastustajilla 5 ja 4 korttia
   Neuvo: Lyö ryhmä J♥, J♣. Useampi kortti kerralla tyhjentää kättä nopeimmin.

**3.** Käsi: 9♠ 6♥ 9♥ 10♥ K♥ 10♦ K♣ · Päällimmäinen: J♦ · Nähty kasassa: 5♠ · Vastustajilla 6 ja 3 korttia
   Neuvo: Lyö ryhmä 10♦, 10♥. Useampi kortti kerralla tyhjentää kättä nopeimmin.

**4.** Käsi: 8♠ 8♦ · Päällimmäinen: J♦ · Nähty kasassa: J♣ A♣ 5♠ 10♦ 10♥ 10♣ · Vastustajilla 5 ja 1 korttia
   Neuvo: Lyö ryhmä 8♦, 8♠. Useampi kortti kerralla tyhjentää kättä nopeimmin.

### `playAce` (4)

**1.** Käsi: 4♠ 9♥ 3♦ A♣ 2♣ · Päällimmäinen: 6♣ · Nähty kasassa: 5♦ K♥ 7♠ 8♥ K♦ 7♥ 3♠ 3♣ 6♦ 6♠ 4♣ · Vastustajilla 3 ja 3 korttia
   Neuvo: Lyö A♣. Ässä nostattaa muita ja saat bonusvuoron.

**2.** Käsi: A♠ 6♦ 10♦ 2♣ J♣ · Päällimmäinen: J♠ · Nähty kasassa: 3♠ 3♥ K♠ 9♣ 2♠ 9♥ · Vastustajilla 4 ja 2 korttia
   Neuvo: Lyö A♠. Ässä nostattaa muita ja saat bonusvuoron.

**3.** Käsi: A♥ 3♦ 10♦ 6♣ · Päällimmäinen: 3♥ · Nähty kasassa: 10♥ 10♠ 10♣ A♣ 6♦ 2♥ 6♥ 8♦ K♥ J♥ · Vastustajilla 5 ja 6 korttia
   Neuvo: Lyö A♥. Ässä nostattaa muita ja saat bonusvuoron.

**4.** Käsi: A♠ 3♠ 9♦ 10♦ · Päällimmäinen: 10♠ · Nähty kasassa: J♥ A♦ J♦ 7♠ 4♥ 6♣ 7♣ 8♣ 6♦ 5♦ 2♠ 9♠ 8♠ 3♥ Q♣ · Vastustajilla 6 ja 5 korttia
   Neuvo: Lyö A♠. Ässä nostattaa muita ja saat bonusvuoron.

### `playNoPair` (3)

**1.** Käsi: 2♠ 9♠ 4♥ 8♥ A♦ A♣ · Päällimmäinen: 8♣ · Nähty kasassa: 6♥ Q♦ 10♠ 3♣ K♠ 2♦ 2♣ J♦ 6♠ 5♠ 4♠ 7♣ · Vastustajilla 3 ja 5 korttia
   Neuvo: Lyö 8♥, sillä ei ole paria kädessä. Parit säästetään ryhmälyöntiin.

**2.** Käsi: A♠ 2♠ 6♠ A♦ 2♣ 10♣ · Päällimmäinen: 10♦ · Nähty kasassa: 6♥ 9♣ Q♠ 8♠ 3♥ 2♦ 6♦ Q♥ K♥ 6♣ · Vastustajilla 4 ja 4 korttia
   Neuvo: Lyö 10♣, sillä ei ole paria kädessä. Parit säästetään ryhmälyöntiin.

**3.** Käsi: A♥ 2♥ 9♥ A♣ · Päällimmäinen: 9♣ · Nähty kasassa: 4♠ 2♠ 7♦ 9♦ 4♥ 5♥ 8♦ 6♥ 6♠ 5♠ 5♣ K♣ 4♣ · Vastustajilla 3 ja 6 korttia
   Neuvo: Lyö 9♥, sillä ei ole paria kädessä. Parit säästetään ryhmälyöntiin.

### `playOnly` (4)

**1.** Käsi: 3♠ 2♣ 4♣ 8♣ · Päällimmäinen: 3♥ · Nähty kasassa: 2♥ Q♦ 4♦ 10♥ 7♣ · Vastustajilla 7 ja 2 korttia
   Neuvo: Lyö 3♠. Se on ainoa käypä kortti.

**2.** Käsi: 10♠ 5♥ J♥ Q♣ · Päällimmäinen: 7♣ (vaadittu maa ♠) · Nähty kasassa: 9♠ A♦ · Vastustajilla 7 ja 2 korttia
   Neuvo: Lyö 10♠. Se on ainoa käypä kortti.

**3.** Käsi: A♠ 9♠ 3♥ 6♦ A♣ · Päällimmäinen: 10♥ · Nähty kasassa: 3♠ 5♦ 7♥ 3♦ 10♣ 7♠ 5♥ · Vastustajilla 3 ja 6 korttia
   Neuvo: Lyö 3♥. Se on ainoa käypä kortti.

**4.** Käsi: 5♠ 3♥ Q♥ 9♣ 10♣ · Päällimmäinen: 10♦ · Nähty kasassa: A♠ J♣ 7♦ 9♠ Q♦ J♠ 8♦ 6♣ 4♦ Q♣ 3♠ · Vastustajilla 3 ja 4 korttia
   Neuvo: Lyö 10♣. Se on ainoa käypä kortti.

### `playSavePair` (4)

**1.** Käsi: J♠ J♥ Q♥ 6♦ 5♣ 6♣ Q♣ · Päällimmäinen: 3♣ · Nähty kasassa: 7♠ 4♦ 10♦ 10♥ 2♣ 9♦ Q♠ 4♠ J♣ 8♦ 9♠ · Vastustajilla 5 ja 2 korttia
   Neuvo: Lyö 5♣. Se säästää parisi myöhempään.

**2.** Käsi: 3♥ 5♥ 5♦ Q♦ 9♣ · Päällimmäinen: 5♣ · Nähty kasassa: A♠ 4♥ 2♦ 10♣ 6♣ K♠ · Vastustajilla 6 ja 6 korttia
   Neuvo: Lyö 9♣. Se säästää parisi myöhempään.

**3.** Käsi: A♠ 10♠ Q♠ 10♥ 8♦ 6♣ · Päällimmäinen: 10♣ · Nähty kasassa: 4♦ 10♦ 4♥ · Vastustajilla 3 ja 5 korttia
   Neuvo: Lyö 6♣. Se säästää parisi myöhempään.

**4.** Käsi: 9♠ 5♥ 8♥ Q♥ 5♣ 7♣ 10♣ · Päällimmäinen: 4♣ · Nähty kasassa: ei mitään · Vastustajilla 6 ja 4 korttia
   Neuvo: Lyö 10♣. Se säästää parisi myöhempään.

### `playSavePairSeen` (4)

**1.** Käsi: 3♠ 6♠ K♠ 3♥ 10♦ 9♣ Q♣ · Päällimmäinen: 5♠ · Nähty kasassa: 9♥ 5♥ 7♠ 8♥ 4♣ K♣ 8♦ A♥ A♦ K♦ · Vastustajilla 4 ja 5 korttia
   Neuvo: Lyö K♠. Se säästää parisi myöhempään ja sen arvoa on nähty eniten.

**2.** Käsi: 8♠ 10♠ K♠ 9♦ 10♦ 6♣ 10♣ · Päällimmäinen: 3♠ · Nähty kasassa: 2♦ 7♣ 8♦ 8♣ 3♦ 3♣ A♣ 6♥ A♥ 10♥ 7♥ Q♥ · Vastustajilla 3 ja 4 korttia
   Neuvo: Lyö 8♠. Se säästää parisi myöhempään ja sen arvoa on nähty eniten.

**3.** Käsi: 10♠ J♦ K♦ 3♣ 8♣ J♣ · Päällimmäinen: Q♣ · Nähty kasassa: A♦ 8♥ 5♥ K♥ 2♠ 9♠ A♠ 6♦ · Vastustajilla 3 ja 2 korttia
   Neuvo: Lyö 8♣. Se säästää parisi myöhempään ja sen arvoa on nähty eniten.

**4.** Käsi: 5♠ Q♠ 10♥ 5♦ 8♣ · Päällimmäinen: 8♠ · Nähty kasassa: Q♦ J♦ 2♥ J♠ 3♥ A♥ · Vastustajilla 3 ja 3 korttia
   Neuvo: Lyö Q♠. Se säästää parisi myöhempään ja sen arvoa on nähty eniten.

### `playSeen` (4)

**1.** Käsi: 3♠ 10♠ 7♥ A♦ 8♦ K♣ · Päällimmäinen: J♦ · Nähty kasassa: 9♥ K♠ 6♥ Q♣ 7♣ K♦ 3♦ Q♥ 6♠ 7♠ 3♣ 2♠ 10♦ 9♣ 8♣ · Vastustajilla 3 ja 3 korttia
   Neuvo: Lyö 8♦. Sen arvoa on nähty eniten, joten muilla on vähiten vastattavaa.

**2.** Käsi: Q♠ A♥ 3♥ 6♥ 7♥ 4♦ Q♣ · Päällimmäinen: 5♥ · Nähty kasassa: 2♠ 10♦ 4♣ 3♦ · Vastustajilla 6 ja 5 korttia
   Neuvo: Lyö 3♥. Sen arvoa on nähty eniten, joten muilla on vähiten vastattavaa.

**3.** Käsi: J♠ 10♥ 10♦ 2♣ · Päällimmäinen: 2♠ · Nähty kasassa: 10♠ 9♣ 3♣ 5♠ 3♠ Q♠ K♥ 3♦ A♠ 3♥ 9♠ 7♠ A♦ Q♥ 8♦ · Vastustajilla 7 ja 2 korttia
   Neuvo: Lyö J♠. Sen arvoa on nähty eniten, joten muilla on vähiten vastattavaa.

**4.** Käsi: 5♥ J♥ 10♦ · Päällimmäinen: 3♥ · Nähty kasassa: 7♠ 6♣ 10♠ Q♠ 6♠ 8♠ Q♥ 7♥ 3♠ 7♣ 5♠ 2♥ · Vastustajilla 5 ja 5 korttia
   Neuvo: Lyö 5♥. Sen arvoa on nähty eniten, joten muilla on vähiten vastattavaa.

### `playSeenTie` (4)

**1.** Käsi: J♦ 2♣ 4♣ 10♣ · Päällimmäinen: 5♣ · Nähty kasassa: 7♣ · Vastustajilla 6 ja 3 korttia
   Neuvo: Lyö 2♣. Nähdyissä ei ole eroa, joten näistä mikä tahansa käy.

**2.** Käsi: 6♠ 7♠ K♠ · Päällimmäinen: J♠ · Nähty kasassa: 5♥ A♠ K♦ 6♥ · Vastustajilla 7 ja 4 korttia
   Neuvo: Lyö 6♠. Nähdyissä ei ole eroa, joten näistä mikä tahansa käy.

**3.** Käsi: 5♠ 9♠ 10♠ K♠ A♦ J♦ 8♣ · Päällimmäinen: 8♠ · Nähty kasassa: J♠ 8♥ 6♦ 4♣ A♥ 7♥ 5♦ 2♣ 3♦ 10♦ 4♥ 3♠ Q♥ · Vastustajilla 7 ja 2 korttia
   Neuvo: Lyö 5♠. Nähdyissä ei ole eroa, joten näistä mikä tahansa käy.

**4.** Käsi: 9♠ 5♣ 8♣ · Päällimmäinen: 9♣ · Nähty kasassa: K♣ 8♥ 5♥ 6♥ A♣ 4♥ · Vastustajilla 7 ja 1 korttia
   Neuvo: Lyö 5♣. Nähdyissä ei ole eroa, joten näistä mikä tahansa käy.

### `playSeven` (4)

**1.** Käsi: 3♠ 7♠ · Päällimmäinen: 2♣ · Nähty kasassa: 6♦ 8♥ 9♣ 10♣ 6♥ 5♥ Q♦ 9♥ A♥ J♣ A♣ · Vastustajilla 7 ja 6 korttia
   Neuvo: Lyö 7♠ ja vaadi maaksi ♠, sitä sinulla on eniten.

**2.** Käsi: 7♠ 2♥ · Päällimmäinen: 6♣ · Nähty kasassa: Q♦ 5♦ 10♥ J♦ 10♦ 4♦ 7♥ 5♥ K♥ 2♦ 7♦ · Vastustajilla 6 ja 4 korttia
   Neuvo: Lyö 7♠ ja vaadi maaksi ♥, sitä sinulla on eniten.

**3.** Käsi: 7♠ 9♠ J♠ 7♥ J♦ 7♣ · Päällimmäinen: 10♣ · Nähty kasassa: 7♦ 8♠ Q♥ J♣ 9♥ A♣ 2♥ 6♥ · Vastustajilla 4 ja 1 korttia
   Neuvo: Lyö 7♠ ja vaadi maaksi ♠, sitä sinulla on eniten.

**4.** Käsi: 5♠ 7♠ Q♠ K♠ 2♥ 3♥ 4♥ · Päällimmäinen: 9♣ · Nähty kasassa: 10♥ K♦ · Vastustajilla 4 ja 2 korttia
   Neuvo: Lyö 7♠ ja vaadi maaksi ♠, sitä sinulla on eniten.

## Ristiseiska (pelatut asemat, Hero paikalla 0)

### `bonusEnd` (3)

**1.** Käsi: A♠ Q♠ K♠ A♣ 2♣ 3♣ 4♣ Q♣ K♣ · Tornit: ♠ 4–8, ♥ 1–12, ♦ 1–13, ♣ 6–7 · Pelattavissa: ei mitään · Bonusvuoro
   Neuvo: Mikään korttisi ei käy bonusvuoroon. Lopeta vuoro.

**2.** Käsi: Q♠ K♠ A♣ 2♣ 3♣ 4♣ Q♣ K♣ · Tornit: ♠ 1–9, ♥ 1–12, ♦ 1–13, ♣ 6–7 · Pelattavissa: ei mitään · Bonusvuoro
   Neuvo: Mikään korttisi ei käy bonusvuoroon. Lopeta vuoro.

**3.** Käsi: Q♠ K♠ · Tornit: ♠ 1–10, ♥ 1–13, ♦ 1–10, ♣ 1–11 · Pelattavissa: ei mitään · Bonusvuoro
   Neuvo: Mikään korttisi ei käy bonusvuoroon. Lopeta vuoro.

### `pass` (4)

**1.** Käsi: 9♠ 10♠ J♥ K♥ 2♦ 4♦ 10♦ Q♦ K♦ 3♣ 10♣ J♣ Q♣ · Tornit: ♠ 7–7, ♥ 7–7, ♦ kiinni, ♣ 7–7 · Pelattavissa: ei mitään
   Neuvo: Mikään korttisi ei käy. Passaa.

**2.** Käsi: 9♠ 10♠ J♥ K♥ 2♦ 4♦ 10♦ Q♦ K♦ 3♣ 10♣ J♣ Q♣ K♣ · Tornit: ♠ 7–7, ♥ 6–7, ♦ 7–7, ♣ 6–7 · Pelattavissa: ei mitään
   Neuvo: Mikään korttisi ei käy. Passaa.

**3.** Käsi: A♠ 9♠ 10♠ J♥ K♥ 2♦ 4♦ 10♦ Q♦ K♦ 3♣ 10♣ J♣ Q♣ K♣ · Tornit: ♠ 6–7, ♥ 6–7, ♦ 6–7, ♣ 6–8 · Pelattavissa: ei mitään
   Neuvo: Mikään korttisi ei käy. Passaa.

**4.** Käsi: A♠ 9♠ 10♠ J♥ Q♥ K♥ 2♦ 4♦ 10♦ Q♦ K♦ 3♣ 10♣ J♣ Q♣ K♣ · Tornit: ♠ 6–7, ♥ 6–8, ♦ 6–8, ♣ 5–8 · Pelattavissa: ei mitään
   Neuvo: Mikään korttisi ei käy. Passaa.

### `play` (4)

**1.** Käsi: A♠ 9♠ 10♠ J♥ Q♥ K♥ 2♦ 4♦ 10♦ Q♦ K♦ 3♣ 10♣ J♣ Q♣ K♣ · Tornit: ♠ 6–8, ♥ 5–8, ♦ 6–8, ♣ 4–8 · Pelattavissa: 9♠ 3♣
   Neuvo: Lyö 3♣, pienin pelattava. Portti (6 tai 8) jää käteen lukoksi, ja se avataan vasta kun samassa maassa on vähintään kaksi korttia joita et pääse pian pelaamaan.

**2.** Käsi: A♠ 9♠ 10♠ J♥ Q♥ K♥ 2♦ 4♦ 10♦ Q♦ K♦ 10♣ J♣ Q♣ K♣ · Tornit: ♠ 6–8, ♥ 5–8, ♦ 6–8, ♣ 3–8 · Pelattavissa: 9♠
   Neuvo: Lyö 9♠, pienin pelattava. Portti (6 tai 8) jää käteen lukoksi, ja se avataan vasta kun samassa maassa on vähintään kaksi korttia joita et pääse pian pelaamaan.

**3.** Käsi: A♠ 9♠ 10♠ J♥ Q♥ K♥ 2♦ 10♦ Q♦ K♦ 10♣ J♣ Q♣ K♣ · Tornit: ♠ 6–8, ♥ 4–8, ♦ 4–8, ♣ 2–8 · Pelattavissa: 9♠
   Neuvo: Lyö 9♠, pienin pelattava. Portti (6 tai 8) jää käteen lukoksi, ja se avataan vasta kun samassa maassa on vähintään kaksi korttia joita et pääse pian pelaamaan.

**4.** Käsi: A♠ 10♠ J♥ Q♥ K♥ 2♦ 10♦ Q♦ K♦ 10♣ J♣ Q♣ K♣ · Tornit: ♠ 5–9, ♥ 2–8, ♦ 4–8, ♣ 1–8 · Pelattavissa: 10♠
   Neuvo: Lyö 10♠, pienin pelattava. Portti (6 tai 8) jää käteen lukoksi, ja se avataan vasta kun samassa maassa on vähintään kaksi korttia joita et pääse pian pelaamaan.

### `playSeven` (4)

**1.** Käsi: 4♠ 5♠ 6♠ 7♠ 8♥ 9♥ 10♥ 3♦ K♦ 2♣ 9♣ Q♣ K♣ · Tornit: ♠ kiinni, ♥ kiinni, ♦ 7–7, ♣ 7–7 · Pelattavissa: 7♠
   Neuvo: Lyö 7♠. Seiska kannattaa avata maahan, jossa sinulla on eniten kortteja.

**2.** Käsi: A♠ 3♠ 4♠ 5♠ 7♠ 9♠ Q♠ Q♥ 3♦ J♦ 2♣ 5♣ 10♣ · Tornit: ♠ kiinni, ♥ 6–7, ♦ kiinni, ♣ 7–7 · Pelattavissa: 7♠
   Neuvo: Lyö 7♠. Seiska kannattaa avata maahan, jossa sinulla on eniten kortteja.

**3.** Käsi: 3♠ 9♠ K♠ 3♥ 10♥ J♥ 2♦ 6♦ 7♦ 9♦ 10♦ 2♣ 5♣ · Tornit: ♠ 7–7, ♥ 7–7, ♦ kiinni, ♣ 7–7 · Pelattavissa: 7♦
   Neuvo: Lyö 7♦. Seiska kannattaa avata maahan, jossa sinulla on eniten kortteja.

**4.** Käsi: 7♠ K♠ 4♥ 5♥ 6♥ 10♥ Q♥ 6♦ 7♦ 9♦ 10♦ J♦ 3♣ · Tornit: ♠ kiinni, ♥ 7–7, ♦ kiinni, ♣ 7–7 · Pelattavissa: 7♠ 6♥ 7♦
   Neuvo: Lyö 7♦. Seiska kannattaa avata maahan, jossa sinulla on eniten kortteja.

## Moska: sivustalyönti

### `add` (4)

**1.** Hero lyö sivusta, puolustajalla 4 korttia · Valtti: ♠ · Pöytä: Q♥→3♣, 6♥, 8♦→10♥ · Käsi: 10♠ J♠ 9♥ 5♦ 8♣
   Neuvo: Lyö 8♣ sivusta: pienin ei-valtti, jolla ei ole paria. Puolustajalla riittää kortteja, paina päälle.

**2.** Hero lyö sivusta, puolustajalla 3 korttia · Valtti: ♥ · Pöytä: 9♣, 6♠→4♦, 4♥→6♥ · Käsi: 10♠ J♦ 4♣ 8♣
   Neuvo: Lyö 4♣ sivusta: pienin ei-valtti, jolla ei ole paria. Puolustajalla riittää kortteja, paina päälle.

**3.** Hero lyö sivusta, puolustajalla 3 korttia · Valtti: ♥ · Pöytä: 9♥, 6♥ · Käsi: 2♠ 4♠ 9♠ A♦ 4♦ 7♦
   Neuvo: Lyö 9♠ sivusta: pienin ei-valtti, jolla ei ole paria. Puolustajalla riittää kortteja, paina päälle.

**4.** Hero lyö sivusta, puolustajalla 6 korttia · Valtti: ♠ · Pöytä: 7♥→K♦ · Käsi: 2♠ 6♠ 9♠ Q♥ 10♦ K♣
   Neuvo: Lyö K♣ sivusta: pienin ei-valtti, jolla ei ole paria. Puolustajalla riittää kortteja, paina päälle.

### `noAdd` (4)

**1.** Hero lyö sivusta, puolustajalla 6 korttia · Valtti: ♣ · Pöytä: 3♠ · Käsi: 4♠ K♠ 2♥ 6♥ J♦
   Neuvo: Sinulla ei ole yhtään korttia jonka voisi lyödä sivusta. Anna vuoron jatkua.

**2.** Hero lyö sivusta, puolustajalla 4 korttia · Valtti: ♥ · Pöytä: 2♦ · Käsi: J♠ 4♥ Q♥ 8♦ K♣
   Neuvo: Sinulla ei ole yhtään korttia jonka voisi lyödä sivusta. Anna vuoron jatkua.

**3.** Hero lyö sivusta, puolustajalla 3 korttia · Valtti: ♣ · Pöytä: 10♣ · Käsi: 5♠ J♠ 6♥ 4♣ 9♣
   Neuvo: Sinulla ei ole yhtään korttia jonka voisi lyödä sivusta. Anna vuoron jatkua.

**4.** Hero lyö sivusta, puolustajalla 3 korttia · Valtti: ♥ · Pöytä: A♥ · Käsi: 8♥ 3♦ 4♦ Q♦ Q♣
   Neuvo: Sinulla ei ole yhtään korttia jonka voisi lyödä sivusta. Anna vuoron jatkua.

## Moska: puolustus

### `beat` (4)

**1.** Hero puolustaa · Valtti: ♠ · Pöytä: 3♣ · Käsi: 2♥ 2♦ 2♣ K♣
   Neuvo: Kaada 3♣ kortilla K♣. Pienin voittava riittää, valtit vasta pakon edessä.

**2.** Hero puolustaa · Valtti: ♥ · Pöytä: 8♣, 8♥ · Käsi: A♥ 10♥ 4♦ 10♣
   Neuvo: Kaada 8♣ kortilla 10♣. Pienin voittava riittää, valtit vasta pakon edessä.

**3.** Hero puolustaa · Valtti: ♠ · Pöytä: 2♥, 2♣ · Käsi: A♠ 5♥ J♥ Q♥ Q♣
   Neuvo: Kaada 2♥ kortilla 5♥. Pienin voittava riittää, valtit vasta pakon edessä.

**4.** Hero puolustaa · Valtti: ♠ · Pöytä: 10♠ · Käsi: A♠ 5♠ 7♠ A♦ 8♣
   Neuvo: Kaada 10♠ kortilla A♠. Pienin voittava riittää, valtit vasta pakon edessä.

### `pass` (4)

**1.** Hero puolustaa · Valtti: ♠ · Pöytä: 6♦ · Käsi: 6♥ 9♥ 10♥ J♣
   Neuvo: Siirrä hyökkäys eteenpäin kortilla 6♥. Pienin sopiva riittää, valtit säästetään.

**2.** Hero puolustaa · Valtti: ♥ · Pöytä: 6♥ · Käsi: 6♠ 9♥ J♦ A♣ 8♣ 10♣
   Neuvo: Siirrä hyökkäys eteenpäin kortilla 6♠. Pienin sopiva riittää, valtit säästetään.

**3.** Hero puolustaa · Valtti: ♥ · Pöytä: 2♥, 2♦ · Käsi: 3♥ 10♥ 3♦ 2♣ Q♣
   Neuvo: Siirrä hyökkäys eteenpäin kortilla 2♣. Pienin sopiva riittää, valtit säästetään.

**4.** Hero puolustaa · Valtti: ♠ · Pöytä: 2♣ · Käsi: 5♠ 2♥ 5♥ Q♥
   Neuvo: Siirrä hyökkäys eteenpäin kortilla 2♥. Pienin sopiva riittää, valtit säästetään.

### `passTrump` (4)

**1.** Hero puolustaa · Valtti: ♥ · Pöytä: Q♠, Q♣ · Käsi: 5♥ 9♥ Q♥ 4♦ 6♣ 9♣
   Neuvo: Siirrä hyökkäys eteenpäin valtilla Q♥. Muuta samanarvoista ei ole kädessä ja siirto käy ennen kaatoa.

**2.** Hero puolustaa · Valtti: ♥ · Pöytä: 5♦ · Käsi: 6♠ 10♠ 5♥ A♦ 2♣ 4♣
   Neuvo: Siirrä hyökkäys eteenpäin valtilla 5♥. Muuta samanarvoista ei ole kädessä ja siirto käy ennen kaatoa.

**3.** Hero puolustaa · Valtti: ♠ · Pöytä: J♦, J♣ · Käsi: 6♠ J♠ 5♦ 9♦
   Neuvo: Siirrä hyökkäys eteenpäin valtilla J♠. Muuta samanarvoista ei ole kädessä ja siirto käy ennen kaatoa.

**4.** Hero puolustaa · Valtti: ♥ · Pöytä: Q♣, Q♦ · Käsi: 3♠ 5♥ 10♥ Q♥ 6♦ 9♦
   Neuvo: Siirrä hyökkäys eteenpäin valtilla Q♥. Muuta samanarvoista ei ole kädessä ja siirto käy ennen kaatoa.

### `take` (4)

**1.** Hero puolustaa · Valtti: ♣ · Pöytä: J♦, J♣ · Käsi: 3♠ 6♠ 7♠ 10♦ 3♣
   Neuvo: Et pysty kaatamaan kaikkia pöydän kortteja. Ota ne käteen.

**2.** Hero puolustaa · Valtti: ♦ · Pöytä: 9♦ · Käsi: 6♠ 3♥ 10♥ 3♣ 8♣ Q♣
   Neuvo: Et pysty kaatamaan kaikkia pöydän kortteja. Ota ne käteen.

**3.** Hero puolustaa · Valtti: ♠ · Pöytä: A♥, A♠ · Käsi: K♠ 9♥ Q♥ 4♦ 5♦ 2♣
   Neuvo: Et pysty kaatamaan kaikkia pöydän kortteja. Ota ne käteen.

**4.** Hero puolustaa · Valtti: ♥ · Pöytä: 5♦, 5♥ · Käsi: J♠ 9♦ Q♦ 4♣
   Neuvo: Et pysty kaatamaan kaikkia pöydän kortteja. Ota ne käteen.

## Kasino (kaksi pelaajaa, ei rakennelmia)

### `build` (4)

**1.** Pöytä: 5♣ Q♣ K♦ 2♠ · Käsi: 5♦ 6♦ K♣ · Kaapattuja: Hero 3, Loki 7
   Neuvo: Rakenna arvo 13 kortilla 6♦. Sinulla on toinen kortti jolla kaappaat sen seuraavaksi.

**2.** Pöytä: Q♥ 6♣ J♥ J♠ 5♣ · Käsi: 7♠ 6♦ 3♣ Q♣ · Kaapattuja: Hero 3, Loki 2
   Neuvo: Rakenna arvo 12 kortilla 7♠. Sinulla on toinen kortti jolla kaappaat sen seuraavaksi.

**3.** Pöytä: 7♠ 3♠ · Käsi: 8♥ 6♦ 2♣ 9♣ · Kaapattuja: Hero 7, Loki 6
   Neuvo: Rakenna arvo 9 kortilla 6♦. Sinulla on toinen kortti jolla kaappaat sen seuraavaksi.

**4.** Pöytä: 3♥ 10♦ 9♣ Q♣ K♠ · Käsi: 3♠ 5♠ 6♠ 9♥ · Kaapattuja: Hero 2, Loki 5
   Neuvo: Rakenna arvo 6 kortilla 3♠. Sinulla on toinen kortti jolla kaappaat sen seuraavaksi.

### `capture` (4)

**1.** Pöytä: 6♥ K♣ 10♦ 10♥ 9♥ · Käsi: 9♠ K♥ J♦ · Kaapattuja: Hero 5, Loki 3
   Neuvo: Kaappaa 9♥ kortilla 9♠. Arvokkain kaappaus: ensin pistekortit (♦10, ♠2, ässät), sitten padat, sitten määrä.

**2.** Pöytä: Q♦ 5♥ 5♦ 9♣ · Käsi: A♠ 3♥ 5♣ · Kaapattuja: Hero 5, Loki 7
   Neuvo: Kaappaa 5♥+9♣ kortilla A♠. Arvokkain kaappaus: ensin pistekortit (♦10, ♠2, ässät), sitten padat, sitten määrä.

**3.** Pöytä: 7♦ 5♥ J♣ 9♥ J♥ · Käsi: A♠ A♦ J♦ · Kaapattuja: Hero 1, Loki 5
   Neuvo: Kaappaa 5♥+9♥ kortilla A♠. Arvokkain kaappaus: ensin pistekortit (♦10, ♠2, ässät), sitten padat, sitten määrä.

**4.** Pöytä: 9♦ 10♦ 3♠ · Käsi: A♠ 10♠ J♥ A♦ · Kaapattuja: Hero 6, Loki 5
   Neuvo: Kaappaa 10♦ kortilla 10♠. Arvokkain kaappaus: ensin pistekortit (♦10, ♠2, ässät), sitten padat, sitten määrä.

### `captureMokki` (4)

**1.** Pöytä: 9♦ 5♦ · Käsi: A♠ 6♠ K♠ 7♥ · Kaapattuja: Hero 4, Loki 5
   Neuvo: Kaappaa koko pöytä kortilla A♠. Se on mökki ja tuo lisäpisteen.

**2.** Pöytä: 4♠ 8♠ Q♠ · Käsi: 5♠ 3♥ A♣ Q♣ · Kaapattuja: Hero 0, Loki 4
   Neuvo: Kaappaa koko pöytä kortilla Q♣. Se on mökki ja tuo lisäpisteen.

**3.** Pöytä: J♦ 2♣ · Käsi: A♥ 10♥ K♣ · Kaapattuja: Hero 4, Loki 7
   Neuvo: Kaappaa koko pöytä kortilla K♣. Se on mökki ja tuo lisäpisteen.

**4.** Pöytä: A♦ 5♣ · Käsi: 4♠ 8♠ 6♥ · Kaapattuja: Hero 0, Loki 6
   Neuvo: Kaappaa koko pöytä kortilla 6♥. Se on mökki ja tuo lisäpisteen.

### `trail` (4)

**1.** Pöytä: 6♣ J♠ · Käsi: 2♠ K♠ Q♦ · Kaapattuja: Hero 2, Loki 2
   Neuvo: Jätä Q♦ pöytään. Kannattavaa kaappausta ei ole, ja tämä on kortti jonka vastustaja epätodennäköisimmin kaappaa. Pistekortit ja ässät pysyvät kädessä.

**2.** Pöytä: J♥ 10♠ Q♣ · Käsi: 9♠ 5♥ 7♣ · Kaapattuja: Hero 1, Loki 7
   Neuvo: Jätä 9♠ pöytään. Kannattavaa kaappausta ei ole, ja tämä on kortti jonka vastustaja epätodennäköisimmin kaappaa. Pistekortit ja ässät pysyvät kädessä.

**3.** Pöytä: 10♣ Q♥ 9♣ 3♥ · Käsi: A♠ 5♠ 10♦ J♣ · Kaapattuja: Hero 0, Loki 5
   Neuvo: Jätä J♣ pöytään. Kannattavaa kaappausta ei ole, ja tämä on kortti jonka vastustaja epätodennäköisimmin kaappaa. Pistekortit ja ässät pysyvät kädessä.

**4.** Pöytä: K♠ 5♥ · Käsi: 10♠ 2♥ A♣ · Kaapattuja: Hero 7, Loki 7
   Neuvo: Jätä 10♠ pöytään. Kannattavaa kaappausta ei ole, ja tämä on kortti jonka vastustaja epätodennäköisimmin kaappaa. Pistekortit ja ässät pysyvät kädessä.


# Original one-button and one-screen multiplayer mechanics (inspiration catalogue for a one-phone, one-button-per-player party game)

> Method note: WebSearch worked, but direct page fetches were blocked by the sandbox egress policy. itch.io and gamedeveloper.com both returned "connect_rejected" or "ENOTFOUND". All findings below therefore come from search-result snippets and summaries, not full-page reads. Descriptions of small itch.io/jam games are thin (often just a tagline) and should be checked on the source page before anything is built on them. Items marked **[COMMON]** are already well-worn in phone party apps or are standard genres, so avoid them as headline ideas.

## 1. One-button design theory: what can a single button express?

### Takeaway
One button gives at least five usable signals: press, release, hold duration, idle (deliberately not pressing) and rhythm. Their combinations (tap vs. long hold, charge and release, double tap, mash, one-press-only commitment) can carry a whole game. Berbank-Green's 2005 Gamasutra feature is the canonical reference.

### Cited Findings
- Berbank-Green's feature "One Button Games" (Gamasutra, 2 June 2005) explores design when one button is the only input. It uses interactive Flash examples, aims to "pose questions, provide suggestions, and present possibilities", and includes a glossary appendix. Green worked on the Creatures series and made the indie game FleaFall — [Game Developer: Feature 'One Button Games'](https://www.gamedeveloper.com/game-platforms/feature-one-button-games-); [author page](https://www.gamedeveloper.com/author/berbank-green); [Bill Wake 2005 pointer to original](https://xp123.com/?p=772)
- In the same article, the timing of press and release drives the action. Hold time can set jump height or charge a shot. A short tap versus a long hold can give different shot types: a short tap makes "a wide, weak shot" and a held button makes "a tight, focused, powerful shot" — [Game Developer: One Button Games](https://www.gamedeveloper.com/design/one-button-games)
- A five-signal framework splits one input into Pressed, Released, Hold, Idle and Rhythm. Most real designs rely on Pressed, Hold and Rhythm, and hold duration can turn a binary input into a continuous value (e.g. a slingshot angle set by how long you press) — [GeekExtreme: Five Signals Behind One-Button Design](https://www.geekextreme.com/simple-game-mechanics-one-button-signals/)
- A jam brief stresses that "one button doesn't mean one action": charge an attack by holding and releasing, or double-tap to double-jump — [itch.io: Game Development One-Button Game 2022 jam](https://itch.io/jam/game-development-one-button-game-2022)
- Rhythm as a verb: in Rhythm Doctor you press on the seventh beat of each musical phrase. PRESS is a one-button tap-and-hold rhythm game — [Fair Plays by Wes: Rhythm Doctor](https://fairplaywes.com/2021/06/25/quick-hits-rhythm-doctor-one-button-fun/); [PRESS](https://pressgame.org/)
- Mashing as a verb: in Beat Mash any button hits a note, so it rewards mashing over precision — [Beat Mash on itch.io](https://all-bent-games.itch.io/beat-mash)
- "One press only" as a verb: in Reddit's The Button (2015), each account could press exactly once, ever. Not pressing was itself an identity ("non-presser" grey flair) — [r/thebutton FAQ mirror](https://r.datuan.dev/r/thebutton/wiki/faq)
- The alt.ctrl.GDC 2019 entry Plünge (toilet-plunger controller) was built as many short minigames, because the developers felt one button could not sustain one long game — [Game Developer: Alt.Ctrl.GDC Showcase: Plünge](https://www.gamedeveloper.com/marketing/alt-ctrl-gdc-showcase-i-pl-nge-i-)

### Inferences
- A practical verb vocabulary for the target app is: TAP (discrete), DOUBLE-TAP, MASH (rate), HOLD (continuous state), RELEASE-TIMING (charge and fire), HOLD-TO-STAY-ALIVE (letting go is the action or the failure), IDLE/ABSTAIN (choosing not to press), RHYTHM (press on the beat), and ONE-SHOT COMMITMENT (a single press per round). The last three are the least used in phone party apps and the most promising for originality.
- Plünge's finding supports the WarioWare-style "many 5–20 second minigames" structure for a one-button party app.

### Gaps
- The full text of Berbank-Green's article could not be read (fetch blocked), so his complete glossary or taxonomy of one-button input types is not reproduced here.
- No Pixelprospector one-button list was retrieved.

## 2. Catalogue: concrete unusual mechanics from notable games (verb / twist + source)

### Takeaway
More than 30 concrete mechanics were found. The most transferable to "each player has one button on one shared phone" are:
- one shared avatar with split inputs (Octopad)
- hold-longest endurance with a twist (Finger on the App, The Button)
- brinkmanship scoring (Rocket Rivals, Ultimate Chicken Horse)
- slap or grab on a shared trigger with decoys (Halli Galli, Jungle Speed)
- hidden random timers (Pass the Bomb)
- hiding among AI decoys (Hidden in Plain Sight)
- tempo-gated movement (J.S. Joust)
- collective voting between control modes (Twitch Plays Pokémon)

### Cited Findings
**Physical / tempo / nerve**
1. **Johann Sebastian Joust** — verb: keep still. Twist: you may only move fast while the music plays at normal speed. When it slows, any sharp motion knocks you out, so you win by jostling others into moving too fast. Uses PS Move controllers that light up red — [Engadget Sportsfriends review](https://www.engadget.com/2014-05-08-sportsfriends-review-with-friends-like-these.html); [GameSpot review](https://Gamespot.com/reviews/sportsfriends-review/1900-6415754/)
2. **Finger on the App (MSCHF × MrBeast, 2020)** — verb: hold your finger on the screen. Twist: the last person still touching wins up to $25,000, and eliminated players vote on the prize amount (the average of their votes). It ended after about 70 hours with four players tied, and a sequel ran in 2021 — [Wikipedia](https://en.wikipedia.org/wiki/Finger_on_the_App); [TechCrunch](https://techcrunch.com/2020/06/22/mschf-finger-on-the-app/); [Tubefilter ending](https://tubefilter.com/2020/07/03/after-70-hours-mrbeast-ends-finger-on-the-app-challenge-by-giving-4-winners-20000-each/)
3. **Reddit "The Button" (2015)** — verb: press once, ever. Twist: a shared 60-second countdown resets whenever anyone presses. Your flair colour records how low the timer was when you pressed (purple 60–51 down to red 11–0), so pressing late shows nerve. Non-pressers get grey flair — [r/thebutton FAQ mirror](https://r.datuan.dev/r/thebutton/wiki/faq); [Vice](https://www.vice.com/en/article/reddit-button-over/?nb=1)
4. **Rocket Rivals (dredds, PICO-8)** — verb: hold to thrust. Twist: shared-screen brinkmanship. You score for staying higher than opponents but lose everything if you touch the laser at the top. One-minute rounds, made with the developer's kids — [Rocket Rivals on itch.io](https://dredds.itch.io/rocket-rivals)
5. **Pass the Bomb / Tick Tack Bumm (Jon Kitching / Piatnik)** — verb: pass. Twist: a hidden random timer (10–60 s, or 20–90 s in some editions), and you may only pass after giving a valid word containing the card's letters. Whoever holds the bomb when it explodes takes a penalty card — [Wikipedia: Pass the Bomb](https://en.wikipedia.org/wiki/Pass_the_Bomb); [UltraBoardGames rules](https://ultraboardgames.com/pass-the-bomb/game-rules.php)

**Slap / grab reflex with a cognitive trigger (tabletop)**

6. **Halli Galli** — verb: ring the shared bell. Twist: ring only when exactly five of one fruit are visible across all face-up cards. A wrong ring costs you a card to each opponent — [BastardCafe](https://bastardcafe.dk/?p=70693); [Kaufland listing](https://www.kaufland.de/product/4149729/)
7. **Jungle Speed** — verb: grab the totem. Twist: race for it when two revealed symbols match. Near-identical decoy symbols trick false grabs, and special cards change the rule mid-round (everyone grabs at once, direction changes). The winner offloads cards to the loser — [Dice Tower: Jungle Speed](https://dicetower.com/board-game/8098)
8. **Dobble / Spot It** — verb: call it first. Twist: any two cards share exactly one symbol, and you race to find it — [boardgameshop.nl Dobble](https://boardgameshop.nl/en/product/dobble/)
9. **Slap Ashes (itch.io)** — verb: ready up, then slap. 2–4 players, 1 minute, one face button each — [Slap Ashes on itch.io](https://vitsoonyoung.itch.io/slap-ashes)

**Shared control / one avatar, many players**

10. **Octopad (Patrick LeMieux, IndieCade 2018, alt.ctrl.GDC)** — verb: press your one assigned input. Twist: one NES controller is split into eight single-button pads, so 4–8 people must jointly steer one Mario. The holders of left, right and A must coordinate. Inspired by one-switch accessibility design — [Game Developer: Octopad](https://gamedeveloper.com/marketing/alt-ctrl-gdc-showcase-i-octopad-i-); [UC Davis](https://arts.ucdavis.edu/news/patrick-lemieux-made-eight-player-controller); [GameLuster IndieCade 2018](https://gameluster.com/gameluster-indiecade-2018-part-2/)
11. **Twitch Plays Pokémon** — verb: vote by input. Twist: Anarchy mode runs every input in order received, while Democracy mode runs only the most-voted input per time window. Players vote to switch modes, and the thresholds are reportedly asymmetric (80% to enter Democracy, 50% to return to Anarchy). Sources differ on exact numbers and windows (20 or 30 s) — [Wikipedia](https://en.wikipedia.org/wiki/Twitch_Plays_Pok%C3%A9mon); [Bulbapedia Season 1](https://bulbapedia.bulbagarden.net/wiki/Twitch_Plays_Pok%C3%A9mon/Season_1)
12. **Puppet Pandemonium (alt.ctrl.GDC 2019)** — players control puppets with a single-button controller while the audience coaxes them along — [Game Developer: Puppet Pandemonium](https://www.gamedeveloper.com/marketing/alt-ctrl-gdc-showcase-i-puppet-pandemonium-i-)
13. **Plünge (alt.ctrl.GDC 2019)** — a plunger controller drives a set of short multiplayer minigames — [Game Developer: Plünge](https://www.gamedeveloper.com/marketing/alt-ctrl-gdc-showcase-i-pl-nge-i-)

**Body / touch on a single device**

14. **Fingle (Game Oven, iPad)** — verb: drag and hold. Twist: two players drag up to five buttons each onto colour targets, and the layouts force fingers to touch and cross. Described as "Twister for your iPad", a game about closeness — [Pocket Gamer](https://www.pocketgamer.com/articles/036676/r/); [Common Sense Media](https://www.commonsensemedia.org/app-reviews/fingle); [Game Developer: Road to the IGF](https://gamedeveloper.com/design/road-to-the-igf-game-oven-s-em-fingle-em-)

**Hidden identity / hidden information on one screen**

15. **Hidden in Plain Sight (Adam Spragg)** — verb: blend in. Twist: 2–4 players look identical to a crowd of AI characters. In "Death Race" everyone walks to a finish line and each player has one bullet to eliminate someone, so moving too fast reveals you. A sniper mode has one player hunting the others among NPCs — [Giant Bomb](https://www.giantbomb.com/games/3030-38424/); [co-op.gg](https://www.co-op.gg/pc/game/hidden-in-plain-sight)
16. **Screencheat (Samurai Punk)** — verb: peek. Twist: all players are invisible, and the only way to find opponents is to read their split-screen view ("screen look"). Colour-coded map quadrants and shot trails reveal position, and every weapon kills in one hit — [Indie Games Plus](https://indiegamesplus.com/multiplayer-fps-screencheat-unplugged-demands-you-peek-at-your-opponents-screens/); [PlayStation Blog](https://blog.eu.playstation.com/2015/04/16/cheat-way-victory-ps4-bound-shooter-screencheat/)
17. **Keep Talking and Nobody Explodes** — verb: talk. Twist: the defuser sees the bomb but not the manual, and the experts see the manual but not the bomb — [IGF](https://igf.com/content/keep-talking-and-nobody-explodes); [Co-Optimus](https://www.co-optimus.com/article/13643/start-your-week-off-with-a-little-co-op-bomb-defusal.html)
18. **Spaceteam** — verb: shout and act. Twist: each player's screen shows instructions that can only be carried out on a teammate's unique control panel — [Giant Bomb: Spaceteam](https://giantbomb.com/wiki/Games/Spaceteam)

**Sabotage / indirect interaction / asymmetric roles**

19. **Ultimate Chicken Horse** — verb: place a trap, then run. Twist: you score for finishing only if at least one other player fails. If everyone finishes, nobody scores, so you build "just barely too hard for your friends, but easy enough for you". Bonuses go for trap kills, finishing first and underdog finishes — [Giant Bomb](https://giantbomb.com/wiki/Games/Ultimate_Chicken_Horse); [game-design homeplay write-up](https://mycours.es/gamedesign2017/2017/10/27/homeplay-ultimate-chicken-horse-2/); [GodisaGeek review](https://godisageek.com/reviews/ultimate-chicken-horse-review/)
20. **Tetris 99** — verb: choose a target. Twist: auto-target modes are KOs (players near death), Attackers (those targeting you; with two or more attackers you send extra garbage), Badges (the strongest players) and Random. KO badges boost your outgoing attacks. Sources disagree on the badge cap — [Giant Bomb](https://giantbomb.com/wiki/Games/Tetris_99); [TheGamer guide](https://www.thegamer.com/tetris-99-guide-nintendo-battle-royale/)
21. **Crawl (Powerhoof)** — verb: haunt. Twist: one hero against the rest. Dead players become ghosts that possess traps and objects or summon monsters, and the ghost who lands the killing blow takes over the hero's body — [Wikipedia](https://en.wikipedia.org/wiki/Crawl_(video_game)); [Game Informer](https://www.gameinformer.com/games/crawl/b/switch/archive/2018/01/11/teach-your-friends-to-kill-each-other.aspx)
22. **Pico Park** — verb: stack and push together. Twist: get a key, open the door, and all players must reach the goal. Players climb on each other for height or combine strength to push heavy blocks — [Giant Bomb: Pico Park](https://giantbomb.com/wiki/Games/Pico_Park)

**Sports with constrained verbs (Sportsfriends)**

23. **BaraBariBall** — verb: jump and dunk. Twist: you score by dunking the ball into the opponent's coloured water, and jumps spend a limited orb pool that refills only on the ground — [GameSpot](https://Gamespot.com/reviews/sportsfriends-review/1900-6415754/); [Engadget](https://www.engadget.com/2014-05-08-sportsfriends-review-with-friends-like-these.html)
24. **Hokra** — verb: carry or pass. Twist: four squares carry and pass a tiny ball, and points accumulate continuously over time while you hold it in a goal zone — [Engadget](https://www.engadget.com/2014-05-08-sportsfriends-review-with-friends-like-these.html)
25. **Super Pole Riders** — verb: push with a pole. Twist: push a ball hanging on a string toward the goal, with dash, tackle and pass — [GameSpot](https://Gamespot.com/reviews/sportsfriends-review/1900-6415754/)

### Inferences
- Mechanic types that phone apps rarely use and that suit one button: tempo-gated action (Joust), hold-to-stay-alive with social scoring (Finger on the App, where losers set the prize), one press per round with visible courage (The Button), brinkmanship with a lethal ceiling (Rocket Rivals), "score only if someone else fails" (UCH), hiding among AI decoys (HiPS), and one avatar with split inputs (Octopad).

### Gaps
- Sources for Nidhogg, Samurai Gunn, Duck Game, Push Me Pull You, Sumotori Dreams, Gang Beasts, Lovers in a Dangerous Spacetime, Tricky Towers, 1-2-Switch, WarioWare Move It, Fibbage/Quiplash, Ligretto, Pit, Hungry Hungry Hippos, Perfection, Jenga and Buckaroo were not retrieved within the search budget. They are not catalogued here with verified mechanics.
- A Nidhogg design analysis (tug-of-war over screen territory) was searched for and not found.

## 3. Game-jam and small itch.io one-button multiplayer originals

### Takeaway
A dedicated "One Button Local Multiplayer" jam (#OBLMJam, 2019) exists but drew only 3 entries. itch.io's one-button / local-multiplayer tags hold many small titles, but snippets give only taglines. Jam-sourced originality is real but thinly documented.

### Cited Findings
- **#OBLMJam (One Button Local Multiplayer, 16–19 Aug 2019, host SteliosWinters)**. Rules: one button per player, competitive not co-op, different devices allowed, no theme. 3 entries: Minimalisports, Solo Button Slayers, Get On My Level ("a quick local vs game") — [itch.io jam page](https://itch.io/jam/one-button-local-multiplayer); [entries](https://itch.io/jam/one-button-local-multiplayer/entries)
- **One Button Village** — a city-builder controlled with a single button, from the Local Multiplayer / Couch Co-Op Jam (1 screen, 1 keyboard) — [itch.io Multiplayer Game Jam](https://itch.io/jam/multiplayer-gamejam)
- **KeyboardWithFriends** — a local-multiplayer game made in 48 h for Ludum Dare 28 (theme "You Only Get One"), built in FlashPunk. How the controls are split was not confirmed — [GitHub repo](https://github.com/qualiaa/KeyboardWithFriends)
- **ROOTS** (Global Game Jam 2023) — racer for 1–4 players, tagged one-button — [itch.io GGJ2023 local multiplayer](https://itch.io/games/tag-global-game-jam-2023/tag-local-multiplayer)
- **ANYKEY** (sciman101) — neon one-button party game for "up to 60 simultaneous players" (the itch.io metadata says 1–16) — [ANYKEY on itch.io](https://sciman101.itch.io/anykey); [SteamSpy](https://steamspy.com/app/790450)
- **Chucksaw** — "Catch saw, dodge saw, flick saw, chuck saw" (one-button party game) — [itch.io one-button party-game tag](https://itch.io/games/tag-one-button/tag-party-game)
- **Button Royale 99** — one-button battle royale against 99 players — [itch.io one-button party-game tag](https://itch.io/games/tag-one-button/tag-party-game)
- **Tippin' Ball** — "an awkward one-button ball game" — [itch.io one-button party-game tag](https://itch.io/games/tag-one-button/tag-party-game)
- **SIXGUN** — local one-button shooter for up to 8 players. **Micro Sprint** — one-button, single-screen, top-down local multiplayer racer. **The Grid** — 2–10 player one-button racer. **One Button Fighter** — [itch.io one-button local multiplayer](https://itch.io/games/accessibility-one-button/local-multiplayer)
- **ONE BUTTON LOCAL MULTIPLAYER SHOOTER** — 1–16 players — [itch.io one-button tag (9+ players)](https://itch.io/games/oldest/player_count-9p/tag-one-button)
- **Wrestle Jump 2** — one-button physics wrestling **[COMMON: sumo/wrestle]**. **Otto's Tennis** — one-button pong-like tennis for two **[COMMON: pong]** — [itch.io one-button party-game tag](https://itch.io/games/tag-one-button/tag-party-game)
- An itch.io jam forum thread asks specifically about "one button per player" multiplayer designs — [One Button to Rule All Jam forum](https://itch.io/jam/one-button-to-rule-all-jam/topic/34373/multiplayer-game-one-button-per-player)
- **God Vibrations** (GGJ 2017, 2–4 players, Smash/TowerFall-inspired; not confirmed one-button) — [itch.io GGJ local multiplayer](https://itch.io/games/local-multiplayer/tag-global-game-jam)

### Inferences
- Most jam one-button multiplayer games fall back on shooter, racer, sports or fighter genres (i.e. the [COMMON] categories). Originality comes more from rule twists (brinkmanship, one shot, hidden identity) than from genre.

### Gaps
- No Ludum Dare or GGJ *winner* that is specifically one-button and shared-screen multiplayer was confirmed.
- itch.io pages could not be opened, so the core rules of Minimalisports, Solo Button Slayers, Get On My Level, ROOTS and Chucksaw are unverified beyond taglines.

## 4. Indirect-interaction mechanics (sabotage, voting, chicken/nerve, betrayal, shared resources, asymmetric roles, hidden info)

### Takeaway
The strongest indirect-interaction patterns found are:
- relative scoring that punishes over-cooperation (UCH)
- choosing whom to hurt (Tetris 99 targeting)
- the dead get a role (Crawl)
- a shared resource any one player can reset for all (The Button)
- collective rule-switching by vote (Twitch Plays Pokémon)
- eliminated players set the stakes (Finger on the App)
- hiding identity among AI clones (Hidden in Plain Sight)
- a peek-to-locate risk/reward (Screencheat)

### Cited Findings
- **Score only relative to others' failure** (sabotage incentive): in UCH, if all finish, no points — [Giant Bomb](https://giantbomb.com/wiki/Games/Ultimate_Chicken_Horse)
- **Targeting choice** (whom to hurt: the weak, the strong, or whoever is hurting you): [Giant Bomb Tetris 99](https://giantbomb.com/wiki/Games/Tetris_99)
- **Eliminated players stay in as antagonists, and the killer inherits the lead role**: [Wikipedia Crawl](https://en.wikipedia.org/wiki/Crawl_(video_game))
- **Shared clock that anyone can reset; one press each; your press time becomes public status**: [r/thebutton FAQ mirror](https://r.datuan.dev/r/thebutton/wiki/faq)
- **Losers vote on the winner's prize (the average of their votes)**: [Wikipedia Finger on the App](https://en.wikipedia.org/wiki/Finger_on_the_App)
- **Bluffing near the end**: the final four were told the game had ended, and one argued it might be a trick to make others let go — [Wikipedia Finger on the App](https://en.wikipedia.org/wiki/Finger_on_the_App)
- **Anarchy vs. Democracy with asymmetric switch thresholds; protest spam ("start9") as a counter-move**: [Wikipedia TPP](https://en.wikipedia.org/wiki/Twitch_Plays_Pok%C3%A9mon); [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Twitch_Plays_Pok%C3%A9mon/Season_1)
- **Hidden identity among AI; acting non-human reveals you; one bullet**: [Giant Bomb HiPS](https://www.giantbomb.com/games/3030-38424/)
- **False-positive penalty on a shared trigger**: a wrong ring in Halli Galli costs a card to every opponent; decoy symbols in Jungle Speed cause false grabs — [BastardCafe](https://bastardcafe.dk/?p=70693); [Dice Tower](https://dicetower.com/board-game/8098)
- **Split information forcing communication**: [IGF KTANE](https://igf.com/content/keep-talking-and-nobody-explodes); [Giant Bomb Spaceteam](https://giantbomb.com/wiki/Games/Spaceteam)
- **Shared limited resource that regenerates under a condition**: BaraBariBall jump orbs refill only on the ground — [GameSpot](https://Gamespot.com/reviews/sportsfriends-review/1900-6415754/)

### Inferences (idea seeds for one-phone, one-button mini-games, extrapolated by the researcher, not sourced designs)
- **"The Button" round**: a shared countdown is visible to all, and any tap resets it for everyone. Each player gets one tap per round, and points scale with how low the clock was when you tapped. If it hits zero, everyone who has not tapped loses. Verbs: idle and one-shot commitment.
- **"Losers set the jackpot"**: a hold-longest round where each player who lets go then taps to vote the prize up or down for those still holding.
- **"Brinkmanship rocket"**: Rocket Rivals adapted to the phone, where each player holds to rise and the top of the screen kills. Score is the height × time you were leader.
- **"Clone crowd"**: 4 player dots plus 20 AI dots drift on the phone. Tapping makes your dot step, so everyone must tap at AI-like rhythms. Each player has one "accuse" via long hold, which only fires if the hold is released over a dot. Hidden identity on one screen.
- **"Octopad split avatar"**: one character on screen, where player A's tap = jump, B = left, C = right, D = action. A cooperative stage with optional betrayal scoring.
- **"Tempo freeze" (Joust-like)**: music plays. Tapping or holding scores only while the music is at normal speed, and pressing during the slow-down eliminates you. Players can't jostle each other but can shout to bait.
- **"False alarm bell"**: Halli Galli-style. Cards appear in the middle, and the first tap when a condition is true wins. A wrong tap gives each opponent a point, and near-identical decoys appear.
- **"Haunting losers"**: eliminated players' buttons switch to spawning obstacles for those still alive (Crawl).
- **"Too easy = nobody scores"**: each player secretly places one hazard (timed tap during a scrolling preview), then all run. Points only if someone fails (UCH).
- **"Majority vs anarchy"**: one shared object, where every tap pushes it in the tapper's direction (anarchy). Players can mash together to trigger a "democracy" phase where only the most-tapping player counts.

### Gaps
- No primary source was found for hidden-role designs on a single *shared* phone screen (e.g. Werewolf adapted to one screen with look-away phases). This needs separate research.
- Auction or bidding mechanics with one button (e.g. "hold to keep bidding, release to drop out", like a Dutch/English clock auction) are a plausible design, but no concrete game source was found in this session.

## 5. Physical / tabletop tricks with a phone lying on the table; and which mechanics are already common in phone party apps

### Takeaway
Touch-based physical play on one device has precedent: Fingle's forced finger contact and Finger on the App's endurance hold. Board-game slap/grab mechanics map directly to a phone in the middle of the table. Meanwhile, existing one-phone 2-player apps are saturated with tug-of-war, whack-a-mole, reaction tests, soccer/penalties, pong and similar. These should be avoided as primary content.

### Cited Findings
- Fingle: two players on one iPad, up to five fingers each, touch is unavoidable, "Twister with fingers" — [Pocket Gamer](https://www.pocketgamer.com/articles/036676/r/); [Common Sense Media](https://www.commonsensemedia.org/app-reviews/fingle)
- Finger on the App: endurance hold on a phone screen, run for about 70 hours — [TechCrunch](https://techcrunch.com/2020/06/22/mschf-finger-on-the-app/)
- **[COMMON]** "2 Player Games" (iOS) includes Pull The Rope (tug-of-war), Whack A Mole and soccer — [App Store](https://apps.apple.com/lc/app/2-player-games/id6739672059)
- **[COMMON]** "2 Player Challenge: Mini Games": Pull the Rope, Whack a Mole, bowling, math quiz, tic-tac-toe — [App Store](https://apps.apple.com/us/app/-/id6740026494)
- **[COMMON]** "Tug It!": phone flat between two players, who mash their half of the screen — [itsallwidgets](https://itsallwidgets.com/tug-it)
- **[COMMON]** "Tug the Table": tug-of-war with a table — [TouchArcade](https://toucharcade.com/games/tug-the-table)
- **[COMMON]** "4 Reaction": 2–4 players on one phone, 25+ minigames. "2 Player Reactor": 17 minigames. "2 Player Games: The Challenge": reaction plus sports like penalty kicks — [4 Reaction on itch.io](https://junostudio.itch.io/4-reaction); [RAWG 2 Player Reactor](https://rawg.io/games/2-player-reactor-multiplayer)
- **[COMMON]** One-button pong and wrestling exist on itch.io (Otto's Tennis, Wrestle Jump 2) — [itch.io one-button party-game tag](https://itch.io/games/tag-one-button/tag-party-game)

### Inferences
- Avoid as headline modes: tug-of-war, mash races, plain reaction duels (first to tap after a signal), whack-a-mole, pong/tennis, soccer/penalties, sumo/wrestle, racing, snake, tanks, math quiz. These are confirmed or strongly implied as standard fare.
- Physical-trick seeds (unsourced extrapolations):
  - "Finger Twister": hold zones appear and move, and you must keep holding while sliding without lifting, so fingers cross (Fingle).
  - "Last finger standing with temptations": a bonus appears briefly that you can grab only by lifting and re-tapping.
  - "Rotate the table": the phone lies in the middle and the active zone migrates between players' edges.
  - "Cover it": one player covers part of the screen with a hand while others must react to what is visible.
- The Halli Galli and Jungle Speed families (shared trigger, cognitive condition, false-positive penalty, decoys) look under-used in phone apps and fit "phone in the middle, everyone has a corner button" perfectly.

### Gaps
- No verified sources were retrieved for Ligretto, Pit, Hungry Hungry Hippos, Perfection, Jenga, Buckaroo, musical chairs, hot potato or red-light-green-light rules. They are well known, but citations were not collected here.
- No market-wide survey quantifying which mechanics dominate phone party apps was found. The [COMMON] tags rest on individual store listings, not a systematic count.
- BoardGameGeek dexterity / real-time category lists were not reachable (fetch blocked).

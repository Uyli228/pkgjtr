---
name: party-minigame-design
description: Design or redesign a one-button mini-game for "Чотири Кути" (1–4 players around one phone, each player has exactly one button). Use when inventing a new mini-game, reworking a boring one, choosing what to cut, or writing a game's rules/intro text. Encodes the party-game "formula" from reports/Формула веселих ігор на одному телефоні.md, the nine one-button verbs, banned clichés, and how a game plugs into game/js/engine.js.
---

# Party mini-game design (one phone, one button each)

The fun happens **between the people around the phone**, not on the screen. A mini-game is good when it makes the room shout, accuse, bluff, beg and laugh within the first 5 seconds. Every rule below serves that.

## 1. Pitch the game in one picture + one verb

Before any code, write three lines:

```
ДІЄСЛОВО:  one word the button does (ХАП / ТРИМАЙ / СТОП / КИДАЙ…)
КАРТИНКА: what a bystander sees in one glance
ДРАМА:    the sentence people will shout ("Відпускай, вибухне!", "Це ти!", "Не чіпай!")
```

If the ДРАМА line is "тисни швидше" — throw the idea away.

## 2. Pick a verb (prefer the unused ones)

| Verb | Feeling | Use in |
|---|---|---|
| tap | speed, greed | only with a cost per tap (Сплячий дракон) |
| hold | commitment, nerve | ставки, «тримай, щоб жити» (Аукціон, Джекпот) |
| release at the right moment | judgement | Остання секунда, Керлінг |
| **do nothing** | restraint, bluff | Мишка і кіт, фальшиві сигнали |
| **one press per round** | decision, regret | Остання секунда, Чий торт? |
| hold-to-live | endurance, fear | Джекпот, Курча на рейках |
| rhythm | togetherness | Ритм-барабан |
| tap vs hold = two actions | depth without more buttons | Хто з них ти? (крок / приціл) |
| double tap | rarely worth it on a phone | avoid |

The market already uses tap-race and hold-to-move to death. New games should lean on **do nothing / one press / hold-to-live / release-as-decision**.

## 3. The formula — every game must hit at least 5 of 8

1. **Readable in 1 second** — one picture, one verb, no reading needed after the first round.
2. **Short and decisive** — a round settles in 5–20 s; a whole game ≤ 35 s (≤ 45 s for multi-round bluff games).
3. **Losing is funny** — design the failure animation first (вибух, торт в обличчя, падіння, «ПІЙМАВ!»).
4. **Made for the watcher** — the outcome is obvious to someone looking over your shoulder.
5. **Players touch each other's fate** — your action helps/hurts someone else (shared timer, shared monster, choosing a target).
6. **Own clear role** — each player has their own token/zone; never several players steering one object.
7. **Hope for the losing** — comeback rule, catch-up bonus, “лідер коштує дорожче”, or visible luck.
8. **Room as referee** — some info is social (faces, bluff, fake alarms, hidden identity).

## 4. Banned / overused (do not ship as a headline game)

Reaction duel (“tap when green”), tug of war / tap race, pong & air hockey, snake / light cycles, tanks, sumo, car racing, soccer / penalties, tic-tac-toe, pool, memory pairs, whack-a-mole, colour-word quiz, spinner war. If an idea reduces to “everyone does the same thing in their corner, fastest wins” — redesign it with one of: a shared resource, a hidden timer, a cost for acting, a target choice, a fake signal, or a hidden identity.

## 5. Twists that turn a cliché into something original

- **Shared clock** — anyone’s action resets/changes it for all (Остання секунда).
- **Shared monster** — every action wakes it; who acted last pays (Сплячий дракон).
- **Price of greed** — the longer you stay in, the more you win *and* the more you risk (Джекпот, Аукціон).
- **Ghost role** — eliminated players keep playing as saboteurs (fake alarms, obstacles).
- **Wrong action rewards rivals** — false tap gives everyone else a point (П’ять фруктів).
- **Target choice** — you decide whom to hurt; hurting the leader pays more (Чий торт?).
- **Hidden identity** — you are one of many identical things (Хто з них ти?).
- **Score only if someone else fails** (Ultimate Chicken Horse rule).

## 6. Bots

Bots must lose **believably**: they see only what a human sees (tells, timers), add noise scaled by `E.skill` (0.3 easy … 0.92 hard), and sometimes make human mistakes (greed, panic on fake alarms). Never let a bot read hidden values (the real bust time, the real wake threshold).

## 7. Text

- `name`: 1–3 words.
- `verb`: one CAPS word or short shout shown huge in the intro (“НЕ ПОСПІШАЙ!”).
- `desc`: **≤ 110 characters**, one or two sentences: what the button does + how you win. Details go in game/README.md, not on screen.
- `btn`: the verb on the player’s button (≤ 9 chars).

## 8. Plugging into the engine (game/js/games/NN-id.js)

```js
G.game({
  id, name, icon, tag, bg, btn, verb, desc, lanes /* true = each player gets a panel */,
  create(E) { return { init, start?, update(dt), draw(g), press?(p), release?(p), bot?(p, dt), label?(p) }; },
});
```

Useful engine calls: `E.players`, `E.arena {x,y,w,h,cx,cy,u}`, `E.home(p, inset)` (point near a player’s corner), `E.panel(g,p,fn)`, `E.dual(g,fn,gap,keep)` (text for both sides of the table), `E.hud(g,p,text)`, `E.avatar(g,x,y,r,p,mood)`, `E.tap/hold` (bots), `E.finish(winnerIds, note)`, `E.best(values,'max'|'min')`, `E.eliminate(id)`, `E.lastStanding()`, juice: `E.shake`, `E.burst`, `E.float`, `E.flash`, `E.hitstop`.
Register the file in game/index.html and game/sw.js, then run the minigame-audit skill.

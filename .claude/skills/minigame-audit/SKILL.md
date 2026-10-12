---
name: minigame-audit
description: Audit every mini-game in "Чотири Кути" against the party-minigame-design formula and the game-feel-juice checklist — run bot simulations for duration/stability, take screenshots, score each game, write docs/minigame-audit.md and list concrete fixes. Use after adding or changing mini-games, before a release/APK build, or when someone says the game "feels boring", "doesn't feel like 1 2 3 4" or "not original".
---

# Mini-game audit

## 1. Measure (automated)

Serve the game and run the bot simulation for 2, 3 and 4 players:

```bash
npx http-server game -p 8123 -s -c-1 &      # in repo root
node tools/audit.mjs                          # writes docs/audit-sim.json
```

`tools/audit.mjs` plays every game with bots (normal skill) 3× per player count and records: finished?, errors, median duration, draw rate, elimination order. Flag:
- **not finished** within 150 s → broken (bots or end condition)
- **median > 35 s** (> 45 s for multi-round bluff games) → too long
- **median < 6 s** → too short / no drama
- **draw rate > 25 %** → tie-break needed

## 2. Score (judgement)

Read the game file and the screenshot, then score 0/1 for each column:

| Column | Question |
|---|---|
| Читається | Can a bystander understand it from one picture + the verb? |
| Коротко | Duration within limits from step 1? |
| Смішна поразка | Is failure slapstick (avatar reaction, flash, aftermath)? |
| Для глядача | Is the outcome obvious to people watching? |
| Взаємодія | Do players affect each other? |
| Своя роль | Does each player own a clear token/zone? |
| Надія | Can someone behind still win? |
| Соціальне | Bluff / hidden info / room-as-referee? |
| Не кліше | Not on the banned list in party-minigame-design §4? |
| Сік | ≥ 5 of 8 items from game-feel-juice checklist? |
| Простота | Passes every hard limit in party-minigame-design §0 (one mechanic, ≤ 3 object kinds, no reading, rule ≤ 60 chars)? **A zero here is blocking — fix before anything else.** |

Total ≥ 8 of 11 and Простота = 1 → keep. 5–6 → fix the zero columns. ≤ 4 → redesign with party-minigame-design §5 or cut.

## 3. Report

Write `docs/minigame-audit.md`: one table row per game (scores + duration + verdict) and a "Fixes applied" list. Then apply fixes, re-run step 1, and update the table.

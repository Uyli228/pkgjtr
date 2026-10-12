---
name: game-feel-juice
description: Make a mini-game in "Чотири Кути" feel alive and funny — button feedback, characters with emotions, hit-stop, screen shake, flashes, pop-up numbers, slapstick failure and a celebration moment. Use when a game "works but feels flat", after adding a new mini-game, or when polishing visuals/feel. Based on Vlambeer's "Art of Screenshake", "Juice it or lose it" (Jonasson & Purho) and Steve Swink's "Game Feel", adapted to the helpers in game/js/engine.js.
---

# Game feel ("juice") for one-button party games

A one-button game has almost no input richness, so **all of the feel comes from the response**. Every press, every hit and every loss must answer back loudly within 100 ms.

## The response ladder (apply in this order)

| Moment | Minimum response | Engine helper |
|---|---|---|
| Any press | sound + button sinks + something in the arena moves | `G.sfx('tap')`, button is automatic |
| Good action | pop-up number that bounces, short bright sound | `E.float(x,y,'+1',color,rot)`, `G.sfx('coin')` |
| Big moment (hit, catch, win a round) | **hit-stop 60–120 ms** + particles + small shake | `E.hitstop(0.08)`, `E.burst`, `E.shake(4)` |
| Failure / elimination | screen flash in red + big shake + character reacts | `E.flash('#FF5468')`, `E.shake(8)`, avatar mood `'hurt'` |
| Tension rising | pulse speed, tint, sound tempo increase | sin-based pulse, faster `beep` |
| Game won | winner character jumps, losers sad, confetti | automatic in result screen |

## Characters, not dots

Every player is the same chubby blob character in their colour (`E.avatar(g,x,y,r,p,mood)`). Moods: `'idle'`, `'happy'`, `'scared'`, `'hurt'`, `'out'`, `'sly'`. Use the avatar wherever a player is represented by a token (seat markers, holders, targets). Faces are what make bystanders laugh; a coloured circle never does.

## Rules of thumb

- **Anticipation → action → reaction**: show the wind-up (bomb pulses, dragon smoke), then the event, then the aftermath (soot, cream, tears) that lingers 1–3 s.
- **Exaggerate failure**: losing animation is bigger than winning animation.
- **Keep shake short** (< 0.4 s) and proportional; never shake on every tap.
- **Contrast**: the important object is the brightest thing on screen; backgrounds stay calm.
- **Numbers pop**: score changes always appear where the action happened, not only in the HUD.
- **Sound for every state change**; vary pitch with intensity (`G.sfx('tap', level)`).
- **Respect readability**: juice must never hide the game state (no flashes over the timer for > 0.3 s).
- **Reduced motion**: if `matchMedia('(prefers-reduced-motion: reduce)')` matches, halve shake and particles (engine does this).

## Checklist per game

- [ ] Press feedback in the arena (not just the button)
- [ ] Avatars with moods for players
- [ ] Hit-stop on the single most important event
- [ ] Red flash + shake on elimination / big loss
- [ ] Pop-up numbers at the action point
- [ ] Anticipation tell before every surprise
- [ ] Aftermath that lingers (cream, soot, debris)
- [ ] Winner celebration readable from across the table

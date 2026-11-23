# Crownwater Phase 1 playtest report

## Method and automated results

Headless Chrome 156 against the Vite **production** preview at [localhost:4179](http://localhost:4179/), using browser keyboard and pointer events, HUD assertions and captured frames. Normal capture viewport was 1366×900 at device scale factor 1. Most routes began from a fresh game; the isolated roadblock pass started from a five-star driving checkpoint, and the New Game regression started with an existing checkpoint.

- `npm test`: **69 passed, 0 failed**. Coverage includes traversal, combat and cover, robbery/theft, police response and escape, identity, save migration/retry, keyboard behavior, Motorworks re-entry beside loot, and checkpoint replacement confirmation.
- `npm run build -- --outDir ~/soc-v2-build-final --emptyOutDir`: Vite built in **403 ms**; the preview returned HTTP 200. Earlier previews on ports 4176–4178 were left running and also returned HTTP 200.

Integrated playtest PRs: [#8 onboarding and traversal](https://github.com/Braventh/state-of-crime/pull/8), [#9 combat](https://github.com/Braventh/state-of-crime/pull/9), [#10 vehicles](https://github.com/Braventh/state-of-crime/pull/10), [#11 pursuit and escape](https://github.com/Braventh/state-of-crime/pull/11), and [#12 robbery and economy](https://github.com/Braventh/state-of-crime/pull/12).

## Section 14 production Chrome results

| Requirement | Result |
| --- | --- |
| 14.1 — Sandbox | Started without a mission and explored on foot and by car across the routes. Robbed Velvet Loom (+$86) and a pedestrian (+$26, no repeated payout). Stole a parked compact and a moving occupied van; changed lanes, braked and exited. At Prism Motorworks, X re-entered beside loot without collecting it; E could still collect the loot. Engaged Vesper Toll near Rainline Market. A gang-specific loot pickup was not independently verified. |
| 14.2 — Combat | Picked up pipe and pistol, switched via weapon slots, discharged the pistol (8 → 7), reloaded from reserve (7 / 24 → 8 / 23), and downed a Vesper Toll crew member. The automated suite tests fists, pipe, stagger and occlusion separately. Angled aim, other firearm categories and melee outcomes were not separately verified in Chrome. |
| 14.3 — Wanted and police | A storefront robbery registered at **two stars**. A gunfight near an officer then brought the response to **five**; officers and cruisers arrived. The HUD stayed “In sight” while exposed. Entering Bluehour Arcade changed the HUD to “Hidden”; the search cooled and stars cleared with 63 HP left. **Five-star roadblock drive-past passed** on an isolated driving route: changed lanes and drove at 73 mph with 88 integrity more than 100 world units past the roadblock, still at five stars. A ram warning was visible in the capture; avoiding a specific ram was not isolated. A five-star chase, roadblock and escape in one continuous run was not tested. |
| 14.4 — Identity | Bought and wore the Canal Overcoat and Copper Tail; the save restored both at $76. Bought Sea Glass paint at Prism Motorworks and verified the color persisted after Continue, with $97 remaining. When a patrol had the player in sight at Velvet Loom, the purchase was denied while the HUD stayed at two stars and cash stayed at $226. Recognition stacking and preservation of five stars are tested at system level; quantitative reacquisition distance was not measured in the browser. |
| 14.5 — World and art | Climbed two fire escapes, picked up a pistol on the upper roof, leaped an adjacent rooftop gap, and used both Bluehour Arcade exits. Captures show the character, roof and street routes, and the wanted HUD outside the canvas. Rooftop street-to-roof span is approximately 42% of the 540-unit frame; the lower passages add another playable route. At 568×280, a wrapped carjack prompt produced 1 px of vertical scroll. After removing the short-window width floor, the same prompt fit in a 280 px page with the dock fully visible. Art review was visual, not independent. |
| 14.6 — Technical | Continued after browser refresh with the purchased appearance, money, weapon and ammo. A malformed checkpoint offered New Game and started normally. A saved game in an iframe without permission to open browser prompts could cancel the in-game New Game confirmation without losing progress, then confirm and replace the save. No JavaScript exceptions or browser error log entries were recorded in completed routes. This combined pass did not cover Safari, Firefox, touch, controllers, or another independent human playtest. |

## Frame pacing

Sampled 120 consecutive animation-frame intervals in each scene, on this headless Chrome machine:

| Scene | Mean interval | p95 interval | Intervals ≥34 ms |
| --- | ---: | ---: | ---: |
| Lantern Row at street level | 16.67 ms | 16.8 ms | 0 |
| Active five-star pursuit at street level | 16.67 ms | 16.7 ms | 0 |

These are short observations, capped near 60 Hz on this environment. They are not CPU/GPU timings, a long-session soak, or a guarantee on other hardware. The renderer caches building facades, culls off-camera foreground and uses a fixed 960×540 logical canvas. Audio cues were generated in Chrome without console errors; sound mixing was not independently auditioned.

## Wanted tuning

The star thresholds and escape rules are unchanged. A shot now adds heat once: a hit keeps its victim offense and can still be heard as gunfire. Officer injuries and knockouts build heat more slowly once active pursuit begins. Observation is checked before a shot can change wanted level or knock out its witness. Only serious offenses seen by police can take a pursuit from four to five stars.

In fresh production Chrome runs on the same route, the player robbed Velvet Loom once, collected a pistol and fired single shots in police sight near Bluehour Arcade. These are criminal actions (robbery or shots actually fired), not police reports; movement and reloads are excluded.

| First reached | Before (`9150c48`, port 4180) | After (port 4181) |
| --- | --- | --- |
| 1 star | Skipped | Skipped |
| 2 stars | 1 action (robbery) | 1 action (robbery) |
| 3 stars | 2 actions (robbery + 1 shot) | 4 actions (robbery + 3 shots) |
| 4 stars | 3 actions (robbery + 2 shots) | 8 actions (robbery + 7 shots) |
| 5 stars | 4 actions (robbery + 3 shots) | 12 actions (robbery + 11 shots) |

The follow-up automated suite passed all 73 tests, including a player-action escalation scenario, the out-of-range knockout regression, and five-star escape. New Game, Cancel and Confirm were also rechecked on port 4181.

## Gameplay evidence

- [Lantern Row, fresh free roam](screenshots/v2-01-lantern-row.png)
- [Purchased outfit and hairstyle after Continue](screenshots/v2-02-custom-look.png)
- [Upper roof with pistol](screenshots/v2-03-rooftop-run.png)
- [Inside Bluehour Arcade](screenshots/v2-04-bluehour-arcade.png)
- [Five stars, cruisers and roadblock](screenshots/v2-05-maximum-response.png)
- [Five-star roadblock approach](screenshots/v2-final-roadblock.png)
- [Past the five-star roadblock while still driving](screenshots/v2-final-roadblock-passed.png)
- [Search cleared inside Bluehour Arcade](screenshots/v2-06-search-cleared.png)
- [Repainted compact](screenshots/v2-07-motorworks.png)
- [Vesper Toll encounter](screenshots/v2-08-gang-encounter.png)
- [568×280 viewport](screenshots/v2-09-short-viewport.png)

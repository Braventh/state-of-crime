# Crownwater Phase 1 playtest report

## Method and automated results

Headless Chrome 156 against the Vite **production** preview at [localhost:4176](http://localhost:4176/), using real browser keyboard and pointer events, HUD assertions and visual inspection of captured frames. Gameplay was earned through input; only the separate corrupt-save test wrote deliberately invalid storage. Normal capture viewport was 1366×900 at device scale factor 1.

- `npm test`: **47 passed, 0 failed**, including 16 sandbox cases and 31 inherited V1 regressions. The new cases cover traversal and alternate exits; weapon range, stagger, reload and cover; robbery, crew retaliation/loot and theft; five tiers, offscreen dispatch, last-known position, escape and identity; and storage migration, validation and stale-tab protection.
- `npm run build -- --outDir ~/soc-v2-build --emptyOutDir`: Vite built in **226 ms**; the preview returned HTTP 200. The separate output directory leaves the V1 preview build intact.

## Section 14 production Chrome results

| Requirement | Result |
| --- | --- |
| 14.1 — Sandbox | Started without a mission, explored on foot and by car, robbed Velvet Loom (+$86), stole a parked compact, drove to Prism Motorworks, and collected gear on the street and roof. Engaged Vesper Toll near Rainline Market; one crew member went down and the player took damage. Full end-to-end verification of occupied-car theft, gang-loot pickup and an isolated civilian mugging was not done in Chrome. |
| 14.2 — Combat | Picked up pipe and pistol, switched via weapon slots, discharged the pistol (8 → 7), and reloaded from reserve (7 / 24 → 8 / 23). The automated suite tests fists, pipe, stagger and occlusion separately. Not all firearm categories, melee outcomes or encounter difficulty were exercised in Chrome. |
| 14.3 — Wanted and police | Robbery registered at **two stars**; subsequent gunfire reached **five**. Officers and multiple vehicles arrived, including a roadblock. At five stars the HUD stayed “In sight” while exposed. Entering Bluehour Arcade changed it to “Searching”; the wanted stars eventually cleared with 63 HP left. An earlier robbery-to-getaway route wrecked the compact and did not finish as planned. Driving and the five-star escape passed in separate routes. |
| 14.4 — Identity | Bought and wore the Canal Overcoat and Copper Tail; the save restored both at $76. Bought Sea Glass paint at Prism Motorworks and verified the color persisted after Continue, with $97 remaining. When a patrol had the player in sight at Velvet Loom, the purchase was denied while the HUD stayed at two stars and cash stayed at $226. Recognition stacking and preservation of five stars are tested at system level; quantitative reacquisition distance was not measured in the browser. |
| 14.5 — World and art | Climbed two fire escapes, picked up a pistol on the upper roof, leaped an adjacent rooftop gap, and used both Bluehour Arcade exits. Captures show the character, roof and street routes, and the wanted HUD outside the canvas. Rooftop street-to-roof span is approximately 42% of the 540-unit frame; the lower passages add another playable route. The first short-window run scrolled at 568×280; after resizing the playfield and stacking the dock, Chrome measured a 280 px page and the whole dock above the fold. Art review was visual, not independent. |
| 14.6 — Technical | Continued after browser refresh with the purchased appearance, money, weapon and ammo. A malformed checkpoint offered New Game and started normally. No JavaScript exceptions or browser error log entries were recorded in the completed routes. No Safari, Firefox, touch, controller or independent human test was run. |

## Frame pacing

Sampled 120 consecutive animation-frame intervals in each scene, on this headless Chrome machine:

| Scene | Mean interval | p95 interval | Intervals ≥34 ms |
| --- | ---: | ---: | ---: |
| Lantern Row at street level | 16.67 ms | 16.7 ms | 0 |
| Active five-star pursuit at street level | 16.67 ms | 16.7 ms | 0 |

These are short observations, capped near 60 Hz on this environment. They are not CPU/GPU timings, a long-session soak, or a guarantee on other hardware. The renderer caches building facades, culls off-camera foreground and uses a fixed 960×540 logical canvas. Audio cues were generated in Chrome without console errors; sound mixing was not independently auditioned.

## Gameplay evidence

- [Lantern Row, fresh free roam](screenshots/v2-01-lantern-row.png)
- [Purchased outfit and hairstyle after Continue](screenshots/v2-02-custom-look.png)
- [Upper roof with pistol](screenshots/v2-03-rooftop-run.png)
- [Inside Bluehour Arcade](screenshots/v2-04-bluehour-arcade.png)
- [Five stars, cruisers and roadblock](screenshots/v2-05-maximum-response.png)
- [Search cleared inside Bluehour Arcade](screenshots/v2-06-search-cleared.png)
- [Repainted compact](screenshots/v2-07-motorworks.png)
- [Vesper Toll encounter](screenshots/v2-08-gang-encounter.png)
- [568×280 viewport](screenshots/v2-09-short-viewport.png)

# State of Crime: Crownwater

**Phase 1 — playable sandbox.** Walk the night market, cross the rooftops, or disappear beneath the road. You choose whether to rob a storefront, steal a ride, fight a crew, or spend your earnings. There is no mission to accept.

## Play

Install Node.js 22.12+ and run:

```sh
npm ci
npm run build
npm run preview -- --port 4176
```

Open [http://localhost:4176/](http://localhost:4176/) in a desktop browser. Use `npm run dev` for development and `npm test` for automated checks. The build uses relative asset paths: serve `dist/` on any static HTTP host. It has no server API, external assets or accounts. The existing Pages workflow deploys on pushes to `main`; V2 is developed separately on `devin/state-of-crime-v2`.

| Keys | On foot | Driving |
| --- | --- | --- |
| A / D or ← / → | Move (hold Shift to sprint) | Accelerate left/right |
| W / S or ↑ / ↓ | Climb a fire escape | Move one lane |
| Space | Jump | Brake |
| E | Interact, enter, pick up or steal | Exit at low speed; open Prism Motorworks when parked nearby |
| X | — | Exit at low speed, including at Prism |
| G | Rob a nearby pedestrian or shop | — |
| F / Q / R | Hold F to attack; hold Q to aim (W/S angles the shot); R reloads | — |
| 1–6 | Fists, pipe, pistol, shotgun, SMG, rifle (once acquired) | — |
| Esc | Pause/help; close a store | Same |

Start on Lantern Row. The first pipe is just to the right; fire escapes to the left lead to a pistol. Find lit turquoise doors for covered routes. Store signs mark the clothing shop, salon, arms dealer, pharmacy and motorworks. The HUD shows the block, interactions, health, cash, equipment and police response. Police search where they last saw or heard you. A different look or fresh paint helps after you break visual contact; it never clears stars immediately.

The browser auto-saves Crownwater progress in a V2 slot. **Continue** restores that slot; **New Game** asks before replacing an existing checkpoint. V1 cash and upgrades can be imported without overwriting the V1 slot. Use the menu for volume, mute and reduced motion.

- [Architecture](docs/TECHNICAL_ARCHITECTURE.md) · [District and gameplay systems](docs/SANDBOX_SYSTEMS.md)
- [Phase 1 playtest checklist](docs/TEST_PLAN.md) · [Executed checks and performance](docs/PLAYTEST_REPORT.md)
- [Known limitations and release scope](docs/RELEASE_NOTES.md) · [Gameplay screenshots](docs/screenshots/)
- [V1 campaign branch and documentation](https://github.com/Braventh/state-of-crime/tree/devin/state-of-crime-v1) (the numbered screenshots and older campaign design documents in this tree are V1 material)

Original procedural Canvas art and synthesized audio. No GTA assets or affiliation; State of Crime is an uncleared working title.

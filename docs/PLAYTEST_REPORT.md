# Playtest report

## Build and method

Played the Vite production preview in Chrome 156 using real browser keyboard and pointer events, visual inspection of captured game frames, and assertions on the visible HUD. Campaign checkpoints were earned through play, not seeded. The release run used a 1440×900 browser viewport; the settings pass also checked 720×530. No FPS, cross-engine results or independent human playtest are claimed.

## Results

| Area | Result |
| --- | --- |
| New Game, movement and First Light | Started fresh, sprinted to Mara, borrowed the Kite, escaped suspicion and delivered at Tidelane. HUD showed $420 and stored the completion. |
| Tail Lights | Started in the Sable loaner, observed level 2, outran the search eastbound, and checked in at Bluehour. HUD showed $840. |
| Dead Air | Collected the cartridge on foot, returned under pursuit, entered Bluehour refuge, waited for clear signal, then handed off. HUD showed $1,410. |
| Cut Across | Deliberately idled to lose and received a retry prompt, restarted and beat Roux in the Sable. HUD showed $2,040. |
| Last Transmission | Cleared all three sentries with Arc caster, jumped onto the orange crate, collected Beacon 06 and returned to Inez. HUD showed campaign complete and $2,890. |
| Sidecar, van and progression | Drove the van back from Breakwater, purchased an engine tune and Bayline Van, staged it, drove, changed lanes and braked. Continued after refresh with all five jobs complete, the van selected and $1,950 remaining. |
| Pause, settings and viewport | Paused, changed mute, volume and reduced motion, resumed, and confirmed settings stored separately. Resized to 720×530; the stage scaled to 689 px wide. |
| Wanted levels and corrupt checkpoint recovery | A malformed save disabled Continue and New Game recovered. Repeated entries into the borrowed Kite escalated the HUD from suspicion through maximum threat. At level 4, hid at Sidecar, watched the search countdown and left with a clear signal. |
| Save validators and pursuit simulation | Five automated tests passed: corrupt/incompatible saves, checkpoint round-trip, settings validation, safe spawn and four-level cap, and persistence of heat while exposed compared to a refuge. |
| Build | Production build passed; compiled asset references are relative and the preview returned HTTP 200. |

**What changed after testing:** The freight sentries were hard to aim at across platform heights, a miss could hit incidental civilians, and the HUD did not show which objective gate was blocking the pickup. Increased the Arc caster's vertical reach, cleared incidental foot traffic from the combat compound, displayed remaining sentries, and replayed the mission to completion with 72 HP left.

## Design review

- First five minutes: A short walk gets to the playable loop quickly; stealing the compact and choosing whether to hide give the delivery a second decision.
- Move and drive: Sprint, forgiving one-way platforms and immediate brake response are readable. Different speed and weight make the van feel materially different from the coupe. The long coast can feel sparse on foot.
- Pursuit: The search threshold makes successfully creating distance legible; hiding is a distinct escape option. Staying in the center lane is often optimal, and re-entering the same borrowed car counts as another theft.
- Variety and progression: Delivery, getaway, score, race and platform combat are different tasks. Buying a permanent tune after the first job gives cash an immediate purpose; the completed campaign does not offer a large repeatable economy.
- World and navigation: District silhouettes and the continuous road establish continuity without transition screens. The objective includes direction/distance and the map gives regional context; interiors or parallel routes would reward more deliberate exploration.
- Shareable hook: The neon-to-causeway drive and a pursuit escape make a short scenic clip.
- Three likely quit points: backtracking through an already familiar road; not finding an obvious first engagement distance at the freight yard; little authored content after campaign completion.

## Not covered

Safari/Firefox, touch and gamepads, sustained performance profiling, independent QA, long-session accessibility and qualitative audio review across devices. Some alternate tool/vehicle combinations and every possible damage/mission failure were not exhaustively tested.

## Captures

- [Title](screenshots/01-title.png)
- [Crownwater / First Light cleared](screenshots/02-crownwater.png)
- [Sunsplice Keys / Cut Across cleared](screenshots/03-sunsplice.png)
- [Breakwater Yard / Beacon 06](screenshots/04-breakwater.png)
- [Crownwater / maximum threat at a refuge](screenshots/05-maximum-threat.png)

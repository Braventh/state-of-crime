# Test plan

Use Node 22.12+, run `npm ci`, `npm test`, `npm run build` and `npm run preview -- --port 4173`. Test the generated production site on an HTTP origin. Use a separate browser profile or clear this game's two keys before a fresh run.

1. Verify title/New Game, help, pause/resume (including focus loss), settings changes and settings persistence.
2. Follow Mara's waypoint, accept First Light, enter the compact, drive and deliver. Confirm distance/direction, speed, reward and checkpoint.
3. For Tail Lights, confirm level-2 units pursue, drive out of the search area, and check in. In free roam, escalate by repeatedly borrowing cars or striking nearby NPCs; verify heat 1–4 and attacks at high heat.
4. For Dead Air, travel back to Signal Exchange, acquire the cartridge on foot, enter Bluehour refuge while wanted, wait and exit, then hand off. Compare search and refuge escape.
5. Start Cut Across, try waiting to fail, restart, avoid collisions as needed and win. Compare lane response and braking with the compact, coupe and van.
6. At Breakwater, accept Last Transmission; jump between platforms, use tools against sentries, retrieve the beacon from its crate, return and confirm campaign completion.
7. Purchase and select a van and upgrade at Sidecar; use restock and stage ride. Check cash, ownership, return after hard reload, and resume via Continue.
8. Make a corrupt checkpoint and reload; Continue should be disabled, settings preserved, and New Game recoverable. Unit tests cover format and validation.
9. Resize the frame and inspect HUD/menus, run with reduced motion, and check for console errors. Chrome desktop is the initial target; record other engines/device types only when exercised.

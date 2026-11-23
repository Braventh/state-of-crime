# Decisions

- Use Vite, TypeScript and native Canvas 2D. Phaser would offer a richer engine and Pixi a WebGL renderer, but a deterministic one-strip sim needs only a fixed ground surface, platforms and simple overlap, so no runtime framework or external assets.
- Use a progressive five-job contact chain with two ways to end a search; scripted arcades over realistic simulation.
- Persist safe checkpoint progress in localStorage separately from settings. Keep transient pursuit and active mission state out of saves.
- Retain **State of Crime** as a working title. Trademark, domain, game-title and storefront clearance has not been performed; do not treat the name as approved for public release.

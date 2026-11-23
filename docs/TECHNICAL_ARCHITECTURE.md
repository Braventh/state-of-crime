# Technical architecture

- `config.ts`: world strip, landmarks, platform collision surfaces, tunables, vehicle catalog and job data.
- `game.ts`: session simulation. The loop advances player/vehicle dynamics, NPCs, pursuit, mission state and deterministic location routing; particles are cosmetic.
- `input.ts`: held keys and single-frame edges, cleared on focus loss and mode changes.
- `art.ts`: original layered Canvas 2D world, sprites, signs and feedback at a fixed 960×540 logical resolution; visible entities selected by camera.
- `main.ts` / `style.css`: browser scene shell, pause and shop overlays, game status, responsive scaling.
- `audio.ts`: synthesized cues, engine/siren oscillators and original sequenced score; wakes after an interaction.
- `save.ts`: separate validated, versioned checkpoint and settings records in localStorage; invalid checkpoint disables Continue, and storage exceptions do not interrupt play.
- Vite emits relative links for static HTTP hosting. GitHub Pages workflow verifies tests/builds on main and publishes the build when Pages is enabled with GitHub Actions.

Pause and focus loss suspend simulation. Delta is clamped to 34 ms to avoid tunneling on large frame gaps. New Game, mission success and garage purchases/service are safe save points. In-progress jobs, immediate heat, active car position and damage do not persist.

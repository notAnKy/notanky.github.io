# Mohamed Ali Jemmali — Build World

An explorable 3D portfolio set on a colorful coastal island. Drive a custom expedition rover through seven districts of software projects, computer vision, games, career history, experiments, and contact information. An editorial HTML portfolio is available from the opening screen and throughout the experience.

## Edition 02 — Coastal campus

- Animated turquoise sea, distant islands, soft cloud sky, palms, flowering gardens, birds, and a drifting airship.
- Seven architectural identities: an ivory welcome arch, turquoise data campus, mint observatory, coral arcade, terracotta archive, lavender greenhouse, and a yellow lighthouse.
- Pearl-and-coral rover with rounded bodywork, detailed tires, steering wheels, roof equipment, and suspension movement.
- Local HDR lighting, physical materials, soft shadows, antialiasing, and restrained bloom on High quality.
- Redesigned arrival screen, compact driving instruments, project galleries, and a complete accessible portfolio.
- Map travel buttons take visitors directly to each district. Floating signs face the camera; mounted signs have readable front and rear faces.

## Stack

Vite, TypeScript, Three.js, HTML and CSS. The site is entirely static. There is no production server, account, API key, or runtime environment variable.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm run preview
```

The production build is written to `dist/`. Vite uses `base: '/'` for the root user-site URL `https://notAnKy.github.io/`.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Drive / steer | WASD or arrow keys | Direction buttons |
| Brake | Space | Brake button |
| Boost | Shift | Boost button |
| Interact | E | E button or on-screen prompt |
| Map | M | Map button |
| Visit a district | Select a destination in the map | Tap a destination in the map |
| Reset rover | R | Quick View for progress reset |

The rover uses arcade acceleration, reverse, friction, speed-dependent steering, and obstacle boundaries. When stuck, press R. The follow camera widens gently while boosting. The world remains open after reaching the Signal Tower.

## Live project sites

Project panels and Quick View link to both the live site and source code when a public deployment is available:

| Project | Live site |
| --- | --- |
| HardwareProbe | [hardwareprobe.vercel.app](https://hardwareprobe.vercel.app/) |
| FNHub | [fortnitehub.vercel.app](https://fortnitehub.vercel.app/) |
| Game Library | [game-library-cyan-ten.vercel.app](https://game-library-cyan-ten.vercel.app/) |
| Nova | [nova-seven-bice.vercel.app](https://nova-seven-bice.vercel.app/) |
| Riftbound Survivors | [riftbound-web-iota.vercel.app](https://riftbound-web-iota.vercel.app/) |
| Is It Vibe Coded? | [isitvibecoded-theta.vercel.app](https://isitvibecoded-theta.vercel.app/) |

Clip and Tunisian Plate Recognition currently have no verified public demo URL, so their cards show the available source or project details. Project files include a screenshot gallery when verified images are available. Quick View offers the same gallery through each project's **View Project** button.

## Accessibility and saved state

Quick View is a keyboard-navigable HTML version of the complete portfolio: introduction, projects, experience, education, skills, and contact. It is also shown if WebGL initialization fails. UI dialogs are keyboard accessible, and the experience responds to `prefers-reduced-motion`.

Visited districts, discovered project files, five build tokens, graphics mode, and sound preference are saved locally in `localStorage`. Sound begins muted. Quick View includes a reset progress button. Graphics can be set to Auto, Low, Medium, or High; Auto selects a lower render resolution on coarse-pointer or lower-core devices.

## Architecture

- `src/data/content.ts` — all portfolio content, links, district coordinates, timeline, and experiment names.
- `src/world/` — original procedural geometry, road network, signs, structures, scanner, and tokens.
- `src/vehicle/Rover.ts` — rover geometry and arcade driving.
- `src/core/Game.ts` — scene, render loop, camera, quality, discovery, interactions.
- `src/core/Input.ts`, `src/core/Save.ts` — keyboard/touch input and local state.
- `src/ui/UI.ts`, `src/style.css` — boot sequence, HUD, map, project panels, terminal, accessible view.
- `src/audio/Audio.ts` — opt-in synthesized engine and interaction sounds.

## GitHub Pages deployment

Create the repository `notAnKy/notAnKy.github.io`, push this project to `main`, then select **GitHub Actions** as the Pages build and deployment source under repository **Settings → Pages**. `.github/workflows/deploy.yml` runs `npm ci`, typechecks and builds via `npm run build`, uploads `dist`, and deploys it after each push to `main`.

## Assets and performance

The buildings, rover, vegetation, sky, ocean, signage, and effects are original procedural geometry, shaders, or canvas textures generated locally at runtime. The scene uses free Three.js addons for rounded geometry, material batching, image-based lighting, and bloom.

Reflections use the locally bundled 1K [Kloppenheim 06 (Pure Sky)](https://polyhaven.com/a/kloppenheim_06_puresky) HDRI by Greg Zaal and Jarod Guest from Poly Haven, licensed CC0. Source and license information are recorded in `public/licenses/poly-haven-environment.txt`. A procedural lighting fallback is used if that asset cannot load.

Project screenshots in `public/project-shots/` come from the owner's public GitHub repositories; Nova's public sign-in image was captured from its live site because its repository does not contain a product screenshot. All assets are local, so the portfolio makes no runtime requests to an asset provider. Rajdhani and DM Mono are bundled by `@fontsource` under the SIL Open Font License 1.1; their license texts ship in `public/licenses/`.

Repeated architecture, plants, tire treads, and trim are batched or instanced. High quality adds multisample antialiasing, bloom, and 4096-pixel soft shadows. Medium uses 2048-pixel shadows; Low skips shadows and postprocessing. Render resolution is capped per quality level. Animation pauses when the tab is hidden, and reduced-motion preferences freeze environmental movement. Audio is synthesized with Web Audio only after opt-in.

Project descriptions and career details come from the supplied brief. Public repository and deployment links were checked against [Mohamed's GitHub profile](https://github.com/notAnKy) and the public Vercel sites. The former portfolio URL is linked as supplied. No email address or resume link was added because neither was verified.

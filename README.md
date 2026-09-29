# Mohamed Ali Jemmali — Build World

An explorable 3D portfolio built as a compact driving world. Seven connected districts present software projects, computer vision, game development, a physical career timeline, experiments, and contact information. A complete HTML Quick View is available from the opening screen and throughout the experience.

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

All 3D assets, signage, and effects are original procedural geometry or canvas textures generated locally at runtime. The districts use distinct structures, ground patterns, colored light fields, roadside sculptures, animated details, and in-world preview screens built with free Three.js features. Project screenshots in `public/project-shots/` come from the owner's public GitHub repositories; Nova's public sign-in image was captured from its live site because its repository does not contain a product screenshot. The images are local assets, so the portfolio does not depend on GitHub at runtime. Rajdhani and DM Mono are bundled by `@fontsource` under the SIL Open Font License 1.1; their license texts ship in `public/licenses/`. The renderer uses antialiasing, supersampling, tone mapping, texture filtering, and quality-dependent soft shadows. Animation pauses when the tab is hidden. Audio is synthesized with Web Audio only after opt-in.

Project descriptions and career details come from the supplied brief. Public repository and deployment links were checked against [Mohamed's GitHub profile](https://github.com/notAnKy) and the public Vercel sites. The former portfolio URL is linked as supplied. No email address or resume link was added because neither was verified.

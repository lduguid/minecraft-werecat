# The Werecat

A short, Minecraft-style animated story that runs in your web browser.

A lone villager wanders too far from his village and gets caught out on the grassy plains after dark. The usual night mobs creep out, but under this full moon they are strangely quiet. Then a terrible sound rolls across the plains: half howl, half meow. It is the **werecat**, a villager who changed after a feral cat scratched him. The lost villager knows that sound, and he runs for home.

The whole film is about 100 seconds long. Everything you see and hear is generated in code: there are no image or audio files.

## Watch it

1. Download or clone this repository.
2. Open `index.html` in a browser with WebGL and Web Audio, such as current Chrome, Edge, or Firefox.
3. Turn your sound on and click **Play**. Browsers only allow audio after a click.

You need an internet connection, because Three.js and the fonts load from public CDNs.

If your browser refuses to run the page straight from disk, serve the folder locally and open `http://localhost:8000`:

```bash
py -m http.server 8000        # Windows
python3 -m http.server 8000   # macOS / Linux
```

### Controls

| Key | Action |
| --- | --- |
| Space | Pause / resume |
| M | Mute / unmute |
| R | Restart |

The same actions are available as buttons in the top-right corner while the story plays.

## The story

1. **Sunset.** A farmer villager in a straw hat gathers flowers, far from home.
2. **Nightfall.** The sun slips away. His village is just a few tiny lights on the horizon.
3. **The mobs.** Zombies, skeletons, spiders, a creeper and an enderman appear, but they just stand and stare at the full moon.
4. **Silence.** The crickets stop singing.
5. **The howl.** On a hilltop, silhouetted against the moon, the werecat throws back its head: *MRRRAAAOOOOWWWW!*
6. **Fear.** Even the monsters back away, and the enderman teleports out.
7. **Flashback** (in sepia). One full moon ago, a feral cat scratched a villager at the edge of the village. When the next full moon rose, he changed.
8. **Run!** The villager drops his flower and runs for home with glowing eyes gaining behind him...

*To be continued.*

## Meet the werecat

The werecat is still recognisably a villager: a tall villager head with the unibrow, and a shredded green robe. Now it also has cat ears, glowing slit-pupil eyes, fangs, whiskers, claws and a swishing tail. It crouches, howls, stalks, and gallops on all fours when it hunts.

## How it's made

- **No build step.** Plain JavaScript files loaded with script tags, plus [Three.js](https://threejs.org/) r158 from jsDelivr (with an unpkg fallback).
- **Procedural pixel art.** Every block, plant, mob skin, the sun and the square full moon are painted onto tiny 16x16 canvases at startup.
- **Voxel world.** Terrain, a terraced hill, oak trees and a small village with houses, a farm, torches and lit windows. The mesher only emits visible block faces and bakes Minecraft-style smooth-lighting ambient occlusion into vertex colours.
- **Blocky characters.** Every mob is built from textured boxes with pivots for heads, arms, legs and tails, and animated in code.
- **Synthesized sound.** All audio is generated live with the Web Audio API, including wind, crickets, gentle piano, a dread drone, mob noises, footsteps, a heartbeat and the werecat's howl. The howl layers distorted voices that glide through "mrrr - AAOOO - wwww" formants, with a trill, vibrato, a growl underneath and a long reverb.
- **Cinematography.** A scripted timeline drives camera moves, captions, letterbox bars, screen shake, flashes and the sepia flashback.

## Project layout

| File | What it does |
| --- | --- |
| `index.html` | Page structure, overlays and script load order |
| `css/style.css` | Title screen, captions, letterbox bars, flashback filter |
| `js/util.js` | Seeded random numbers, noise, easing, moon and sun directions |
| `js/textures.js` | Procedural pixel-art textures and the block texture atlas |
| `js/mesher.js` | Block definitions, voxel mesher with ambient occlusion, plant sprites |
| `js/world.js` | Terrain, the werecat's hill, the village, trees, torches and lights |
| `js/sky.js` | Sky gradient, stars, sun, moon, clouds, sunset-to-night lighting and fog |
| `js/actor.js` | Textured-box builder and the shared `Actor` class (movement, head tracking, damage flash) |
| `js/mobs.js` | Villager, zombie, skeleton, creeper, enderman |
| `js/creatures.js` | Spider, feral cat and the werecat |
| `js/fx.js` | Particles, camera shake, captions, flash, fade and flashback overlays |
| `js/audio.js` | All synthesized music, ambience and sound effects |
| `js/story.js` | The story timeline: shots, captions and cues |
| `js/main.js` | Renderer setup, title screen, controls and the main loop |

## Tweaking it

- **Story, captions and timing.** Edit the `beats` array in `js/story.js`. Each beat has a start time (`at`), an `enter()` setup, timed `cues`, and a `tick()` that places the camera.
- **The howl.** Adjust `howl()` in `js/audio.js`. It takes `dist` (0 = right next to you, 1 = far away), `dur` and `pitch`.
- **The world.** The villager's starting spot, the village and the flashback location are constants at the top of `js/world.js`. The hill is built wherever `WC.MOON_DIR` in `js/util.js` points, so the moon always rises behind it.
- **Jump to a moment.** Add `?t=45` to the URL to start 45 seconds in, or `?t=45&pause=1` to freeze there. This is handy when adjusting a shot.

## Credits

- Rendering by [Three.js](https://threejs.org/) (MIT licence).
- Fonts: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) and [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) from Google Fonts.
- Inspired by Minecraft. All textures, models and sounds here are original recreations generated in code, and no game assets are used.

NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

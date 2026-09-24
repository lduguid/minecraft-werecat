# The Werecat

Two short, Minecraft-style animated stories that run in your web browser. Both are set in the same blocky world with the same villager.

- **Grandpa's House** (`halloween.html`) is a spooky Halloween prequel. A villager visits his grandpa's cottage at the edge of a dark forest and finds it deserted, apart from a lot of cats.
- **The Werecat** (`index.html`) follows on from it. Caught far from home under a full moon, the villager hears a terrible sound, half howl and half meow, and runs for home.

Each film is about a minute and a half long. Everything you see and hear is generated in code: there are no image or audio files.

## Watch it

1. Download or clone this repository.
2. Open `halloween.html` to watch **Grandpa's House** first, then `index.html` for **The Werecat**. The end screen of Grandpa's House links straight to The Werecat. Use a browser with WebGL and Web Audio, such as current Chrome, Edge, or Firefox.
3. Turn your sound on and click **Play**. Browsers only allow audio after a click.

You need an internet connection, because Three.js and the fonts load from public CDNs.

If your browser refuses to run the pages straight from disk, serve the folder locally and open `http://localhost:8000`:

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

The same actions are available as buttons in the top-right corner while a story plays.

## Grandpa's House (the Halloween prequel)

1. **Halloween.** On a gloomy afternoon, the villager sets off from his village to visit his grandpa.
2. **The walk.** The path leads past the flower meadow, towards a cottage at the edge of the dark forest.
3. **Pumpkins.** Jack-o'-lanterns grin from the fence posts, but something isn't right.
4. **Cats.** Instead of Grandpa there are cats, lots of them, with glowing eyes.
5. **The door.** It has been splintered and raked with deep claw marks. A scrap of Grandpa's old green robe is caught on the splinters.
6. **"Grandpa...?"** Something bursts out of the dark doorway.
7. **Watched.** Glowing eyes stare out from between the trees, but when he looks, nothing is there.
8. **The witch.** A witch on a broomstick crosses the moon above the forest, cackling, and bats scatter.
9. **Home.** Scared and worried, he hurries back towards the village as the cats watch him go.
10. **Distracted.** The flower meadow is so pretty in the golden light that he forgets the time. Tonight, there will be a full moon...

The last shot matches the opening of The Werecat, so the two films play as one continuous story.

New characters: black cats that scurry, sit and hiss; a green-skinned witch in a floppy hat riding a broom; bats; and a pair of eyes in the forest.

## The Werecat

1. **Sunset.** A farmer villager in a straw hat gathers flowers, far from home.
2. **Nightfall.** The sun slips away. His village is just a few tiny lights on the horizon.
3. **The mobs.** Zombies, skeletons, spiders, a creeper and an enderman appear, but they just stand and stare at the full moon.
4. **Silence.** The crickets stop singing.
5. **The howl.** On a hilltop, silhouetted against the moon, the werecat throws back its head: *MRRRAAAOOOOWWWW!*
6. **Fear.** Even the monsters back away, and the enderman teleports out.
7. **Flashback** (in sepia). One full moon ago, a feral cat scratched a villager. When the next full moon rose, he changed.
8. **Run!** The villager drops his flower and runs for home with glowing eyes gaining behind him...

*To be continued.*

### Meet the werecat

The werecat is still recognisably a villager: a tall villager head with the unibrow, and a shredded green robe. Now it also has cat ears, glowing slit-pupil eyes, fangs, whiskers, claws and a swishing tail. It crouches, howls, stalks, and gallops on all fours when it hunts.

## How it's made

- **No build step.** Plain JavaScript files loaded with script tags, plus [Three.js](https://threejs.org/) r158 from jsDelivr (with an unpkg fallback).
- **Procedural pixel art.** Every block, plant, mob skin, pumpkin face, the sun and the square full moon are painted onto tiny 16x16 canvases at startup.
- **Voxel world.** Terrain, a terraced hill, oak trees and a small village with houses, a farm, torches and lit windows. Grandpa's House extends the same world south with a path, a cottage and a dark forest of dark oak, spruce and dead trees. The mesher only emits visible block faces and bakes Minecraft-style smooth-lighting ambient occlusion into vertex colours. The prequel also darkens the ground under the forest canopy and inside the cottage.
- **Blocky characters.** Every mob is built from textured boxes with pivots for heads, arms, legs, tails, wings and hats, and animated in code.
- **Synthesized sound.** All audio is generated live with the Web Audio API, including wind, crickets, gentle piano, a dread drone, mob noises, footsteps, a heartbeat and the werecat's howl. The howl layers distorted voices that glide through "mrrr - AAOOO - wwww" formants, with a trill, vibrato, a growl underneath and a long reverb. The prequel adds a howling wind, a creepy music-box lullaby, a witch's cackle, a creaking door, owls, bats, eerie meows, a growl and thunder.
- **Cinematography.** A scripted timeline drives camera moves, captions, letterbox bars, screen shake, flashes, fades and the sepia flashback. In the prequel, a "mood" controller moves the sky, fog and light from grey-purple Halloween gloom to the golden sunset where The Werecat begins.
- **Shared engine.** Both stories use the same core files. The prequel only adds optional hooks to them, so The Werecat plays exactly as it did before the prequel existed.

## Project layout

| File | What it does |
| --- | --- |
| `index.html` | The Werecat: page structure, overlays and script load order |
| `halloween.html` | Grandpa's House: page structure, overlays and script load order |
| `css/style.css` | Title screen, captions, letterbox bars, flashback filter |
| `css/halloween.css` | Orange and purple Halloween styling for Grandpa's House |
| `js/util.js` | Seeded random numbers, noise, easing, moon and sun directions |
| `js/textures.js` | Procedural pixel-art textures and the block texture atlas |
| `js/mesher.js` | Block definitions, voxel mesher with ambient occlusion and optional canopy and roof shading, plant sprites |
| `js/world.js` | Terrain, the werecat's hill, the village, trees, torches and lights, with hooks for extending the world |
| `js/sky.js` | Sky gradient, stars, sun, moon, clouds, sunset-to-night lighting and fog |
| `js/actor.js` | Textured-box builder and the shared `Actor` class (movement, head tracking, damage flash) |
| `js/mobs.js` | Villager, zombie, skeleton, creeper, enderman |
| `js/creatures.js` | Spider, cats (with colour options and a sitting pose) and the werecat |
| `js/fx.js` | Particles (including autumn leaves and witch sparkles), camera shake, captions, flash, fade and flashback overlays |
| `js/audio.js` | Synthesized music, ambience and sound effects, plus the low-level synth helpers |
| `js/story.js` | The Werecat's timeline: shots, captions and cues |
| `js/main.js` | The Werecat's renderer setup, title screen, controls and main loop |
| `js/halloween/world.js` | The path, Grandpa's cottage, the pumpkin patch, the fence and the dark forest |
| `js/halloween/props.js` | Jack-o'-lanterns, the clawed door, the fence, the witch on her broom, bats and the eyes in the forest |
| `js/halloween/audio.js` | The prequel's spooky sounds and music box |
| `js/halloween/atmosphere.js` | The gloom-to-sunset mood controller for sky, fog and light |
| `js/halloween/story.js` | Grandpa's House timeline: shots, captions and cues |
| `js/halloween/main.js` | Grandpa's House renderer setup, cast, title screen, controls and main loop |

## Tweaking it

- **Story, captions and timing.** Edit the `beats` array in `js/story.js` (The Werecat) or `js/halloween/story.js` (Grandpa's House). Each beat has a start time (`at`), an `enter()` setup, timed `cues`, and a `tick()` that places the camera. In the prequel, each beat also has a `mood` range from 0 (gloom) to 1 (sunset).
- **The howl.** Adjust `howl()` in `js/audio.js`. It takes `dist` (0 = right next to you, 1 = far away), `dur` and `pitch`.
- **The witch's cackle.** Adjust `cackle()` in `js/halloween/audio.js`.
- **The world.** The villager's starting spot, the village and the flashback location are constants at the top of `js/world.js`. The hill is built wherever `WC.MOON_DIR` in `js/util.js` points, so the moon always rises behind it. Grandpa's cottage, path and forest edge are constants at the top of `js/halloween/world.js`.
- **Jump to a moment.** On either page, add `?t=45` to the URL to start 45 seconds in, or `?t=45&pause=1` to freeze there. This is handy when adjusting a shot.

## Credits

- Rendering by [Three.js](https://threejs.org/) (MIT licence).
- Fonts: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) and [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) from Google Fonts.
- Inspired by Minecraft. All textures, models and sounds here are original recreations generated in code, and no game assets are used.

NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

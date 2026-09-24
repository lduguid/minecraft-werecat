# The Werecat

A trilogy of short, Minecraft-style animated stories that run in your web browser. All three are set in the same blocky world and follow the same young villager, Alex. They are listed here in the recommended watching order.

1. **The Werecat** (`index.html`). Caught far from home under a full moon, Alex hears a terrible sound, half howl and half meow, and runs for home.
2. **Grandpa's House** (`halloween.html`) is a spooky Halloween prequel, set earlier that same day. Alex visits his grandpa's cottage at the edge of a dark forest and finds it deserted, apart from a lot of cats.
3. **The Last Full Moon** (`finale.html`) ends the story. He makes it back to the village, but the house he hides in holds a secret of its own.

Each film is about one and a half to two minutes long. Everything you see and hear is generated in code: there are no image or audio files.

## Watch it

1. Download or clone this repository.
2. Open `index.html` and start with **The Werecat**. Each end screen links to the next film, and every title and end screen lists all three. Use a browser with WebGL and Web Audio, such as current Chrome, Edge, or Firefox.
   - Watching The Werecat first keeps its mystery intact. Seeing Grandpa's House second lets you spot the clues, and it introduces the witch just before the finale.
   - The films also work in story order: Grandpa's House, then The Werecat, then The Last Full Moon.
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

## The Werecat

1. **Sunset.** Alex, a young villager in a straw hat, gathers flowers far from home.
2. **Nightfall.** The sun slips away. His village is just a few tiny lights on the horizon.
3. **The mobs.** Zombies, skeletons, spiders, a creeper and an enderman appear, but they just stand and stare at the full moon.
4. **Silence.** The crickets stop singing.
5. **The howl.** On a hilltop, silhouetted against the moon, the werecat throws back its head: *MRRRAAAOOOOWWWW!*
6. **Fear.** Even the monsters back away, and the enderman teleports out.
7. **Flashback** (in sepia). One full moon ago, a feral cat scratched a villager. When the next full moon rose, he changed.
8. **Run!** Alex drops his flower and runs for home with glowing eyes gaining behind him...

*To be continued.*

### Meet the werecat

The werecat is still recognisably a villager: a tall villager head with the unibrow, and a shredded green robe. Now it also has cat ears, glowing slit-pupil eyes, fangs, whiskers, claws and a swishing tail. It crouches, howls, stalks, and gallops on all fours when it hunts.

## Grandpa's House (the Halloween prequel)

1. **Halloween.** On a gloomy afternoon, Alex sets off from his village to visit his grandpa.
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

## The Last Full Moon (the finale)

1. **Long ago** (in sepia). A witch flies across the moon and lets a bottle fall into the dark forest. It smashes, green smoke rises, and a grey tabby walks out of it. As it comes closer the curse takes hold: its fur darkens, its eyes narrow into glowing slits, its fur bristles, and it hisses at the camera.
2. **The escape.** Alex reaches the village with the werecat right behind him, dives into the nearest house and slams the door. Claws rake it from outside, then everything goes quiet.
3. **The poppy.** Peeking out, he sees the werecat in the torchlight. It lays his lost poppy on the doorstep, then walks away into the dark with a sad, low howl.
4. **The lair.** The house glows green. There is a bubbling cauldron, a shelf of potions with one bottle missing, a map of the forest with Grandpa's cottage circled in red, and a pointed hat he has seen once before. He pockets a golden apple.
5. **She's home.** The kind village cleric comes in with her black cat and takes the hat from its hook. Her face changes. She was the witch all along, and tonight she means to pour a new potion over the whole village.
6. **The rescue.** Her cat sniffs him out, but the werecat bursts through the door and stands between them. Her weakness potion brings it down. This time, Alex doesn't run: he throws one of her own potions back at her.
7. **Dawn.** As the sun rises, he offers the weakened werecat the golden apple. Gold light swirls, there is a flash, and the curse is broken.
8. **Morning.** He walks back to Grandpa's cottage. The jack-o'-lanterns have burnt out, the cats are dozing in the sun, and the clawed door has been patched with fresh planks. Grandpa is napping on his porch with a bandaged arm. He says he had a very long night.

New characters: the witch on foot in her cleric's hood, her black cat, a grandpa, and one small black cat in a very small hat who is not happy about it.

## How it's made

- **No build step.** Plain JavaScript files loaded with script tags, plus [Three.js](https://threejs.org/) r158 from jsDelivr (with an unpkg fallback).
- **Procedural pixel art.** Every block, plant, mob skin, pumpkin face, potion, map, the sun and the square full moon are painted onto tiny canvases at startup.
- **Voxel world.** Terrain, a terraced hill, oak trees and a small village with houses, a farm, torches and lit windows. Grandpa's House extends the same world south with a path, a cottage and a dark forest of dark oak, spruce and dead trees. The finale reuses that whole world and turns one village house into the witch's lair. The mesher only emits visible block faces and bakes Minecraft-style smooth-lighting ambient occlusion into vertex colours. The later films also darken the ground under the forest canopy and inside buildings.
- **Blocky characters.** Every mob is built from textured boxes with pivots for heads, arms, legs, tails, wings and hats, and animated in code. Alex is a Minecraft-style baby villager: half-size, with a big head and quick little steps, and he hops up one-block steps instead of walking into them.
- **Synthesized sound.** All audio is generated live with the Web Audio API, including wind, crickets, gentle piano, a dread drone, mob noises, footsteps, a heartbeat and the werecat's howl. The howl layers distorted voices that glide through "mrrr - AAOOO - wwww" formants, with a trill, vibrato, a growl underneath and a long reverb. The prequel adds a howling wind, a creepy music-box lullaby, a witch's cackle, a creaking door, owls, bats, eerie meows, a growl and thunder. The finale adds a bubbling cauldron, smashing glass, a door slam, claw scrapes, a potion fizz, an apple crunch, the shimmer of the cure and morning birdsong.
- **Cinematography.** A scripted timeline drives camera moves, captions, letterbox bars, screen shake, flashes, fades and the sepia flashbacks. In the prequel, a "mood" controller moves the sky, fog and light from grey-purple Halloween gloom to the golden sunset where The Werecat begins. In the finale, a daybreak controller takes the sky from The Werecat's full-moon night through a pink dawn to a bright morning, and dims the light indoors so the cauldron's green glow fills the lair.
- **Shared engine.** All three stories use the same core files, and each later story only adds optional hooks to them.

## Project layout

| File | What it does |
| --- | --- |
| `index.html` | The Werecat: page structure, overlays and script load order |
| `halloween.html` | Grandpa's House: page structure, overlays and script load order |
| `finale.html` | The Last Full Moon: page structure, overlays and script load order |
| `css/style.css` | Title and end screens, the watch-order links, captions, letterbox bars, flashback filter |
| `css/halloween.css` | Orange and purple Halloween styling for Grandpa's House |
| `css/finale.css` | Moonlit silver and gold styling for The Last Full Moon |
| `js/util.js` | Seeded random numbers, noise, easing, moon and sun directions |
| `js/textures.js` | Procedural pixel-art textures and the block texture atlas |
| `js/mesher.js` | Block definitions, voxel mesher with ambient occlusion and optional canopy and roof shading, plant sprites |
| `js/world.js` | Terrain, the werecat's hill, the village, trees, torches and lights, with hooks for extending the world |
| `js/sky.js` | Sky gradient, stars, sun, moon, clouds, sunset-to-night lighting and fog |
| `js/actor.js` | Textured-box builder and the shared `Actor` class (movement, hopping up steps, head tracking, damage flash) |
| `js/mobs.js` | Villager (including a child version and a sitting pose), zombie, skeleton, creeper, enderman |
| `js/creatures.js` | Spider, cats (with colour options, a sitting pose and fading eye glow) and the werecat |
| `js/fx.js` | Particles (including autumn leaves, witch sparkles, curse smoke, gold sparkles and splinters), camera shake, captions, flash, fade and flashback overlays |
| `js/audio.js` | Synthesized music, ambience and sound effects, plus the low-level synth helpers |
| `js/story.js` | The Werecat's timeline: shots, captions and cues |
| `js/main.js` | The Werecat's renderer setup, title screen, controls and main loop |
| `js/halloween/world.js` | The path, Grandpa's cottage, the pumpkin patch, the fence and the dark forest |
| `js/halloween/props.js` | Jack-o'-lanterns, the clawed door, the fence, the witch (on her broom or on foot in disguise), bats and the eyes in the forest |
| `js/halloween/audio.js` | The prequel's spooky sounds and music box |
| `js/halloween/atmosphere.js` | The gloom-to-sunset mood controller for sky, fog and light |
| `js/halloween/story.js` | Grandpa's House timeline: shots, captions and cues |
| `js/halloween/main.js` | Grandpa's House renderer setup, cast, title screen, controls and main loop |
| `js/finale/world.js` | The prequel's world with the witch's lair opened up |
| `js/finale/props.js` | Cauldron, potion bottles and shelf, the map, the hat, broom, table, golden apple, bench, poppy, the lair door and Grandpa's bandage |
| `js/finale/audio.js` | The finale's sound effects and birdsong |
| `js/finale/daybreak.js` | The night-to-dawn-to-morning sky controller |
| `js/finale/story.js` | The Last Full Moon timeline: shots, captions and cues |
| `js/finale/main.js` | The finale's renderer setup, cast, title screen, controls and main loop |

## Tweaking it

- **Story, captions and timing.** Edit the `beats` array in `js/story.js` (The Werecat), `js/halloween/story.js` (Grandpa's House) or `js/finale/story.js` (The Last Full Moon). Each beat has a start time (`at`), an `enter()` setup, timed `cues`, and a `tick()` that places the camera. In the prequel, each beat also has a `mood` range from 0 (gloom) to 1 (sunset). In the finale, the `k` range runs from 0 (night) through 0.5 (dawn) to 1 (morning).
- **The howl.** Adjust `howl()` in `js/audio.js`. It takes `dist` (0 = right next to you, 1 = far away), `dur` and `pitch`.
- **The witch's cackle.** Adjust `cackle()` in `js/halloween/audio.js`.
- **The world.** Alex's starting spot, the village and the flashback location are constants at the top of `js/world.js`. The hill is built wherever `WC.MOON_DIR` in `js/util.js` points, so the moon always rises behind it. Grandpa's cottage, path and forest edge are constants at the top of `js/halloween/world.js`. The lair's furniture is placed in `js/finale/main.js`.
- **Jump to a moment.** On any page, add `?t=45` to the URL to start 45 seconds in, or `?t=45&pause=1` to freeze there. This is handy when adjusting a shot.

## Credits

- Rendering by [Three.js](https://threejs.org/) (MIT licence).
- Fonts: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) and [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) from Google Fonts.
- Inspired by Minecraft. All textures, models and sounds here are original recreations generated in code, and no game assets are used.

NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

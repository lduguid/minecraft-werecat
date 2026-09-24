window.WC = window.WC || {};

(function () {
  const FW = (WC.Finale = WC.Finale || {});

  // The witch's lair is the village house just west of the main path, with its door on the east wall.
  // Interior: x -13..-10, z -58..-54, floor surface at y 13, ceiling at y 16.
  const LAIR = { door: { x: -10, z: -56 }, floor: 13 };
  const FLOWERS = new Set(['poppy', 'dandelion', 'cornflower']);

  FW.buildWorld = function (scene) {
    const world = WC.Halloween.buildWorld(scene, {
      decorate(t) {
        const { grid, B } = t;
        grid.set(LAIR.door.x, LAIR.floor, LAIR.door.z, B.AIR);
        grid.set(LAIR.door.x, LAIR.floor + 1, LAIR.door.z, B.AIR);
      },
      // Bare ground outside the lair door, and no other flowers in view of it,
      // so the poppy the werecat leaves there is the only one on screen.
      // Also a clear view at dawn of Alex feeding the werecat.
      keepPlant: (p) => {
        if (p.x >= -9 && p.x <= -6 && p.z >= -56 && p.z <= -54) return false;
        if (p.x >= -9 && p.x <= -6 && p.z >= -49 && p.z <= -46) return false;
        return !(FLOWERS.has(p.tile) && p.x >= -9 && p.x <= -1 && p.z >= -60 && p.z <= -51);
      },
    });
    world.fw = { LAIR };
    return world;
  };
})();

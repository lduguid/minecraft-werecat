window.WC = window.WC || {};

(function () {
  const FW = (WC.Finale = WC.Finale || {});

  // The witch's lair is the village house just west of the main path, with its door on the east wall.
  // Interior: x -13..-10, z -58..-54, floor surface at y 13, ceiling at y 16.
  const LAIR = { door: { x: -10, z: -56 }, floor: 13 };

  FW.buildWorld = function (scene) {
    const world = WC.Halloween.buildWorld(scene, {
      decorate(t) {
        const { grid, B } = t;
        grid.set(LAIR.door.x, LAIR.floor, LAIR.door.z, B.AIR);
        grid.set(LAIR.door.x, LAIR.floor + 1, LAIR.door.z, B.AIR);
      },
    });
    world.fw = { LAIR };
    return world;
  };
})();

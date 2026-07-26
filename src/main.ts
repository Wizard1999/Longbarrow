import type { EntityId } from './core/types';
import type * as THREE from 'three';
import { createLoop } from './core/loop';
import { createWorld, simStep } from './sim/world';
import { buildTestMap } from './sim/map';
import { cmdCancelSite, cmdSetSelection } from './sim/commands';
import { createRenderer } from './render/renderer';
import { buildTerrainMesh } from './render/terrainMesh';
import { buildSceneryViews } from './render/sceneryViews';
import { buildNodeViews, syncNodeViews } from './render/nodeViews';
import { syncBuildingViews } from './render/buildingViews';
import { syncUnitViews } from './render/unitViews';
import { syncSiteViews } from './render/siteViews';
import { createCamera } from './render/camera';
import { createPlacementGhost } from './render/placementGhost';
import { createPicker, createUiState } from './input/selection';
import { createKeyboard } from './input/keyboard';
import { createMouse } from './input/mouse';
import { createHud } from './ui/hud';

const world = buildTestMap(createWorld(1337));

const { scene, renderer } = createRenderer();
const terrainMesh = buildTerrainMesh(scene);
buildSceneryViews(scene, world);

const views = {
  units: new Map<EntityId, THREE.Group>(),
  buildings: new Map<EntityId, THREE.Group>(),
  sites: new Map<EntityId, THREE.Group>(),
  nodes: buildNodeViews(scene, world),
};

const cam = createCamera();
const ghost = createPlacementGhost(scene);
const ui = createUiState();
const picker = createPicker(cam.camera, terrainMesh, views);
const hud = createHud(world, ui);

createMouse({ world, domElement: renderer.domElement, cam, picker, ghost, ui, flash: hud.flash });

const keyboard = createKeyboard({
  onKey(k) {
    if (k === 't') loop.setThrottle(!loop.isThrottled());
    if (k === 'g') {
      ui.selectedBuildingId = null;
      ui.selectedSiteId = null;
      cmdSetSelection(world, world.units.filter(u => u.team === 'player' && u.gather).map(u => u.id));
    }
    if (k === 'escape') {
      if (ui.placingType) { ui.placingType = null; ghost.hide(); }
      else if (ui.selectedSiteId !== null) {
        cmdCancelSite(world, ui.selectedSiteId);
        ui.selectedSiteId = null;
        hud.flash('site cancelled, essence refunded');
      }
    }
    if (k === 'b' && world.units.some(u => u.selected && u.gather)) ui.placingType = 'outpost';
    if (k === 'q') hud.tryTrain('worker');
    if (k === 'e') hud.tryTrain('legionnaire');
  },
});

window.addEventListener('resize', () => {
  cam.onResize();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const loop = createLoop({
  step: () => simStep(world),
  render: (alpha, realDt, now) => {
    cam.pan(realDt, keyboard.keys, keyboard.mouseX, keyboard.mouseY);
    cam.update();
    syncUnitViews(scene, world, views.units, alpha);
    syncNodeViews(world, views.nodes);
    syncSiteViews(scene, world, views.sites);
    syncBuildingViews(scene, world, views.buildings, ui.selectedBuildingId);
    hud.update(now, loop.isThrottled());
    renderer.render(scene, cam.camera);
  },
});

cam.update();
loop.start();

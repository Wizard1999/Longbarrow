import type { EntityId } from './core/types';
import type * as THREE from 'three';
import { createLoop } from './core/loop';
import { createWorld, simStep } from './sim/world';
import { buildTestMap } from './sim/map';
import { cmdCancelSite, cmdFormSquad, cmdSetSelection } from './sim/commands';
import { squadByNumber } from './sim/squads';
import { AUTOMATION } from './data/tuning';
import { createRenderer } from './render/renderer';
import { buildTerrainMesh } from './render/terrainMesh';
import { buildSceneryViews } from './render/sceneryViews';
import { buildNodeViews, syncNodeViews } from './render/nodeViews';
import { syncBuildingViews } from './render/buildingViews';
import { syncUnitViews } from './render/unitViews';
import { syncSiteViews } from './render/siteViews';
import { createCamera } from './render/camera';
import { createPlacementGhost } from './render/placementGhost';
import { createChainVisuals } from './render/chainVisuals';
import { createPicker, createUiState } from './input/selection';
import { createKeyboard } from './input/keyboard';
import { createMouse } from './input/mouse';
import { createHud } from './ui/hud';
import { createChainEditor } from './ui/chainEditor';

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
const chainEditor = createChainEditor(world, ui, hud.flash);
const chainVisuals = createChainVisuals(scene);

createMouse({ world, domElement: renderer.domElement, cam, picker, ghost, ui, flash: hud.flash });

const keyboard = createKeyboard({
  onKey(k, e) {
    // Ctrl+1..5 forms a squad; 1..5 selects one. Squads are persistent (Q1),
    // so the number key is a real handle, not a saved selection.
    const n = Number(k);
    if (Number.isInteger(n) && n >= 1 && n <= AUTOMATION.maxSquads) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const sel = world.units.filter(u => u.selected && u.team === 'player').map(u => u.id);
        const res = cmdFormSquad(world, 'player', sel, n);
        if (res.ok) {
          ui.selectedSquadId = res.siteId ?? null;
          ui.armedBehaviour = null;
          hud.flash(`squad ${n} formed — ${sel.length} unit(s)`);
        } else {
          hud.flash(res.reason ?? 'cannot form a squad');
        }
      } else {
        const squad = squadByNumber(world, 'player', n);
        if (squad) {
          ui.selectedSquadId = squad.id;
          ui.armedBehaviour = null;
          ui.selectedBuildingId = null;
          ui.selectedSiteId = null;
          cmdSetSelection(world, squad.memberIds);
        } else {
          hud.flash(`no squad ${n} — select units and press Ctrl+${n}`);
        }
      }
      return;
    }

    if (k === 't') loop.setThrottle(!loop.isThrottled());
    if (k === 'g') {
      ui.selectedBuildingId = null;
      ui.selectedSiteId = null;
      cmdSetSelection(world, world.units.filter(u => u.team === 'player' && u.gather).map(u => u.id));
    }
    if (k === 'escape') {
      if (ui.armedBehaviour) { ui.armedBehaviour = null; }
      else if (ui.placingType) { ui.placingType = null; ghost.hide(); }
      else if (ui.selectedSiteId !== null) {
        cmdCancelSite(world, ui.selectedSiteId);
        ui.selectedSiteId = null;
        hud.flash('site cancelled, essence refunded');
      }
    }
    if (k === 'b' && world.units.some(u => u.selected && u.gather)) ui.placingType = 'outpost';
    if (k === 'q') hud.tryTrain('worker');
    if (k === 'e') hud.tryTrain('legionnaire');
    if (k === 'r') hud.tryTrain('marksman');
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
    const squadMemberIds = new Set(world.squads.flatMap(s => s.memberIds));
    syncUnitViews(scene, world, views.units, alpha, squadMemberIds);
    syncNodeViews(world, views.nodes);
    syncSiteViews(scene, world, views.sites);
    syncBuildingViews(scene, world, views.buildings, ui.selectedBuildingId);
    chainVisuals.sync(world.squads.find(s => s.id === ui.selectedSquadId) ?? null);
    hud.update(now, loop.isThrottled());
    chainEditor.update();
    renderer.render(scene, cam.camera);
  },
});

cam.update();
loop.start();

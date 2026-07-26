import type * as THREE from 'three';
import type { World } from '../core/types';
import { BUILDING_TYPES } from '../data/buildings';
import {
  cmdAddChainStep, cmdAssignBuilders, cmdGather, cmdMove, cmdPlaceBuilding,
  cmdSetRally, cmdSetSelection,
} from '../sim/commands';
import type { RtsCamera } from '../render/camera';
import type { PlacementGhost } from '../render/placementGhost';
import type { UiState } from './selection';
import { ownerIdOf, screenPosOf, selectedIds } from './selection';

type Picker = ReturnType<typeof import('./selection').createPicker>;

export interface MouseDeps {
  world: World;
  domElement: HTMLCanvasElement;
  cam: RtsCamera;
  picker: Picker;
  ghost: PlacementGhost;
  ui: UiState;
  flash: (msg: string) => void;
}

export function createMouse(deps: MouseDeps): void {
  const { world, domElement, cam, picker, ghost, ui, flash } = deps;
  const selboxEl = document.getElementById('selbox');
  let dragStart: { x: number; y: number } | null = null;
  let dragging = false;

  /** Keep the chain editor pointed at whatever the player is looking at: if
   *  the whole selection belongs to one squad, show that squad's chain. */
  function followSelection(): void {
    const sel = world.units.filter(u => u.selected);
    const owner = sel.length
      ? world.squads.find(s => sel.every(u => s.memberIds.includes(u.id)))
      : undefined;
    ui.selectedSquadId = owner?.id ?? null;
    ui.armedBehaviour = null;
  }

  domElement.addEventListener('wheel', e => cam.zoom(e.deltaY), { passive: true });
  domElement.addEventListener('contextmenu', e => e.preventDefault());

  domElement.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    dragStart = { x: e.clientX, y: e.clientY };
    dragging = false;
  });

  domElement.addEventListener('mousemove', e => {
    if (ui.placingType) {
      picker.setFromEvent(e);
      ghost.update(world, ui.placingType, picker.ground());
    }
    if (!dragStart || !selboxEl) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.hypot(dx, dy) > 4) {
      dragging = true;
      selboxEl.style.display = 'block';
      selboxEl.style.left = `${Math.min(dragStart.x, e.clientX)}px`;
      selboxEl.style.top = `${Math.min(dragStart.y, e.clientY)}px`;
      selboxEl.style.width = `${Math.abs(dx)}px`;
      selboxEl.style.height = `${Math.abs(dy)}px`;
    }
  });

  // One consolidated mouseup. Phase 0 had two competing listeners here (06 §6).
  domElement.addEventListener('mouseup', e => {
    // ---- left while placing: commit the building ----
    if (e.button === 0 && ui.placingType) {
      picker.setFromEvent(e);
      const hit = picker.ground();
      if (hit) {
        const type = ui.placingType;
        const builders = world.units.filter(u => u.selected && u.build).map(u => u.id);
        const res = cmdPlaceBuilding(world, 'player', type, hit.point.x, hit.point.z, builders);
        flash(res.ok
          ? (builders.length
            ? `${BUILDING_TYPES[type].label} sited — worker heading over`
            : 'sited, but no worker assigned')
          : res.reason ?? 'cannot place there');
        if (res.ok && !e.shiftKey) { ui.placingType = null; ghost.hide(); }
      }
      dragStart = null;
      dragging = false;
      return;
    }

    // ---- left while a behaviour is armed: site that chain step ----
    if (e.button === 0 && ui.armedBehaviour && ui.selectedSquadId !== null && !dragging) {
      picker.setFromEvent(e);
      const hit = picker.ground();
      if (hit) {
        const kind = ui.armedBehaviour;
        const res = cmdAddChainStep(world, ui.selectedSquadId, kind, hit.point.x, hit.point.z);
        flash(res.ok ? `${kind} step added` : res.reason ?? 'cannot add that step');
        ui.armedBehaviour = null;
      }
      if (selboxEl) selboxEl.style.display = 'none';
      dragStart = null;
      dragging = false;
      return;
    }

    // ---- left: selection ----
    if (e.button === 0 && dragStart) {
      if (dragging) {
        const x1 = Math.min(dragStart.x, e.clientX);
        const x2 = Math.max(dragStart.x, e.clientX);
        const y1 = Math.min(dragStart.y, e.clientY);
        const y2 = Math.max(dragStart.y, e.clientY);
        ui.selectedBuildingId = null;
        ui.selectedSiteId = null;
        cmdSetSelection(world, world.units.filter(u => {
          // Rival units are not selectable or commandable (06 §6).
          if (u.team !== 'player') return false;
          const p = screenPosOf(cam.camera, u.x, u.z);
          return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
        }).map(u => u.id));
        followSelection();
      } else {
        picker.setFromEvent(e);
        const unitHit = picker.unit();
        const bldHit = picker.building();
        const siteHit = picker.site();
        const near = [unitHit, bldHit, siteHit]
          .filter((h): h is THREE.Intersection => Boolean(h))
          .sort((a, b) => a.distance - b.distance)[0];

        if (siteHit && near === siteHit) {
          ui.selectedBuildingId = null;
          cmdSetSelection(world, []);
          ui.selectedSiteId = ownerIdOf(siteHit, 'siteId');
        } else if (unitHit && near === unitHit) {
          const unitId = ownerIdOf(unitHit, 'unitId');
          const unit = world.units.find(u => u.id === unitId);
          if (unit && unit.team === 'player' && unitId !== null) {
            ui.selectedBuildingId = null;
            ui.selectedSiteId = null;
            cmdSetSelection(world, e.shiftKey ? [...selectedIds(world), unitId] : [unitId]);
            followSelection();
          }
        } else if (bldHit && near === bldHit) {
          const bid = ownerIdOf(bldHit, 'buildingId');
          const b = world.buildings.find(x => x.id === bid);
          if (b && b.team === 'player') {
            cmdSetSelection(world, []);
            followSelection();
            ui.selectedSiteId = null;
            ui.selectedBuildingId = bid;
          }
        } else {
          ui.selectedBuildingId = null;
          ui.selectedSiteId = null;
          cmdSetSelection(world, []);
          followSelection();
        }
      }
      if (selboxEl) selboxEl.style.display = 'none';
      dragStart = null;
      dragging = false;
    }

    // ---- right: cancel placement / set rally / gather / move ----
    if (e.button === 2) {
      if (ui.placingType) { ui.placingType = null; ghost.hide(); return; }
      picker.setFromEvent(e);

      if (ui.selectedBuildingId !== null) {
        const groundHit = picker.ground();
        if (groundHit) {
          cmdSetRally(world, ui.selectedBuildingId, groundHit.point.x, groundHit.point.z);
          flash('rally point set');
        }
        return;
      }

      const sel = selectedIds(world);
      if (!sel.length) return;

      // resuming a paused build is the same gesture as starting one
      const siteHit = picker.siteDeep();
      if (siteHit) {
        const siteId = ownerIdOf(siteHit, 'siteId');
        if (siteId !== null) {
          const accepted = cmdAssignBuilders(world, sel, siteId);
          flash(accepted.length ? `${accepted.length} worker(s) building` : 'workers only');
        }
        return;
      }

      const nodeHit = picker.nodeDeep();
      if (nodeHit) {
        const nodeId = ownerIdOf(nodeHit, 'nodeId');
        const node = world.nodes.find(n => n.id === nodeId);
        if (nodeId !== null) {
          // Workers gather; anything else just walks there.
          const accepted = new Set(cmdGather(world, sel, nodeId));
          const rest = sel.filter(id => !accepted.has(id));
          if (rest.length && node) cmdMove(world, rest, node.x, node.z);
        }
        return;
      }

      const groundHit = picker.ground();
      if (groundHit) cmdMove(world, sel, groundHit.point.x, groundHit.point.z);
    }
  });
}

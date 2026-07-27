import type { UnitTypeKey, World } from '../core/types';
import { TICK_HZ } from '../core/loop';
import { BUILDING_TYPES } from '../data/buildings';
import { UNIT_TYPES } from '../data/units';
import { canTrain } from '../sim/production';
import { cmdCancelSite, cmdTrain } from '../sim/commands';
import { builderIsWorking, buildersOn } from '../sim/construction';
import { countGathering, totalResourcesRemaining } from '../sim/economy';
import { supplyCap, supplyUsed } from '../sim/supply';
import { automationSlots, runningSquads } from '../sim/squads';
import type { UiState } from '../input/selection';
import { dayNumber, dayPeriod, daylight, formatClock } from '../sim/daynight';
import { issueCommand } from '../replay/live';

const el = (id: string): HTMLElement => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`missing element #${id}`);
  return found;
};

export interface Hud {
  flash: (msg: string) => void;
  tryTrain: (unitType: UnitTypeKey) => void;
  update: (now: number, throttled: boolean) => void;
}

export function createHud(world: World, ui: UiState): Hud {
  const dbg = {
    fps: el('d-fps'), tps: el('d-tps'), tick: el('d-tick'), rate: el('d-rate'),
    units: el('d-units'), sel: el('d-sel'), throttle: el('d-throttle'),
  };
  const resUi = {
    essence: el('r-essence'), gathering: el('r-gathering'),
    workers: el('r-workers'), remaining: el('r-remaining'), supply: el('r-supply'),
    chains: el('r-chains'),
  };
  const clockUi = { time: el('c-time'), period: el('c-period'), dial: el('c-dial') };
  const cardTitle = el('card-title');
  const cardBtns = el('card-btns');
  const cardQueue = el('card-queue');
  const cardHint = el('card-hint');
  const flashEl = el('flash');

  let announcedWinner = false;
  let flashTimer: ReturnType<typeof setTimeout> | undefined;
  function flash(msg: string): void {
    flashEl.textContent = msg;
    flashEl.style.opacity = '1';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashEl.style.opacity = '0'; }, 1600);
  }

  function tryTrain(unitType: UnitTypeKey): void {
    if (ui.selectedBuildingId === null) { flash('select a structure first'); return; }
    const building = ui.selectedBuildingId;
    const res = issueCommand(
      { t: 'train', building, unit: unitType },
      () => cmdTrain(world, building, unitType),
    );
    if (!res.ok) flash(res.reason ?? 'cannot train that');
  }

  // Rebuilt only when the selection changes, so buttons stay clickable.
  let cardKey = '';
  function renderCard(): void {
    const sel = world.units.filter(u => u.selected);
    const b = ui.selectedBuildingId !== null
      ? world.buildings.find(x => x.id === ui.selectedBuildingId) : undefined;
    const site = ui.selectedSiteId !== null
      ? world.sites.find(x => x.id === ui.selectedSiteId) : undefined;
    const first = sel[0];
    const key = site ? `s${site.id}`
      : b ? `b${b.id}`
      : first ? `u${sel.length}:${first.type}`
      : 'none';

    if (key !== cardKey) {
      cardKey = key;
      cardBtns.innerHTML = '';
      if (site) {
        cardTitle.textContent = `${BUILDING_TYPES[site.type].label} — under construction`;
        const btn = document.createElement('button');
        btn.innerHTML = '<b>Cancel (Esc)</b><span class="c">full refund</span>';
        btn.onclick = () => {
          issueCommand(
            { t: 'cancelSite', site: site.id },
            () => cmdCancelSite(world, site.id),
          );
          ui.selectedSiteId = null;
          flash('site cancelled, essence refunded');
        };
        cardBtns.appendChild(btn);
        cardHint.textContent = 'right-click the site with a worker selected to resume';
      } else if (b) {
        const t = BUILDING_TYPES[b.type];
        cardTitle.textContent = `${t.label} — +${t.command} command`;
        const hotkeys: Partial<Record<UnitTypeKey, string>> = { worker: 'Q', legionnaire: 'E', marksman: 'R' };
        for (const ut of t.produces) {
          const u = UNIT_TYPES[ut];
          const btn = document.createElement('button');
          btn.innerHTML = `<b>${u.label} (${hotkeys[ut] ?? ''})</b><span class="c">${u.cost} essence · ${u.supply} cmd</span>`;
          btn.dataset['unit'] = ut;
          btn.onclick = () => tryTrain(ut);
          cardBtns.appendChild(btn);
        }
        cardHint.textContent = 'right-click the ground to set a rally point';
      } else if (first) {
        const workers = sel.filter(u => u.gather).length;
        cardTitle.textContent = `${sel.length} selected (${workers} worker${workers === 1 ? '' : 's'})`;
        if (workers) {
          const t = BUILDING_TYPES.outpost;
          const btn = document.createElement('button');
          btn.innerHTML = `<b>Build Outpost (B)</b><span class="c">${t.cost} essence · +${t.command} cmd</span>`;
          btn.dataset['build'] = 'outpost';
          btn.onclick = () => { ui.placingType = 'outpost'; };
          cardBtns.appendChild(btn);
          cardHint.textContent = 'outposts add command, hold territory, and accept essence';
        } else {
          cardHint.textContent = '';
        }
      } else {
        cardTitle.textContent = 'Nothing selected';
        cardHint.textContent = 'click the Standard to train units';
      }
    }

    // live state on every frame: affordability and queue
    for (const child of cardBtns.children) {
      const btn = child as HTMLButtonElement;
      const unit = btn.dataset['unit'] as UnitTypeKey | undefined;
      const build = btn.dataset['build'];
      if (unit) {
        btn.disabled = !(b && canTrain(world, b.id, unit).ok);
      } else if (build === 'outpost') {
        btn.disabled = world.resources.player < BUILDING_TYPES.outpost.cost;
      }
    }

    if (site) {
      const pct = Math.round((site.progress / site.required) * 100);
      const working = buildersOn(world, site.id).some(u => builderIsWorking(world, u));
      cardQueue.textContent = `${pct}% — ${working ? 'building' : 'PAUSED (no worker)'}`;
      cardQueue.style.color = working ? '#555' : '#b02e2e';
    } else if (b?.queue.length) {
      const head = b.queue[0];
      cardQueue.style.color = '#555';
      if (head) {
        const pct = Math.round((1 - head.ticksLeft / UNIT_TYPES[head.type].buildTicks) * 100);
        const rest = b.queue.length > 1 ? ` (+${b.queue.length - 1} queued)` : '';
        cardQueue.textContent = `${UNIT_TYPES[head.type].label} ${pct}%${rest}`;
      }
    } else {
      cardQueue.textContent = '';
    }
  }

  let frameCount = 0;
  let tickAtLastSample = 0;
  let lastSample = 0;
  let essenceAtLastSample = 0;

  function update(now: number, throttled: boolean): void {
    frameCount++;
    if (now - lastSample >= 500) {
      const elapsed = (now - lastSample) / 1000;
      const fps = frameCount / elapsed;
      const tps = (world.tick - tickAtLastSample) / elapsed;
      const measuredRate = ((world.resources.player - essenceAtLastSample) / elapsed) * 60;

      frameCount = 0;
      tickAtLastSample = world.tick;
      essenceAtLastSample = world.resources.player;
      lastSample = now;

      dbg.fps.textContent = fps.toFixed(0);
      dbg.tps.textContent = tps.toFixed(1);
      dbg.tps.className = Math.abs(tps - TICK_HZ) > 1.5 ? 'warn' : '';
      dbg.rate.textContent = measuredRate.toFixed(0);
    }
    dbg.tick.textContent = String(world.tick);
    dbg.units.textContent = String(world.units.length);
    dbg.sel.textContent = String(world.units.filter(u => u.selected).length);
    dbg.throttle.textContent = throttled ? 'ON (~12fps)' : 'off';
    dbg.throttle.className = throttled ? 'warn' : '';

    // Always visible, never hidden behind a toggle — the designer's ask is that
    // the player can tell the time of day at any moment.
    clockUi.time.textContent = formatClock(world);
    const period = dayPeriod(world);
    clockUi.period.textContent = period;
    const lit = Math.round(daylight(world) * 100);
    clockUi.dial.style.background =
      `conic-gradient(#ffd9a0 0 ${lit}%, #2b3557 ${lit}% 100%)`;
    clockUi.dial.title = `Day ${dayNumber(world) + 1} — ${period}`;

    // The match is over: say so once, plainly. Information, never advice
    // (UI_BLUEPRINT § "Information, never advice").
    if (world.winner && !announcedWinner) {
      announcedWinner = true;
      flash(world.winner === 'player' ? 'VICTORY — enemy base destroyed'
                                      : 'DEFEAT — your base was destroyed');
    }

    resUi.essence.textContent = String(world.resources.player);
    resUi.gathering.textContent = String(countGathering(world, 'player'));
    resUi.workers.textContent = String(world.units.filter(u => u.team === 'player' && u.gather).length);
    resUi.remaining.textContent = String(totalResourcesRemaining(world));

    const used = supplyUsed(world, 'player');
    const cap = supplyCap(world, 'player');
    resUi.supply.textContent = `${used}/${cap}`;
    resUi.supply.style.color = used >= cap ? '#b02e2e' : '';

    // Command buys automation slots as well as population (A4, §8.3).
    const slots = automationSlots(world, 'player');
    const chains = runningSquads(world, 'player');
    resUi.chains.textContent = `${chains}/${slots}`;
    resUi.chains.style.color = chains >= slots ? '#b02e2e' : '';

    renderCard();
  }

  return { flash, tryTrain, update };
}

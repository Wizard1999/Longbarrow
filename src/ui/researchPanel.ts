import type { World } from '../core/types';
import { TECH } from '../data/tech';
import type { TechId } from '../data/tech';
import { availableTech, canResearch, cmdCancelResearch, cmdResearch } from '../sim/tech';
import { issueCommand } from '../replay/live';
import { RESOURCES, RESOURCE_ORDER } from '../data/resources';
import type { ResourceCost } from '../data/resources';
import { canAfford } from '../sim/resources';

/** "90 Material · 30 Legacy", built from the registry rather than hardcoded. */
function costLabel(cost: ResourceCost): string {
  return RESOURCE_ORDER
    .filter(id => (cost[id] ?? 0) > 0)
    .map(id => `${cost[id]} ${RESOURCES[id].label}`)
    .join(' · ') || 'free';
}

/**
 * The research panel.
 *
 * Presents Cohort's track the way §8.5 describes it rather than the way a
 * generic RTS tech tree would: a short reachable list where *timing* is the
 * decision, not a branching diagram where picking wrong is punished. Doctrine
 * pairs are labelled as a pair precisely so the player can see that taking one
 * does not forfeit the other — that reassurance is the mechanic (D-028).
 *
 * Every action routes through `issueCommand` rather than calling the sim
 * directly, so research appears in the replay stream. Calling `cmdResearch`
 * here would produce replays that silently diverge the moment an upgrade
 * completed.
 */

export interface ResearchPanel {
  update: () => void;
}

export function createResearchPanel(
  world: World,
  flash: (msg: string) => void,
): ResearchPanel {
  const root = document.getElementById('research');
  const body = document.getElementById('research-body');
  const progress = document.getElementById('research-progress');
  if (!root || !body || !progress) {
    return { update: () => { /* panel absent from this page */ } };
  }

  // Rebuilt only when the offered set changes, so buttons stay clickable
  // between frames and the DOM is not thrashed sixty times a second.
  let renderedKey = '';

  function start(id: TechId): void {
    const check = canResearch(world, 'player', id);
    if (!check.ok) { flash(check.reason ?? 'cannot research that'); return; }
    issueCommand({ t: 'research', team: 'player', tech: id },
      () => cmdResearch(world, 'player', id));
    flash(`researching ${TECH[id].label}`);
  }

  function cancel(): void {
    issueCommand({ t: 'cancelResearch', team: 'player' },
      () => cmdCancelResearch(world, 'player'));
    flash('research cancelled — cost refunded');
  }

  function renderOptions(ids: TechId[]): void {
    body!.replaceChildren(...ids.map((id) => {
      const def = TECH[id];
      const affordable = canAfford(world.resources.player, def.cost);

      const row = document.createElement('button');
      row.className = 'tech-row';
      row.disabled = !affordable;
      row.title = def.blurb;

      const name = document.createElement('span');
      name.className = 'tech-name';
      name.textContent = def.label;

      const cost = document.createElement('span');
      cost.className = 'tech-cost';
      cost.textContent = costLabel(def.cost);

      row.append(name, cost);

      // Doctrine pairs: say plainly that the other stays available, because a
      // player trained on other RTS will assume it does not.
      if (def.pairedWith) {
        const pair = document.createElement('span');
        pair.className = 'tech-pair';
        pair.textContent = `doctrine · ${TECH[def.pairedWith].label} stays available`;
        row.append(pair);
      }

      row.onclick = () => start(id);
      return row;
    }));

    if (!ids.length) {
      const done = document.createElement('p');
      done.className = 'tech-empty';
      done.textContent = 'All research complete.';
      body!.replaceChildren(done);
    }
  }

  function update(): void {
    const state = world.tech.player;
    const active = state.researching;

    if (active) {
      const def = TECH[active.id];
      const pct = Math.round((1 - active.ticksLeft / def.researchTicks) * 100);
      progress!.hidden = false;
      progress!.innerHTML = '';

      const label = document.createElement('span');
      label.textContent = `${def.label} — ${pct}%`;

      const bar = document.createElement('div');
      bar.className = 'tech-bar';
      const fill = document.createElement('span');
      fill.style.width = `${pct}%`;
      bar.append(fill);

      const stop = document.createElement('button');
      stop.className = 'tech-cancel';
      stop.textContent = 'Cancel';
      stop.onclick = cancel;

      progress!.append(label, bar, stop);
      // Nothing else can be started while one is running, so offering the list
      // would only invite a refusal.
      if (renderedKey !== 'busy') { body!.replaceChildren(); renderedKey = 'busy'; }
      return;
    }

    progress!.hidden = true;
    const ids = availableTech(world, 'player');
    // Affordability is in the key so a row un-greys the moment it is payable.
    const key = ids.map(id =>
      `${id}:${canAfford(world.resources.player, TECH[id].cost)}`).join('|');
    if (key === renderedKey) return;
    renderedKey = key;
    renderOptions(ids);
  }

  return { update };
}

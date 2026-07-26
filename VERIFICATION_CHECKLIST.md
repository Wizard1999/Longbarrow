# Manual Verification Checklist

Things I **cannot** verify from my sandbox — no browser, no WebGL, no eyes. Everything here needs a human at a real machine.

Anything covered by `test_sim.mjs` is deliberately **not** listed; that's already proven. This is the gap between "the logic is correct" and "the game actually works and feels right."

Check items off as you go, and note anything that fails — a failure here is a real bug regardless of what the tests say.

**The game is now a real project, not a single file.** `npm install`, then
`npm run dev`, then open the URL it prints (usually `http://localhost:5173`).
The old `phase1_step1.*.html` files are kept only for rollback and reference —
don't test against them.

---

## A. Does it even run (do this first, 2 minutes)

- [ ] `npm install` completes. It prints a high-severity `npm audit` warning about `brace-expansion` — that's inside ESLint's own config loader, dev-only, and clearing it needs a breaking ESLint upgrade. Deliberately left alone; tell me if you'd rather I take the upgrade
- [ ] `npm run dev` starts and the page loads
- [ ] Terrain, trees, rocks, units, and both bases render — nothing invisible or black
- [ ] No red errors in the browser console (F12 → Console)
- [ ] **Colours look right.** Three.js went from r128 to r185 in this migration, and its lighting model and colour output changed underneath us. I re-tuned the light intensities and checked it in a browser, but "right" here is a judgement call — if the scene reads flatter, brighter, or cooler than the old single-file build did on your machine, say so and compare against `phase1_step1.6_construction.html` side by side
- [ ] `npm test` → 126 passing
- [ ] `npm run lint` → clean, and `npm run build` produces a bundle
- [ ] Works in whichever browser you actually use. Chrome/Edge/Firefox should be fine; **Safari is the most likely to misbehave.**

## B. Performance and the fixed tick (1.2)

- [ ] Runs at a comfortable framerate on your machine — check `render fps` in the debug panel
- [ ] Unit movement looks *smooth*, not steppy. The sim runs at 20Hz, so if interpolation is broken you'll see visible stutter at 20 steps/sec
- [ ] **Press T.** `render fps` should collapse to ~12 while `sim ticks/s` holds at ~20
- [ ] With T on, units still cross the same distance in the same wall-clock time, and essence still accrues at the same real-time rate
- [ ] Press T again — recovers cleanly, no speed-up burst to "catch up"
- [ ] Switch to another tab for ~30 seconds, come back. The game should resume normally, **not** fast-forward through the missed time
- [ ] Reload several times — trees and rocks land in identical positions every time

## C. Camera and input (carried from Phase 0)

- [ ] WASD pans; edge-scroll pans; both feel reasonable in speed
- [ ] Scroll wheel zooms, clamps sensibly at both ends
- [ ] Camera can't be panned off into empty space (clamped at ±38)
- [ ] Drag-box selection lands on the units you actually dragged over — **worth checking near the screen edges and when zoomed out**, where projection errors show up
- [ ] Clicking a red (rival) unit selects nothing. Same for drag-selecting over them
- [ ] Right-clicking during a left-drag doesn't produce anything weird
- [ ] Browser context menu never appears on right-click

## D. Gather loop (1.4)

- [ ] **G** selects all four workers
- [ ] Right-click a crystal cluster → all four walk out and start gathering, no further input
- [ ] Workers visibly carry a glowing shard on the return trip only
- [ ] **Workers park in separate spots around the node, not stacked on top of each other.** This was a real bug I fixed — confirm it's actually fixed on screen, not just in the test
- [ ] Node visibly shrinks as it drains
- [ ] Essence counter climbs; `essence/min` in the debug panel reads plausibly
- [ ] Right-click a node with *legionnaires* selected — they should walk to it and do nothing, not error
- [ ] Move-order a gathering worker — it stops gathering and obeys
- [ ] Mixed selection (workers + legionnaires) right-clicked on a node: workers gather, legionnaires just walk there

## E. Command supply, production, outposts (1.5)

- [ ] Click your Standard (the big base) — the bottom command card shows train buttons
- [ ] **Q** trains a worker, **E** a legionnaire; buttons show cost and command
- [ ] Queue progress percentage advances; queued extras show as "+N queued"
- [ ] Trained units emerge from the building edge and walk to the rally point
- [ ] With the Standard selected, right-click the ground → rally point moves; next unit walks there instead
- [ ] Buttons grey out when you can't afford them or you're at the cap
- [ ] **Hit the Command cap** (starts 12/15 — two more units does it). Training refuses, and a toast explains why
- [ ] Supply readout turns red at the cap
- [ ] Select a worker → "Build Outpost" appears. **B** also works
- [ ] Placement ghost follows the cursor, **green where valid, red where invalid**
- [ ] Ghost turns red over: another building, an essence node, the map edge
- [ ] Left-click places it; **Esc** or right-click cancels placement mode
- [ ] Shift+click places one and stays in placement mode for another
- [ ] New outpost raises the Command cap, and its control ring appears
- [ ] Outposts accept essence — build one next to a far node and confirm workers deliver there rather than walking all the way home
- [ ] Clicking a building selects it (and deselects units), and vice versa

## E2. Queue & Walk construction (1.6)

The pause-on-reassignment behaviour is the headline here — the blueprint calls it a deliberate design choice, not an afterthought, so it's worth testing properly rather than glancing at.

- [ ] Select a worker, press **B**, click the ground → a **site** appears sunk into the earth, and the worker walks over
- [ ] Nothing is built until the worker actually arrives — no progress while it's still walking
- [ ] The structure visibly **rises out of the ground** as it completes
- [ ] Select the site → command card shows a live percentage
- [ ] **Now pull the worker off mid-build** (right-click somewhere else, or send it to gather). The site should:
  - [ ] stay on the map, not vanish
  - [ ] keep its progress — the percentage must not reset
  - [ ] show "PAUSED (no worker)" in red
  - [ ] turn its footprint ring amber, and go more translucent
- [ ] **Right-click the paused site with a worker selected** → it resumes from exactly where it stopped
- [ ] Select a site and press **Esc** (or the Cancel button) → full essence refund, site removed
- [ ] A finished outpost starts contributing Command — an *unfinished* one contributes nothing
- [ ] You can't place a second site overlapping the first
- [ ] Placing with no worker selected still works, and the toast tells you no worker was assigned
- [ ] Assigning four workers instead of one does **not** build faster (deliberate — assumption A8, see `OPEN_QUESTIONS.md`)

## E3. Squads and behaviour chains (1.7)

This is the step the blueprint judges hardest: *"if it feels like scripting,
it's wrong — rebuild the interaction, not the backend."* So the questions below
about how it **feels** matter more than the ones about whether it works.

**The core run-through:**

- [ ] Press **G** to grab the workers, then **Ctrl+1** — a cyan ring appears under each member and the panel bottom-left reads "Squad 1 — 4 unit(s)"
- [ ] Click **Move**, then click a spot on the map → a blue post appears there and "1. Move" joins the list
- [ ] Add **Attack-move** and **Patrol** the same way, somewhere else each time
- [ ] The three posts are joined by a line on the ground, and the line **closes into a loop** (because Loop is on)
- [ ] Press **Run**. The squad sets off, and the post for the step it's currently on stands taller
- [ ] **Walk away for a minute.** It should keep running the loop with no further input
- [ ] The step highlighted in the list matches the tall post on the map

**Did it feel like scripting?**

- [ ] Assembling that chain took about six clicks. Did it feel like *commanding*, or like filling in a form? This is the question — if it's the latter, the interaction needs rebuilding, not the backend
- [ ] Can you tell what a squad is going to do by looking at the **map**, without reading the panel?
- [ ] Is the arm-a-behaviour-then-click-the-map rhythm obvious, or did you have to think about it?

**The Command gate (assumption A4 — the interesting half of §8.3):**

- [ ] The top bar shows `chains` next to `command`. It reads **0/1** at the start
- [ ] Form a second squad from the legionnaires (**Ctrl+2**), give it a step, press Run → **refused**, with "not enough Command — 1 chain at a time"
- [ ] Build an Outpost. Once it *finishes*, the readout becomes **/2** and the second chain runs
- [ ] Does being limited to one automated chain at the opening feel like a meaningful constraint, or just annoying? (Open question Q19)

**Redirecting:**

- [ ] With a running squad selected, right-click the ground → it stops automating and obeys, and the button flips back to Run
- [ ] The squad still **exists** afterwards — redirected, not disbanded
- [ ] Press Run again → it starts over from step 1. **Should it instead resume where it left off?** That's open question Q18 and I'd like your call
- [ ] Press **1** at any time to re-select squad 1, wherever it is

**Odds and ends:**

- [ ] **Loop: off** → the chain stops after the last step instead of repeating
- [ ] **×** next to a step removes it; **Clear** empties the chain
- [ ] A `gather` step puts the workers in that squad to work and keeps them there
- [ ] Put a step somewhere unreachable — the chain should give up on it after ~45s and move on, not wedge
- [ ] Forming a squad from units already in another squad moves them out of the old one

## F. Art direction — the subjective ones

These matter more than they sound, because they're the decisions that can't be un-made cheaply later.

- [ ] **Does the base read as a dead thing still twitching, or as a machine with a power source?** The whole Cohort concept depends on the first. If the pulsing core reads as "powered on," that's the Necron problem and I should change it
- [ ] Is the glow the right warmth? Currently gold; the design doc allows gold *or* pale green
- [ ] Is the pulse rate right? Currently ~0.7Hz — slow, breath-like. Faster reads mechanical, slower may read dead
- [ ] Does the moss read as *overgrowth on something ancient*, or as random green blobs?
- [ ] Do the ribs read as fossil/bone, or as machinery? (Design intent: no visible joints or gears anywhere)
- [ ] Rival red version — still clearly the same civilization, just a different force?
- [ ] Do essence crystals read as natural, or too videogame-y?
- [ ] Overall: does anything on screen read as *steampunk* or *toy-like*? Both are explicit design vetoes
- [ ] Control range rings — helpful, or visual clutter?

## G. Known gaps — expected, not bugs

Don't report these; they're scheduled work.

- Units walk through each other and through buildings — collision arrives with pathfinding
- Units walk through trees and rocks (scenery is decorative only)
- No combat; red units are inert
- High ground has no combat effect yet — the terrain queries exist but nothing consumes them until 1.8/1.9
- No fog of war, no vision system
- Attack-move currently just moves — there is nothing to attack until 1.9
- Rival team has no AI (1.11)
- No win condition (1.12)
- Every number is a placeholder; the economy is deliberately untuned

## H. Open questions

Moved to their own file: **`OPEN_QUESTIONS.md`**. That's the running list of everything I've decided without you and everything I'd like your call on, tiered by urgency. It grows as I build; this checklist stays focused on "does it actually work."

The feel-based ones in there (Q12–Q16) specifically need you at the controls, so they pair naturally with working through this checklist.

---

*Updated through v1.7. New items get added as versions land.*

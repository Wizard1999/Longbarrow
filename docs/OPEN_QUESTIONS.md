# Open Questions

Everything I've had to decide without you, plus everything I'd like your call on. Nothing here is blocking — I've made a reasonable choice in every case and kept building. But each one is a place where I guessed, and guesses accumulate.

**Tiers:** ⚠️ = I'll hit this within the next couple of steps · ◐ = needed before Phase 2 · ○ = whenever

Answer them in any order, a few at a time. Where I've already implemented something, changing it later is cheap unless noted.

---

## ⚠️ Coming up immediately (steps 1.7–1.12)

**Q1 — What counts as a "squad"?** (needed for 1.7)
The design doc talks constantly about squads but never defines one mechanically. Two readings:
- **(a) Persistent named group** — you form a squad, it has an identity, it holds its behaviour chain, you re-select it with a hotkey. Cohesion applies per-squad.
- **(b) Ad-hoc selection** — "squad" is just whatever you have selected right now, and chains attach to those units.
(a) fits "Command gates how many squads run chains simultaneously" (§8.3) much better, since you can't count something that doesn't persist. **Leaning (a).** Confirm?

**Q2 — Behaviour chain vocabulary for Phase 1.**
Blueprint says keep it small: move, gather, patrol, attack-move. Are those four the right four? Anything you'd swap in — hold position, guard unit, retreat-at-low-health? The doc mentions guard/kite/hold/auto-retreat as eventual building blocks (§4), but Phase 1 doesn't need all of them.

**Q3 — Do chains loop by default?**
"Walk here → mine this → walk there → patrol" — when the chain ends, does the squad loop back to step 1, or stop and hold? Looping fits "continues until redirected" (§4). **Leaning loop-by-default with a per-chain toggle.**

**Q4 — Cohesion penalty shape.** (needed for 1.10)
The cap is ~20 and a second officer restores effectiveness. But what *is* the penalty — reduced damage, reduced accuracy, slower attack speed? And is it a cliff at 21 or a gradient? A gradient is more forgiving; a cliff is more legible, which matters given the doc wants this readable on the battlefield rather than a hidden stat. **Leaning gradient starting at the cap, but shown explicitly in the UI.**

**Q5 — Is the Chronicler the officer, and does it exist in Phase 1?**
Cohort's roster has no unit labelled "officer." Chronicler (support/detector, extends Command range) is the natural fit, but blueprint 1.8 only asks for Legionnaire and Marksman. I'll add a minimal Chronicler purely as the cohesion officer unless you'd rather I invent a dedicated one.

**Q6 — Combat targeting rule.** Blueprint says pick one: nearest enemy, or lowest HP. **Leaning nearest**, because lowest-HP targeting produces focus-fire behaviour that looks like micro, and the whole design is trying to make fights resolve on positioning instead.

**Q7 — Should the Phase 1 AI be beatable?** It needs to attack so combat is testable, but a scripted opponent that always wins or always loses teaches nothing. I'll aim for "loses to competent play, punishes doing nothing."

---

## ◐ Decisions I've already made that you may want to overturn

Each of these is live in the build right now.

**A1 — One resource type.** Just "essence." The doc never says how many. Adding a second is a data change, not structural.

**A2 — High ground gives a damage bonus vs. lower targets, plus vision range.** Blueprint said pick one; I kept both since vision is nearly free. Not yet wired to combat (nothing to attach it to until 1.9).

**A3 — Chronicler as officer.** See Q5.

**A4 — Command gates pop cap *and* simultaneous automated squads.** §8.3 says it should; blueprint 1.5 only required pop cap. The squad half arrives with 1.7.

**A5 — Phase 1 map.** One 180°-rotationally-symmetric map, two bases, four essence nodes, contested high ground between. Enforced by test.

**A6 — The resource is called "essence."** Placeholder I invented; it was floated in the early ChatGPT conversation. One string, trivially renamed.

**A7 — Control range does nothing mechanically.** ⚠️ *This is the one I'd most like your view on.* §8.1 says Command extends control range and pop cap together, but never says what control range is *for*. The obvious answer — restricting where you can build — is Conclave's "Project from Network" mechanic, and using it for Cohort would break the no-reskinning rule, since Cohort's identity is "Queue & Walk." So right now it's a ring on the ground that does nothing. Candidates: passive regen or repair inside it; required for rally/reinforcement; extends vision; enables automated squads only within it (ties §8.3 to territory); or purely cosmetic territory display forever.

**A8 — More workers don't build faster.** Construction runs at a flat rate whenever at least one assigned worker is present. Piling workers onto a building to rush it is a different race's fantasy, and Cohort's whole curve is "flat and reliable." But it does make construction feel slightly inert — worth a second look.

**A9 — Automation slots are Command / 8.** Starting Command (15) buys one
concurrent chain; the first Outpost (+8) buys the second. See Q19.

**A10 — A manual order stops a running chain outright.** See Q18.

**A11 — A `gather` chain step targets the nearest *live* node to the point you
clicked**, not one specific node, so the step keeps working after that node is
mined out. Consistent with how 1.4's set-and-forget loop re-targets on its own.

**A12 — Shield-wall counts a local adjacency cap, not the squad cohesion cap.**
See Q22.

**A13 — A Marksman takes ~1s of standing still to be fully "set up."** The doc
says it's better stationary; it never says how long that takes.

---

## ⚠️ New with 1.7 (squads & behaviour chains)

**Q17 — Should *forming* a squad cost Command, or only *running* a chain?**
Right now forming is free and unlimited (up to five squads); the Command cap
only refuses you when you try to **run** a second chain simultaneously. That
reads well — you can plan as much as you like, you just can't execute it all at
once — and it matches §8.3's "number of squads that can run an automated
command chain simultaneously" fairly literally. But it does mean the cap is
invisible until the moment it bites. **Leaning as built.**

**Q18 — Should a manual order *stop* a chain or *pause* it?**
Currently it stops: right-clicking a move order at any squad member takes that
squad off automation, and you press Run again to resume from step 1. The
alternative is pausing — you interrupt, and it picks the chain back up where it
left off once you stop giving orders. Stopping is more predictable and never
surprises you by resuming; pausing is less typing when you just want to nudge a
squad mid-route. §4 only says "continues until redirected", which doesn't
settle it. **Leaning stop, but this is the one I'd most like you to feel.**

**Q19 — Is 8 Command per automation slot the right rate?** (A9)
Chosen so you start with exactly one slot and your first Outpost visibly buys
the second, making the mechanic legible early. Whether one chain at the opening
is *fun* or just restrictive is a feel question. Pure tuning either way.

**Q20 — Should a squad be able to hold a mixed chain of economy and army steps?**
Nothing stops you putting a `gather` step in a chain of legionnaires — the
non-workers just stand guard at the point while any workers in the squad mine.
That fell out of the implementation rather than being designed. It might be a
nice bit of emergent flexibility (a squad that escorts its own miners), or it
might be muddle.

**Q21 — Chain step cap is 6, squad cap is 5.** Both arbitrary. The step cap
matters more than it looks: Mycora's whole supply identity (§8.3) is gating
chain *complexity*, so whatever number Cohort sits at becomes the baseline that
Mycora is measured against later.

---

## ⚠️ New with 1.8 (core units)

**Q22 — "Defense bonus per adjacent Legionnaire up to cohesion cap" (§8.7) —
which cap?** Two readings: (a) a *local* limit on how many touching neighbours
can help you, or (b) §8.6's ~20-unit squad cohesion cap. I built (a), capped at
5, because that's the one that means something physically — only so many bodies
fit around you — and because (b) is 1.10's job and would make the two mechanics
do the same work twice. Worth confirming, since it changes what a big Cohort
blob feels like.

**Q23 — How long should a Marksman take to set up?** (A13) Currently ~1s of
holding position to go from moving accuracy to full. Shorter makes kiting
viable again; longer makes repositioning feel punishing. This is the dial that
decides whether the unit reads as "reward for planning" or "annoying to move".

**Q24 — Should the Marksman replace or sit beside the Legionnaire in the
opening?** Both cost 2 Command and similar essence, so right now there's no
real reason to build one over the other until combat exists at 1.9.

---

## ⚠️ Art direction (new reference received)

**Q25 — When do we do the renderer pass, and how far?**
You've given three constraints that mostly agree with each other and one that
fights the others: BOTW/Ghibli look, don't be needlessly low-poly, lighting
matters — and **it has to run on practically any machine from a website**.

Reading the reference pen resolved most of that tension. The Ghibli quality is
in the *shading model* (hue-path colour ramp, half-lambert wrap, hue-shifted
shadows, tinting ambient, backlight rim), which is cheap fragment maths. The
expensive parts — per-blade instanced grass, planar reflections, the full post
chain — are what would break the low-end target, and at a far top-down RTS
camera they buy far less than they do in first person.

So "Ghibli" and "runs anywhere" are not really in conflict, **as long as we
take the light model and not the technique stack.**

On "not too low-poly": that's the easy one. Triangles are nearly free on any
GPU made this decade; what actually kills low-end machines is draw calls,
fillrate and overdraw. We can raise geometry detail substantially — the units
are currently 6-sided cylinders, which is cruder than we need — provided we
instance repeated meshes and keep the material count small.

The real question is **scheduling**, because the blueprint puts polish in Phase
4.4 and we're mid-Phase-1:
- **(a) Now, scoped to the light model.** A shading pass plus a quality-tier
  system, then back to 1.9. Costs a step's worth of time; the payoff is that
  every asset after this is authored against the real look instead of being
  redone later.
- **(b) After 1.13 playtest.** Follows the plan as written, and the playtest is
  about whether the *game* works, which doesn't need final art.
- **(c) Full port of the reference's techniques.** I'd argue against this — it
  contradicts the low-end requirement, and most of it is invisible from an RTS
  camera.

**Leaning (a) but scoped tightly**, mainly because art direction is the thing
§10 calls expensive to un-make, and everything we build from here inherits it.

**Q26 — What is the actual low-end target?** "Practically any machine" needs a
number to design against. Integrated graphics from roughly 2017 on, at 1080p,
30fps, with maybe 60 units on screen? That's a concrete budget I can hold the
renderer to and test against. Without one I'm guessing.

---

## ◐ Design gaps that will block Phase 2+

**Q8 — Hero archetypes.** Section 11 lists these as undesigned, and blueprint 3.3 explicitly says they need a design pass with you before implementation. Not urgent, but it's the largest undesigned system.

**Q9 — Do Conclave and Titanfolk want a naming pass?** Now that the elemental framing is explicit (Water, Earth), "The Current" and "Titanfolk" carry less flavour than "Cohort" and "Mycora" do. Might be fine as-is.

**Q10 — Mycora unit naming and visual language.** Deferred to Phase 2. Your *Nausicaä* × *The Last of Us* reference is logged in the design doc for that pass.

**Q11 — Weather.** Section 7 defines air/weather interactions in detail, but weather itself has no mechanics anywhere. Phase 4 problem, flagged so it isn't forgotten.

---

## ○ Feel and tuning — answer after you've actually played it

These need a human at the controls; they can't be reasoned out.

**Q12 — Does the base read as a dead thing still twitching, or as a machine with a power source?** The single most important subjective question in the project so far. The whole Cohort concept collapses into the Necron problem if it's the latter.

**Q13 — Is the economy in the right order of magnitude?** Not asking for balance — just whether gathering, training, and building are broadly the right speed relative to each other.

**Q14 — Starting Command is 15 against 12 used**, so you hit the cap almost immediately. Deliberate, to make the mechanic visible fast. Probably wants more early headroom for real play.

**Q15 — Is construction time right?** An Outpost is 100 ticks (5 seconds) of a worker standing there. Long enough that pulling the worker off matters, short enough not to be boring — but that balance is the entire point of the pause mechanic, so it's worth feeling out.

**Q16 — Are the control-range rings useful or clutter?** Especially once there are several outposts and the rings overlap.

---

## ✅ Answered

*(Nothing yet — this section fills in as you work through the list.)*

---

*Updated through v1.8.*

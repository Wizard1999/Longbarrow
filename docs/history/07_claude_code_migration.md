# 07 — Migrating to Claude Code

Read this after `06_phase1_kickoff.md`. It supersedes that file's environment section only — everything else in `06` (module layout, the sim-purity rule, per-step acceptance criteria, assumptions A1–A8) still stands.

## Why now

Chat has no server, no `npm`, no ability to actually run the app — every build so far has been single-file HTML, and later steps were assembled with Python string-replacement against that one file rather than real edits. It worked, and it's tested, but step 1.7 (squads) is the first system where that stops being a reasonable way to work. Claude Code gets a real project: a dev server, a type checker, and the ability to run both the app and the test suite directly instead of reasoning about whether they'd pass.

## Status at handoff

| Step | State |
|---|---|
| 1.1 Project structure | **Not started — this is Claude Code's first task, see below** |
| 1.2 Fixed-tick simulation | ✅ Done, tested |
| 1.3 High ground | Groundwork only (`elevationAdvantage`, `hasHighGroundOver`) — not wired to anything yet, since nothing needs it until combat |
| 1.4 Worker gather loop | ✅ Done, tested |
| 1.5 Command supply | ✅ Done, tested |
| 1.6 Queue & Walk construction | ✅ Done, tested |
| 1.7 Squads & behaviour chains | **⚠️ In progress — sim logic only, not wired to input/UI, not tested. See below.** |
| 1.8–1.13 | Not started |

**85 tests passing** as of 1.6 (`test_sim.mjs`). 1.7's simulation code is written and parses standalone, but has no test coverage and no way to trigger it from the game yet — nothing calls `createSquad`, `stepSquads` isn't in the tick, and there's no UI for building a chain. Treat it as a rough draft of the logic, not a finished step.

## Files to bring over

Everything in this list should be in the project folder before you open Claude Code.

**Design & planning (read in this order):**
`00_START_HERE_FOR_OPUS.md` → `01_design_document.md` → `02_development_blueprint.md` → `06_phase1_kickoff.md` → this file

**Context (read if useful, not authoritative over the above):**
`03_chat_transcript.md`, `04_original_reference_conversation.md`, `README.md`

**Living tracking files (all current through v1.6):**
`CHANGELOG.md`, `OPEN_QUESTIONS.md`, `VERIFICATION_CHECKLIST.md`

**Working code:**
`05_phase0_prototype.html` (original tech spike, for reference only)
`phase1_step1.2_fixed_tick.html` through `phase1_step1.6_construction.html` (validated, in order)
`phase1_step1.7_squads_IN_PROGRESS.html` (draft — see below)
`test_sim.mjs` (85 passing tests against 1.6)

**Important:** `01_design_document.md` in this set is the *current* version — it has the elemental framing and Cohort's revised visual identity (§8.8) that a copy from earlier in the project won't have. If there's an older copy sitting anywhere, this one wins.

## First task: 1.1, but as a real migration

Instead of a blank Vite scaffold, 1.1 here means: stand up the project (Vite + TypeScript + Three.js via npm, per `06`), then port the *validated* logic in `phase1_step1.6_construction.html` into the module structure from `06` §2 — each `/* ---------- path.ts ---------- */` comment in the source marks where that block belongs. The sim-purity rule (`06` §3) already held in the single-file version; keep it holding.

Port `test_sim.mjs` to `vitest` at the same time rather than after — it's the thing that proves the port didn't silently break anything. All 85 should still pass once the module split is done, unchanged in behavior.

**Then finish 1.7** using `phase1_step1.7_squads_IN_PROGRESS.html` as a starting draft rather than from scratch. What's there and what's missing:

- Done: squad creation/persistence, chain data structure, the four Phase 1 behaviors (move, attack-move, gather, patrol) with ongoing-vs-completing semantics, a step timeout so an unreachable order can't wedge a chain forever, and `automationSlots()` deriving the Command-gated concurrent-chain cap per assumption A4.
- Missing: `stepSquads` isn't called from the tick; no commands exist to create/modify a squad from outside the sim; no input for selecting a squad, building a chain, or seeing it run; zero tests.
- Two open questions this step depends on, both in `OPEN_QUESTIONS.md` — **Q1** (squads as persistent named groups, which is what got built) and **Q3** (chains loop by default — implemented that way, `squad.loop` defaults true). Both are reasonable defaults, not confirmed with the designer.

Once 1.7 is genuinely done — wired in, tested, playable — resume the normal loop from `00_START_HERE_FOR_OPUS.md`: state what's next, do it, summarize, pause at phase boundaries and architectural decisions.

## Keep the tracking files alive

`CHANGELOG.md` gets an entry per version regardless of which environment produced it — same format, just switch the `Environment:` field to `Claude Code`. Add to `OPEN_QUESTIONS.md` rather than resolving things unilaterally; the designer is working through that list on their own schedule. `VERIFICATION_CHECKLIST.md` gets a new section per step, matching the existing style: concrete, checkable, no jargon. Append — the designer hasn't gone through everything on the list yet.

# Agent Reasoning and Work Quality Protocol

This document defines how coding agents should approach Longbarrow work. It is
part of the project memory and must be considered before implementing, reviewing,
or planning substantial changes.

## Purpose

Longbarrow is large enough that plausible-looking edits are not sufficient.
Agents must understand the request, inspect the relevant systems, reason about
architecture and downstream effects, implement the smallest coherent change,
and verify both code and documentation.

A structured checklist often improves specificity and reduces missed
constraints. It is a **work discipline**, not evidence of a secret model mode or
of any particular internal architecture. Agents should use the structure
privately and report conclusions, decisions, evidence, and verification—not
private chain-of-thought transcripts.

## Required five-stage pass

Before substantial work, silently complete this pass:

1. **UNDERSTAND**
   - What outcome is the designer actually asking for?
   - Which statements are hard requirements, preferences, references, or future
     backlog items?
   - What would count as finished?

2. **ANALYZE**
   - Which files, systems, tests, decisions, and art references are relevant?
   - What architectural boundaries could be affected?
   - What assumptions need validation before editing?

3. **REASON**
   - What dependencies and second-order effects follow from the change?
   - What is the smallest coherent implementation that does not create rework?
   - What failure modes, performance costs, determinism risks, or UX regressions
     should be anticipated?

4. **SYNTHESIZE**
   - Combine design intent, architecture rules, current priorities, and available
     evidence into one implementation plan.
   - Resolve conflicts in favor of locked decisions and explicitly record any new
     decision that must be made.

5. **CONCLUDE / EXECUTE**
   - Implement the selected approach.
   - Add or update tests where behavior changes.
   - Run the relevant verification commands.
   - Update `CURRENT_STATE.md`, `PROGRESS.md`, `TODO.md`, `CHANGELOG.md`, and
     `DECISIONS.md` as applicable.
   - Report what changed, what was verified, and what remains uncertain.

## Domain variants

Use the same discipline with vocabulary suited to the task.

### Creative and visual work

**UNDERSTAND → EXPLORE → CONNECT → CREATE → REFINE**

Preserve locked faction identity, compare against first-party concept art,
separate visual targets from technical references, then refine for RTS camera
readability and performance.

### Architecture and analysis

**DEFINE → EXAMINE → COMPARE → EVALUATE → CONCLUDE**

Inspect existing boundaries before proposing new abstractions. Prefer a clear
comparison of alternatives and select based on determinism, maintainability,
performance, testability, and player experience.

### Debugging and problem solving

**CLARIFY → DECOMPOSE → GENERATE → ASSESS → RECOMMEND**

Reproduce first, isolate the failing layer, generate targeted hypotheses, test
those hypotheses, then fix the root cause rather than masking symptoms.

## Longbarrow-specific questions

Every meaningful change should consider these questions:

- Does this preserve `src/sim/` determinism and its no-outward-import rule?
- Does it support intent-driven RTS play rather than adding unnecessary micro?
- Is it readable from the war-table camera at realistic play distance?
- Does it reinforce the locked visual identity instead of drifting toward a
  familiar genre faction?
- Will it work acceptably in a browser on modest hardware?
- Can it be tested in the developer sandbox?
- Does it need a tuning value in `src/data/` rather than a hardcoded constant?
- Have public progress information and internal logs remained synchronized?
- Is the result reproducible by the next coding agent without chat context?

## Evidence and honesty rules

- Never claim a test, build, benchmark, deployment, or visual inspection passed
  unless it actually ran and produced that result.
- Separate observed facts from inferences and design proposals.
- Treat external prompt-engineering claims as hypotheses unless backed by
  reliable evidence.
- Do not use polished language to hide uncertainty.
- Do not expose private chain of thought. Provide concise rationale, alternatives,
  decisions, and verification evidence instead.

## Completion record

A substantial task is not complete until:

- code or documentation is in the correct permanent location;
- affected tests are added or updated;
- verification has run, or the exact blocker is logged;
- roadmap/progress/current-state documents agree;
- newly supplied references or designer decisions are not left only in chat;
- the next agent can resume from repository files alone.

## Source note supplied by the designer

The designer supplied a prompt-engineering note advocating a five-step structure:

> UNDERSTAND → ANALYZE → REASON → SYNTHESIZE → CONCLUDE

and domain variants such as:

> UNDERSTAND → EXPLORE → CONNECT → CREATE → REFINE
>
> DEFINE → EXAMINE → COMPARE → EVALUATE → CONCLUDE
>
> CLARIFY → DECOMPOSE → GENERATE → ASSESS → RECOMMEND

The useful, durable project decision is to adopt these as explicit quality
checklists. Claims in the original note about hidden modes, measured percentage
improvements, or matching a model's internal architecture are not treated as
established facts.


## Versioned handoff naming

Extracted work folders and packaged archives must include the build version, for example `Longbarrow-v1.14.0-work` and `Longbarrow-v1.14.0-59pct.zip`. Do not hand off generic `Longbarrow-main` folders when a version is known.

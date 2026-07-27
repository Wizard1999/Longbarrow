# START HERE

> **First, check the git remote.** The home of this project is
> **`Wizard1999/Longbarrow`**, not the older `Wizard1999/RTS`.
>
> ```bash
> git remote -v          # origin must be .../Wizard1999/Longbarrow
> ```
>
> Remote-execution containers are recreated between sessions and re-clone from
> whichever repository the session was originally attached to, which silently
> resets `origin` back to `RTS`. This has already happened once and sent a
> commit to the wrong repository. If `origin` is wrong, fix it before pushing:
>
> ```bash
> git remote rename origin rts-old
> git remote add origin https://github.com/Wizard1999/Longbarrow
> ```

Every new session begins here. Read these, in order:

1. **`CLAUDE.md`** — what the project is, the architecture rule, the coding rules
2. **`docs/AGENT_REASONING.md
- `docs/ENGINE_VISION.md` — open RTS engine and creator-platform direction`** — the required structured quality and reasoning protocol
3. **`docs/CURRENT_STATE.md`** — what was just done, what is in flight, what is next
4. **`docs/TODO.md`** — the prioritized work queue
5. **`docs/DECISIONS.md`** — decisions already made; do not relitigate these
6. **`docs/BUGS.md`** — known defects

Read on demand, not every session:

- `docs/GAME_DESIGN.md` — the full design bible (races, economy, combat, phases)
- `docs/UI_BLUEPRINT.md` — the target command interface
- `docs/ARCHITECTURE.md` — module-by-module map of the codebase
- `docs/ROADMAP.md` — phase plan
- `docs/OPEN_QUESTIONS.md` — things needing a designer decision
- `docs/CHANGELOG.md` — version history

## The loop

```
Read START_HERE.md + referenced files
Apply AGENT_REASONING.md privately
        ↓
Do the work
        ↓
npm test && npm run typecheck
        ↓
Update CURRENT_STATE.md (+ DECISIONS.md if a decision was made)
        ↓
git commit
```

## When context is running low

Ask for, or proactively produce, a full `CURRENT_STATE.md` rewrite covering:
architecture decisions, files changed, unfinished work, bugs, next steps, and
design philosophy. Do not omit details. Then start a fresh session from this file.

## Conversation hygiene

Keep separate concerns in separate sessions. The docs are the shared memory,
not the chat history:

- Design / lore / balance → one session
- Engine + architecture → another
- UI and interface work → another
- AI opponent → another

## Current objective

See `docs/CURRENT_STATE.md § Currently Working On`.


## Versioned handoff naming

Extracted work folders and packaged archives must include the build version, for example `Longbarrow-v1.14.0-work` and `Longbarrow-v1.14.0-59pct.zip`. Do not hand off generic `Longbarrow-main` folders when a version is known.

## Public roadmap invariant

- Treat `docs/ROADMAP.md` as public product data: run `npm run sync:site` after roadmap/progress edits and verify the full roadmap appears on `/development.html`.

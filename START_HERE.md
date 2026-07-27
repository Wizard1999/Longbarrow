# START HERE

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

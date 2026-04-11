# AGENTS

Read order for every Codex session:
1. `docs/product-spec.md`
2. `docs/project-state.md`
3. `docs/_local/current-session.md` if it exists

Rules:
- Treat `docs/product-spec.md` as product truth.
- Treat `docs/project-state.md` as durable repo memory.
- Treat `docs/_local/current-session.md` as local working memory.
- Update `docs/project-state.md` only when architecture, roadmap, or major decisions change.
- Update `docs/_local/current-session.md` at the end of every meaningful task.
- Never store secrets.
- Keep notes concise.
- Prefer exact next steps, changed files, constraints, and verification commands over long prose.
- Follow existing repository architecture and conventions.
- Avoid speculative notes.

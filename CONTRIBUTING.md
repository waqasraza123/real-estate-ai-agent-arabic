# Contributing

Start every session by reading:
1. `docs/product-spec.md`
2. `docs/project-state.md`
3. `docs/_local/current-session.md` if it exists

## Contribution Rules

- Treat `docs/product-spec.md` as the product source of truth until implementation matures.
- Keep `docs/project-state.md` durable and update it only for architecture, roadmap, or major decision changes.
- Keep `docs/_local/current-session.md` concise and local-only.
- Never store secrets in tracked or local memory files.
- Do not claim existing implementation that does not exist.
- State assumptions explicitly instead of guessing.
- Prefer reusable modules over large multi-purpose files.
- Use descriptive and consistent names.
- Write production-grade code with typing, validation, and error handling.
- Do not add code comments unless truly necessary.
- Keep commit messages under 140 characters.

## Workflow

1. Confirm the current product and repo context from the docs.
2. Make the smallest change set that moves the roadmap forward cleanly.
3. Update `docs/project-state.md` if the architecture, roadmap, or major decisions changed.
4. Update `docs/_local/current-session.md` at the end of the task.
5. Run verification commands relevant to the change before committing.

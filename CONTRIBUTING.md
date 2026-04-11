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

## Push Safety

- Versioned hooks live in `.githooks/`.
- Run `pnpm setup:githooks` after cloning or if hooks stop firing.
- `git push` is protected by `.githooks/pre-push`, which runs `scripts/verify-push.sh`.
- `pnpm verify:push` runs the exact verification sequence used by the hook.
- `pnpm safe-push` is the AI-friendly command. It wires hooks, runs verification, and then pushes.
- Push verification currently requires:
  - `pnpm typecheck`
  - `pnpm test:fast`
  - `pnpm build`

## Browser Testing

- `pnpm test:web-smoke` runs the fast critical-path Playwright checks and excludes visual snapshot tests.
- `pnpm test:web-visual` runs opt-in visual regression coverage for top demo routes.
- `pnpm test:web-visual:update` refreshes visual baselines when an intentional UI change is accepted.
- Keep visual regression focused on seeded, stable demo routes so snapshot noise stays low.

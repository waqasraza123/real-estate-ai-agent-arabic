# AI Agent for Automated Real Estate Sales, Leasing & Handover

This repository is starting from a documentation-first bootstrap. The product brief is captured before implementation so future work can stay aligned, typed, testable, and production-grade.

## Source Of Truth

- Product truth: `docs/product-spec.md`
- Durable repo memory: `docs/project-state.md`
- Local working memory: `docs/_local/current-session.md`
- Session instructions for Codex: `AGENTS.md`

## Current State

No application code or architecture has been implemented yet. The current repository contains only the minimum durable documentation needed to turn the product idea into working project context.

## Working Rules

- English and Arabic are first-class product languages.
- Arabic must be implemented as a first-class RTL experience.
- Testing matters from the beginning.
- Code must stay modular, typed, validated, and maintainable.
- Secrets must never be committed.

## Verification

```bash
git status --short
test -f AGENTS.md
test -f README.md
test -f CONTRIBUTING.md
test -f docs/product-spec.md
test -f docs/project-state.md
test -f docs/_local/current-session.md
git check-ignore -v docs/_local/current-session.md
```

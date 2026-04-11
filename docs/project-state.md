# Project State

## Product
- Product name: AI Agent for Automated Real Estate Sales, Leasing & Handover
- Primary markets: United States and Saudi Arabia
- Primary languages: English and Arabic
- Product truth lives in `docs/product-spec.md`

## Current Architecture
- No application architecture exists yet
- Current repository state is a documentation-first bootstrap
- Durable memory is kept in `docs/project-state.md`
- Local working memory is kept in `docs/_local/current-session.md` and must remain uncommitted

## Non-Negotiable Rules
- Never store secrets in repository memory files
- Arabic must be treated as a first-class RTL experience
- Testing must matter from the beginning
- Avoid speculative implementation claims
- Code should be modular, typed, validated, and maintainable
- Keep commit messages under 140 characters

## Current Roadmap
- Establish initial implementation architecture and stack choices
- Define the first end-to-end lead intake to qualification slice
- Define bilingual UX foundations including RTL support
- Define initial data model, workflow states, and audit requirements
- Define the testing baseline before feature implementation expands

## Completed Major Slices
- Bootstrapped durable repo memory and operating instructions
- Captured the initial product spec from the project brief
- Established local-only session memory via `docs/_local/`

## Important Decisions
- `docs/product-spec.md` is the durable product source of truth until implementation matures
- `docs/project-state.md` is the durable repository memory file
- `docs/_local/current-session.md` is local working memory and must be ignored by git
- No implementation architecture has been selected yet to avoid premature coupling

## Deferred / Not Yet Implemented
- Frontend application
- Backend services
- Data model and persistence layer
- Authentication and authorization
- External integrations
- Dashboards and analytics
- Testing infrastructure beyond document-level verification

## Risks / Watchouts
- Premature stack decisions could bias the architecture before workflows are clear
- Arabic UX can degrade quickly if RTL support is not designed from the foundation
- Omnichannel scope can sprawl without a disciplined first slice
- Auditability requirements can be missed if not designed early

## Standard Verification
- `git status --short`
- `test -f AGENTS.md`
- `test -f README.md`
- `test -f CONTRIBUTING.md`
- `test -f docs/product-spec.md`
- `test -f docs/project-state.md`
- `test -f docs/_local/current-session.md`
- `git check-ignore -v docs/_local/current-session.md`

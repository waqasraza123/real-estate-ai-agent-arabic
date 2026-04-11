# Project State

## Product
- Product name: AI Agent for Automated Real Estate Sales, Leasing & Handover
- Primary markets: United States and Saudi Arabia
- Primary languages: English and Arabic
- Product truth lives in `docs/product-spec.md`
- Product positioning is now defined as a premium bilingual operating layer for sales, leasing, and handover operations

## Current Architecture
- Implemented architecture now includes a TypeScript monorepo foundation with `apps/web` and `apps/api`
- Shared packages implemented are `domain`, `i18n`, `ui`, `testing`, `contracts`, `database`, and `workflows`
- Root tooling now includes `pnpm` workspaces, `turbo`, TypeScript base config, ESLint, Vitest, Playwright, and a versioned pre-push safety system
- The web application is a Next.js App Router shell with EN and AR routes, RTL-aware layout switching, seeded fixtures, and placeholder Phase 1 surfaces
- The API application is a Fastify service with schema-validated website lead intake and manager-readable case list and case detail endpoints
- The current persisted alpha store uses Drizzle over local `PGlite` for safe Phase 2 development without introducing remote infrastructure
- `apps/worker`, `integrations`, `analytics`, and `config` remain planned and unimplemented
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
- Phase 1A: Flagship Demo Core covering the bilingual web shell, seeded data, dashboard, inbox, conversation console, scheduling, document, handover, and manager views
- Phase 1B: Demo hardening for motion, state quality, responsive refinement, and stronger visual coverage
- Phase 2: functional alpha covering lead capture to qualification to visit scheduling to follow-up to manager review
- Phase 2 has started with persisted website lead capture and manager-visible case APIs
- Phase 3: leasing and document workflows
- Phase 4: handover command center
- Phase 5: hardening and enterprise controls

## Completed Major Slices
- Bootstrapped durable repo memory and operating instructions
- Captured the initial product spec from the project brief
- Established local-only session memory via `docs/_local/`
- Upgraded `docs/product-spec.md` from the full v2 source specification into the authoritative product document
- Added planning docs for repo architecture, domain model, user journeys, roadmap, testing, i18n, and Intel Mac local development
- Implemented `Phase 1A: Flagship Demo Core`
- Added the monorepo workspace, shared package shells, Next.js web shell, bilingual routing, premium landing/dashboard/inbox/profile/conversation/scheduling/documents/handover/manager screens, and smoke-test coverage
- Added a versioned safe-push system with `.githooks/pre-push`, `scripts/verify-push.sh`, `scripts/safe-push.sh`, and root push-verification scripts
- Started Phase 2 with a persisted alpha API slice for website lead capture and manager-readable case visibility
- Added `apps/api` plus shared `contracts`, `database`, and `workflows` packages with integration-tested lead intake and case retrieval endpoints

## Important Decisions
- `docs/product-spec.md` is the durable product source of truth until implementation matures
- `docs/project-state.md` is the durable repository memory file
- `docs/_local/current-session.md` is local working memory and must be ignored by git
- The implementation architecture is a modern TypeScript monorepo
- Next.js is the planned web application framework
- Fastify is the planned application API framework
- BullMQ on Redis is the planned async workflow layer
- PostgreSQL with Drizzle is the planned persistence direction
- The first implementation phase is `Phase 1A: Flagship Demo Core`, which is web-first and fixture-backed
- Phase 1A intentionally uses seeded local fixtures instead of real persistence, live AI execution, or external providers
- The first persisted Phase 2 slice uses local `PGlite` with Drizzle for safe local development while keeping PostgreSQL as the production persistence target
- Website lead intake is the first persistence-backed workflow boundary before qualification, scheduling, or follow-up automation are introduced
- The repository uses a versioned `core.hooksPath` pointing to `.githooks`
- Normal `git push` runs `scripts/verify-push.sh` via `.githooks/pre-push`
- `pnpm safe-push` is the preferred AI-facing push command

## Deferred / Not Yet Implemented
- Worker services and durable background job orchestration
- Authentication and authorization
- External integrations
- Dashboards and analytics
- Agent orchestration and workflow automation
- Real provider integrations
- Real AI execution and automation enforcement
- Qualification logic, visit scheduling, follow-up automation, and manager intervention tooling above basic case visibility
- Web-to-API wiring for persisted lead submission and manager case views

## Risks / Watchouts
- Arabic UX can degrade quickly if RTL support is not designed from the foundation
- Omnichannel scope can sprawl without a disciplined first slice
- Auditability requirements can be missed if not designed early
- The premium product promise raises the bar for motion, state design, and visual quality from the first demo
- AI trust will fail quickly if escalation, approval, and inspection paths are not explicit
- The web shell must not drift into mixed fixture and persisted state without an explicit boundary during Phase 2
- The local `PGlite` alpha store is a development convenience and must not be mistaken for the long-term production deployment model

## Standard Verification
- `git status --short`
- `pnpm typecheck`
- `pnpm test:fast`
- `pnpm test:web-smoke`
- `pnpm build`
- `pnpm lint`
- `pnpm verify:push`
- `git check-ignore -v docs/_local/current-session.md`

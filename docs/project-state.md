# Project State

## Product
- Product name: AI Agent for Automated Real Estate Sales, Leasing & Handover
- Primary markets: United States and Saudi Arabia
- Primary languages: English and Arabic
- Product truth lives in `docs/product-spec.md`
- Product positioning is now defined as a premium bilingual operating layer for sales, leasing, and handover operations

## Current Architecture
- Implemented architecture now includes a TypeScript monorepo foundation with `apps/web`, `apps/api`, and `apps/worker`
- Shared packages implemented are `domain`, `i18n`, `ui`, `testing`, `contracts`, `database`, and `workflows`
- Root tooling now includes `pnpm` workspaces, `turbo`, TypeScript base config, ESLint, Vitest, Playwright, and a versioned pre-push safety system
- The web application is now a hybrid Next.js App Router shell: premium seeded Phase 1 surfaces remain available, while the lead intake, lead detail, scheduling, documents, and manager routes can use persisted alpha data from `apps/api`
- The API application is a Fastify service with schema-validated website lead intake, qualification, visit scheduling, follow-up-plan mutation, automation control, document state mutation, manager-readable case list and case detail endpoints, and persisted handover intake, milestone-planning, customer-update-boundary, and readiness-task endpoints
- The worker application is a narrow background follow-up processor that polls the local alpha queue, opens overdue manager interventions, and respects per-case automation pause or resume state
- The current persisted alpha store uses Drizzle over local `PGlite` for safe Phase 2 and early Phase 3 development without introducing remote infrastructure
- `integrations`, `analytics`, and `config` remain planned and unimplemented
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
- Core Phase 2 is now live locally through the website lead -> qualification -> visit scheduling -> manager review path
- Phase 3: leasing and document workflows
- Early Phase 3 is now live locally through persisted document request tracking, queue-backed follow-up interventions, automation pause or resume controls, and manager follow-up reset actions
- Phase 4: handover command center
- The first persisted Phase 4 intake boundary is now live locally: manager-approved promotion from document-complete cases into handover intake with readiness-task tracking
- The next persisted Phase 4 planning boundary is now live locally: manager-visible milestone planning and approval-only customer-update readiness states on each handover record
- The next persisted Phase 4 scheduling boundary is now live locally: appointment planning and internal confirmation on each handover record behind explicit customer-update approvals
- The next persisted Phase 4 outbound-preparation boundary is now live locally: appointment-confirmation delivery preparation and dispatch-ready promotion into a scheduled handover state without provider sending
- The next persisted Phase 4 execution-readiness boundary is now live locally: scheduled handover blockers and snag tracking with visible owner, severity, due time, and audit history
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
- Extended the persisted alpha slice across the web app with live website lead submission, persisted lead detail routes, qualification updates, visit scheduling, and manager review
- Added the first persisted document workflow slice with seeded document requirements, status updates, audit events, and live document-center rendering
- Added `apps/worker` plus queue-backed overdue follow-up processing, persisted manager interventions, automation pause or resume controls, and manager follow-up reset actions
- Added the first persisted handover slice with manager-approved intake creation, seeded readiness tasks, handover audit events, and live handover-task status updates
- Added the next persisted handover slice with milestone planning, customer-update approval boundaries, linked audit events, and live handover milestone/customer-boundary controls
- Added the next persisted handover slice with appointment planning, internal confirmation, linked audit events, and live handover appointment controls
- Added the next persisted handover slice with outbound delivery preparation, dispatch-ready promotion, scheduled-state progression, linked audit events, and live delivery-boundary controls
- Added the next persisted handover slice with scheduled-boundary blocker logging, snag tracking, blocker updates, linked audit events, and live execution-readiness controls
- Strengthened push verification to include lint and API integration tests in addition to typecheck, fast tests, and build

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
- The first background-automation slice uses a local `PGlite` queue model in `apps/worker` before Redis or BullMQ are introduced
- The web app intentionally falls back to seeded demo data when `apps/api` is unavailable so the premium shell remains buildable and demo-safe
- The first persisted handover boundary starts only from document-complete cases and now includes milestone planning, approval-only customer-update readiness, internal appointment planning or confirmation, and dispatch-ready preparation, while provider sending and completion automation remain deferred
- Handover appointment planning is gated by approved scheduling readiness and internal confirmation is gated by a separate approved confirmation boundary
- The appointment-confirmation update must be explicitly prepared and then marked dispatch-ready before the handover record is promoted into a scheduled state
- Execution blockers and snags can only be logged after the handover record reaches the scheduled boundary
- Push verification now covers lint and API integration tests because the repo has meaningful backend behavior, not just shell code
- The repository uses a versioned `core.hooksPath` pointing to `.githooks`
- Normal `git push` runs `scripts/verify-push.sh` via `.githooks/pre-push`
- `pnpm safe-push` is the preferred AI-facing push command

## Deferred / Not Yet Implemented
- Authentication and authorization
- External integrations
- Dashboards and analytics
- Agent orchestration and workflow automation
- Real provider integrations
- Real AI execution and automation enforcement
- Deeper qualification policy logic and approval boundaries beyond the current structured alpha form
- Redis or BullMQ-backed durable job orchestration beyond the current local alpha worker
- Leasing-specific rejection reasons and policy rules beyond the current shared document-request model
- Real outbound customer communication, appointment execution, provider callbacks, and completion workflows beyond the current handover planning, internal confirmation, dispatch-ready, and blocker-tracking boundary

## Risks / Watchouts
- Arabic UX can degrade quickly if RTL support is not designed from the foundation
- Omnichannel scope can sprawl without a disciplined first slice
- Auditability requirements can be missed if not designed early
- The premium product promise raises the bar for motion, state design, and visual quality from the first demo
- AI trust will fail quickly if escalation, approval, and inspection paths are not explicit
- The web shell must not drift into mixed fixture and persisted state without an explicit boundary during Phase 2
- The local `PGlite` alpha store is a development convenience and must not be mistaken for the long-term production deployment model
- The current local queue model is intentionally transitional and must not be mistaken for the long-term distributed worker architecture
- Phase 4 should not be overextended prematurely; the current handover slice is intentionally limited to intake, milestone planning, approval-only customer boundaries, internal appointment confirmation, dispatch-ready preparation, and blocker tracking, not live provider sending or completion automation

## Standard Verification
- `git status --short`
- `pnpm typecheck`
- `pnpm test:fast`
- `pnpm test:web-smoke`
- `pnpm build`
- `pnpm lint`
- `pnpm verify:push`
- `git check-ignore -v docs/_local/current-session.md`

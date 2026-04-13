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
- The worker application is a narrow background follow-up processor that polls the local alpha queue, opens overdue manager interventions, and respects both manual automation pause state and derived QA-driven automation holds
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
- The next persisted Phase 4 execution-day boundary is now live locally: scheduled handover records can move into a real in-progress state and then close through a controlled completion summary without provider callbacks
- The next persisted Phase 4 aftercare boundary is now live locally: completed handover records can capture a manager review and one explicit post-handover follow-up boundary with owner, due time, and resolution summary
- The next persisted Phase 4 admin-closure boundary is now live locally: completed handover records can capture an archive review plus manual held, ready-to-archive, and archived statuses without external archive automation
- The next persisted Phase 4 manager-visibility boundary is now live locally: manager workspace and lead-list surfaces now expose derived handover closure signals for closure review required, aftercare open, held, ready-to-archive, and archived states
- Phase 5: hardening and enterprise controls
- The first persisted Phase 5 control boundary is now live locally: role-aware restrictions now protect post-completion review, aftercare follow-up, and archive mutations behind local handover-manager or admin control
- The next persisted Phase 5 control boundary is now live locally: role-aware restrictions now protect manager follow-up, automation, execution blockers, and execution-day transitions with visible UI guardrails and API-enforced permissions
- The next persisted Phase 5 control boundary is now live locally: role-aware restrictions now protect milestone planning, appointment planning or confirmation, and customer-update approval or delivery boundaries with shared permissions and visible UI guardrails
- The next persisted Phase 5 workspace boundary is now live locally: manager and list surfaces now separate active handover work into planning, execution, and closure views using case-summary handover state plus the current local operator role
- The next persisted Phase 5 session boundary is now live locally: the web shell issues signed local operator sessions, handover detail routes require a trusted session plus workspace access, and manager plus handover entry surfaces are now guarded by shared workspace rules
- The next persisted Phase 5 trust-hardening boundary is now live locally: the API now accepts only signed operator sessions, the integration harness has fully migrated off raw role headers, and invalid or legacy session attempts are rejected at the boundary
- The next persisted Phase 5 manager-routing boundary is now live locally: the blended manager command center is now split into dedicated revenue and handover routes, while the shared `/manager` entry redirects single-surface roles and acts as a chooser only when both command surfaces are valid
- The next persisted Phase 5 QA-policy boundary is now live locally: inbound website lead messages are automatically sampled into QA review when policy signals match, with localized summaries and persisted trigger evidence visible in queue and case detail surfaces
- The next persisted Phase 5 outbound-QA boundary is now live locally: prepared handover customer updates can automatically open a draft QA approval gate from policy-pack matches, the QA workspace can resolve those draft reviews, and dispatch readiness is blocked until the gate is cleared
- The next persisted Phase 5 governance-analytics boundary is now live locally: manager gateway, revenue, and handover command surfaces now expose cross-surface QA pressure, stale pending counts, and policy hotspots from the persisted intake-review plus outbound-draft-review state
- The next persisted Phase 5 governance-reporting boundary is now live locally: the API now exposes a trusted-session governance summary with 7-day activity and recent-event rollups across intake QA reviews and handover-draft QA gates, and manager routes render those historical trends alongside current pressure
- The next persisted Phase 5 revenue-draft-governance boundary is now live locally: sales managers can prepare customer reply drafts into the QA queue, automatic draft policy checks preserve matched evidence on the live case, and reviewer decisions stay visible across conversation, QA, and manager surfaces
- The next persisted Phase 5 exportable-governance-reporting boundary is now live locally: manager roles can open a dedicated governance report route with filterable detailed QA event history across revenue and handover, and export the current scope as CSV through the trusted local session path
- The next persisted Phase 5 automation-governance boundary is now live locally: open case QA reviews now suppress follow-up automation, clearing or follow-up-required outcomes derive an explicit case automation hold state, and revenue plus manager surfaces show that governance hold directly

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
- Added the next persisted handover slice with explicit execution start, controlled completion, persisted execution timestamps, completion summaries, linked audit events, and live handover-day controls
- Added the next persisted handover slice with post-completion manager review, explicit aftercare follow-up tracking, resolution summaries, linked audit events, and live post-handover controls
- Added the next persisted handover slice with administrative closure review, archive hold or ready decisions, manual archived status, linked audit events, and live archive-boundary controls
- Added the next persisted manager-visibility slice with derived handover-closure signals in case summaries, manager workspace metrics, closure queues, lead-list badges, and integration-tested list visibility for archived records
- Added the first persisted Phase 5 control slice with local operator-role switching in the web shell, API-enforced governance permissions on post-completion and archive mutations, localized role visibility, and integration coverage for restricted vs allowed roles
- Added the next persisted Phase 5 control slice with shared permission definitions, API-enforced restrictions on follow-up, automation, blocker, and execution actions, disabled UI controls with role guard notes, and production-server smoke stability for Playwright
- Added the next persisted Phase 5 control slice with shared planning permissions, API-enforced restrictions on milestones, appointments, and customer-update delivery boundaries, disabled UI controls with role guard notes, and integration coverage for restricted vs allowed planning actions
- Added the next persisted Phase 5 workspace slice with active handover summary state on case-list contracts, role-aware manager queues for planning, execution, and closure surfaces, and lead-list handover workflow visibility beyond closure-only status
- Added the next persisted Phase 5 session slice with shared signed local operator-session contracts, trusted handover-detail access checks, workspace-gated manager and handover routes, and the remaining intake and task mutations moved behind explicit handover permissions
- Added the next persisted Phase 5 trust-hardening slice with signed-session-only API enforcement, integration coverage for invalid and legacy session rejection, and full harness migration off the raw role header fallback
- Added the next persisted Phase 5 manager-routing slice with shared manager workspace helpers, dedicated revenue and handover command-center routes, a role-aware `/manager` gateway, expanded manager-route smoke coverage, and manager-path revalidation across server actions
- Added the next persisted Phase 5 QA-governance slice with a first-class `qa_reviewer` role, dedicated `/qa` workspace routes, persisted case-linked QA sampling and review records, localized QA forms and queue views, and role-aware integration plus smoke coverage
- Added the next persisted Phase 5 QA-policy slice with automatic intake-time QA trigger detection, localized policy-sample summaries, persisted trigger evidence and signal metadata, queue and case-detail visibility for manual vs policy-triggered reviews, and integration coverage for automatic review creation
- Added the next persisted Phase 5 outbound-QA slice with policy-pack checks on prepared handover customer updates, persisted per-draft QA review state and evidence, reviewer-only QA resolution from the `/qa` case surface, blocked dispatch-ready promotion until QA approval, and integration coverage for the new gate
- Added the next persisted Phase 5 governance-analytics slice with shared manager-side QA pressure derivation, revenue and handover governance attention queues, cross-surface policy hotspots, and manager-route smoke coverage for the new analytics surfaces
- Added the next persisted Phase 5 governance-reporting slice with a dedicated governance-summary API, 7-day QA activity rollups, recent governance event history across both QA scopes, workspace-gated report access, manager-route history panels, and integration coverage for the new reporting contract
- Added the next persisted Phase 5 revenue-draft-governance slice with prepared customer-reply draft submission into the existing case QA boundary, outbound reply-draft policy detection, persisted draft context on QA records and audit history, conversation plus QA surface rendering for the draft, and integration coverage for the new route and review lifecycle
- Added the next persisted Phase 5 exportable-governance-reporting slice with filterable governance-event contracts, normalized event reporting from audit history, a manager-only `/manager/governance` route, CSV export, manager-route entry links, and integration plus smoke coverage for the new reporting surface
- Added the next persisted Phase 5 automation-governance slice with derived case automation-hold state from QA reviews, worker-side suppression of overdue automation while QA is open, follow-up job re-arming when QA clears, manager and lead-surface hold visibility, and lifecycle coverage across API, worker, and manager-unit tests
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
- Handover-day execution can only start from the scheduled boundary after internal confirmation is complete and all open blockers are resolved
- Controlled handover completion can only happen from the in-progress boundary and must capture a completion summary on the persisted record
- Post-handover review and aftercare follow-up can only start after the handover record is completed
- Post-handover follow-up is explicitly gated by a saved review outcome that requires follow-up
- Administrative archive review can only start after the handover record is completed, the manager review exists, and any required aftercare follow-up is resolved
- Archive status is a manual admin boundary on the completed record with `held`, `ready`, and `archived` states; it does not trigger any external archive system
- Case summaries now expose a derived `handoverClosure` signal for manager and list surfaces instead of requiring full handover-detail fetches to render closure state
- The local authorization boundary now uses a signed `operator_session` cookie in the web shell and a signed `x-operator-session` header as the primary trusted path to the API
- The API now accepts only the signed `x-operator-session` header as its local trusted operator identity path; raw role headers are rejected
- Post-completion review, aftercare follow-up, archive review, and archive status changes are now explicitly limited to `handover_manager` and `admin` roles
- Follow-up-plan and automation controls are now limited to managerial roles in the local control model, while blocker updates are limited to handover-execution roles and execution-day transitions are limited to `handover_manager` and `admin`
- Milestone planning and appointment controls are now limited to handover coordination roles, while customer-update approval, delivery preparation, and dispatch-ready promotion are limited to `handover_manager` and `admin`
- Shared operator-permission definitions now live in `packages/contracts` so the web shell and API enforce the same local role model
- Case summaries now expose the linked active handover record so manager and list views can render planning and execution surfaces without fetching full handover detail
- The manager workspace now separates revenue follow-up, handover planning, handover execution, and handover closure as distinct local-control surfaces keyed off the current operator role
- Shared operator-workspace definitions now live in `packages/contracts`, with sales, handover, revenue-manager, and handover-manager access separated explicitly at the route and API boundary level
- The shared `/manager` route now redirects roles that own only one manager surface into their dedicated route, while dual-surface roles use `/manager` as an explicit chooser between `/manager/revenue` and `/manager/handover`
- Handover intake is now explicitly limited to `handover_manager` and `admin`, while live handover task status updates are now limited to handover coordination roles
- The local role model now includes a dedicated `qa_reviewer` role and `qa` workspace for explicit human inspection beyond manager routes
- QA sampling is now a case-linked persisted boundary with append-friendly review history, while queue surfaces and case detail use the latest review as the active QA state
- QA review requests are limited to managerial roles plus `admin`, while QA review resolution is limited to `qa_reviewer` and `admin`
- Automatic QA sampling now runs during website lead intake when the inbound message matches local policy heuristics, and the persisted review keeps explicit trigger source, signal list, and matched-evidence context
- Case QA reviews now carry an explicit subject type and optional prepared reply draft text so the same persisted review boundary can govern both inbound-message sampling and outbound revenue reply-draft approval without a parallel review system
- Prepared handover customer updates now carry their own persisted QA gate state, and dispatch-ready promotion is blocked whenever the latest draft review is pending or marked for follow-up
- Manager governance analytics now derive directly from the existing case-summary QA fields so revenue and handover command centers can show governance pressure without a separate reporting backend
- Historical governance reporting now comes from a dedicated summary endpoint aggregated from persisted QA records plus audit events, rather than expanding the case-list contract with trend data
- Detailed governance reporting and CSV export now come from a dedicated manager-only event-list endpoint plus web export route, instead of overloading the existing 7-day summary contract
- Case summaries now expose a derived `automationHoldReason` from the latest case QA review, and open or follow-up-required case QA states suppress queued follow-up automation until QA is cleared
- Push verification now covers lint and API integration tests because the repo has meaningful backend behavior, not just shell code
- Playwright smoke verification now runs against a production Next server because the dev-server path was intermittently unstable on the handover route in this environment
- The repository uses a versioned `core.hooksPath` pointing to `.githooks`
- Normal `git push` runs `scripts/verify-push.sh` via `.githooks/pre-push`
- `pnpm safe-push` is the preferred AI-facing push command

## Deferred / Not Yet Implemented
- Authentication and authorization
- Real identity, durable sessions, and server-trusted role assignment beyond the current signed local operator-session control mode
- External integrations
- Dashboards and analytics
- Agent orchestration and workflow automation
- Real provider integrations
- Real AI execution and automation enforcement
- Deeper qualification policy logic and approval boundaries beyond the current structured alpha form
- Broader QA policy packs beyond the current intake sampling, prepared revenue reply-draft approval gate, prepared handover customer-update draft gate, and the current manager-facing governance summary plus exportable event reporting
- Redis or BullMQ-backed durable job orchestration beyond the current local alpha worker
- Leasing-specific rejection reasons and policy rules beyond the current shared document-request model
- Real outbound customer communication, provider callbacks, external archive systems, broader post-completion workflows, and fully automated handover execution beyond the current planning, dispatch-ready, blocker, in-progress, controlled-completion, aftercare, and admin-closure boundaries

## Risks / Watchouts
- Arabic UX can degrade quickly if RTL support is not designed from the foundation
- Omnichannel scope can sprawl without a disciplined first slice
- Auditability requirements can be missed if not designed early
- The premium product promise raises the bar for motion, state design, and visual quality from the first demo
- AI trust will fail quickly if escalation, approval, and inspection paths are not explicit
- The web shell must not drift into mixed fixture and persisted state without an explicit boundary during Phase 2
- The local `PGlite` alpha store is a development convenience and must not be mistaken for the long-term production deployment model
- The current local queue model is intentionally transitional and must not be mistaken for the long-term distributed worker architecture
- Phase 4 should not be overextended prematurely; the current handover slice is intentionally limited to intake, milestone planning, approval-only customer boundaries, internal appointment confirmation, dispatch-ready preparation, blocker tracking, explicit execution start, controlled completion, aftercare, and a narrow admin-closure boundary, not live provider sending, external archiving, or downstream automation
- The current signed operator-session boundary is intentionally local and transitional; it proves trusted session handling and workspace access patterns but must not be mistaken for full production authentication

## Standard Verification
- `git status --short`
- `pnpm typecheck`
- `pnpm test:fast`
- `pnpm test:web-smoke`
- `pnpm build`
- `pnpm lint`
- `pnpm verify:push`
- `git check-ignore -v docs/_local/current-session.md`

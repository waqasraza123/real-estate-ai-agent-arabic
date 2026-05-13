# Commercial Fact Grounding

## Objective

Ground outbound case-agent decisions on approved commercial facts before customer-facing WhatsApp replies can carry pricing, payment-plan, availability, document, or policy commitments.

This slice does not turn the agent into a pricing authority. It creates a production boundary that keeps commitment-bearing replies tied to explicit approved sources and downgrades or escalates unsafe sends.

## Implemented Boundary

- `packages/contracts` now defines approved commercial facts, fact kinds, grounding status, and persisted fact references on each case-agent run.
- `packages/database` now persists an `approved_commercial_facts` table and seeds bilingual baseline policy facts for local alpha operation.
- `packages/database` now stores fact-grounding metadata on `case_agent_runs`:
  - `commercial_fact_grounding_status`
  - `commercial_fact_required_kinds`
  - `commercial_fact_references`
  - `commercial_fact_warnings`
- `packages/workflows` now builds a grounding package before each case-agent decision:
  - pricing or pricing objections require `pricing`, `payment_plan`, and `policy`
  - availability or detail-sharing requests require `availability` and `policy`
  - document-related work requires `document_requirement`
- `apps/worker` now passes grounding state into the provider-backed model prompt so model decisions see approved facts, missing evidence, and send constraints.
- Lead profile and conversation surfaces now expose the latest agent-run grounding status and approved source labels.

## Send-Time Guardrails

The workflow guardrail checks proposed outbound messages before a WhatsApp send is queued.

- Unsafe commitments such as discounts, exception approvals, legal guarantees, possession dates, final availability, fee waivers, or locked pricing are escalated to a manager.
- Pricing or payment-plan language that requires approved evidence is downgraded to a reply draft if required fact kinds are missing.
- Low-risk clarification messages can still ask for budget, unit type, or timing when no commitment is made.

## Approved Fact Store

The current store is intentionally simple and local:

- project-specific facts match `project_interest`
- global facts use `project_interest = "*"`
- facts are locale-specific
- expired facts are ignored
- inactive facts are ignored

The seeded records are policy boundaries, not live price sheets. A real deployment should replace or extend them with client-approved sales sheets, inventory availability, payment-plan policy, promotion rules, and document-readiness policy.

## Commercial Source Control Center

The local alpha now has a manager-owned source lifecycle instead of a hidden fact table.

- Managers can create commercial sources by project and source type:
  - `inventory_csv`
  - `sales_sheet`
  - `policy_pack`
  - `manual_entry`
  - `compliance_reference`
- Inventory CSV imports create source versions, row-level import errors, inventory snapshots, and pending fact proposals.
- Manual facts can carry source evidence, locale, kind, unit code, expiry, and WhatsApp reply scope.
- Proposed facts remain unavailable to the case agent until a manager approves them.
- Approval copies proposal evidence onto the approved fact so source/version lineage survives after review.
- Approving a replacement fact supersedes the prior active fact with the same tenant, project, kind, locale, scope, and unit code.

## Manager Review Workflows

Commercial-source hardening now includes production-style manager ergonomics around review volume and freshness.

- Single proposal approval/rejection remains available on each proposal.
- Bulk approval supports up to 50 selected pending proposals with a shared approver and optional shared expiry.
- Bulk rejection supports up to 50 selected pending proposals with one required rejection reason.
- Expiring, stale, and expired active facts appear in the source center and on the individual source page.
- Managers can record an expiry review with one of four outcomes:
  - `renewed`: keeps the fact active and updates the expiry timestamp.
  - `archived`: removes the fact from active grounding by setting the fact status to archived.
  - `source_refresh_required`: records that the source must be refreshed before the fact should be trusted further.
  - `left_expired`: records an explicit decision to let the fact age out.
- Expiry-review history is visible from the source center so operators can inspect who made the freshness decision and why.

## Source Refresh Tasks

Source-refresh-required is now an operational task, not only a review note.

- Choosing `source_refresh_required` during an expiry review opens or updates one open source-refresh task for the affected fact.
- The task is linked to the commercial source, affected fact, reason, requester, and optional due timestamp.
- The source center lists open refresh tasks across projects so managers can see source-owner workload before reply grounding starts failing.
- The source detail page lists all refresh tasks for that source, including completed and dismissed history.
- Managers can resolve a task as:
  - `completed`: a refreshed source was imported or otherwise reviewed, and the refresh work is closed.
  - `dismissed`: the task is intentionally closed without a source refresh.
- Renewing a fact automatically completes any open refresh task for that fact.
- Archiving a fact automatically dismisses any open refresh task for that fact.
- Source summaries expose `openRefreshTasksCount`, so commercial source lists can show refresh pressure next to proposal and active-fact counts.

## Evidence-Aware Reply Authoring

Managers can now inspect the commercial evidence behind a proposed customer reply before the text enters QA or WhatsApp delivery.

- `POST /v1/cases/:caseId/reply-grounding-preview` accepts a proposed reply draft and returns:
  - required commercial fact kinds inferred from the draft text
  - approved source-linked references that would ground the reply
  - missing evidence warnings when required fact kinds are absent
  - `not_required`, `grounded`, or `missing_required_evidence` status
- The preview uses the same approved fact store as the case-agent grounding path:
  - project-scoped facts are matched to the case project
  - global facts can still apply where configured
  - expired or inactive facts are excluded by the store lookup
  - response locale follows the current case/customer language path
- The conversation console now includes a commercial evidence preview panel beside manual reply and prepared-reply QA controls.
- The preview supports both manager-prepared QA drafts and direct human replies, but it does not replace QA approval, send guardrails, or policy escalation.
- Missing evidence should drive the operator back to the Commercial Source Control Center instead of encouraging unsupported customer promises.

## Prepared Reply QA Evidence Carryover

Prepared customer-reply QA records now persist the commercial evidence snapshot captured at draft-preparation time.

- Preparing a reply draft for QA runs the same grounding inference as the preview endpoint.
- `case_qa_reviews` now stores:
  - `commercial_fact_checked_at`
  - `commercial_fact_grounding_status`
  - `commercial_fact_required_kinds`
  - `commercial_fact_references`
  - `commercial_fact_warnings`
- The QA case surface renders the persisted grounding status, checked timestamp, required fact kinds, missing-evidence notes, and approved source references.
- The sales conversation surface shows the same snapshot on the current reply-draft state so managers can confirm what evidence will travel with the QA gate.
- The snapshot is intentionally immutable review context. It helps reviewers inspect the exact source facts used when the draft entered QA without re-running preview against a later source-store state.

## Missing-Evidence Submit Policy

Prepared reply drafts now fail closed before QA when they make commercial commitments that cannot be grounded.

- Draft preparation always runs commercial grounding before creating the QA record.
- Drafts with `missing_required_evidence` do not create a `case_qa_reviews` row.
- The API returns a specific `reply_draft_missing_commercial_evidence` conflict with the checked timestamp, required fact kinds, and missing-evidence warnings.
- The web action renders a localized blocking message and preserves the existing preview panel as the operator path for diagnosing what needs source approval.
- The draft request form now states the rule directly: commercial promises must be backed by approved facts before the draft can enter QA.
- This keeps QA from becoming a workaround around missing source governance. Operators must add, renew, or approve the relevant commercial facts before asking QA to approve customer-facing wording.

## Evidence Gap Queue

Missing evidence now creates a manager-visible readiness item instead of only returning a blocked form error.

- `commercial_evidence_gaps` records project, case, required fact kind, warnings, draft context, requester, and resolution metadata.
- Prepared reply draft submission opens or updates one open evidence gap per missing fact kind before returning the conflict response.
- Evidence gaps are separate from source-refresh tasks:
  - refresh tasks are tied to a known source or fact that needs renewal
  - evidence gaps are tied to a missing project/kind boundary where no usable source may exist yet
- The Commercial Source Control Center now shows open evidence gaps with the blocked draft context and missing-kind warnings.
- Revenue manager commercial-readiness metrics now include open evidence-gap pressure alongside stale facts, pending approvals, and blocked commercial replies.
- Managers can resolve or dismiss a gap with a summary after adding, renewing, or approving the required commercial fact.
- Open evidence gaps now resolve automatically when a matching approved fact becomes usable:
  - approving a pending fact proposal closes gaps for the same tenant, project, and fact kind
  - creating a manual approved fact closes gaps for the same tenant, project, and fact kind
  - renewing an existing active fact closes gaps for the same tenant, project, and fact kind
- Automatic resolution records who approved or renewed the fact when that actor is available, plus the fact title that satisfied the gap.

## Readiness Analytics By Fact Kind

Commercial readiness now breaks pressure down by fact kind so managers can see what kind of source work is blocking replies.

- `ProjectCommercialReadinessSummary` now includes `kindBreakdown` with counts for each active project fact kind:
  - active approved facts
  - pending approvals
  - open evidence gaps
  - expiring-soon facts
  - stale or expired facts
- The revenue manager command center aggregates the same breakdown across project and kind, sorted by open evidence gaps first, then pending approvals, then stale facts.
- The readiness panel now shows the top project/kind pressure rows beside the existing high-level commercial-readiness counters.
- This keeps readiness reviews operational: managers can tell whether pricing, payment-plan, availability, policy, fee, handover-date, unit-status, visit-term, or document-requirement sources need attention before more replies are blocked.

## API Boundaries

The source center is exposed only through trusted manager-session routes.

- `POST /v1/commercial-fact-proposals/bulk-approve`
- `POST /v1/commercial-fact-proposals/bulk-reject`
- `GET /v1/commercial-facts/expiry-reviews`
- `POST /v1/commercial-facts/:factId/expiry-review`
- `GET /v1/commercial-source-refresh-tasks`
- `POST /v1/commercial-source-refresh-tasks/:taskId/resolve`
- `GET /v1/commercial-evidence-gaps`
- `POST /v1/commercial-evidence-gaps/:gapId/resolve`
- `POST /v1/cases/:caseId/reply-grounding-preview`

These routes require the same `manage_commercial_sources` or revenue-manager workspace boundary as the existing commercial-source APIs.

## Production Notes

- Do not store secrets or provider credentials in approved facts.
- Do not treat a global pricing policy as a live price sheet.
- Exact prices, discounts, incentives, legal guarantees, possession dates, and final availability still require a source-backed fact or human approval.
- Source lifecycle, approval ownership, expiry, and per-project source uploads now exist locally, but production deployment still needs client-owned source governance, user identity, remote storage, and provider credential setup.
- Source-refresh tasks currently close as manager-recorded workflow evidence; a later deployment should connect completion to a specific imported source version when external source storage is live.
- A future retrieval adapter can replace the simple database lookup while preserving the existing `CaseAgentFactGrounding` contract.

## Verification Guidance

User requested no tests or builds for this step.

Recommended later checks:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:agent-evals`
- `pnpm test:integration`

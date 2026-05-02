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

## Production Notes

- Do not store secrets or provider credentials in approved facts.
- Do not treat a global pricing policy as a live price sheet.
- Exact prices, discounts, incentives, legal guarantees, possession dates, and final availability still require a source-backed fact or human approval.
- A future admin surface should manage fact lifecycle, approval ownership, expiry, and per-project source uploads.
- A future retrieval adapter can replace the simple database lookup while preserving the existing `CaseAgentFactGrounding` contract.

## Verification Guidance

User requested no tests or builds for this step.

Recommended later checks:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:agent-evals`
- `pnpm test:integration`

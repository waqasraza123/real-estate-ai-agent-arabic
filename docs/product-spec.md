# Product Spec

## Product Name

AI Agent for Automated Real Estate Sales, Leasing & Handover

## Product Truth

This document is the durable product source of truth until implementation matures.

## Primary Markets

- United States
- Saudi Arabia

## Supported Languages

- English
- Arabic

Arabic is a first-class product language and must be designed as a full RTL experience across content, layout, forms, workflows, and reporting.

## Primary Users

- Real estate developers
- Brokerages
- Sales teams
- Leasing teams
- Call center and front-desk teams
- Managers
- Handover teams
- Operations and admin staff

## Problems To Solve

- Slow lead response
- Lead leakage from weak follow-up
- Poor lead qualification
- Scattered conversations across forms, calls, email, WhatsApp, and portals
- Low site-visit booking rate
- Weak property matching and recommendation flow
- Inconsistent leasing and sales pipeline discipline
- Delayed document collection
- Poor manager visibility into team performance
- Chaotic handover coordination
- Bilingual communication gaps in English and Arabic

## Core Outcomes

- Capture and unify inbound leads
- Qualify leads with AI
- Respond in English and Arabic
- Recommend suitable properties and units
- Book visits and follow-ups
- Keep leads warm automatically
- Move leads through sales and leasing stages
- Collect and track required documents
- Support approvals and manager oversight
- Coordinate handover tasks and communications
- Provide strong dashboards and auditability

## Core Product Capabilities

- Omnichannel lead intake and conversation unification
- AI-driven lead qualification
- Bilingual communication workflows
- Property and unit recommendation
- Visit scheduling and follow-up orchestration
- Pipeline management for sales and leasing
- Document request, collection, and status tracking
- Approval and escalation support for managers
- Handover workflow coordination
- Reporting, dashboards, and audit trails

## Product Quality Bar

- Premium, world-class, highly polished UX
- Visibly impressive for high-paying clients
- Smooth motion and transitions
- Clean information architecture
- Production-grade foundations
- Strong local development experience on an Intel MacBook Pro 2019
- Testing must matter from the beginning
- Maintainable, scalable, typed, modular codebase
- No code comments unless truly necessary

## Non-Negotiable Engineering Rules

- No comments in code unless truly necessary
- Use descriptive and consistent names
- Prefer reusable modules and components over large multi-purpose files
- Write production-grade code with maintainable structure, strong typing, validation, and error handling
- Do not guess missing requirements; state assumptions explicitly
- Avoid hardcoded values, hacks, and tightly coupled logic
- Keep code modular, testable, and scalable
- Keep commit messages under 140 characters

## Product Principles

- Prioritize speed-to-response without losing auditability
- Design for clear human oversight, not opaque automation
- Keep bilingual workflows symmetrical where practical
- Treat manager visibility as a core workflow, not a reporting afterthought
- Treat handover as part of the revenue workflow, not a separate side process

## Initial Scope Boundaries

- No implementation stack is chosen yet
- No channel integrations are implemented yet
- No CRM, telephony, WhatsApp, or portal connectors are implemented yet
- No market-specific compliance logic is implemented yet

## Open Assumptions

- The early product should support both sales and leasing from the same core workflow foundation
- Market-specific differences should be handled through configurable workflows rather than separate products where feasible

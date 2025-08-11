## PRD — AI Insights Agent for Natural‑Language Business Questions

### Introduction / Overview
Managers need instant, trustworthy answers from business data without digging through complex dashboards or spreadsheets. This feature provides an AI agent that understands natural‑language questions (e.g., “Why were sales lower last weekend?”, “Which menu items are most profitable this month?”, “How did the Sydney venue perform vs last year?”) and returns clear, actionable insights sourced from Supabase data. The agent highlights key drivers behind changes and surfaces opportunities or risks to enable faster, better decisions.

Primary data source for v1: Supabase tables (starting with `public.till_summaries`).

### Goals
- Deliver a concise, business‑focused answer to a user’s question with top drivers and KPI callouts.
- Meet a P95 backend latency of 3–6 seconds for typical queries (excluding network/UI render time).
- Achieve time‑to‑insight ≤ 15 seconds from question submission to usable answer.
- Guardrail: enforce read‑only SQL with LIMIT to keep data access safe and predictable.

### User Stories
- As a manager, I want to ask “Why were sales down last weekend?” and get a short explanation with key drivers (e.g., fewer covers, lower average sale, specific items or venues that declined) so I can act.
- As a manager, I want to see “Which menu items are most profitable this month?” so I can promote winners and reprice or retire poor performers.
- As a manager, I want to compare venues (e.g., “How did the Sydney venue perform compared to last year?”) to identify outliers and best practices.
- As a manager, I want KPI callouts (revenue, net sales, margin, transactions, average sale) so I grasp the headline quickly.

### Functional Requirements
1. Authentication & Access Control
   1. Use Supabase Auth for user authentication in v1.
   2. Enforce Supabase Row‑Level Security (RLS) for data access; scope rows by `org_id`.
   3. Rollout to managers only.

2. Query Input & UX
   1. Provide an input in the existing dashboard AI panel for free‑form questions.
   2. Offer optional prompt scaffolds (e.g., “Why were sales lower last [period]?”) as suggestions.
   3. Show a compact result card with: short narrative answer (2–3 sentences), KPI callouts, and top drivers list. No charts in v1.

3. SQL Generation (Read‑Only)
   1. Use the existing `generateSQL` service to produce SELECT‑only queries with LIMIT.
   2. Always include appropriate date filters when the query implies a period.
   3. Provide the LLM with a schema description for the supported tables (start with `public.till_summaries`).
   4. Validate generated SQL for safety: must start with SELECT; deny INSERT/UPDATE/DELETE/DDL; ensure LIMIT present.

4. Query Execution
   1. Execute generated SQL against Supabase in read‑only context and under RLS.
   2. If filters are missing (e.g., no date), apply sensible defaults (e.g., last 28 days) before execution.
   3. Cap result sets (e.g., 1000 rows) and trim columns to what’s required for the insight.

5. Insight Generation
   1. Generate a concise narrative answer (2–3 sentences) tailored to the user’s question.
   2. Include KPI callouts relevant to the question (e.g., net sales, gross sales, profit, transactions, average sale).
   3. Provide a top‑drivers list identifying the largest contributors (e.g., items, venues, categories) to increases/decreases.
   4. Format currency as AUD; round to nearest dollar for readability.

6. Result Presentation
   1. Display answer, KPI callouts, and drivers in the AI panel.
   2. Do not show SQL by default; no CSV export in v1.
   3. Provide clear error messaging if SQL generation or execution fails.

7. Cost & Performance Controls
   1. Cache answers by normalized query + filters + org for 15 minutes.
   2. Enforce token and result size limits; truncate and summarize when needed.
   3. Target P95 3–6s backend latency for typical questions.

8. Observability & Safety
   1. Log request metadata, latency, and LLM token usage (exclude PII in logs).
   2. Retain generated SQL for diagnostics (not shown to end‑users by default).
   3. Maintain audit trail of which user asked which question and when.

9. Data Model (Initial Scope: `public.till_summaries`)
   - Natural key uniqueness: `(org_id, time_span, venue_name)` one row per trading day.
   - Key columns (post‑normalization intent):
     - org_id (text or uuid)
     - venue_name (text)
     - time_span (text for v1; may migrate to date later)
     - first_txn_at, last_txn_at (timestamp)
     - qty_transactions (bigint), average_sale (numeric)
     - gross_sales, total_discount, net_sales, net_sales_ex_tax, payment_total, cost_of_sales, profit_amount, profit_percent (numeric)
   - Indexes for typical queries: `(org_id)`, `(org_id, first_txn_at)`, `(org_id, last_txn_at)`, `(org_id, venue_name)`.

### Non‑Goals (Out of Scope for v1)
- No writebacks or automations.
- No staffing/ops data integration yet.
- No cross‑org benchmarking.
- No charts or downloadable CSV in v1.
- No OpenAI Agents orchestration in v1 (may plan later).

### Design Considerations
- Surface within the existing dashboard AI panel now; plan a dedicated `/insights` page later for history and comparisons.
- Keep responses scannable: headline number(s), brief narrative, drivers list.
- Use consistent currency and date formatting (AUD, ISO dates).

### Technical Considerations
- Authentication & RLS
  - Use Supabase Auth. Ensure JWT contains `org_id` claim or derive `org_id` server‑side and set a secure session context so RLS can enforce per‑org access.
  - Implement RLS policies on `public.till_summaries` to allow org members read access to their rows only.

- Data Access
  - Execute LLM‑generated, validated SELECT queries against Supabase. Guardrails: SELECT‑only, LIMIT, deny dangerous keywords.
  - Provide the LLM a curated schema description (only allowed tables/columns) to reduce hallucinations.

- Caching
  - Cache key: hash of `{normalized_query, filters, org_id}` with 15‑minute TTL.
  - In‑memory cache for v1; consider Redis for multi‑instance deployments later.

- Failure Handling
  - Fallback messages for SQL generation/execution errors with guidance to rephrase.
  - Partial results handling with graceful degradation.

### Success Metrics
- Primary: time‑to‑insight ≤ 15 seconds.
- Secondary: P95 backend latency 3–6 seconds; successful answers rate (> 90% of queries produce a useful answer without manual re‑query).

### Open Questions
1. Confirm the definitive source and format for `org_id` in Supabase Auth tokens to align RLS.
2. Finalize the normalized schema for `public.till_summaries` (date vs text `time_span`) and rollout plan without breaking existing data.
3. Define the method for “top drivers” attribution (e.g., absolute deltas vs contribution to variance) and required supporting data.
4. Default period when the user omits dates (e.g., last 28 days vs last 7 days)?
5. Do we need a query history for managers in v1.1 (to be shown on `/insights`)?



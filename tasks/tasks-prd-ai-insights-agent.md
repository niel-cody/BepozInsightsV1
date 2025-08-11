## Relevant Files

- `server/routes.ts` - API endpoints including `/api/ai/query`; integrate caching, guardrails, and error handling.
- `server/services/openai.ts` - Read‑only SQL generation and insight summarization; add schema prompt for `public.till_summaries` and drivers logic.
- `server/storage.ts` - Data access abstraction; ensure `executeReadOnlySQL` uses the read‑only DB and aligns with RLS.
- `server/services/supabase.ts` - Database connections; confirm read‑only client and environment configuration.
- `shared/schema.ts` - Shared DB types; add/align `till_summaries` typings (post‑normalization intent).
- `client/src/components/dashboard/ai-query-panel.tsx` - UX for question input and results (answer + KPI callouts + drivers).
- `client/src/pages/dashboard.tsx` - Hosts the AI panel in the dashboard.
- `client/src/lib/supabase.ts` - Client auth/session; ensure compatibility with Supabase Auth.
- `server/index.ts` - Server bootstrap; ensure middleware and route registration.
- `tasks/prd-ai-insights-agent.md` - Source PRD for this task list.
- (Supabase) RLS policies on `public.till_summaries` - Enforce per‑org read access (managed in Supabase, referenced here).
- (New) `server/services/cache.ts` - In‑memory cache for AI query results (TTL ~15m).

### Notes

- Read‑only guardrails: enforce SELECT‑only with LIMIT; deny dangerous keywords.
- Latency target: P95 3–6s backend; time‑to‑insight ≤ 15s overall.
- No charts/CSV in v1; show concise answer, KPI callouts, and top drivers only.
- Managers‑only rollout; Supabase Auth + RLS for access control.

## Tasks

- [ ] 1.0 Auth & RLS Integration (Supabase)
  - [x] 1.1 Enable RLS and create read policy on `public.till_summaries` for `{authenticated}` where JWT `org_id` matches column; add `service_role` full‑access policy
  - [x] 1.2 Confirm JWT contains `org_id`; if not, define server‑side derivation and document token claims
  - [x] 1.3 Add server middleware to attach `org_id` to Supabase session if needed; verify policy enforcement with sample queries
- [ ] 2.0 Data Model Readiness for `till_summaries`
  - [x] 2.1 Add UUID primary key and audit timestamps (`created_at`, `updated_at`) with trigger
  - [x] 2.2 Rename columns to snake_case; `Name` → `venue_name`; keep `time_span` as text (for now)
  - [x] 2.3 Convert numeric and timestamp columns safely (strip symbols; parse `DD/MM/YYYY HH24:MI`)
  - [ ] 2.4 Enforce uniqueness on `(org_id, time_span, venue_name)` after duplicate check
  - [x] 2.4 Enforce uniqueness on `(org_id, time_span, venue_name)` after duplicate check
  - [ ] 2.5 Create helpful indexes: `(org_id)`, `(org_id, first_txn_at)`, `(org_id, last_txn_at)`, `(org_id, venue_name)`
  - [x] 2.5 Create helpful indexes: `(org_id)`, `(org_id, first_txn_at)`, `(org_id, last_txn_at)`, `(org_id, venue_name)`
  - [ ] 2.6 Document mappings and add TS types if needed in `shared/schema.ts`
  - [x] 2.6 Document mappings and add TS types if needed in `shared/schema.ts`
- [ ] 3.0 AI SQL Generation and Validation
  - [ ] 3.1 Provide schema description for `till_summaries` to SQL generator
  - [x] 3.1 Provide schema description for `till_summaries` to SQL generator
  - [ ] 3.2 Strengthen guardrails: enforce LIMIT, deny dangerous keywords, and validate table allowlist
  - [x] 3.2 Strengthen guardrails: enforce LIMIT, deny dangerous keywords, and validate table allowlist
  - [ ] 3.3 Add basic unit/integration checks for SQL validation (smoke tests)
  - [x] 3.3 Add basic unit/integration checks for SQL validation (smoke tests)
- [ ] 4.0 Read‑Only Query Execution with Caching
  - [x] 4.1 Implement in‑memory cache with TTL (~15m) and request key normalization
  - [x] 4.2 Integrate cache into `/api/ai/query` response path
- [ ] 5.0 Insight Formatting: Answer, KPI Callouts, Top Drivers
- [ ] 6.0 Dashboard UI: AI Panel Enhancements and Error States
- [ ] 7.0 Observability & Safety: Logging, Auditing, and Limits



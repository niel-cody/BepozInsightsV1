## Relevant Files

- `shared/schema.ts` - Define `organizations` and `user_organizations` tables and types.
- `server/services/supabase.ts` - DB access; helpers for setting `request.jwt.claims`.
- `server/routes.ts` - New endpoints: `GET /api/orgs`, `POST /api/orgs/select`; augment auth flow.
- `server/index.ts` - Ensure routes/middleware initialization.
- `client/src/lib/supabase.ts` - Client auth/session wiring for Supabase Auth.
- `client/src/lib/auth.tsx` - Client auth helpers; store and expose `selectedOrgId`.
- `client/src/components/layout/header.tsx` - Integrate an `OrgSwitcher` into header.
- `client/src/components/layout/org-switcher.tsx` (new) - Dropdown for changing organization.
- `client/src/pages/choose-org.tsx` (new) - Blocking org selection screen for multi‑org users.
- `client/src/hooks/use-auth.tsx` - Expose user + org context; enforce guard.
- `client/src/lib/queryClient.ts` - Namespace react‑query keys by `selectedOrgId`; clear cache on switch.

### Notes

- RLS uses `auth.jwt()->>'org_id'`; the server must include `org_id` in JWT after selection/switch or set `request.jwt.claims` per request.
- Persist last‑used org server‑side (`user_organizations.is_default`) and mirror in client (local storage) for faster UX.
- UI components should use shadcn; keep aesthetics minimal and accessible.
- Indexes: `user_organizations (user_id)`, `(organization_id)`, unique `(user_id, organization_id)`; `organizations (slug)`.

## Tasks

- [ ] 1.0 Data Model & RLS
  - [ ] 1.1 Create `organizations` table (id uuid pk, name, slug?, is_active, timestamps)
  - [x] 1.1 Create `organizations` table (id uuid pk, name, slug?, is_active, timestamps)
  - [ ] 1.2 Create `user_organizations` (user_id fk, organization_id fk, role enum, is_default, unique(user_id, organization_id); indexes)
  - [x] 1.2 Create `user_organizations` (user_id fk, organization_id fk, role enum, is_default, unique(user_id, organization_id); indexes)
  - [ ] 1.3 Backfill `org_id` across existing tables; align type; plan FK to `organizations.id`
  - [x] 1.3 Backfill `org_id` across existing tables; align type; plan FK to `organizations.id`
  - [ ] 1.4 Add RLS policies on `organizations` and `user_organizations` so members can list their orgs
  - [x] 1.4 Add RLS policies on `organizations` and `user_organizations` so members can list their orgs
  - [ ] 1.5 Update RLS on data tables to use `auth.jwt()->>'org_id' = org_id`
  - [x] 1.5 Update RLS on data tables to use `auth.jwt()->>'org_id' = org_id`
  - [ ] 1.6 Seed sample orgs/memberships for development
  - [x] 1.6 Seed sample orgs/memberships for development

- [ ] 2.0 Auth Token & Session Handling for org_id
  - [x] 2.1 Include `org_id` claim in JWT on login when determinable (last‑used); else omit
  - [x] 2.2 Implement secure token refresh on org selection/switch (new JWT with `org_id`)
  - [x] 2.3 Validate membership on selection to prevent cross‑org escalation
  - [x] 2.4 Fallback: set `request.jwt.claims` per request for RLS in server if JWT not refreshed
  - [x] 2.5 Document token shape and rotation behavior

- [ ] 3.0 Organization APIs (`/api/orgs`, `/api/orgs/select`)
  - [x] 3.1 GET `/api/orgs`: return organizations for user with role and `is_default`
  - [x] 3.2 POST `/api/orgs/select`: body validation, membership check, issue token with `org_id`
  - [x] 3.3 Add basic rate limiting and audit log (userId, orgId, latency) for selection
  - [ ] 3.4 Unit tests for membership checks and error states

- [ ] 4.0 Client Org Selection Flow (post‑login modal or page)
  - [ ] 4.1 Build `choose-org` flow (blocking Dialog or page) using shadcn components
  - [x] 4.1 Build `choose-org` flow (blocking Dialog or page) using shadcn components
  - [x] 4.2 Fetch orgs post‑auth; handle 0/1/>1 org logic; auto‑select if one
  - [x] 4.3 On select: call `/api/orgs/select`, persist locally, refresh context
  - [ ] 4.4 Loading and error states; accessible focus management
  - [x] 4.4 Loading and error states; accessible focus management
  - [ ] 4.5 Minimal aesthetic per Jony Ive / Dieter Rams
  - [x] 4.5 Minimal aesthetic per Jony Ive / Dieter Rams

- [ ] 5.0 Header Org Switcher (in‑app switching)
  - [x] 5.1 Create `OrgSwitcher` dropdown in header; show current org name + initials/avatar
  - [x] 5.2 Selecting org calls `/api/orgs/select`, updates local state, and re‑scopes data
  - [ ] 5.3 Invalidate and refetch react‑query caches on switch
  - [x] 5.3 Invalidate and refetch react‑query caches on switch
  - [ ] 5.4 Keyboard navigation and ARIA roles
  - [x] 5.4 Keyboard navigation and ARIA roles

- [ ] 6.0 Route Guard & Data Scoping (selectedOrgId required)
  - [ ] 6.1 Org context/provider exposing `selectedOrgId` and switch method
  - [ ] 6.2 Guard protected routes; show selector if missing
  - [ ] 6.3 Ensure all data fetching includes `org_id` filter; adapt hooks/services
  - [ ] 6.4 Handle lost access mid‑session (403 → prompt to choose another org)

- [ ] 7.0 State, Caching, and Persistence (react‑query + local storage)
  - [ ] 7.1 Namespace react‑query keys by `selectedOrgId`
  - [ ] 7.2 Clear caches on org switch; avoid cross‑org data bleed
  - [ ] 7.3 Persist `selectedOrgId` in local storage; hydrate on load if authorized
  - [ ] 7.4 Telemetry events for selection/switch (no PII)

- [ ] 8.0 UI Polish & Accessibility (shadcn minimal design)
  - [ ] 8.1 Refine spacing, typography, and color usage
  - [ ] 8.2 Ensure Dialog and Dropdown meet a11y (focus trap, ESC, roles)
  - [ ] 8.3 Empty‑state messaging for 0 orgs with support contact
  - [ ] 8.4 Visual tests/screenshots for consistency

- [ ] 9.0 Telemetry & Tests (logging, integration/E2E)
  - [ ] 9.1 Server logs for `/api/orgs` and selection (userId, orgId, latency)
  - [ ] 9.2 Unit tests for API validation and membership logic
  - [ ] 9.3 Integration tests for RLS enforcement (deny cross‑org access)
  - [ ] 9.4 E2E flow: login → choose org → scoped data → switch org → re‑scoped data
  - [ ] 9.5 Update README/Docs with org model and usage



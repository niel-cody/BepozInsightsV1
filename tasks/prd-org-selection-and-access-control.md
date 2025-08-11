## PRD — Organization Selection and Per‑Org Data Access (Supabase Auth + RLS)

### Introduction / Overview
Users who belong to multiple organizations must explicitly choose which organization to access after login. Once selected, the application scopes all data and interactions to that organization. Users can switch organizations later from the header. Access control is enforced via Supabase Auth and Row‑Level Security (RLS) using the `org_id` claim in the JWT.

This PRD defines the UX, data model, APIs, and guardrails to deliver a professional, minimal UI (shadcn) aligned with a Jony Ive / Dieter Rams aesthetic.

### Goals
- Require org selection for multi‑org users post‑login; auto‑select when only one org.
- Enforce per‑org data access across the app via RLS using `auth.jwt()->>'org_id'`.
- Provide an in‑app org switcher in the header; switching re‑scopes data instantly.
- Persist last‑used org; default to it on next login if authorized.
- Minimal, fast flow: selection within 1–2 clicks; P95 selection latency < 1s.

### User Stories
- As a user with access to multiple organizations, after login I must choose which org to view so I don’t accidentally view the wrong data.
- As a user with only one organization, I am taken directly into that org without extra steps.
- As a user, I can switch organization at any time from the header and the app updates immediately.
- As an admin/manager, I am confident that data is isolated per organization and cannot be accessed across orgs.

### Functional Requirements
1. Org Determination & Selection
   1. Detect user’s org memberships on login.
   2. If 0 orgs: show request‑access screen with contact instructions.
   3. If 1 org: auto‑select and continue.
   4. If >1 org: show a blocking modal to choose org (name + avatar/initials).
   5. Persist selected org as last‑used; reuse when valid.

2. In‑App Org Switcher
   1. Header dropdown with current org name + avatar/initials.
   2. Show list of user’s orgs; selecting an org re‑scopes the session.
   3. Visual feedback during switch; refresh scoped data.

3. Route Guarding
   1. Require `selectedOrgId` in app context for protected pages.
   2. If missing: show org‑selector modal or redirect to `/choose-org`.
   3. All data‑fetching hooks include `org_id` filter when relevant.

4. Auth & RLS Integration
   1. Supabase Auth for authentication.
   2. RLS policies use `auth.jwt()->>'org_id'` to scope reads/writes.
   3. On selection/switch, issue a token that includes `org_id` (or set `request.jwt.claims` server‑side for the current session) and update client state.

5. Data Model
   1. `organizations` table
      - id uuid primary key default `gen_random_uuid()`
      - name text not null
      - slug text unique (optional)
      - is_active boolean default true
      - created_at timestamptz default now()
      - updated_at timestamptz default now()
   2. `user_organizations` table (membership with role)
      - user_id (fk to `users.id`)
      - organization_id (fk to `organizations.id`)
      - role text not null default 'member' (enum: admin, manager, viewer)
      - is_default boolean default false
      - created_at timestamptz default now()
      - unique(user_id, organization_id)
   3. Existing data tables reference `org_id` (text/uuid). Target state: `org_id` -> fk `organizations.id`.

6. APIs
   1. GET `/api/orgs` → list organizations for current user.
   2. POST `/api/orgs/select` → body: `{ organizationId }`; returns refreshed token/context with `org_id` set.
   3. Authentication endpoints updated to include last‑used org; set `org_id` claim when determinable.

7. Persistence
   1. Store last‑used org in server (membership `is_default`) and mirror in client (local storage) to accelerate UX.
   2. On switch, update both server and client mirrors.

8. UI/UX
   1. Minimal shadcn components: Dialog, Select/List, Avatar, DropdownMenu.
   2. Clear, spacious layout; restrained color; accessible focus states.
   3. Empty state for 0 orgs: professional copy, support contact.

### Non‑Goals (v1)
- Organization creation/administration UI (invite, billing, branding).
- Cross‑org analytics or switching without explicit user action.
- Offline persistence beyond last‑used org id.

### Design Considerations
- Header switcher must be reachable and consistent across pages.
- Modal selection should be keyboard accessible and screen‑reader friendly.
- Persist org context in URL optionally (e.g., `/org/:orgId/...`) for sharable links (v1.1).

### Technical Considerations
- RLS Policies
  - Update existing tables to use `org_id` in RLS expressions: `USING (auth.jwt()->>'org_id' = org_id)`.
  - Add read policies on `organizations` and `user_organizations` so members can list their orgs.

- Token & Session
  - Preferred: include `org_id` in JWT on selection/switch; alternatively set `request.jwt.claims` per request.
  - On switch, refresh token (short request) and reset client caches/state.

- Data Model Migration
  - Create `organizations`, `user_organizations`.
  - Backfill `org_id` across tables; if feasible, enforce FK `org_id` → `organizations.id`.
  - Indexes: `user_organizations (user_id)`, `(organization_id)`, unique `(user_id, organization_id)`; `organizations (slug)`.

- App Wiring
  - New endpoints `/api/orgs`, `/api/orgs/select`.
  - Header component `OrgSwitcher` consuming `/api/orgs` and calling `/api/orgs/select`.
  - Route guard HOC/provider requiring `selectedOrgId`.
  - Client stores `selectedOrgId` (local storage) strictly as UI mirror; JWT `org_id` is source of truth for RLS.

- Caching & State
  - Clear relevant caches (react‑query) on org switch.
  - Namespaces react‑query keys by `selectedOrgId`.

- Telemetry
  - Log org selection and switches (userId, orgId, latency). No PII.

### Success Metrics
- 100% of multi‑org users must select an org before viewing data.
- P95 org switch latency < 1.5s end‑to‑end.
- 0 data leakage incidents across organizations (verified by RLS rules).

### Open Questions
1. Should `org_id` be `uuid` (recommended) or remain `text` in legacy tables during transition?
2. Do we need per‑org roles beyond admin/manager/viewer in v1?
3. Should URLs include org context (e.g., `/org/:orgId/...`) in v1 or v1.1?
4. For SSO, will org membership be provisioned externally (SCIM) or managed in‑app (later phase)?



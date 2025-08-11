# Tests: Organization APIs (/api/orgs, /api/orgs/select)

These are test stubs you can port to your preferred framework (Jest + supertest suggested) or run as manual steps via REST client.

## Setup
- Seeded data exists per migrations: `organizations`, `user_organizations` with `user-1`.
- Obtain a JWT by calling `/api/auth/login` with an email that maps to `user-1`.

## Cases

1) GET /api/orgs returns memberships for current user
- Arrange: Login as `user-1`; capture `accessToken`.
- Act: GET /api/orgs with `Authorization: Bearer <token>`
- Assert: 200 OK; JSON array length >= 1; each item has `{ id, name, role, is_default }`.

2) POST /api/orgs/select validates membership and rotates token
- Arrange: Pick an org id from case (1).
- Act: POST /api/orgs/select with body `{ organizationId }`; header `Authorization: Bearer <token>`
- Assert: 200 OK; response contains `{ accessToken, organizationId }`.
- Decode JWT and verify it includes `org_id = organizationId`.

3) POST /api/orgs/select denies non-member selection
- Arrange: Create or use an org the user does not belong to.
- Act: POST /api/orgs/select with that `organizationId`.
- Assert: 403 with `{ message: 'Not a member of this organization' }`.

4) Rate limiting on selection
- Act: POST /api/orgs/select >5 times within 60s.
- Assert: 429 with helpful message.

5) `/api/orgs` latency logged (manual)
- Observe server logs include `[ORG][list]` entries with `latencyMs`.



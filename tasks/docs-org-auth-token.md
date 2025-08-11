## Org-Aware Auth Token and Rotation

### JWT Payload Shape
Issued by server on login/verify and on org selection.

```
{
  "userId": string,        // app user id
  "email": string,         // user email (non-PII usage only)
  "org_id"?: string,       // selected organization id (uuid). Omitted if not yet selected
  "iat": number,           // issued at (epoch seconds)
  "exp": number            // expiry (epoch seconds)
}
```

Notes
- `org_id` drives Supabase RLS (`auth.jwt()->>'org_id'`).
- When `org_id` is absent, protected routes must prompt for org selection.

### When Tokens Are Issued/Rotated
1) Login (`/api/auth/login`) or Magic Verify (`/api/auth/verify`)
- Server looks up the user’s last‑used org via `user_organizations.is_default`.
- If found and active: include `org_id` in JWT. Otherwise omit.

2) Organization Selection (`/api/orgs/select`)
- Validate membership: `(user_id, organization_id)` must exist in `user_organizations`.
- Update `is_default` for the chosen org.
- Issue a fresh JWT including `org_id = organizationId`.

3) Signout (`/api/auth/signout`)
- Client discards token. Server may optionally blacklist in production.

### Server RLS Claims
- On each authenticated request the server sets:
```
set_config('request.jwt.claims', '{"role":"authenticated","org_id":"<org>","user_id":"<user>"}', true)
```
- This ensures RLS policies using `auth.jwt()` function evaluate correctly for the request.

### Security & Validation
- Membership validation on `/api/orgs/select` prevents cross‑org escalation.
- JWT expiry defaults to 7d; refresh on selection to avoid stale org contexts.
- Avoid placing PII in tokens; only `userId`, `email`, and `org_id` are included.

### Client Behavior
- After login: if multiple orgs and token has no `org_id`, block UI with org selector.
- After selection: replace token with the refreshed one; clear/reactivate caches scoped by `org_id`.

### RLS Summary
- Tables scoped by `org_id` must enforce policies like:
  - `USING (auth.jwt()->>'org_id' = org_uuid::text)`
- Org listing policies:
  - `user_organizations`: `USING (auth.jwt()->>'user_id' = user_id)`
  - `organizations`: `USING (EXISTS (SELECT 1 FROM user_organizations WHERE organization_id = organizations.id AND user_id = auth.jwt()->>'user_id'))`



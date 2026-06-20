# SailsPipeline Multi-Tenant Transition — Phase 0 Design

**Status:** Implemented (foundation)  
**Date:** June 2026

---

## Goal

Introduce a tenant boundary (`agency_id`) on root CRM entities and enforce it in auth and ORM query paths, while keeping today's single-agency deployments working via a **Default Agency** backfill.

Phase 0 does **not** onboard multiple live agencies yet. It lays the schema, auth claims, and automatic read scoping required for Phase 1+.

---

## Tenant model

| Concept | Implementation |
|---------|----------------|
| **Tenant** | `agencies` row identified by UUID (`CHAR(36)`) |
| **Default tenant** | `00000000-0000-4000-8000-000000000001` / slug `default` |
| **Scoped root tables (P0)** | `users`, `travel_requests`, `passengers` |
| **Child tables (Phase 1)** | Inherit via join to `travel_requests` or denormalize `agency_id` on hot paths |

### `agencies`

```sql
id CHAR(36) PK
name VARCHAR(120)
slug VARCHAR(80) UNIQUE
is_active BOOLEAN
created_at / updated_at
```

---

## Auth & request context

1. **Login** issues JWT with `sub` (username) and `agency_id`.
2. **`get_current_user`** validates username + agency against `users`, then calls `set_current_agency_id()`.
3. **`get_db`** clears tenant context when the request finishes.

Unauthenticated routes (login, register, health) run **without** tenant context. Only `User` / `Agency` queries run there.

---

## Global query filtering (ORM)

`database.py` registers a SQLAlchemy `do_orm_execute` listener that applies `with_loader_criteria` when `agency_id` context is set:

- `TravelRequest.agency_id == current`
- `Passenger.agency_id == current`

**Inserts** must still stamp `agency_id` explicitly (filters apply to SELECT only).

**Defense in depth:** `agency_service.get_travel_request_for_agency()` and create-path checks compare `agency_id` and return **404** on mismatch (no cross-tenant existence leak).

---

## Data stamping on write

| Path | `agency_id` source |
|------|-------------------|
| User registration / seed admin | Default agency |
| New travel request | `current_user.agency_id` |
| New passenger / client | `require_current_agency_id()` |
| Client import rows | Tenant context from authenticated import route |

---

## Migration strategy

| Environment | Action |
|-------------|--------|
| **Fresh Docker / test DB** | `db/init.sql` creates `agencies`, seeds default row, adds `agency_id` FKs + indexes |
| **Existing MySQL volume** | Run `db/migrate_multi_tenant_phase0.sql` once |

Backfill order:

1. Create default agency  
2. `users.agency_id` → default  
3. `travel_requests.agency_id` → creating user's agency  
4. `passengers.agency_id` → creator's agency, else default  

---

## Indexes (Phase 0)

- `users(agency_id)`
- `travel_requests(agency_id)`, `(agency_id, status)`
- `passengers(agency_id)`, `(agency_id, is_active)`

---

## Explicitly deferred (Phase 1+)

| Item | Why deferred |
|------|----------------|
| `agency_id` on all child tables | Join-through-request sufficient for Phase 0 reads if root access is gated |
| Per-agency username/email uniqueness | Keep global unique constraints until admin UX for agency provisioning |
| Tenant-prefixed attachment paths | Requires storage migration + download authorization pass |
| Sales analytics / remaining reports SQL scoping | Add `agency_id` filters after root enforcement proven |
| Agency admin UI / provisioning API | No second agency to manage yet |
| Row Level Security in MySQL | App-layer filter sufficient for Phase 0 |

---

## Phase roadmap

| Phase | Scope |
|-------|--------|
| **0 (this)** | Schema, JWT claims, session filter, write stamping, default agency migration |
| **1** | Denormalize `agency_id` on hot child tables; attachment path prefix; explicit API checks on all ID routes |
| **2** | Agency provisioning, invite flow, per-agency user namespace policy |
| **3** | Analytics rollups per agency; operational tooling |

---

## Verification checklist

- [ ] Run `migrate_multi_tenant_phase0.sql` on dev DB volumes created before this change
- [ ] Recreate `test-db` container (uses updated `init.sql`)
- [ ] Confirm login returns `user.agency_id` in `/api/auth/me`
- [ ] Confirm cross-tenant request/passenger IDs return 404 when context differs (Phase 1 integration test)

---

## Applying the migration (existing dev DB)

```powershell
Get-Content db\migrate_multi_tenant_phase0.sql | docker compose exec -T db mysql -uroot -prootsecret sailspipeline
```

Recreate test DB after schema changes:

```powershell
docker compose --profile test rm -sf test-db
docker compose --profile test up -d test-db
```

# Implementation Plan 02: Minimal Auth & Spaces Skeleton

## 1. Overview
Goal: Introduce a minimal authentication layer and user-scoped Spaces API so the Studio app can support logged-in users and basic space management, aligned with the architecture in `agents/architecture/01_format_asset_lifecycle_specification.md` and `agents/architecture/04_API_DB.md`.

In scope:
- Database tables for `users` and `spaces`, including basic ownership and timestamps.
- Backend auth primitives (password hashing, session or token handling) and auth-related environment variables.
- Auth endpoints for register/login/logout using email + password.
- Spaces endpoints to list and create spaces for the authenticated user.
- Frontend wiring for a basic login/register flow and a simple Spaces dashboard using the new APIs.

Out of scope:
- Advanced auth (OAuth, multi-factor, password reset flows, email verification).
- Full user profile management.
- Project/Definition/RenderedAsset CRUD beyond the placeholder `/api/spaces` implementation.
- Robust permissions/roles beyond “spaces owned by the current user”.

## 2. Step-by-Step Plan

1. Design DB schema for `users` and `spaces`  
   Status: Completed  
   Testing: After writing the DDL in `db/migrations.sql`, run the statements against the `studio` database in a local/dev environment (e.g., via `sudo mysql` or MySQL Workbench) and confirm via `SHOW TABLES; DESCRIBE users; DESCRIBE spaces;` that the columns and indexes match the plan.  
   Checkpoint: Wait for developer approval before proceeding.

2. Apply migrations to the `studio` database  
   Status: Completed  
   Testing: Verify that the new tables exist and can be queried/inserted into with simple test inserts using the MySQL CLI or Workbench. Confirm that the existing `schema_version` table is unchanged.  
   Checkpoint: Wait for developer approval before proceeding.

3. Configure backend auth environment and helpers  
   Status: Completed  
   Testing: Add any new env vars to `.env.example` and ensure the server starts without errors using the real `.env`. Implement password hashing (e.g., `bcryptjs`) and token/session helpers, then run a small manual Node script or temporary route to hash/verify a known password to confirm behavior.  
   Checkpoint: Wait for developer approval before proceeding.

4. Implement auth routes (`/api/auth/*`)  
   Status: Completed  
   Testing: With the server running, use curl or a REST client (e.g., Postman) to: register a user, log in with correct and incorrect credentials, verify that an HTTP-only cookie or token is set, and log out (cookie cleared or token invalidated). Confirm that protected test routes reject unauthenticated requests and accept authenticated ones.  
   Checkpoint: Wait for developer approval before proceeding.

5. Implement Spaces service & routes (`/api/spaces`)  
   Status: Completed  
   Testing: After logging in as a test user, call `GET /api/spaces` and `POST /api/spaces` to create and list spaces. Confirm that spaces are scoped to the authenticated user (i.e., another user does not see them). Validate error responses when unauthenticated or when sending invalid payloads.  
   Checkpoint: Wait for developer approval before proceeding.

6. Wire frontend to auth & spaces APIs  
   Status: Completed  
   Testing: From the browser, verify that an unauthenticated visitor sees a login/register UI, can register/log in, then sees a Spaces dashboard backed by `/api/spaces`. Confirm that the client sends credentials (cookies) on relevant requests and that logging out returns the UI to the unauthenticated state.  
   Checkpoint: Wait for developer approval before proceeding.

7. Update docs and handoff notes  
   Status: Completed  
   Testing: Ensure `README.md` reflects the new auth + spaces behavior and any new environment variables. Update `agents/handoff/handoff_01.md` (or latest) to document how authentication, users, and spaces now work. Confirm that `agents/implementation/plan_02.md` status fields accurately reflect completed steps.  
   Checkpoint: Wait for developer approval before proceeding.

## 3. Progress Tracking Notes

- Step 1 — Status: Completed.  
- Step 2 — Status: Completed.  
- Step 3 — Status: Completed.  
- Step 4 — Status: Completed.  
- Step 5 — Status: Completed.  
- Step 6 — Status: Completed.  
- Step 7 — Status: Completed.

# AGENT.md — QR Dynamic Backend (Bun + Hono)

This file guides **agentic coding agents and humans** working in this repository.

This repository is a **small Bun + Hono backend** for the **dynamic QR** part of a QR code application.
Keep changes minimal, follow existing patterns, and be explicit when tooling is missing.

---

## Project Overview

- Runtime: **Bun**
- Language: **TypeScript** (strict mode)
- Web framework: **Hono**
- Entry point: `src/index.ts`
- Storage: **Adapter-based** (Convex initially, Neon/Postgres later)
- ORM (Neon): **Drizzle** (used only inside Neon adapters)

---

## Goals (Non-Negotiable)

1. **Domain-first structure**  
   Group code by product domain (e.g. `users`, `urls`), not by technical layer.

2. **Adapter pattern for storage**  
   Storage implementations (Convex, Neon, etc.) must be swappable without touching service logic.

3. **Explicit and boring code**  
   Avoid clever abstractions. Prefer clarity, explicit dependencies, and simple flows.

---

## Commands

### Install
```bash
bun install
Dev Server
bash
Copy code
bun run dev
Starts Hono server with hot reload

Default URL: http://localhost:3000

Build
No build script is currently defined in package.json.

If a build step is added later, document it here.

Tests
No tests exist today.

If tests are added, use:

bash
Copy code
bun test
Single-test pattern:

bash
Copy code
bun test --filter <pattern>
Lint / Format
No linter or formatter is configured.

If added, keep configuration minimal and document commands here.

Architecture Overview
Request Flow
powershell
Copy code
Routes → Handlers → Services → Storage Adapter → Data
Responsibilities
Routes

URL mapping and wiring

No business logic

Handlers

HTTP concerns only

Input parsing & validation

Status codes and response shaping

Services

Business logic and orchestration

No HTTP or framework-specific types

Storage Adapters

Persistence boundary

Implement domain storage interfaces

Convex / Neon implementations live here

Data

Actual DB or SDK calls (Drizzle / SQL / Convex SDK)

Always hidden behind adapters

Key Rule
Services depend on interfaces, never on concrete storage libraries.

Repository Structure (Domain-First)
Organize code by domain, not by layer:

text
Copy code
src/
  index.ts                  # Hono app entry
  config/                   # env parsing, configuration
  shared/                   # cross-domain helpers (small + stable)
    errors/
    http/
    validation/
    types/

  domains/
    users/
      routes.ts
      handlers.ts
      service.ts
      storage/
        interface.ts        # UsersStorage interface
        convex.adapter.ts   # Convex implementation
        neon.adapter.ts     # Neon implementation (Drizzle)
      models.ts
      validators.ts

    urls/
      routes.ts
      handlers.ts
      service.ts
      storage/
        interface.ts
        convex.adapter.ts
        neon.adapter.ts
      models.ts
      validators.ts

  infra/
    db/
      interface.ts          # DB interface (minimal)
      neon.db.ts            # NeonDB implementation + connection
    storage/
      factory.ts            # adapter selection (env-based)

tests/
✅ DO

text
Copy code
src/domains/urls/handlers.ts
❌ DON’T

text
Copy code
src/handlers/urls.ts
Storage Adapter Pattern
Each domain owns its own storage interface.

Example Naming
UrlsStorage (interface)

ConvexUrlsStorageAdapter

NeonUrlsStorageAdapter

Interface Rules
Keep interfaces small and domain-shaped

Do NOT create generic repository abstractions

Return domain models, not DB rows

Do NOT leak Drizzle / SQL / Convex SDK types outside adapters

Infra: DB Abstraction (Neon)
We use a minimal DB boundary so adapters depend on DB, not a concrete client.

infra/db/interface.ts defines DB

infra/db/neon.db.ts:

Creates the Neon connection

Exports NeonDB

Exposes createNeonDB() or getNeonDB()

Neon adapters receive DB via constructor injection

Rules
Only Neon adapter files may import Drizzle

Only infra DB files may:

Read connection strings

Create database connections

Dependency Injection & Wiring
Wiring happens in one place, not scattered across the app.

src/infra/storage/factory.ts selects adapters based on environment:

text
Copy code
STORAGE_PROVIDER=convex → Convex adapters
STORAGE_PROVIDER=neon   → Neon adapters
Handlers receive services

Services receive storage interfaces

Code Style
General
Use TypeScript with strict enabled

Use ES modules (import / export)

Prefer const over let; avoid var

Avoid unnecessary abstractions

Keep functions small and single-purpose

Formatting
Indentation: 2 spaces

Quotes: single quotes

Semicolons: omit unless required

No formatter configured — match existing style

Imports
External packages first, then internal imports

Separate groups with a blank line

Import only what you use

Naming
Variables / functions: camelCase

Classes / interfaces / types: PascalCase

Constants: UPPER_SNAKE_CASE only when truly constant

Error Handling & Validation
Handlers

Perform runtime validation (Zod recommended)

Catch errors and return clear HTTP status codes

Services

Assume validated input

Throw domain errors (defined in shared/errors)

Avoid uncaught errors bubbling out of handlers

Hono Conventions
Initialize once:

ts
Copy code
const app = new Hono()
Define routes using app.get, app.post, etc.

Use c.text, c.json, or c.body for responses

Export the app as default from the entry file

Testing Guidance
Tests do not exist yet — do not invent tooling

If added:

Use bun test

Prefer fake/in-memory adapters over mocks

Keep tests deterministic (no network calls)

Don’t Do This
Don’t import Convex or Drizzle into services or handlers

Don’t create a generic repository layer

Don’t create global singleton DB connections in random files

Don’t reorganize folders into top-level routes/handlers/services

Don’t add dependencies without asking

Git / Workflow
Do not commit unless explicitly asked

Summarize changes with file paths

Safety & Boundaries
Do not add secrets or environment-specific values

Avoid changing unrelated behavior

Preserve backward compatibility unless told otherwise

When Unsure
If you’re unsure where something belongs:

HTTP-specific → handler

Business rules → service

Persistence → adapter

Cross-domain & stable → shared

Connection / config / wiring → infra

Notes for Agents
Be explicit when tooling is missing

Ask before adding new dependencies

Prefer incremental, reviewable changes

Avoid large refactors without request

Confirm behavior before changing APIs

End
Keep this file updated as the project grows.

yaml
Copy code

---

If you want next, I can:
- Generate a **folder skeleton** matching this exactly
- Add a **worked `urls` example** (POST + redirect)
- Create a **fake adapter** for testing
- Create a **Convex → Neon migration plan**

This is a very solid foundation — you’re setting this up *correctly* from day one.
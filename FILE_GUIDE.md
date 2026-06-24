# Backend — File-by-File Guide (for defense)

This document explains **every file** in `teamboard-backend`: what it does, why
it exists, and the key concept behind it. Use it to walk a reviewer through the
codebase and answer "why did you do it this way?".

---

## Big picture

- **Framework:** NestJS 11 (TypeScript). Nest is an opinionated Node framework
  built around **modules**, **controllers**, **providers (services)** and
  **dependency injection** — the same MVC ideas you'd see in Express, but
  structured and testable.
- **Database:** MongoDB via **Mongoose** (ODM). Each collection has a *schema*.
- **Architecture:** a **modular monolith** — one deployable app, but every
  domain (auth, users, projects, tasks, dashboard) is an isolated module that
  could be split into a microservice later.
- **Request lifecycle:** `Request → middleware (helmet, sanitize) → guard (JWT)
  → pipe (validation) → controller → service → Mongoose model → MongoDB`, and
  the response flows back through an exception filter that standardises errors.

---

## Root & config

| File | What it does |
| ---- | ------------ |
| `src/main.ts` | **Entry point.** Boots the Nest app and registers global, app-wide concerns: `helmet` (secure headers), the NoSQL-injection sanitizer, CORS, the global `/api` route prefix, the global `ValidationPipe` (DTO validation), and the global exception filter. Then starts listening on the configured port. |
| `src/app.module.ts` | **Root module.** Wires everything together: loads config globally, opens the Mongo connection, configures the rate-limiter (`ThrottlerModule`) and the in-process event bus (`EventEmitterModule`), and imports every feature module. Also registers the throttler as a global guard. |
| `src/health.controller.ts` | A tiny public `GET /api/health` endpoint returning `{ status: 'ok' }`. Used by Docker/uptime checks to confirm the app is alive. |
| `src/config/configuration.ts` | Turns raw environment variables into a **typed config object** (`port`, `mongoUri`, `jwt.*`, `throttle.*`, `defaultInvitePassword`). Everything reads config through this, never `process.env` directly. |
| `src/config/env.validation.ts` | A **Joi schema** that validates the environment on boot. If `MONGO_URI` or `JWT_SECRET` is missing/invalid the app refuses to start — failing fast instead of at request time. |

---

## Common (cross-cutting concerns)

| File | What it does |
| ---- | ------------ |
| `src/common/guards/jwt-auth.guard.ts` | A guard extending Passport's `AuthGuard('jwt')`. Put `@UseGuards(JwtAuthGuard)` on a route and it requires a valid `Authorization: Bearer <token>`; otherwise it returns 401. |
| `src/common/decorators/current-user.decorator.ts` | A custom param decorator `@CurrentUser()`. After the JWT strategy validates a token it attaches the user to the request; this decorator pulls it (or one field, e.g. `@CurrentUser('userId')`) into a controller method. |
| `src/common/filters/all-exceptions.filter.ts` | A global **exception filter** that converts any thrown error into a consistent JSON shape (`statusCode`, `path`, `timestamp`, `message`) and logs unexpected 5xx errors with their stack. |
| `src/common/middleware/mongo-sanitize.middleware.ts` | Express middleware that strips MongoDB operator keys (`$gt`, `$where`, dotted keys) from the request **body and params** — defending against NoSQL operator injection (e.g. a login of `{ "email": { "$gt": "" } }`). |
| `src/common/utils/password.util.ts` | Two helpers — `hashPassword` and `comparePassword` — wrapping bcrypt. A single source of truth for password hashing, reused by signup and by project invites. |

---

## Schemas (the "M" in MVC — the data models)

Centralised under `src/schemas/<feature>/` so the data layer is in one place.

| File | What it does |
| ---- | ------------ |
| `src/schemas/users/user.schema.ts` | The **User** model: `name`, unique `email`, `passwordHash`. `passwordHash` is `select: false` so it is never returned by default queries. |
| `src/schemas/projects/project.schema.ts` | The **Project** model: `name`, `description`, `owner`, and a `members` array of `{ user, role }` sub-documents (`ProjectMember`). `ProjectRole` is `admin`/`member`. An index on `members.user` powers "projects I belong to" lookups. |
| `src/schemas/tasks/task.schema.ts` | The **Task** model: `title`, `description`, `status` (`todo`/`in_progress`/`done` via `TaskStatus`), a `project` reference, and `createdBy`. Access is governed by project membership, not by the task's creator. |

---

## DTOs (input contracts + validation)

Centralised under `src/dto/<feature>/`. A **DTO** (Data Transfer Object) defines
the exact shape of a request body and uses `class-validator` decorators so the
global `ValidationPipe` rejects anything malformed before it reaches a service.

| File | What it validates |
| ---- | ----------------- |
| `src/dto/auth/signup.dto.ts` | `name` (2–60), `email` (valid email), `password` (6–72). |
| `src/dto/auth/login.dto.ts` | `email`, `password`. |
| `src/dto/projects/create-project.dto.ts` | `name` (2–120), optional `description`. |
| `src/dto/projects/update-project.dto.ts` | `PartialType` of create — all fields optional (for PATCH). |
| `src/dto/projects/invite-member.dto.ts` | `email` of the person to invite. |
| `src/dto/tasks/create-task.dto.ts` | `title` (2–160), optional `description`, optional `status` (enum). |
| `src/dto/tasks/update-task.dto.ts` | `PartialType` of create — all fields optional. |

---

## Feature modules

Each feature has a **module** (wires it up), a **controller** (HTTP routes), and
a **service** (business logic). Controllers stay thin; all logic is in services.

### Users (`src/modules/users/`)

| File | What it does |
| ---- | ------------ |
| `users.service.ts` | Owns user persistence: `create` (hashes the password), `findByEmail`, `findById`, and `findOrCreate` (used by invites — returns an existing user or creates one with the default password). |
| `users.module.ts` | Registers the User model and exports `UsersService` so Auth and Projects can use it. |

### Auth (`src/modules/auth/`)

| File | What it does |
| ---- | ------------ |
| `auth.controller.ts` | Routes: `POST /auth/signup`, `POST /auth/login`, `GET /auth/me` (guarded). |
| `auth.service.ts` | The auth flow: checks for duplicate email on signup, verifies credentials on login (same error for unknown email vs wrong password to prevent user enumeration), and issues JWTs. |
| `auth.module.ts` | Configures `JwtModule` (secret + expiry from config) and `PassportModule`; registers the controller, service and JWT strategy. |
| `strategies/jwt.strategy.ts` | Passport strategy that validates the bearer token's signature/expiry and maps its payload (`sub`, `email`) to the `AuthUser` the `@CurrentUser()` decorator returns. |
| `auth.service.spec.ts` | Unit tests: signup creates a user + returns a token, duplicate email is rejected, login succeeds with correct credentials and fails (401) otherwise. |

### Projects (`src/modules/projects/`)

| File | What it does |
| ---- | ------------ |
| `projects.controller.ts` | CRUD routes for `/projects`. On single-project GET it also returns `myRole` so the UI can gate admin-only actions. |
| `members.controller.ts` | Member management under `/projects/:projectId/members`: list (any member), invite (admin only), remove (admin only). |
| `projects.service.ts` | The heart of authorization. Creates a project (creator becomes an **admin** member), lists projects you belong to, and provides `findForMember`/`findForAdmin` gates reused everywhere. Handles invites (find-or-create the user, add as member), member removal (owner can't be removed), and emits a `project.deleted` event on delete. |
| `projects.module.ts` | Registers the Project model + both controllers, imports `UsersModule` (for invites), and exports `ProjectsService` for Tasks and Dashboard. |

### Tasks (`src/modules/tasks/`)

| File | What it does |
| ---- | ------------ |
| `tasks.controller.ts` | Create/list under `/projects/:projectId/tasks`; get/update/delete under `/tasks/:id`. |
| `tasks.service.ts` | Task CRUD, each gated by **project membership** (via `ProjectsService.findForMember`). Also provides aggregation helpers for the dashboard (`countByStatusForProjects`, `countPerProject`) and an `@OnEvent('project.deleted')` handler that deletes a project's tasks (the cascade). |
| `tasks.module.ts` | Registers the Task model, imports `ProjectsModule` (for membership checks), and exports `TasksService` for the dashboard. |
| `tasks.service.spec.ts` | Unit tests: create verifies membership first, a non-member is blocked, invalid ids 404, and the project-deleted handler removes the right tasks. |

### Dashboard (`src/modules/dashboard/`)

| File | What it does |
| ---- | ------------ |
| `dashboard.controller.ts` | `GET /dashboard` (guarded) returning the current user's stats. |
| `dashboard.service.ts` | Read-only aggregation: counts projects you're in, totals tasks and breaks them down by status, and lists each project with your role and its task count. It **orchestrates** `ProjectsService` + `TasksService` rather than touching collections directly, keeping module boundaries intact. |
| `dashboard.module.ts` | Imports `ProjectsModule` + `TasksModule` and registers the dashboard controller/service. |

---

## Key concepts a reviewer may ask about

- **Why modular monolith?** Fast to build/deploy now; boundaries already exist
  so each module can become a service later. See `README.md` → Architecture.
- **How is the "microservice path" real?** Modules only talk through exported
  **services** and an **event bus**. Swap the in-process `EventEmitter2` for
  RabbitMQ/Redis and add a gateway, and the modules barely change.
- **How is authorization done?** Centrally in `ProjectsService`: `findForMember`
  (any role) and `findForAdmin` (admin only). Tasks reuse `findForMember`; member
  management uses `findForAdmin`.
- **How are passwords handled?** bcrypt via `password.util.ts`; hashes are never
  selected by default; login avoids user enumeration.
- **Why DTOs + ValidationPipe?** Input is validated and whitelisted at the edge
  (`whitelist` + `forbidNonWhitelisted`), so services receive only clean, typed data.
- **How does invite work?** Admin posts an email; `UsersService.findOrCreate`
  returns or creates the user (with `DEFAULT_INVITE_PASSWORD`); they're added as a
  `member` and can log in to see only their assigned projects.

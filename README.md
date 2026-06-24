# TeamBoard — Backend (NestJS + MongoDB)

REST API for **TeamBoard**, a lightweight work-management platform. Users sign
up, create projects, and manage tasks within each project.

Built with **NestJS 11 + TypeScript + Mongoose**, organised as a **modular
monolith** with a clear path to microservices (see [Architecture](#architecture)).

---

## Tech stack

| Concern         | Choice                                              |
| --------------- | --------------------------------------------------- |
| Framework       | NestJS 11 (TypeScript)                               |
| Database        | MongoDB via Mongoose                                 |
| Auth            | JWT (Passport `passport-jwt`) + bcrypt              |
| Validation      | `class-validator` / `class-transformer` DTOs        |
| Config          | `@nestjs/config` + Joi env validation               |
| Security        | Helmet, global rate limiting, NoSQL-injection guard |
| Cross-module    | `@nestjs/event-emitter` (in-process pub/sub)        |
| Tests           | Jest (unit)                                         |

---

## Project structure

Each feature is a self-contained NestJS module following an **MVC-per-feature**
layout — controller (C), schema/model (M), service (business logic), plus its
DTOs and the module that wires them together.

DTOs and schemas are centralised under `src/dto/` and `src/schemas/` (organised
by feature); controllers/services/modules stay per-feature under `src/modules/`.

```
src/
├── main.ts                     # bootstrap: helmet, sanitize, validation, CORS, prefix
├── app.module.ts               # root module — config, db, throttler, events, features
├── health.controller.ts        # GET /api/health liveness probe
├── config/                     # configuration.ts + env.validation.ts (Joi)
├── common/
│   ├── decorators/current-user.decorator.ts
│   ├── guards/jwt-auth.guard.ts
│   ├── filters/all-exceptions.filter.ts
│   ├── middleware/mongo-sanitize.middleware.ts
│   └── utils/password.util.ts          # bcrypt hash/compare (single source)
├── schemas/                    # the "M": users/, projects/, tasks/ Mongoose schemas
├── dto/                        # input contracts: auth/, projects/, tasks/
└── modules/
    ├── users/        # service + module (owns user data)
    ├── auth/         # controller, service, module, jwt strategy
    ├── projects/     # projects + members controllers, service, module
    ├── tasks/        # controller, service, module (member-scoped)
    └── dashboard/    # controller, service, module (stats aggregation)
```

See [`FILE_GUIDE.md`](./FILE_GUIDE.md) for a file-by-file explanation.

### Roles & membership

A project has **members**, each with a role. The creator is the **admin**;
admins can invite/remove members and delete the project. Invited **members** can
view the project and fully manage its tasks. Inviting an email with no account
creates one with `DEFAULT_INVITE_PASSWORD`, so they can log in and see only the
projects they belong to.

---

## API

Base URL: `http://localhost:3000/api`

### Auth

| Method | Endpoint       | Auth | Body                         | Description            |
| ------ | -------------- | ---- | ---------------------------- | ---------------------- |
| POST   | `/auth/signup` | —    | `{ name, email, password }`  | Register + get a token |
| POST   | `/auth/login`  | —    | `{ email, password }`        | Log in + get a token   |
| GET    | `/auth/me`     | JWT  | —                            | Current user profile   |

### Projects (all require JWT)

| Method | Endpoint        | Body                       | Description           |
| ------ | --------------- | -------------------------- | --------------------- |
| POST   | `/projects`     | `{ name, description? }`   | Create a project      |
| GET    | `/projects`     | —                          | List my projects      |
| GET    | `/projects/:id` | —                          | Get one project       |
| PATCH  | `/projects/:id` | `{ name?, description? }`  | Update a project      |
| DELETE | `/projects/:id` | —                          | Delete (+ its tasks)  |

### Tasks (all require JWT)

| Method | Endpoint                      | Body                                   | Description           |
| ------ | ----------------------------- | -------------------------------------- | --------------------- |
| POST   | `/projects/:projectId/tasks`  | `{ title, description?, status? }`     | Create a task         |
| GET    | `/projects/:projectId/tasks`  | —                                      | List a project's tasks|
| GET    | `/tasks/:id`                  | —                                      | Get one task          |
| PATCH  | `/tasks/:id`                  | `{ title?, description?, status? }`    | Update a task         |
| DELETE | `/tasks/:id`                  | —                                      | Delete a task         |

`status` ∈ `todo` | `in_progress` | `done`.

### Members (all require JWT)

| Method | Endpoint                              | Role  | Description                  |
| ------ | ------------------------------------- | ----- | ---------------------------- |
| GET    | `/projects/:projectId/members`        | any   | List members + roles         |
| POST   | `/projects/:projectId/members`        | admin | Invite by email `{ email }`  |
| DELETE | `/projects/:projectId/members/:userId`| admin | Remove a member              |

### Dashboard (requires JWT)

| Method | Endpoint     | Description                                            |
| ------ | ------------ | ----------------------------------------------------- |
| GET    | `/dashboard` | Stats: project/task counts, by-status, per-project    |

Authenticated requests must send `Authorization: Bearer <accessToken>`.

---

## Getting started

### Prerequisites

- Node.js 20+ and npm
- MongoDB — easiest via Docker (below), or a local/Atlas connection string

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Adjust values as needed (see [Environment variables](#environment-variables)).

### 3. Start MongoDB (Docker)

```bash
docker compose up -d mongo
```

This runs MongoDB on `localhost:27017` with a persistent volume.

### 4. Run the API

```bash
npm run start:dev      # watch mode
```

API is live at `http://localhost:3000/api`. Check `GET /api/health`.

### Run everything in Docker

```bash
docker compose up --build      # Mongo + API together
```

---

## Environment variables

| Variable         | Required | Default                   | Description                              |
| ---------------- | -------- | ------------------------- | ---------------------------------------- |
| `NODE_ENV`       | no       | `development`             | `development` \| `production` \| `test`  |
| `PORT`           | no       | `3000`                    | HTTP port                                |
| `MONGO_URI`      | **yes**  | —                         | MongoDB connection string                |
| `CORS_ORIGIN`    | no       | `*`                       | Allowed frontend origin                  |
| `JWT_SECRET`     | **yes**  | —                         | JWT signing secret (min 16 chars)        |
| `JWT_EXPIRES_IN` | no       | `1d`                      | Token lifetime                           |
| `DEFAULT_INVITE_PASSWORD` | no | `TeamBoard123!`        | Password for users created via invite    |
| `THROTTLE_TTL`   | no       | `60`                      | Rate-limit window (seconds)              |
| `THROTTLE_LIMIT` | no       | `100`                     | Max requests per window per IP           |

The app validates these with Joi on boot and exits with a clear error if any
required variable is missing or malformed.

---

## Testing

```bash
npm test               # unit tests
npm run test:cov       # with coverage
```

Covered: password hashing & credential checks (`AuthService`), task ownership
enforcement and the project-deletion cascade (`TasksService`).

---

## Architecture

### Why a modular monolith?

For a project of this size a monolith is faster to build, test, and deploy than
a true microservice fleet — but the brief asks for a structure that *could*
evolve into services. So every domain lives in an **isolated module** that only
exposes a narrow surface:

- Modules never import another module's internals — they depend on an exported
  **service** (e.g. `TasksModule` imports `ProjectsModule` and uses
  `ProjectsService.findOneForOwner` for authorization).
- Cross-cutting reactions are **event-driven**, not direct calls: deleting a
  project emits a `project.deleted` event and `TasksService` reacts to it. This
  is the same shape a message broker would take across services.

### Path to microservices

| Today (monolith)                              | Split into services                                            |
| --------------------------------------------- | -------------------------------------------------------------- |
| `AuthModule` + `UsersModule`                  | **AuthService** (owns users + token issuance)                  |
| `ProjectsModule`                              | **ProjectService**                                             |
| `TasksModule`                                 | **TaskService**                                                |
| In-process `EventEmitter2` (`project.deleted`)| Replace with **RabbitMQ / Redis pub-sub** — same event names   |
| Direct `ProjectsService` call for auth checks | Replace with an **API Gateway** + service-to-service call/JWT  |

Because the boundaries already exist, extraction is mostly transport changes,
not a rewrite.

### Security & trade-offs

- **Helmet** for secure headers, global **rate limiting** (`@nestjs/throttler`).
- **NoSQL-injection** guard: a small middleware strips `$`/dotted keys from
  bodies & params, backed by strict DTO validation (`whitelist` +
  `forbidNonWhitelisted` + type coercion). On Express 5 `req.query` is read-only,
  so query injection is handled by validation alone.
- **Passwords** are bcrypt-hashed and never selected by default (`select:false`).
- Login returns the **same error** for unknown email and wrong password to avoid
  user enumeration.
- **Trade-off:** ownership is enforced in services (simple, explicit) rather than
  via a generic policy/CASL layer — appropriate for this scope.

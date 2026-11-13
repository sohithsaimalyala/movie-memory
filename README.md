# Movie Memory

Sign in with Google, save your favorite movie, and get AI-generated fun facts about it.

Built for the full-stack take-home assessment, **Variant B (Frontend/API-focused)**.

## Features

- **Google sign-in** with Auth.js v5 and database-backed sessions; logging out deletes the session row.
- **Onboarding:** first-time users choose a favorite movie (validated on the server); returning users go straight to the dashboard.
- **Dashboard:** Google name, email, and photo (with fallbacks), the favorite movie, and sign-out.
- **AI fun facts** from the OpenAI Responses API, saved in PostgreSQL with the movie title used for each one.
- **Typed REST API:** `GET /api/me`, `PUT /api/me/movie`, `GET /api/fact`, plus a typed client with normalized errors.
- **Inline movie editing** with Save/Cancel, an optimistic update, and rollback on failure.
- **30-second client-side fact cache**, bypassed by "Get another fact" and cleared when the movie changes.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL 18 (Docker Compose), Prisma 7 with `@prisma/adapter-pg` |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta.32`), Google provider, Prisma adapter |
| AI | Official `openai` SDK (Responses API), default model `gpt-5.4-mini` |
| Tests | Node's built-in test runner (`node:test`) |

## Local setup

**Prerequisites:** Node.js 22.18 or later, npm, and Docker.

```bash
git clone https://github.com/sohithsaimalyala/movie-memory.git
cd movie-memory
npm ci                      # also runs `prisma generate`
cp .env.example .env        # then fill in the values below
npm run db:up               # starts PostgreSQL on 127.0.0.1:5433 and waits until healthy
npx prisma migrate deploy   # applies prisma/migrations
npm run dev                 # http://localhost:3000
```

Use `npm run dev -- -p 3001` if port 3000 is taken.

### Environment variables

All variables are server-side only. `.env` is git-ignored; never commit it.

| Variable | Purpose |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | Used by Docker Compose to create the local database (defaults are pre-filled; choose a password) |
| `DATABASE_URL` | `postgresql://movie_memory:<password>@localhost:5433/movie_memory?schema=public` |
| `AUTH_SECRET` | Signs Auth.js cookies. Generate with `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth client credentials |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Optional. Overrides the default `gpt-5.4-mini` |
| `AUTH_TRUST_HOST` | Optional. Set to `true` only when running `npm run start` locally |

### Google OAuth setup

1. In Google Cloud Console, configure the **OAuth consent screen**: External, Testing mode, and add your Google account as a **test user**.
2. Create an **OAuth client ID** of type **Web application**.
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Add the same entries for any other port you use.
3. Put the client ID and secret in `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

In Testing mode, only listed test users can sign in, so reviewers need their own OAuth client.

### Database

- Schema: `prisma/schema.prisma`. Migrations: `prisma/migrations/`.
- Models: `User` (with a nullable `favoriteMovie VARCHAR(200)`), `Account`, `Session` (both used by Auth.js), and `MovieFact`.
- Foreign keys cascade on user deletion. `MovieFact` has an index on `(userId, createdAt DESC)`.
- Useful commands:
  - `npm run db:migrate`: create or apply migrations during development
  - `npm run db:studio`: browse the data
  - `docker compose down`: stop the database (data persists in a named volume)

## API

Every endpoint identifies the user from the session cookie and never accepts a user ID from the client. Errors always use this shape, and responses are sent with `Cache-Control: no-store`:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Enter a movie title." } }
```

| Endpoint | Description | Success | Errors |
|---|---|---|---|
| `GET /api/me` | Current user's profile and favorite movie | `200 { id, name, email, image, favoriteMovie }` | 401 |
| `PUT /api/me/movie` | Body `{ "title": string }`. Trimmed; 1–200 Unicode code points; no control characters | `200 { favoriteMovie }` | 401, 415 (not JSON), 400 (invalid JSON), 422 (validation), 500 |
| `GET /api/fact` | **Returns the latest saved fact for the current movie.** Generates (and saves) one only if none exists yet | `200 { fact: { id, movieTitle, content, createdAt } }` | 401, 409, 422, 429, 502, 503, 504 |
| `GET /api/fact?refresh=1` | **Always generates** a new fact (subject to a 10-second per-user cooldown) | same | same |

`GET /api/fact` error codes:
- **409:** `NO_FAVORITE_MOVIE`, or `MOVIE_CHANGED` if the movie changed during generation
- **422:** `UNKNOWN_MOVIE`
- **429:** `COOLDOWN` (with `Retry-After`) or `RATE_LIMITED`
- **502:** `UPSTREAM_ERROR`
- **503:** `NOT_CONFIGURED` (no OpenAI key)
- **504:** `TIMEOUT`

The typed client is `src/lib/api-client.ts`. Every failure becomes an `ApiError` with `status` and `code`. That includes API errors, non-JSON responses (`HTTP_ERROR`, `INVALID_RESPONSE`) and network failures (`NETWORK_ERROR`, status 0).

## Why Variant B

Variant B focuses on API design and client behavior: typed endpoints, a reusable client with normalized errors, optimistic updates with rollback, and client-side caching. That fit the goal of a small, well-tested full-stack app where correctness at the client/server boundary matters more than server infrastructure.

## Architecture and decisions

- **Server-side authorization everywhere.**
  - `getSessionUser()` and `getCurrentUser()` in `src/lib/session.ts` are the only way pages and routes identify the user.
  - Every query is scoped to that user ID.
  - There's no `proxy.ts`: each page and route checks the session itself. With database sessions, a proxy would query the database on every request, including prefetches.
- **Database sessions over JWT,** so logout really revokes the session. The session callback returns only `id`, `name`, `email`, and `image`, never the session token or OAuth tokens.
- **One validator for titles** (`src/lib/movie-title.ts`), shared by onboarding, the API, and the inline editor. Length is counted in code points to match PostgreSQL's `VARCHAR(200)`.
- **Onboarding is write-once** (`updateMany … where favoriteMovie: null`); later changes go through `PUT /api/me/movie`.
- **Fact generation** (`src/lib/facts.ts`, `src/lib/openai.ts`, both `server-only`):
  - The movie title is read from the database, never from the client.
  - Simultaneous requests from one user are merged in-process.
  - A 10-second per-user cooldown limits cost.
  - The SDK uses a 15-second timeout and 1 retry.
  - Output is validated (completed, non-empty, at most 500 characters, `UNKNOWN_MOVIE` sentinel) before saving.
  - Each fact is saved with the title used to generate it, so facts never appear under a different movie.
- **Prompting:**
  - The model is asked for one well-documented fact (production, cast and crew, release, reception, or awards), with no invented details and no spoilers.
  - It can answer `UNKNOWN_MOVIE` instead of guessing.
  - The title is wrapped in delimiters and treated as data.
  - Facts are labeled "AI-generated and not independently verified."
- **Client cache** (`src/lib/fact-cache.ts`):
  - Keyed by user and movie, with a 30-second TTL.
  - Concurrent loads share one request.
  - The server-rendered fact seeds it.
  - "Get another fact" bypasses it.
  - Saving a new movie invalidates both the old and new keys, and results arriving after invalidation are discarded.
- **Optimistic editing** (`src/lib/optimistic-movie.ts`, `favorite-movie-section.tsx`):
  - The title updates immediately.
  - While saving, the fact panel pauses so it can't show a fact for the wrong movie.
  - On failure, the previous title (and its cached fact) is restored, along with the server's message.

## Testing

```bash
npm test            # unit tests (node:test, no network or database needed)
npm run lint
npm run typecheck
npm run build
```

**Unit tests (24)** cover:
- Title validation (trimming, empty input, the 200 code-point limit including emoji, control characters)
- API client error handling
- The fact cache (hit, expiry, refresh bypass, invalidation, de-duplication, discarding late results)
- Optimistic save (success and rollback)

**Checked during development but not automated in this repo:**
- Tests against a local mock of the OpenAI Responses API (pointed to with `OPENAI_BASE_URL`), covering success, unknown movie, empty, incomplete or oversized output, 401, 429 and 500 with a retry, a timeout, the reasoning-parameter fallback, five simultaneous requests producing one API call, the cooldown, user isolation, and a movie change during generation.
- `curl` checks of every endpoint, including unauthorized access, validation, injected `userId` fields, and user isolation.
- Headless Chrome checks of onboarding, the dashboard layout from 320px to 1280px, keyboard focus and contrast, and the inline edit flow (optimistic update, a single request on double submit, rollback on a server 401, cache hits, and refresh bypass).
- One real Google sign-in and one controlled real OpenAI request.

## Known limitations and future work

- **Duplicate generation is only prevented within one process.** Multiple server instances would need a shared lock (Postgres advisory locks or Redis).
- **The cooldown is a basic cost guard,** not a full rate limiter.
- **AI facts can be wrong.** The prompt reduces made-up facts but can't eliminate them.
- **The fact cache lives in memory,** so it resets on a full page reload. That's acceptable given the 30-second TTL.
- **Auth.js v5 is still in beta,** so it's pinned to an exact version.
- **Not yet built:** automated browser tests in the repo (for example Playwright), integration tests against a test database, and a deployment configuration.

## AI-assisted development


I used Claude (Anthropic), through Claude Code, as a coding assistant throughout this project.

- **Design and decisions (me):** I chose the architecture and made the security calls, including database sessions over JWTs, session-scoped authorization on every route, the write-once onboarding update, the 30-second client cache, and optimistic editing with rollback. Claude proposed options at each stage, and I picked among them or changed them.
- **Implementation (Claude, reviewed by me):** Claude wrote most of the code and tests from those decisions. I reviewed every change and approved each stage before committing it.
- **Verification (shared):** Claude ran lint, type checks, builds, mock-based OpenAI tests, and curl and headless-browser checks. I set up the Google OAuth and OpenAI credentials and ran the real Google sign-in and the live OpenAI test myself.
- **Ownership:** I can walk through and defend every part of the code, including the tradeoffs and known limitations listed above.

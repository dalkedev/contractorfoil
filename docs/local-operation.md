# Local operation

The frontend and API run as separate processes. Use Node 24.22.2 and npm 11.19.1 with the committed lockfiles. Install all packages once from the repository root with `npm run setup`.

## Configure the API

Copy `backend/.env.example` to `backend/.env` and replace the signing-secret placeholder. `npm run dev:api` runs the backend from its package directory, where startup loads `.env`.

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB URI with an explicit database. Defaults to `mongodb://127.0.0.1:27017/contractorfoil` in development; required in production. The example uses a separate local database. |
| `JWT_SECRET` | Required server signing secret. Keep it private; changing it invalidates tokens signed with the previous secret. |
| `PORT` | HTTP port from `1` to `65535`; defaults to `5000`. |
| `CORS_ORIGINS` | Comma-separated exact frontend origins, including scheme and port, without paths. Development defaults to `http://localhost:5173,http://127.0.0.1:5173`; production requires an explicit value. |
| `USE_RECAPTCHA` | Accepts `true` or `false`; defaults to `false`. Enables registration verification when `true`. |
| `RECAPTCHA_SECRET_KEY` | Server-only reCAPTCHA v3 secret, required when verification is enabled. |
| `RECAPTCHA_HOSTNAME` | Exact expected CAPTCHA hostname, required when verification is enabled. |

Use the same hostname in the browser URL and CORS configuration. `localhost` and `127.0.0.1` are different origins. CORS controls browser access; authenticated API requests still require a valid token and an owned record.

An empty `CORS_ORIGINS` permits direct same-origin browser requests without granting cross-origin access. Behind a reverse proxy or TLS terminator, explicitly list the public frontend origin; the API does not assume forwarded headers are trusted.

`NODE_ENV=production` enables production configuration checks and binds HTTP to `0.0.0.0`. Development binds to `127.0.0.1`. Keep local validation on loopback.

The [frontend configuration guide](../frontend/README.md#browser-configuration) describes public build variables. Local defaults never select a hosted API.

## Start and inspect

With local MongoDB running at the example URI, use separate terminals:

```sh
npm run dev:api
```

```sh
npm run dev
```

The API waits for the initial MongoDB connection before listening. Check it using loopback requests:

```sh
curl --fail http://127.0.0.1:5000/health/live
curl --fail http://127.0.0.1:5000/health/ready
```

Liveness reports that the HTTP process is running. Readiness returns success only while the database is connected and the process is accepting work. Health responses do not include connection details.

On `SIGINT` or `SIGTERM`, the process stops reporting ready, drains HTTP connections within a deadline, and closes MongoDB. Stop both development processes with Ctrl-C when finished.

## Run checks

Backend tests create and drop a fictional test database. They do not load `.env` and reject non-loopback MongoDB URIs. Keep the test MongoDB process separate from application data.

Start a disposable local MongoDB instance in one terminal. These commands require `mongod` on your `PATH`:

```sh
CF_TEST_DB_DIR="$(mktemp -d /tmp/contractorfoil-tests.XXXXXX)"
mongod --bind_ip 127.0.0.1 --port 27281 --dbpath "$CF_TEST_DB_DIR"
```

In another terminal, from the repository root:

```sh
npm run check
```

The backend suite defaults to port `27281` and generates a `cf_test_` database name. To use another isolated instance, set `CF_TEST_MONGO_URI` for the command:

```sh
CF_TEST_MONGO_URI=mongodb://127.0.0.1:27281/cf_test_local npm test
```

The URI must use `mongodb:`, a loopback host, and an explicit `cf_test_` database, with no credentials or query options. Tests delete their database during cleanup. Use only a disposable instance and fictional data. CAPTCHA tests stub verification instead of calling Google.

For focused checks:

| Command from repository root | Scope |
| --- | --- |
| `npm run test --prefix backend` | Backend configuration, lifecycle, and API tests |
| `npm run test --prefix frontend` | Transport, domain, and interface tests |
| `npm run typecheck` | Frontend TypeScript |
| `npm run build` | Type checking and frontend production bundle |

Stop the disposable MongoDB process with Ctrl-C after tests. Keep credentials, database directories, logs, and browser profiles outside the repository.

## Optional CAPTCHA

Leave both CAPTCHA flags disabled locally. In that mode registration needs no provider token or Google verification request, and the frontend does not load the CAPTCHA script.

To enable reCAPTCHA v3, configure the public site key and `VITE_USE_RECAPTCHA=true` before building the frontend. Set `USE_RECAPTCHA=true`, `RECAPTCHA_SECRET_KEY`, and `RECAPTCHA_HOSTNAME` on the API. The API checks a successful provider result, the `register` action, the exact hostname, and a score of at least `0.5`, with a 3-second verification timeout. Missing server configuration prevents startup; failed or unavailable verification prevents registration.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API does not start | Required variables, valid port/origins, and MongoDB reachability. Do not paste secret values into diagnostics. |
| Browser cannot reach the API | `VITE_API_URL`, API health, and the exact frontend origin in `CORS_ORIGINS`. Restart Vite after editing its environment. |
| Preview requests fail | Add `http://127.0.0.1:4173` to the local API allowlist and build with an explicit local `VITE_API_URL`. |
| Tests cannot connect | A disposable MongoDB instance must be listening on the configured loopback port. |
| Session is rejected | Sign in again. Expired, invalid, or deleted-account tokens return `401`. |
| Save response is lost | Retain the draft and inspect or refresh saved records before repeating a mutation. |
| Request times out | The browser stops waiting after 20 seconds, including response-body transfer. Retry a read deliberately. For a write, check saved records first: the server may already have committed it. |

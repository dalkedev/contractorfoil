# Frontend hosting

`npm run build` produces static files in `frontend/dist`. Serve that directory over HTTPS and run the Express API as a separate service with its own MongoDB connection and server secrets.

## API origin

Set `VITE_API_URL` to the intended API origin before building, for example `https://api.example.test`, without an `/api` suffix. The client appends paths such as `/api/auth/me`. Configure that API's `CORS_ORIGINS` with the exact frontend origin.

A blank production `VITE_API_URL` uses relative `/api/...` requests on the frontend origin. Use this only when an explicitly configured reverse proxy routes `/api` to Express. The supplied static-host configuration does not create that proxy. Never use a production API as a local or preview fallback.

Use a separate API and database for previews. Do not allow all preview domains to access production data. Browser variables are embedded in the bundle; MongoDB URIs, JWT signing secrets, and CAPTCHA secret keys belong only on the API service.

## Vercel configuration

Two Vercel Root Directory settings are supported. Commands and output paths are relative to the selected directory:

| Setting | Repository root | `frontend` |
| --- | --- | --- |
| Configuration | [vercel.json](../vercel.json) | [frontend/vercel.json](../frontend/vercel.json) |
| Framework | Other | Vite |
| Install | `npm ci --prefix frontend` | `npm ci` |
| Build | `npm run build` | `npm run build` |
| Output | `frontend/dist` | `dist` |

The existing hosted frontend uses `frontend` as its Root Directory. Its local configuration selects Vite and uses that directory's committed lockfile. Keep this setting when updating the project; no dashboard change is required. A new project may use either layout above.

Do not use `npm ci --prefix frontend` with Root Directory `frontend`: that looks for a nonexistent nested `frontend/frontend/package-lock.json` and fails with npm's lockfile usage error. Likewise, output is `dist` within the frontend root, not `frontend/dist`.

Both configurations install and build only the frontend package. Neither deploys the backend. Configure `VITE_API_URL` and any optional public CAPTCHA settings for the intended environment before building.

The rewrites serve `index.html` for `/`, `/login`, `/register`, `/dashboard`, and `/contractors/:path*`, including create, detail, and edit routes. This lets direct navigation and refresh reach React Router. Add a rewrite when introducing another top-level application route. Static assets and `/api` or `/health` paths are outside these rewrites, so an absent API route cannot masquerade as a successful SPA document.

The configurations follow Vercel's [Root Directory settings](https://vercel.com/docs/builds/configure-a-build#root-directory), [static configuration reference](https://vercel.com/docs/project-configuration/vercel-json) and [Vite SPA guidance](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas). Source configuration does not establish deployed behavior; verify the next deployment in the target environment.

## Verify a hosting change

Before release, build with the intended public variables and verify:

1. An unauthenticated direct request to `/contractors` loads the SPA and presents sign-in.
2. After signing in to an isolated test service, refreshing `/contractors/<owned-id>` loads that record.
3. JavaScript, styles, and public assets return their own content types.
4. `/api/...` reaches the intended API and returns JSON, including API `404` responses. A static-only frontend host should return an HTTP error for those paths.
5. The API allows only the configured browser origins and requires authentication for every contractor endpoint.
6. Disabled CAPTCHA makes no CAPTCHA provider requests; enabled CAPTCHA uses the intended public key and matching API configuration.

Use fictional data on isolated services for these checks. If a mutation response is ambiguous, inspect the saved result before a deliberate retry. Keep the previous frontend artifact and API configuration available for rollback; preserve the existing database and identifiers.

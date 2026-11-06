# ContractorFoil frontend

React 18 and TypeScript SPA, built with Vite. Run setup and the local API using the [repository guide](../README.md#run-locally).

From the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite at `http://127.0.0.1:5173` |
| `npm run test --prefix frontend` | Run Vitest once |
| `npm run test:watch --prefix frontend` | Watch frontend tests |
| `npm run typecheck` | Check TypeScript |
| `npm run build` | Type check and build `frontend/dist` |
| `npm run preview --prefix frontend` | Preview the build at `http://127.0.0.1:4173` |

The development and preview servers use strict ports. If a port is occupied, stop the other process rather than assuming Vite moved to another port. Allow the preview origin in the local API's `CORS_ORIGINS` when using it.

## Browser configuration

Copy `.env.example` to `.env` in this directory. Vite reads these settings when the dev server starts or the bundle is built; restart or rebuild after changing them. Every `VITE_` value is public browser configuration.

| Variable | Behavior |
| --- | --- |
| `VITE_API_URL` | API origin, without `/api`. Development defaults to `http://127.0.0.1:5000`; a blank production value uses the frontend origin and requires separately configured API routing. |
| `VITE_USE_RECAPTCHA` | Only the exact value `true` enables registration CAPTCHA. Defaults to disabled. |
| `VITE_RECAPTCHA_SITE_KEY` | Public reCAPTCHA v3 site key, required when browser CAPTCHA is enabled. |

Never put `JWT_SECRET`, `MONGO_URI`, or a reCAPTCHA secret key in frontend configuration. See [hosting](../docs/hosting.md) before building for a remote API.

## Client boundaries

`src/services/api.ts` owns HTTP requests and session storage. Successful login and registration save a session; `/api/auth/me` verifies the current account. Authentication and record ownership are enforced by the API.

`src/domain/contractors.ts` owns draft conversion, sparse updates, search, sorting, and display formatting. Reuse these helpers when changing forms. An unrelated edit must preserve missing values, decimal precision, and an existing non-midnight contact timestamp. Explicitly clearing a date or price sends `null`.

The client sends mutations once. An `ApiError` with `ambiguous: true` means the server may have saved the request despite the failed response. Preserve the draft and reconcile the saved data before offering another create action.

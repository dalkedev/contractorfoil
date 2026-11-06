# ContractorFoil

ContractorFoil keeps company contact details, notes, a contact date, and current material prices in one workspace. Each account manages its own records. Prices use PLN/kg.

The frontend is a React and TypeScript SPA built with Vite. The API uses Express, Mongoose, MongoDB, and JWT authentication.

## Run locally

Use Node **24.22.2**, npm **11.19.1**, and a local MongoDB instance listening on `127.0.0.1:27017`. Runtime versions are recorded in `.nvmrc`, `.node-version`, and the package manifests.

From the repository root:

```sh
npm run setup
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Replace the `JWT_SECRET` placeholder in `backend/.env` with a random local signing secret. Keep the local database URI and CAPTCHA disabled for local development.

Start the API:

```sh
npm run dev:api
```

In another terminal, start the frontend:

```sh
npm run dev
```

Open `http://127.0.0.1:5173` and register a local account. The frontend uses `http://127.0.0.1:5000` for the API during development unless `VITE_API_URL` is set. It has no production API fallback.

## Working with records

- Search and sort Companies, then open a record to view or edit its contact details, notes, and current prices.
- Keep NIP and phone numbers as strings so leading zeroes and formatting survive.
- A zero price is a recorded value; an unset price is shown as `Not set`. Display formatting does not change stored precision.
- Contact date is optional and has a neutral meaning. Editing another field preserves an existing timestamp and any untouched optional values.
- If a save response is lost, check saved records before repeating the action. Mutations are never retried automatically.

## Check changes

Start an isolated local MongoDB instance for the backend suite as described in [local operation](docs/local-operation.md#run-checks), then run:

```sh
npm run check
```

This runs backend and frontend tests, frontend type checking, and the production build. Individual commands are `npm test`, `npm run typecheck`, and `npm run build`. The build output is `frontend/dist`.

Use fictional local accounts and records for tests and screenshots. Do not use a production API or database for validation.

## Documentation

- [Local operation and configuration](docs/local-operation.md)
- [API and stored-value semantics](docs/api.md)
- [Frontend hosting and deep links](docs/hosting.md)
- [Frontend development](frontend/README.md)

The existing license declarations are retained in the package manifests: MIT at the repository root and ISC in the backend package.

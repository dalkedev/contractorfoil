# Changelog

## 1.0.0-rc.1 — 2026-11-06

First tagged release candidate for local use and review. This does not claim production acceptance.

- Add a responsive English company workspace with search, sorting, detail views and shared create/edit forms. Preserve leading-zero identifiers, zero versus absent prices and stored price precision.
- Enforce account ownership on API reads and writes, validate inputs, pin JWT verification and redact server errors.
- Preserve drafts through ordinary save failures. Bound requests, including response bodies, to 20 seconds; reconcile uncertain writes instead of retrying them automatically.
- Bind in-flight requests to the verified account and invalidate stale state when another tab changes its session.
- Replace the legacy frontend build with Vite, pin runtimes and dependency locks, remove tracked generated dependencies and add factual local setup, API, hosting and verification documentation.
- Update proxy-addr to 2.0.8. Dependency audits reported no known vulnerabilities in either package at verification time.
- Support Vercel projects rooted at either the repository root or `frontend`. Fix the nested-lockfile installation failure in frontend-root deployments.

Validation: 56 backend tests with an isolated real MongoDB instance, 88 frontend tests, TypeScript and production build passed. Both Vercel build layouts passed clean tracked-source installs and produced identical assets. GitHub reports a successful Vercel preview build for the hosting fix. Preview authentication and the deployed API/database connection are not independently validated; live CAPTCHA, screen readers, physical touch and other browsers/platforms remain outside this verification.

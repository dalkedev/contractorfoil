# Local verification — 6 November 2026

The company workspace was checked against a real local Express API and disposable MongoDB database using fictional accounts and records. The functional revision was `946923ec9721cd944917d9e35a117f04fe791693`; the documentation and refreshed screenshots do not change application behavior.

## Automated checks

`npm run check` passed on Linux with Node 24.22.2 and npm 11.19.1:

| Check | Observed result |
| --- | --- |
| Backend tests with real local MongoDB | 56 passed |
| Frontend transport, domain, session and interface tests | 88 passed |
| TypeScript | Passed |
| Production frontend build | Passed |

See [local operation](local-operation.md#run-checks) for the disposable test database and commands. The backend suite rejects non-loopback database targets.

## Browser acceptance

The built SPA was exercised in Chromium on Linux through Playwright. The core, deadline and two-page session checks ran again on the combined functional revision. The focused interface checks had passed on that same revision before the final integrated run.

| Scope | Checks | What was observed |
| --- | --- | --- |
| Core workflow | 12 passed | Registration, reload, create/edit/delete, owner isolation, direct route refresh and sign-in recovery |
| Stalled requests | 4 passed | A committed but withheld POST released the UI after 20.47 seconds, retained its draft and sent once; readback found exactly one saved record; a stalled GET recovered through deliberate retry |
| Shared sessions | 4 passed | A changed credential blocked the old form before network submission, the other tab's token survived, explicit sign-in saved only to its own account, and a late login response could not undo logout |
| Interface recovery and reflow | 33 passed | Repeated validation focus, inline renewal, safe dialog actions, keyboard wrap/Escape, successful read focus and full-value wrapping at 320, 390, 768 and 1440 CSS pixels |

The core workflow verified leading zeroes in NIP, formatted phone strings, a zero price, full stored decimal precision, absent optional prices and preservation of a legacy non-midnight timestamp during a notes-only edit. Lost-response checks committed a request to the local API before withholding or dropping its response; they did not merely simulate a failed save before the server received it.

Resting input borders measured 3.81:1 against their white surface. Long NIP values and search text remained readable in the tested views. This measurement and keyboard testing cover specific controls and flows, not a full accessibility conformance assessment.

The README screenshots were captured from the same functional build at 1440×900 and 390×844 viewport sizes, with full-page capture on mobile. The three companies and the account shown are fictional local fixtures. Both views were inspected; neither had horizontal page overflow.

## Before a release

Local acceptance does not establish hosted behavior. A failed Vercel preview check remained unresolved: deployment Build Logs were not available, and the dashboard required authentication. The configured install and build commands also passed in a fresh tracked-source export, but this does not establish why the hosted check failed. Do not infer a deployment fix from the local results.

Before releasing, inspect the actual hosting logs, confirm the intended frontend API origin and isolated preview API/database, and follow the [hosting checks](hosting.md#verify-a-hosting-change). No production deployment or database migration was performed during this verification.

Actual browser zoom, screen-reader use, physical touch devices, Safari/Firefox, other operating systems and live CAPTCHA provider behavior remain unverified. There is no load benchmark, production reliability claim or full WCAG certification in these results.

# API reference

The local API origin is `http://127.0.0.1:5000`. Requests and responses use JSON. Contractor endpoints require `Authorization: Bearer <token>` and return only records owned by the authenticated account. The interface calls these records Companies; API paths and stored identifiers retain `contractors` for compatibility.

## Authentication

| Method and path | Request body | Success |
| --- | --- | --- |
| `POST /api/auth/register` | `name`, `email`, `password`; `captchaToken` when enabled | `201`, session object |
| `POST /api/auth/login` | `email`, `password` | `200`, session object |
| `GET /api/auth/me` | Bearer token, no body | `200`, public profile |

A session has this shape; the values below are fictional placeholders:

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Example Operator",
  "email": "operator@example.test",
  "token": "<signed-token>"
}
```

`/api/auth/me` returns only `_id`, `name`, and `email`. Registration requires a nonblank name of at most 200 characters, an email address of at most 254 characters, and a password of at least 8 characters and at most 72 UTF-8 bytes. Login accepts existing account passwords without imposing the new-registration minimum. A duplicate registration returns `409`; invalid credentials return `401`.

Registration returns a usable session. The browser verifies persisted identity with `/me`; decoding or displaying a cached token is not an authorization check. Invalid, expired, malformed, or deleted-account tokens return `401`.

## Contractors

| Method and path | Request | Success |
| --- | --- | --- |
| `GET /api/contractors` | No body | `200`, owned records as an array |
| `POST /api/contractors` | Required fields and any optional editable fields | `201`, created document |
| `GET /api/contractors/:id` | MongoDB document ID | `200`, owned document |
| `PUT /api/contractors/:id` | Sparse editable fields | `200`, updated document |
| `DELETE /api/contractors/:id` | No body | `200`, `{ "message": "Contractor deleted successfully" }` |

The list is unpaginated. Search and sorting are performed in the frontend. A missing record and another account's record both return `404`. An invalid document ID returns `400`.

### Editable fields

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | Nonblank string, max 200 characters, required on create | Company name |
| `phone` | Nonblank string, max 100 characters, required on create | Contact phone, including formatting |
| `nip` | Nonblank string, max 100 characters, required on create | NIP identifier, preserving leading zeroes |
| `address` | Nonblank string, max 1,000 characters, required on create | Company address |
| `contactDate` | Date string or `null`, optional | Neutral contact date |
| `notes` | String, max 10,000 characters, or `null`, optional | Record notes |
| `priceColorless` | Finite number or `null`, optional | Current colorless material price in PLN/kg |
| `priceColor` | Finite number or `null`, optional | Current colored material price in PLN/kg |
| `typeUnknown` | String, max 200 characters, or `null`, optional | Additional material label |
| `priceUnknown` | Finite number or `null`, optional | Current additional material price in PLN/kg |

A local fictional create body:

```json
{
  "name": "Example Foil Works",
  "phone": "+48 012 345 678",
  "nip": "0123456789",
  "address": "10 Sample Street",
  "contactDate": "2026-11-06",
  "notes": "Fictional local record",
  "priceColorless": 0,
  "priceColor": 8.1234567
}
```

Successful document responses retain MongoDB `_id`, server-managed `user`, `createdAt`, and `updatedAt`, along with the stored editable fields. Existing collection names and record IDs are preserved.

### Sparse updates and stored values

`PUT` updates only supplied editable fields. For example, `{ "notes": "Updated local note" }` leaves every price, the contact date, and missing optional values unchanged. Do not rebuild a complete record from its formatted display text.

Zero and absence are different values. Prices accept finite decimals, including compatible decimal strings, without a new minimum or fixed decimal scale. Explicit `null` or an empty price string clears a price to `null`; omitted prices remain untouched. The UI formats prices to two decimal places for display while retaining the stored numeric value for editing.

The UI sends `null` when a date is explicitly cleared. A date-only value such as `2026-11-06` is stored as UTC midnight. A valid existing timestamp, including its non-midnight time and milliseconds, survives unrelated edits. Contact date does not imply a scheduled reminder or a last/next-contact rule.

The server assigns ownership. Requests cannot write `user`, timestamps, MongoDB update operators, or unknown fields. A legacy `_id` echoed in `PUT` is accepted and ignored when it matches the route ID; a conflicting `_id` is rejected. Invalid input is rejected before applying any fields.

## Errors and health

Errors return a safe `message`, a machine-readable `code`, and optional string-valued field errors. They do not expose database or provider diagnostics. For example:

```json
{
  "message": "Check the highlighted fields.",
  "code": "INVALID_INPUT",
  "fields": { "name": "Enter a nonempty string of at most 200 characters." }
}
```

| Status | Meaning |
| --- | --- |
| `400` | Invalid input, malformed JSON, invalid ID, or failed CAPTCHA verification |
| `401` | Missing or invalid session, or invalid login credentials |
| `403` | Browser origin is outside the configured allowlist |
| `404` | Missing API route or owned record |
| `409` | Email already registered |
| `413` | JSON body exceeds the 32 KB limit |
| `415` | Request encoding is unsupported |
| `500` | Unexpected server failure |
| `503` | Service unavailable, including CAPTCHA verification transport failure |

`GET /health/live` returns `200` with `{ "status": "ok" }`. `GET /health/ready` returns `200` with `{ "status": "ready" }` when connected and accepting work, or `503` with `{ "status": "unavailable" }`. Neither endpoint requires a token or reveals connection details.

## Mutation recovery

The API does not provide an idempotency key for creating records. A lost response or server failure can leave a write's result uncertain. The frontend sends each mutation once and reports uncertain results through `ApiError.ambiguous`.

Preserve the draft, then read the list or document to reconcile saved data before repeating a create or update. Do not automatically retry a mutation after a timeout. An HTTP error or incomplete response alone is not proof that storage failed.

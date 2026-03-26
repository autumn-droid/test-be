# Datedi — API Response Format

**Purpose:** This document describes the unified response envelope used by every HTTP endpoint in the Datedi backend. Frontend clients should parse this wrapper consistently before accessing the actual payload.

**API reference:** Interactive docs (Swagger) at `/api` when the server is running.

---

## Overview

Every HTTP response from the Datedi API follows one of three top-level shapes:

| Shape | When | `success` |
|-------|------|-----------|
| [Success](#success-response) | Request completed normally | `true` |
| [Success — Paginated](#paginated-success-response) | List endpoint with pagination | `true` |
| [Error](#error-response) | Any exception (validation, auth, not found, etc.) | `false` |

---

## Success Response

Returned by all non-paginated endpoints that complete without error.

```json
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | `true` | Always `true` for successful responses |
| `data` | `object \| array \| null` | The actual payload. `null` for endpoints that return nothing (e.g. DELETE) |
| `message` | `string` | Human-readable status. Currently always `"Success"` |

### Examples

**`GET /dates/:id`**
```json
{
  "success": true,
  "data": {
    "id": "665f...",
    "owner": { "id": "664a...", "fullname": "An Nguyen", "avatarUrl": null },
    "startDateTime": "2026-04-01T10:00:00.000Z",
    "greetingNote": "Let's grab coffee ☕",
    "locations": [],
    "status": "open",
    "pendingRequestsCount": 2,
    "budgetAmount": { "amount": 200000, "currency": "VND" },
    "costSplitPercentage": 50,
    "createdAt": "2026-03-26T08:00:00.000Z",
    "updatedAt": "2026-03-26T08:00:00.000Z"
  },
  "message": "Success"
}
```

**`DELETE /dates/:id`**
```json
{
  "success": true,
  "data": null,
  "message": "Success"
}
```

**`GET /chat/conversations`** (non-paginated array)
```json
{
  "success": true,
  "data": [
    { "id": "...", "participants": [...], "lastMessage": { ... } }
  ],
  "message": "Success"
}
```

---

## Paginated Success Response

Returned by list endpoints that support `page` / `limit` query parameters.

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 42,
    "page": 1,
    "totalPages": 5
  },
  "message": "Success"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | `true` | Always `true` |
| `data` | `array` | The current page of items |
| `meta.total` | `number` | Total number of items across all pages |
| `meta.page` | `number` | Current page number (1-indexed) |
| `meta.totalPages` | `number` | Total number of pages |
| `message` | `string` | Always `"Success"` |

### Query parameters (all paginated endpoints)

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number to fetch (1-indexed) |
| `limit` | `10` | Number of items per page |

### Paginated endpoints

| Endpoint | `data` contains |
|----------|-----------------|
| `GET /dates` | Date cards |
| `GET /dates/my-dates` | Dates owned by the current user |
| `GET /dates/my-requests` | Join requests sent by the current user |
| `GET /dates/:dateId/join-requests` | Join requests for a specific date |
| `GET /chat/conversations/:id/messages` | Messages in a conversation |

### Example

**`GET /dates?page=2&limit=5`**
```json
{
  "success": true,
  "data": [
    {
      "id": "665f...",
      "owner": { "id": "664a...", "fullname": "Minh Tran", "avatarUrl": "https://..." },
      "startDateTime": "2026-04-05T14:00:00.000Z",
      "greetingNote": "Explore Hoan Kiem lake together?",
      "status": "open",
      "pendingRequestsCount": 0,
      "budgetAmount": { "amount": 150000, "currency": "VND" },
      "costSplitPercentage": 50,
      "createdAt": "2026-03-25T12:00:00.000Z",
      "updatedAt": "2026-03-25T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 2,
    "totalPages": 9
  },
  "message": "Success"
}
```

---

## Error Response

Returned whenever an error occurs — bad input, unauthorized access, resource not found, or any server-side exception.

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "details": "Date not found"
  },
  "message": "Date not found"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | `false` | Always `false` for errors |
| `error.code` | `string` | Machine-readable error code (see table below) |
| `error.details` | `string \| string[]` | Human-readable description. **Array** for validation errors (one entry per failing field), **string** for all other errors |
| `message` | `string` | Same as `error.details` when it is a string; the generic exception message when `details` is an array |

### Error codes

| HTTP Status | `error.code` | Typical cause |
|-------------|--------------|---------------|
| 400 | `BAD_REQUEST` | Invalid field value, business rule violation, or validation failure |
| 401 | `UNAUTHORIZED` | Missing or expired JWT token |
| 403 | `FORBIDDEN` | Authenticated but not allowed (e.g. editing another user's date) |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource (e.g. phone number already registered, already sent a join request) |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

### Examples

**Validation error — `POST /auth/register` with missing fields**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "details": [
      "phoneNumber should not be empty",
      "phoneNumber must be a string",
      "password must be longer than or equal to 6 characters"
    ]
  },
  "message": "Bad Request"
}
```

**Not found — `GET /dates/nonexistent-id`**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "details": "Date not found"
  },
  "message": "Date not found"
}
```

**Unauthorized — request without token**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "details": "Unauthorized"
  },
  "message": "Unauthorized"
}
```

**Forbidden — trying to update someone else's date**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "details": "You can only update your own dates"
  },
  "message": "You can only update your own dates"
}
```

**Conflict — duplicate join request**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "details": "You have already sent a join request for this date"
  },
  "message": "You have already sent a join request for this date"
}
```

---

## Special cases

### File serving endpoints

The following endpoints return **raw binary data** and are **not** wrapped in the standard envelope:

| Endpoint | Content-Type |
|----------|-------------|
| `GET /images/:filename` | `image/jpeg`, `image/png`, etc. |
| `GET /voice/:filename` | `audio/mpeg`, `audio/mp4`, etc. |
| `GET /themes/download` | `application/zip` |

Use these URLs directly in `<img>`, `<audio>`, or file download contexts.

### WebSocket (real-time chat)

WebSocket events via Socket.IO are **not** wrapped in this format. See `VOICE_CHAT_API.md` for the WebSocket event schema.

---

## Suggested frontend helper

```typescript
interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

interface ApiPaginated<T> {
  success: true;
  data: T[];
  meta: { total: number; page: number; totalPages: number };
  message: string;
}

interface ApiError {
  success: false;
  error: { code: string; details: string | string[] };
  message: string;
}

type ApiResponse<T> = ApiSuccess<T> | ApiPaginated<T> | ApiError;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    const details = Array.isArray(json.error.details)
      ? json.error.details.join(', ')
      : json.error.details;
    throw new Error(`[${json.error.code}] ${details}`);
  }

  return json.data as T;
}
```

---

## Document info

- **Applies to:** `datedi-be` NestJS backend, all HTTP endpoints.
- **Does not apply to:** WebSocket events, file-serving endpoints (images, voice, themes ZIP).

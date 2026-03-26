# Dates API

All responses follow the unified envelope described in [API_RESPONSE_FORMAT.md](./API_RESPONSE_FORMAT.md).
Base URL: `http://<host>:3001`
Authentication: `Authorization: Bearer <access_token>` (JWT)

---

## Data Models

### Date Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `owner` | `object` | Owner info — `{ id, fullname, avatarUrl? }` |
| `startDateTime` | `string (ISO 8601)` | When the date starts |
| `greetingNote` | `string` | Message shown on the date card |
| `locations` | `Location[]` | Ordered list of planned locations |
| `status` | `"open" \| "matched"` | `open` = looking for someone; `matched` = a request was accepted |
| `pendingRequestsCount` | `number` | Number of pending join requests (visible to owner) |
| `budgetAmount` | `object` | `{ amount: number, currency: string }` |
| `costSplitPercentage` | `number (0–100)` | How much the requester pays (0 = owner pays all, 100 = requester pays all) |
| `createdAt` | `string (ISO 8601)` | Creation timestamp |
| `updatedAt` | `string (ISO 8601)` | Last update timestamp |

### Location Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Place name |
| `latitude` | `number (-90–90)` | Yes | GPS latitude |
| `longitude` | `number (-180–180)` | Yes | GPS longitude |
| `visitTime` | `string (ISO 8601)` | Yes | Planned time to visit this location |
| `imageUrls` | `string[]` | No | Photo URLs for this location |

### Budget Object

| Field | Type | Description |
|-------|------|-------------|
| `amount` | `number (≥ 0)` | Numeric amount |
| `currency` | `string` | One of: `VND`, `USD`, `EUR`, `JPY`, `GBP`, `CNY` |

### Join Request Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `date` | `object` | Summary of the target date — `{ id, startDateTime, greetingNote }` |
| `requester` | `object` | Requester info — `{ id, fullname, avatarUrl? }` |
| `message` | `string` | Message sent to the date owner |
| `status` | `"pending" \| "accepted" \| "rejected"` | Request status |
| `createdAt` | `string (ISO 8601)` | Creation timestamp |
| `updatedAt` | `string (ISO 8601)` | Last update timestamp |

---

## Dates Endpoints

### POST /dates — Create a date

**Auth required:** Yes

**Request body:**

```json
{
  "startDateTime": "2026-04-10T14:00:00.000Z",
  "greetingNote": "Let's grab coffee and explore the old quarter!",
  "locations": [
    {
      "name": "Cafe Giảng",
      "latitude": 21.0340,
      "longitude": 105.8500,
      "visitTime": "2026-04-10T14:00:00.000Z",
      "imageUrls": ["/images/1761559562275-60b94d9d.jpeg"]
    }
  ],
  "budgetAmount": {
    "amount": 200000,
    "currency": "VND"
  },
  "costSplitPercentage": 50
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `startDateTime` | ISO 8601 string | Yes | Valid date-time |
| `greetingNote` | string | Yes | Min length 1 |
| `locations` | Location[] | Yes | Can be empty array |
| `budgetAmount` | Budget object | Yes | amount ≥ 0, valid currency |
| `costSplitPercentage` | number | Yes | 0–100 |

**Response: `201 Created`**

```json
{
  "success": true,
  "data": {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "owner": { "id": "664a...", "fullname": "An Nguyen", "avatarUrl": null },
    "startDateTime": "2026-04-10T14:00:00.000Z",
    "greetingNote": "Let's grab coffee and explore the old quarter!",
    "locations": [
      {
        "name": "Cafe Giảng",
        "latitude": 21.034,
        "longitude": 105.85,
        "visitTime": "2026-04-10T14:00:00.000Z",
        "imageUrls": ["https://example.com/img1.jpg"]
      }
    ],
    "status": "open",
    "pendingRequestsCount": 0,
    "budgetAmount": { "amount": 200000, "currency": "VND" },
    "costSplitPercentage": 50,
    "createdAt": "2026-03-26T08:00:00.000Z",
    "updatedAt": "2026-03-26T08:00:00.000Z"
  },
  "message": "Success"
}
```

**Error responses:**

| Status | `error.code` | Cause |
|--------|-------------|-------|
| 400 | `BAD_REQUEST` | Validation error (invalid field) |
| 401 | `UNAUTHORIZED` | Missing or expired token |

---

### GET /dates — List public dates

**Auth required:** No (optional — if token provided, the authenticated user's own dates are excluded)

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number (1-indexed) |
| `limit` | number | `10` | Items per page |
| `date` | ISO 8601 string | — | Filter by UTC day (e.g. `2026-04-10T00:00:00.000Z`) |

**Response: `200 OK`**

```json
{
  "success": true,
  "data": [
    {
      "id": "665f...",
      "owner": { "id": "664a...", "fullname": "Minh Tran", "avatarUrl": "https://..." },
      "startDateTime": "2026-04-10T14:00:00.000Z",
      "greetingNote": "Explore Hoan Kiem lake together?",
      "locations": [],
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
    "page": 1,
    "totalPages": 5
  },
  "message": "Success"
}
```

---

### GET /dates/my-dates — Get current user's dates

**Auth required:** Yes

**Query parameters:** `page` (default `1`), `limit` (default `10`)

**Response: `200 OK`** — same paginated structure as `GET /dates`, only includes dates owned by the authenticated user.

---

### GET /dates/my-requests — Get current user's join requests

**Auth required:** Yes

**Query parameters:** `page` (default `1`), `limit` (default `10`)

**Response: `200 OK`**

```json
{
  "success": true,
  "data": [
    {
      "id": "667a...",
      "date": {
        "id": "665f...",
        "startDateTime": "2026-04-10T14:00:00.000Z",
        "greetingNote": "Let's grab coffee!"
      },
      "requester": { "id": "664a...", "fullname": "An Nguyen", "avatarUrl": null },
      "message": "I'd love to join!",
      "status": "pending",
      "createdAt": "2026-03-26T09:00:00.000Z",
      "updatedAt": "2026-03-26T09:00:00.000Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "totalPages": 1
  },
  "message": "Success"
}
```

---

### GET /dates/:id — Get a single date

**Auth required:** No

**Path params:** `id` — date ID

**Response: `200 OK`**

```json
{
  "success": true,
  "data": {
    "id": "665f...",
    "owner": { "id": "664a...", "fullname": "An Nguyen", "avatarUrl": null },
    "startDateTime": "2026-04-10T14:00:00.000Z",
    "greetingNote": "Let's grab coffee!",
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

**Error responses:**

| Status | `error.code` | Cause |
|--------|-------------|-------|
| 404 | `NOT_FOUND` | Date does not exist |

---

### PATCH /dates/:id — Update a date

**Auth required:** Yes (owner only)

**Path params:** `id` — date ID

**Request body:** All fields are optional (partial update). Same fields as `POST /dates`.

```json
{
  "greetingNote": "Updated note!",
  "costSplitPercentage": 30
}
```

**Response: `200 OK`** — updated Date object (same shape as `GET /dates/:id`)

**Error responses:**

| Status | `error.code` | Cause |
|--------|-------------|-------|
| 400 | `BAD_REQUEST` | Validation error |
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Not the date owner |
| 404 | `NOT_FOUND` | Date does not exist |

---

### DELETE /dates/:id — Delete a date

**Auth required:** Yes (owner only)

**Path params:** `id` — date ID

**Response: `200 OK`**

```json
{
  "success": true,
  "data": null,
  "message": "Success"
}
```

**Error responses:**

| Status | `error.code` | Cause |
|--------|-------------|-------|
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Not the date owner |
| 404 | `NOT_FOUND` | Date does not exist |

---

### GET /dates/nearby — Get dates near a location

**Auth required:** No (optional — if token provided, the authenticated user's own dates are excluded)

**Query parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `latitude` | number | Yes | — | User's current latitude (-90 to 90) |
| `longitude` | number | Yes | — | User's current longitude (-180 to 180) |
| `radius` | number | No | `10` | Search radius in kilometers |

**Response: `200 OK`** — array of Date objects sorted by `distanceKm` ascending, each extended with:

| Field | Type | Description |
|-------|------|-------------|
| `distanceKm` | `number` | Distance in km from the provided coordinates to the nearest location of this date (rounded to 2 decimal places) |

```json
{
  "success": true,
  "data": [
    {
      "id": "665f...",
      "owner": { "id": "664a...", "fullname": "Minh Tran", "avatarUrl": null },
      "startDateTime": "2026-04-10T14:00:00.000Z",
      "greetingNote": "Explore Hoan Kiem lake together?",
      "locations": [
        {
          "name": "Hoan Kiem Lake",
          "latitude": 21.0285,
          "longitude": 105.8542,
          "visitTime": "2026-04-10T14:00:00.000Z",
          "imageUrls": []
        }
      ],
      "status": "open",
      "pendingRequestsCount": 1,
      "budgetAmount": { "amount": 150000, "currency": "VND" },
      "costSplitPercentage": 50,
      "createdAt": "2026-03-25T12:00:00.000Z",
      "updatedAt": "2026-03-25T12:00:00.000Z",
      "distanceKm": 0.87
    }
  ],
  "message": "Success"
}
```

**Notes:**
- Only dates that have at least one location are returned.
- Distance is calculated to the **nearest location** of the date using the Haversine formula.
- Dates are sorted closest-first.

**Error responses:**

| Status | `error.code` | Cause |
|--------|-------------|-------|
| 400 | `BAD_REQUEST` | Missing or non-numeric `latitude`/`longitude`, or non-positive `radius` |

---

### POST /dates/summary — Count dates per day

**Auth required:** No (optional — if token provided, authenticated user's own dates are excluded from counts)

**Request body:**

```json
{
  "dates": [
    "2026-04-10T00:00:00.000Z",
    "2026-04-11T00:00:00.000Z",
    "2026-04-15T00:00:00.000Z"
  ]
}
```

Each entry is an ISO 8601 datetime; the server groups by UTC day.

**Response: `200 OK`**

```json
{
  "success": true,
  "data": {
    "2026-04-10": 4,
    "2026-04-11": 1,
    "2026-04-15": 0
  },
  "message": "Success"
}
```

Use this endpoint to show a calendar with date availability (e.g. highlight days that have active dates).

---

## Join Requests Endpoints

### POST /dates/:dateId/requests — Send a join request

**Auth required:** Yes
**Constraint:** Cannot request your own date. Cannot send duplicate requests to the same date.

**Path params:** `dateId` — target date ID

**Request body:**

```json
{
  "message": "Hey! I'd love to join your date 😊"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `message` | string | Yes | Min length 1 |

**Response: `201 Created`**

```json
{
  "success": true,
  "data": {
    "id": "667a...",
    "date": {
      "id": "665f...",
      "startDateTime": "2026-04-10T14:00:00.000Z",
      "greetingNote": "Let's grab coffee!"
    },
    "requester": { "id": "664a...", "fullname": "An Nguyen", "avatarUrl": null },
    "message": "Hey! I'd love to join your date 😊",
    "status": "pending",
    "createdAt": "2026-03-26T09:00:00.000Z",
    "updatedAt": "2026-03-26T09:00:00.000Z"
  },
  "message": "Success"
}
```

**Error responses:**

| Status | `error.code` | Cause |
|--------|-------------|-------|
| 400 | `BAD_REQUEST` | Date is already `matched` (closed) |
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Trying to request your own date |
| 404 | `NOT_FOUND` | Date does not exist |
| 409 | `CONFLICT` | Already have a pending or accepted request for this date |

---

### GET /dates/:dateId/requests — List join requests for a date

**Auth required:** Yes (owner only)

**Path params:** `dateId` — date ID

**Response: `200 OK`**

```json
{
  "success": true,
  "data": [
    {
      "id": "667a...",
      "date": { "id": "665f...", "startDateTime": "2026-04-10T14:00:00.000Z", "greetingNote": "..." },
      "requester": { "id": "664b...", "fullname": "Linh Pham", "avatarUrl": "https://..." },
      "message": "Would love to join!",
      "status": "pending",
      "createdAt": "2026-03-26T09:00:00.000Z",
      "updatedAt": "2026-03-26T09:00:00.000Z"
    }
  ],
  "message": "Success"
}
```

**Error responses:**

| Status | `error.code` | Cause |
|--------|-------------|-------|
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Not the date owner |
| 404 | `NOT_FOUND` | Date does not exist |

---

### PATCH /dates/:dateId/requests/:requestId/accept — Accept a join request

**Auth required:** Yes (owner only)

**Path params:** `dateId`, `requestId`

**Behavior:**
- Sets the request status to `accepted`
- Sets the date status to `matched`
- Any previously accepted request on this date is automatically set back to `pending`

**Response: `200 OK`** — updated Join Request object

**Error responses:**

| Status | `error.code` | Cause |
|--------|-------------|-------|
| 400 | `BAD_REQUEST` | Date is already `matched`, or request is not `pending` |
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Not the date owner |
| 404 | `NOT_FOUND` | Date or request does not exist |

---

### PATCH /dates/:dateId/requests/:requestId/reject — Reject a join request

**Auth required:** Yes (owner only)

**Path params:** `dateId`, `requestId`

**Response: `200 OK`** — updated Join Request object with `status: "rejected"`

**Error responses:**

| Status | `error.code` | Cause |
|--------|-------------|-------|
| 400 | `BAD_REQUEST` | Request is not `pending` |
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Not the date owner |
| 404 | `NOT_FOUND` | Date or request does not exist |

---

## Typical Mobile Flows

### User A creates a date and waits for requests

1. `POST /dates` — create the date
2. `GET /dates/my-dates` — view owned dates and their `pendingRequestsCount`
3. `GET /dates/:dateId/requests` — see who sent requests
4. `PATCH /dates/:dateId/requests/:requestId/accept` — accept one
5. `PATCH /dates/:dateId/requests/:requestId/reject` — reject others

### User B discovers and requests a date

1. `GET /dates` — browse public dates (pass `?date=` to filter by day)
2. `GET /dates/:id` — view date detail before requesting
3. `POST /dates/:dateId/requests` — send a request with a message
4. `GET /dates/my-requests` — track request status

### Calendar view — show days with available dates

1. `POST /dates/summary` — pass an array of ISO datetimes for each day in the visible month
2. Use the returned counts to highlight active days in the calendar UI

---

## Document info

- **Applies to:** `datedi-be` NestJS backend
- **Related:** [API_RESPONSE_FORMAT.md](./API_RESPONSE_FORMAT.md) for the full response envelope spec

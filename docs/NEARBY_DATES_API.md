# Nearby Dates API

**Feature:** Proximity-Based Date Discovery
**Endpoint:** `GET /dates/nearby`

All responses follow the unified envelope in [API_RESPONSE_FORMAT.md](./API_RESPONSE_FORMAT.md).

---

## Overview

Returns a list of dates that have at least one location within the given radius of the user's current GPS coordinates. Results are sorted **closest first**.

If the user is authenticated, their own dates are excluded from the results.

---

## Request

```
GET /dates/nearby?latitude=<lat>&longitude=<lon>&radius=<km>
```

### Query Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `latitude` | number | **Yes** | — | User's current latitude (−90 to 90) |
| `longitude` | number | **Yes** | — | User's current longitude (−180 to 180) |
| `radius` | number | No | `10` | Search radius in **kilometers** |
| `date` | ISO 8601 string | No | — | Filter by UTC day (e.g. `2026-04-10T00:00:00.000Z`) |

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | No | `Bearer <access_token>` — if provided, the user's own dates are excluded |

### Example requests

```
GET /dates/nearby?latitude=21.0285&longitude=105.8542&radius=5
GET /dates/nearby?latitude=21.0285&longitude=105.8542&radius=5&date=2026-04-10T00:00:00.000Z
Authorization: Bearer eyJhbGci...
```

---

## Response

### 200 OK

Returns an **array** of date objects sorted by `distanceKm` ascending (closest first).

```json
{
  "success": true,
  "data": [
    {
      "id": "665f1a2b3c4d5e6f7a8b9c0d",
      "owner": {
        "id": "664a...",
        "fullname": "Minh Tran",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
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
    },
    {
      "id": "665f...",
      "owner": { "id": "664b...", "fullname": "Linh Pham", "avatarUrl": null },
      "startDateTime": "2026-04-11T10:00:00.000Z",
      "greetingNote": "Coffee at the bookstore cafe?",
      "locations": [
        {
          "name": "Đinh Lễ Book Street",
          "latitude": 21.0254,
          "longitude": 105.8520,
          "visitTime": "2026-04-11T10:00:00.000Z",
          "imageUrls": []
        }
      ],
      "status": "open",
      "pendingRequestsCount": 0,
      "budgetAmount": { "amount": 100000, "currency": "VND" },
      "costSplitPercentage": 100,
      "createdAt": "2026-03-26T07:00:00.000Z",
      "updatedAt": "2026-03-26T07:00:00.000Z",
      "distanceKm": 3.21
    }
  ],
  "message": "Success"
}
```

### Response fields

All standard date fields plus one extra:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Date ID |
| `owner` | object | `{ id, fullname, avatarUrl? }` |
| `startDateTime` | ISO 8601 string | When the date starts |
| `greetingNote` | string | Message on the date card |
| `locations` | array | List of locations (see below) |
| `status` | `"open"` \| `"matched"` | `open` = still accepting requests |
| `pendingRequestsCount` | number | Number of pending join requests |
| `budgetAmount` | object | `{ amount: number, currency: string }` |
| `costSplitPercentage` | number (0–100) | How much cost the requester covers |
| `createdAt` | ISO 8601 string | — |
| `updatedAt` | ISO 8601 string | — |
| **`distanceKm`** | number | Distance in km from the user's coordinates to the **nearest location** of this date (2 decimal places) |

#### Location object

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Place name |
| `latitude` | number | GPS latitude |
| `longitude` | number | GPS longitude |
| `visitTime` | ISO 8601 string | Planned visit time |
| `imageUrls` | string[] | Photo URLs (may be empty) |

---

## Error Responses

### 400 Bad Request — missing or invalid coordinates

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "details": "latitude and longitude are required and must be valid numbers"
  },
  "message": "latitude and longitude are required and must be valid numbers"
}
```

### 400 Bad Request — invalid radius

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "details": "radius must be a positive number"
  },
  "message": "radius must be a positive number"
}
```

---

## Behavior Notes

- **No pagination** — all matching dates within the radius are returned in a single response.
- **Empty array** is returned (not an error) when no dates are found within the radius.
- Dates with **no locations** are never returned.
- Distance is calculated to the **nearest location** of each date, so a date with multiple stops appears if any stop is within range.
- **`status: "matched"`** dates are still returned — filter client-side if you want `open` only.
- The `date` param filters by the full UTC day of the provided datetime — only dates whose `startDateTime` falls on that day are returned.

---

## Suggested Implementation

### Get user location (Flutter example)

```dart
import 'package:geolocator/geolocator.dart';

final position = await Geolocator.getCurrentPosition(
  desiredAccuracy: LocationAccuracy.high,
);
```

### Call the API

```dart
final uri = Uri.parse('$baseUrl/dates/nearby').replace(queryParameters: {
  'latitude': position.latitude.toString(),
  'longitude': position.longitude.toString(),
  'radius': '10',
});

final response = await http.get(
  uri,
  headers: {'Authorization': 'Bearer $accessToken'},
);

final json = jsonDecode(response.body);
if (json['success'] == true) {
  final dates = (json['data'] as List)
      .map((d) => NearbyDate.fromJson(d))
      .toList();
}
```

### Model

```dart
class NearbyDate {
  final String id;
  final Owner owner;
  final DateTime startDateTime;
  final String greetingNote;
  final List<Location> locations;
  final String status;
  final int pendingRequestsCount;
  final Budget budgetAmount;
  final int costSplitPercentage;
  final double distanceKm; // extra field — distance from user

  factory NearbyDate.fromJson(Map<String, dynamic> json) => NearbyDate(
    id: json['id'],
    owner: Owner.fromJson(json['owner']),
    startDateTime: DateTime.parse(json['startDateTime']),
    greetingNote: json['greetingNote'],
    locations: (json['locations'] as List).map((l) => Location.fromJson(l)).toList(),
    status: json['status'],
    pendingRequestsCount: json['pendingRequestsCount'],
    budgetAmount: Budget.fromJson(json['budgetAmount']),
    costSplitPercentage: json['costSplitPercentage'],
    distanceKm: (json['distanceKm'] as num).toDouble(),
  );
}
```

### Display distance

| `distanceKm` | Suggested label |
|-------------|-----------------|
| < 1 | `"< 1 km away"` |
| 1 – 9.99 | `"1.2 km away"` (1 decimal) |
| ≥ 10 | `"10 km away"` (integer) |

```dart
String formatDistance(double km) {
  if (km < 1) return '< 1 km away';
  if (km < 10) return '${km.toStringAsFixed(1)} km away';
  return '${km.round()} km away';
}
```

---

## Related docs

- [DATES_API.md](./DATES_API.md) — full dates feature reference
- [API_RESPONSE_FORMAT.md](./API_RESPONSE_FORMAT.md) — response envelope spec

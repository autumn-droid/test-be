# Datedi — App overview for design

**Purpose:** This document summarizes what the **Datedi** product does and which capabilities exist in the backend today, so design can plan screens, flows, and UI patterns. It is derived from the NestJS API (`datedi-be`).

**API reference:** Interactive docs are available at `/api` (Swagger) when the server is running.

---

## Product overview

**Datedi** is a **dating app** where users can:

1. **Sign up and sign in** with **phone number** (nation code + number) and password.
2. **Create a “date”** — a planned outing with a **start time**, **greeting note**, **one or more locations** (name, map coordinates, scheduled visit time, optional photo URLs), **budget** (amount + currency), and **cost split** (0–100%).
3. **Browse public dates** (paginated; optional **filter by calendar day** in UTC; authenticated users may see a feed that **excludes their own** dates).
4. **Request to join** someone else’s open date with a **message** to the owner.
5. **Manage join requests:** date owners see incoming requests; they can **accept** or **reject**. Accepting moves the date toward a **matched** state (only one accepted match at a time per product rules in the API).
6. **Chat in conversations** tied to the dating domain: **text**, **images** (URLs + caption), **voice** (upload then reference in message), and **system** messages. **Real-time updates** are delivered via **WebSockets** (Socket.IO) in addition to REST.
7. **Customize look & feel** via **remote themes**: the app can fetch **current theme version**, **download theme packages (ZIP)**, and a **`data.json` manifest** for assets (icons, colors, etc.).

**Positioning for UI:** Think “date as a first-class object” (not only DMs): discovery → detail → request → owner inbox → match → coordinated chat, with rich **map/location** and **budget/split** surfaces.

---

## Primary user journeys (design-facing)

| Journey | Summary | Screens / patterns to consider |
|--------|---------|--------------------------------|
| **Onboarding & auth** | Register → login → token refresh | Phone + password forms, validation, session/refresh handling |
| **Profile** | View/edit **fullname**, see **phone**; upload **avatar** | Profile view, edit form, image picker & crop, avatar in lists |
| **Discover dates** | Paginated list; optional **day filter**; **summary counts** across days (for calendar UI) | Feed/list, calendar or day chip filter, empty states, loading |
| **Date detail** | Single date: owner, time, note, **locations on map**, images per stop, budget, split %, **status** (open / matched), **pending request count** | Map + itinerary timeline, image galleries, status badges |
| **Create / edit date** | Multi-step or long form: locations array, times, budget, split | Map pin placement, reorder stops, currency input, validation |
| **Join flow** | User sends **join request** with message; sees **my requests** list | CTA on date detail, compose message modal, “my requests” hub |
| **Owner: requests inbox** | List requests for **my** date; **accept** / **reject** | Inbox list with avatars, accept/reject, conflict / closed states |
| **Chat** | Conversation list → thread; **message limit** indicator per conversation | Bubbles for text/image/voice/system, composer, attachments, limit UX |
| **Voice messages** | Record or pick audio → **upload** → send message with `voice` type + metadata URL | Waveform or duration UI, upload progress, playback in thread |
| **Themes** | Check version → download assets or ZIP; apply branding | Optional “what’s new” / update available, silent OTA theme swap |

---

## Feature list (by domain)

### Authentication (`auth`)

- **Register** — nation code, phone, password, full name.
- **Login** — phone + password.
- **Refresh token** — obtain new access token without re-login.

*Design:* Login/register, “stay signed in,” error states (wrong password, duplicate phone).

---

### Users (`users`)

- **Current user profile** (`/users/me`) — nation code, phone, full name, avatar URL, timestamps.
- **Public profile by ID** — same fields for another user (for avatars/names in lists).
- **Update profile** — patch display fields.
- **Upload avatar** — multipart image (JPEG, PNG, GIF, WebP).

*Design:* Profile header, editable fields, avatar everywhere (dates, chat, join requests).

---

### Dates (`dates`)

- **Create date** (authenticated) — start datetime, greeting, locations[], budget, cost split %.
- **List public dates** — pagination; optional **UTC day** filter; behavior differs slightly if user is logged in (may hide own dates from this list).
- **Summarize counts by days** — POST body with list of UTC days → counts (for calendar heatmap / badges).
- **My dates** — paginated dates owned by the user.
- **Get one date by ID** — full card/detail payload.
- **Update / delete date** — owner only.

**Date concept (fields useful for UI):**

- **Owner** — id, full name, avatar.
- **startDateTime** — scheduling.
- **greetingNote** — short intro / vibe.
- **locations[]** — name, lat/lng, **visitTime**, optional **imageUrls** per stop.
- **budgetAmount** — amount + currency.
- **costSplitPercentage** — 0–100.
- **status** — `open` | `matched`.
- **pendingRequestsCount** — badge on card or detail.

*Design:* Map-centric itinerary, multi-stop timeline, budget/split explanation, status-driven CTAs (e.g. hide “request to join” when matched or closed).

---

### Join requests (`join-requests` — routes under `/dates/...`)

- **Send request** — `POST /dates/:dateId/requests` with a message (cannot request own date; duplicate pending/accepted rules enforced).
- **List requests for a date** — owner only.
- **Accept / reject** — owner only; accepting may auto-reject other accepted flow per API semantics.
- **My requests** — paginated list for the requester.

*Design:* Requester message preview, states `pending` | `accepted` | `rejected`, owner decision UI, empty inbox, error toasts (date closed, already requested).

---

### Chat (`chat`)

**REST (JWT required):**

- **List conversations** for the user.
- **Conversation detail** by ID.
- **Messages** — paginated history for a conversation.
- **Message limit status** — per-conversation cap/usage (show remaining messages or locked state in UI).
- **Send message** — type + content + optional metadata; **images** array merged into metadata for image messages.
- **System messages** — special endpoint (treat as automated / product-generated copy in the thread).

**Message types (must be visually distinct):**

| Type | Role in UI |
|------|------------|
| `text` | Standard bubble |
| `image` | Caption + one or more images (URLs in metadata / `images` field) |
| `voice` | Player UI; upload flow described in Voice section |
| `system` | Centered or subtle system line (e.g. “You matched”) |

**Real-time:** New messages can be **pushed** over WebSocket to conversation participants (event such as `message:new` — see `VOICE_CHAT_API.md` in repo for integration notes).

*Design:* Conversation list with last message preview, read receipts concept (`readBy` in model), typing not specified in API—optional polish. **Strongly** design for **message limit** UX (disabled composer, upgrade/teaser—if product adds monetization later).

---

### Voice (`voice`)

- **Upload** audio (MP3, M4A, WAV, OGG) — max **20 MB** (per `VOICE_CHAT_API.md`).
- **Download/play** by filename (authenticated).
- **Delete** file.

**Typical chat flow:** `POST /voice/upload` → then `POST /chat/conversations/:id/messages` with `type: "voice"` and `metadata.voiceUrl`.

*Design:* Record button, duration, retry, playback controls in thread, optional caption in `content`.

---

### Images (`images`)

- **Upload** single or **multiple** (up to 10) — used for generic assets; URLs/paths feed into messages or location galleries.
- **Serve** image by filename.
- **List** / **delete** (admin-like; confirm product usage).

*Design:* Multi-image picker for chat and for location stops on a date.

---

### Themes (`themes`)

- **Current version** metadata (version, changelog, size, dates).
- **List all versions.**
- **Download `data.json`** for current or specific version (manifest for theming).
- **Download theme ZIP** (latest or by version).
- **Upload new theme** (ZIP + changelog) — likely **operator/admin** only in production; still relevant if design includes “theme preview” or “update available.”

*Design:* Treat as **design system delivery**: tokens, icons, colors referenced by the client; optional in-app “Updating look…” state.

---

## Cross-cutting UX notes

- **JWT everywhere** except some public reads (e.g. date list/detail, public user by ID). Plan **logged-out browse** vs **logged-in** flows where behavior differs.
- **Pagination** is common (`page`, `limit`); infinite scroll vs paged “load more.”
- **Time zones:** API uses **UTC day** filtering for date discovery/summary—surface this in calendar UX (label “day in UTC” or convert client-side consistently).
- **Swagger** at `/api` is the source of truth for exact request/response shapes during implementation.

---

## Suggested screen inventory (starter checklist)

1. Splash / brand  
2. Register / Login / Refresh handling  
3. Home — discover dates (feed + filters)  
4. Calendar / day picker (optional, backed by summary endpoint)  
5. Date detail — map, itinerary, budget, owner, CTA  
6. Create / edit date — multi-location wizard  
7. My dates  
8. Join request composer  
9. My join requests  
10. Incoming requests (per date) — owner  
11. Chat — inbox  
12. Chat — thread (text, image, voice, system)  
13. Profile — view / edit / avatar  
14. Theme update / asset loading (optional, mostly invisible)  
15. Settings / legal (not in API doc—product-dependent)  

---

## Document info

- **Generated from:** `datedi-be` NestJS modules and controllers.  
- **Not covered here:** Payment, moderation, push notifications, email/SMS OTP—unless added later in the API.

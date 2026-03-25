# Datedi Backend — Claude Context

## Project Overview

**Datedi** is a dating app backend built with NestJS. It provides REST APIs and WebSocket support for user authentication, date event management, chat messaging, and media uploads.

- **Framework**: NestJS 11 (Node.js)
- **Database**: MongoDB Atlas via Mongoose ODM
- **Auth**: JWT (access token 15m + refresh token 7d)
- **Real-time**: Socket.IO WebSocket gateway
- **Port**: 3001 (or `process.env.PORT`)
- **API Docs**: Swagger at `/api`

## Source Structure

```
src/
├── main.ts                  # Bootstrap: ValidationPipe, Swagger, static files
├── app.module.ts            # Root module, imports all feature modules
├── auth/                    # JWT auth: register, login, refresh
├── users/                   # User profiles and search
├── dates/                   # Date events and join requests
├── chat/                    # Conversations, messages, WebSocket gateway
├── images/                  # Image upload/serve (5MB, JPEG/PNG/GIF/WebP)
├── voice/                   # Voice upload/serve (20MB, MP3/M4A/WAV/OGG)
└── themes/                  # App theme versioning
```

## Modules

Each module follows: `{feature}.module.ts`, `{feature}.controller.ts`, `{feature}.service.ts`, `schemas/`, `dto/`, optionally `guards/` and `strategies/`.

### Auth (`src/auth/`) — `/auth`
- `POST /auth/register` — register with nationCode, phoneNumber, password, fullname
- `POST /auth/login` — returns access + refresh tokens
- `POST /auth/refresh` — exchange refresh token for new access token
- Guards: `JwtAuthGuard` (required), `OptionalJwtGuard` (optional), `JwtRefreshAuthGuard`
- Strategies: `jwt.strategy.ts`, `jwt-refresh.strategy.ts`
- Token payload: `{ sub: userId, nationCode, phoneNumber }`

### Users (`src/users/`) — `/users`
- `GET /users/:id`, `GET /users/search`
- `PATCH /users/profile`, `PATCH /users/avatar`
- Schema fields: nationCode, phoneNumber, password (bcrypt), fullname, avatarUrl
- Unique compound index: (nationCode, phoneNumber)

### Dates (`src/dates/`) — `/dates`
- `POST /dates` — create date event (auth required)
- `GET /dates` — list public dates with pagination (optional auth; hides requester's own)
- `POST /dates/summary` — count dates per UTC day from array of ISO datetime strings
- `GET /dates/:id`, `PATCH /dates/:id`, `DELETE /dates/:id`
- `GET /dates/my-dates`, `GET /dates/my-requests`
- Date fields: ownerId, startDateTime, greetingNote, locations[], acceptedRequestId, status (open|matched), budgetAmount, costSplitPercentage
- Location fields: name, latitude, longitude, visitTime, imageUrls[]
- Budget: amount + currency (VND, USD, EUR, JPY, GBP, CNY)

**Join Requests** (`join-requests.controller.ts`) nested under `/dates`:
- `POST /dates/:dateId/join-requests`
- `GET /dates/:dateId/join-requests`
- `PATCH /dates/:dateId/join-requests/:id/accept`
- `PATCH /dates/:dateId/join-requests/:id/reject`
- Status: pending | accepted | rejected

### Chat (`src/chat/`) — `/chat` (HTTP) + `/chat` (WebSocket namespace)
**HTTP Endpoints**:
- `GET /chat/conversations`
- `GET /chat/conversations/:conversationId`
- `GET /chat/conversations/:conversationId/messages` — paginated
- `GET /chat/conversations/:conversationId/limit` — message limit status
- `POST /chat/conversations/:conversationId/messages`
- `POST /chat/system-messages`

**WebSocket Events** (`chat.gateway.ts`):
- `join:conversation` / `leave:conversation`
- `message:send` — send message
- `typing:start` / `typing:stop`
- `message:read` — mark as read

**Schemas**: Conversation, Message (type: text|image|system|voice), MessageLimit (0–5 count, limitLifted flag)

**Message limit**: 5 messages per conversation until join request is accepted.

### Images (`src/images/`) — `/images`
- `POST /images/upload`, `POST /images/upload-multiple`
- `GET /images/:filename`, `DELETE /images/:filename`
- Storage: `storage/images/`

### Voice (`src/voice/`) — `/voice`
- `POST /voice/upload`, `GET /voice/:filename`, `DELETE /voice/:filename`
- Storage: `storage/voices/`

### Themes (`src/themes/`) — `/themes`
- `GET /themes/current`, `POST /themes`, `GET /themes/versions`

## Database — MongoDB Atlas

**Collections**: users, dates, joinrequests, conversations, messages, messagelimits

**Connection**: Built dynamically from `CLOUD_MONGO_DB_PASSWORD` env var.

```
mongodb+srv://thanhandp147:{password}@datedi-cluster.cbqhp8m.mongodb.net/
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `CLOUD_MONGO_DB_PASSWORD` | MongoDB Atlas password | required |
| `JWT_SECRET` | Access token signing secret | 'your-secret-key' |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | 'your-refresh-secret-key' |
| `PORT` | Server port | 3001 |

## Conventions

**Naming**:
- Files: `{feature}.{role}.ts` (e.g., `dates.service.ts`)
- DTOs: `{action}-{entity}.dto.ts` (e.g., `create-date.dto.ts`)
- Schemas: `{entity}.schema.ts`

**Patterns**:
- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- All request bodies validated via class-validator DTOs
- Pagination: `{ page, limit }` query → `{ data, total, page, totalPages }`
- Errors: NestJS exceptions (NotFoundException, ConflictException, UnauthorizedException)
- Logging: NestJS `Logger` class in controllers and services
- Swagger decorators: `@ApiTags`, `@ApiOperation`, `@ApiResponse` on all controllers

**Security**:
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with expiration enforced
- Authorization checks in service layer (e.g., only owner can update/delete dates)

## Running the App

```bash
npm run start:dev   # development (watch mode)
npm run build       # compile to dist/
npm run start:prod  # production
npm run test        # unit tests
npm run test:e2e    # end-to-end tests
```

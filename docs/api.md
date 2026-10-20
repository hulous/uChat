# API and WebSocket contract

The generated OpenAPI contract is available at
`http://localhost:8050/v3/api-docs`, with an interactive UI at
`http://localhost:8050/swagger-ui/index.html`.

Unless marked public, endpoints require `Authorization: Bearer <jwt>`.
Validation and domain errors are returned by the backend's global exception
handler as an API message response. Exact request schemas are available in
Swagger and the DTO classes under `backend/src/main/java/com/uchat/api/dtos`.

## Authentication

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create an account |
| POST | `/api/auth/login` | Public | Authenticate and return a JWT |
| GET | `/api/auth/me` | JWT | Return the current user |
| PUT | `/api/auth/me` | JWT | Update the current user |

The login response contains a token and `expiresIn`. The frontend uses the
duration to determine when local authentication is no longer valid.

## Users and contacts

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/user/{id}` | JWT | Fetch one user |
| GET | `/api/user/contacts` | JWT | List current-user contacts |
| POST | `/api/user/contacts` | JWT | Add a contact by email |
| POST | `/api/user/contacts/{id}` | JWT | Add a contact by user ID |
| DELETE | `/api/user/contacts/{id}` | JWT | Remove a contact |

Contact invitation payloads use the form `{ "email": "person@example.com" }`.

## Chat rooms

Room IDs are UUIDs.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/rooms` | JWT | List rooms available to the user |
| GET | `/api/rooms/public` | JWT | List public rooms |
| POST | `/api/rooms` | JWT | Create a room |
| POST | `/api/rooms/{roomId}/join` | JWT | Join a room |
| DELETE | `/api/rooms/{roomId}/membership` | JWT | Leave a room |
| GET | `/api/rooms/{roomId}/members` | JWT | List members |
| POST | `/api/rooms/{roomId}/members` | JWT | Invite a member by email |
| PUT | `/api/rooms/{roomId}/visibility` | JWT | Change public/private visibility |
| DELETE | `/api/rooms/{roomId}` | JWT | Close a room |
| POST | `/api/rooms/{roomId}/bans` | JWT | Ban a member |

Room creation uses a name payload. Visibility updates use `isPublic`. Invitations
use `email`; bans use `userId` and `durationHours`.

## Conversation history

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/conversations/{conversationId}/messages` | JWT | Load direct conversation history |
| GET | `/api/conversations/rooms/{roomId}/messages` | JWT | Load room history |

Room history is pageable through Spring's `Pageable` query parameters. Access to
room history is checked against membership before messages are returned.

## STOMP/SockJS

Connect to `/ws` and include the JWT in the STOMP `CONNECT` headers:

```text
Authorization: Bearer <jwt>
```

Publish a message to:

```text
/app/chat.send
```

The message payload contains:

```json
{
  "conversationId": "conversation-or-room-id",
  "kind": "conversation",
  "content": "Hello"
}
```

Use `kind: "room"` for room messages. Subscribe to one of:

```text
/topic/conversations/{conversationId}
/topic/rooms/{roomId}
```

Moderation notifications are user-specific:

```text
/user/queue/room-bans
/user/queue/room-closed
```

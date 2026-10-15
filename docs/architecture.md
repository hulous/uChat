# Architecture

## Runtime topology

```text
Browser
  │ HTTP / REST and SockJS-STOMP
  ▼
Angular frontend :4200 ───────► Spring Boot backend :8050
                                      │
                                      ├─ REST controllers
                                      ├─ JWT security
                                      ├─ STOMP message broker
                                      ├─ JPA repositories
                                      └─ Liquibase migrations
                                            │
                                            ▼
                                      PostgreSQL :5432
```

Docker Compose publishes the frontend as host port `4250`, the backend as
`8050`, and PostgreSQL as `5532`. Service-to-service traffic uses Compose service
names and internal ports.

The optional `e2e` profile runs Playwright against the Compose frontend service.
It is not part of the default application startup.

## Backend

The backend is a Spring Boot 4.0 application targeting Java 24. Its main
responsibilities are:

- validating and serving REST requests;
- authenticating users and issuing JWTs;
- enforcing room membership and moderation rules;
- persisting users, contacts, rooms, memberships, messages, and bans with JPA;
- applying schema changes with Liquibase;
- exposing the SockJS endpoint `/ws` and STOMP destinations;
- exposing health and generated OpenAPI endpoints.

Hibernate schema generation is disabled (`ddl-auto: none`). The database schema
is owned by the Liquibase changelog at
`backend/src/main/resources/db/changelog/db.changelog-master.yaml`.

## Frontend

The frontend is an Angular 21 application served by the Angular development
server in the development image. The route structure is:

| Route | Access | Screen |
| --- | --- | --- |
| `/login` | Public | Login |
| `/register` | Public | Registration |
| `/account` | Authenticated | Account/profile |
| `/chat` | Authenticated | Direct chat landing page |
| `/chat/rooms` | Authenticated | Room list and creation |
| `/chat/rooms/:roomId` | Authenticated | Room conversation |
| `/chat/contacts/add` | Authenticated | Add contact |
| `/chat/:conversationId` | Authenticated | Direct conversation |

The route guard redirects unauthenticated users to `/login` and preserves the
requested URL in the `returnUrl` query parameter. The authentication interceptor
adds the stored JWT to API requests. Tokens are stored in browser local storage
under `uchat.authentication` and expire after the server-provided duration
(currently one hour).

## Authentication and authorization

Registration and login are public. Login returns a JWT and its expiration
duration. Protected REST requests send:

```http
Authorization: Bearer <jwt>
```

The same token is sent in the STOMP `CONNECT` frame. The backend validates the
token before allowing messaging. Room subscriptions are additionally checked by
the inbound channel interceptor so a user cannot subscribe to an unauthorized
room topic.

## Real-time messaging

The frontend connects to `/ws` using SockJS and STOMP. The backend enables the
simple broker with `/topic` and accepts application messages under `/app`.

1. The client connects with a JWT.
2. It subscribes to a conversation or room topic.
3. It publishes a JSON message to `/app/chat.send`.
4. The backend validates and persists the message.
5. The backend broadcasts the resulting message to the matching topic.

Room moderation events are delivered privately to the affected user through
`/user/queue/room-bans` and `/user/queue/room-closed`.

## Data model

The main persisted concepts are:

- `users`: accounts and credentials;
- contact relationships between users;
- `chat_room`: room identity, owner, and visibility;
- room membership records;
- `chat_room_ban`: temporary or permanent room bans;
- `chat_message`: direct and room messages.

All schema changes must be added as a new Liquibase change set. Do not edit an
already-applied change set in a shared environment.

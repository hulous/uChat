import { HttpClient } from "@angular/common/http";
import { of, Subject } from "rxjs";
import { IMessage, RxStomp } from "@stomp/rx-stomp";
import { AuthService } from "./auth";
import { ChatService, ChatTarget, MessageDto } from "./chat.service";

describe("ChatService", () => {
  let service: ChatService;
  let authService: jasmine.SpyObj<AuthService>;
  let http: jasmine.SpyObj<HttpClient>;
  let client: jasmine.SpyObj<RxStomp>;
  const message: MessageDto = {
    id: "message-1",
    conversationId: "conversation-1",
    senderEmail: "client@example.com",
    content: "Hello",
    sentAt: "2026-01-01T12:00:00.000Z",
  };
  const frame: IMessage = {
    ack: jasmine.createSpy("ack"),
    nack: jasmine.createSpy("nack"),
    command: "MESSAGE",
    headers: {},
    body: JSON.stringify(message),
    isBinaryBody: false,
    binaryBody: new Uint8Array(),
  };
  const legacyUuidTarget: ChatTarget = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    kind: "conversation",
  };
  const roomTarget: ChatTarget = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    kind: "room",
  };

  beforeEach(() => {
    authService = jasmine.createSpyObj("AuthService", ["getToken"]);
    http = jasmine.createSpyObj("HttpClient", ["get", "post", "delete", "put"]);
    client = jasmine.createSpyObj("RxStomp", [
      "configure",
      "activate",
      "watch",
      "publish",
      "deactivate",
    ]);
    client.watch.and.returnValue(of(frame));
    Object.defineProperty(client, "stompClient", {
      value: {
        subscribe: jasmine
          .createSpy("subscribe")
          .and.returnValue({ unsubscribe() {} }),
      },
    });
    Object.defineProperty(client, "connected$", {
      value: of({}),
      configurable: true,
    });
    service = new ChatService(authService, http);
    Object.defineProperty(service, "client", { value: client });
  });

  it("loads conversation history through the API", () => {
    http.get.and.returnValue(of([message]));

    service
      .loadHistory({ id: "conversation-1", kind: "conversation" })
      .subscribe((messages) => {
        expect(messages).toEqual([message]);
      });

    expect(http.get).toHaveBeenCalledWith(
      "/api/conversations/conversation-1/messages",
    );
  });

  it("connects with the bearer token and forwards incoming messages", async () => {
    authService.getToken.and.returnValue("jwt-token");

    await service.connect({ id: "conversation-1", kind: "conversation" });

    expect(client.configure).toHaveBeenCalledWith(
      jasmine.objectContaining({
        connectHeaders: { Authorization: "Bearer jwt-token" },
        reconnectDelay: 5000,
      }),
    );
    expect(client.activate).toHaveBeenCalled();
    const subscribeSpy = client.stompClient.subscribe as jasmine.Spy;
    expect(subscribeSpy).toHaveBeenCalledWith(
      "/topic/conversations/conversation-1",
      jasmine.any(Function),
    );
    subscribeSpy.calls.mostRecent().args[1](frame);
    expect(service.messages()).toEqual(message);
  });

  it("does not reconnect to the already active conversation", async () => {
    authService.getToken.and.returnValue("jwt-token");

    await service.connect({ id: "conversation-1", kind: "conversation" });
    client.configure.calls.reset();
    await service.connect({ id: "conversation-1", kind: "conversation" });

    expect(client.configure).not.toHaveBeenCalled();
  });

  it("disconnects before switching conversations and publishes messages", async () => {
    authService.getToken.and.returnValue("jwt-token");
    await service.connect({ id: "conversation-1", kind: "conversation" });
    client.deactivate.calls.reset();

    await service.connect({ id: "conversation-2", kind: "conversation" });
    service.send({ id: "conversation-2", kind: "conversation" }, "Hi there");

    expect(client.deactivate).toHaveBeenCalled();
    expect(client.publish).toHaveBeenCalledWith({
      destination: "/app/chat.send",
      body: JSON.stringify({
        conversationId: "conversation-2",
        kind: "conversation",
        content: "Hi there",
      }),
    });
  });

  it("ignores callbacks from a previous target after switching", async () => {
    authService.getToken.and.returnValue("jwt-token");
    const subscribeSpy = client.stompClient.subscribe as jasmine.Spy;

    await service.connect({ id: "conversation-1", kind: "conversation" });
    const oldSubscriptions = subscribeSpy.mock.calls.slice();

    await service.connect(roomTarget);
    const newSubscriptions = subscribeSpy.mock.calls.slice(-3);

    oldSubscriptions[0][1]({ body: "old-room-ban" });
    oldSubscriptions[1][1]({ body: "old-room-closed" });
    oldSubscriptions[2][1](frame);

    expect(service.bannedRoomId()).toBeNull();
    expect(service.closedRoomId()).toBeNull();
    expect(service.messages()).toBeNull();

    newSubscriptions[2][1](frame);
    expect(service.messages()).toEqual(message);
  });

  it("recovers the transition queue after a rejected connection", async () => {
    authService.getToken.and.returnValue("jwt-token");
    client.activate.mockImplementationOnce(() => {
      throw new Error("connection failed");
    });

    let error: unknown;
    try {
      await service.connect({ id: "conversation-1", kind: "conversation" });
    } catch (caught) {
      error = caught;
    }
    expect(error).toEqual(new Error("connection failed"));

    await service.connect({ id: "conversation-2", kind: "conversation" });

    expect(client.activate).toHaveBeenCalledTimes(2);
  });

  it("cancels a hanging activation when a new target supersedes it", async () => {
    authService.getToken.and.returnValue("jwt-token");
    const connected = new Subject<object>();
    Object.defineProperty(client, "connected$", {
      value: connected.asObservable(),
      configurable: true,
    });

    const firstConnection = service.connect({
      id: "conversation-1",
      kind: "conversation",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const secondConnection = service.connect({
      id: "conversation-2",
      kind: "conversation",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    connected.next({});

    await Promise.all([firstConnection, secondConnection]);

    expect(client.activate).toHaveBeenCalledTimes(2);
    expect(client.stompClient.subscribe as jasmine.Spy).toHaveBeenCalledWith(
      "/topic/conversations/conversation-2",
      jasmine.any(Function),
    );
  });

  it("keeps UUID-shaped legacy conversations on conversation routes", async () => {
    authService.getToken.and.returnValue("jwt-token");
    http.get.and.returnValue(of([message]));

    await service.connect(legacyUuidTarget);
    service.loadHistory(legacyUuidTarget).subscribe();

    expect(client.stompClient.subscribe as jasmine.Spy).toHaveBeenCalledWith(
      `/topic/conversations/${legacyUuidTarget.id}`,
      jasmine.any(Function),
    );
    expect(http.get).toHaveBeenCalledWith(
      `/api/conversations/${legacyUuidTarget.id}/messages`,
    );
  });

  it("uses room routes only for explicit room targets", async () => {
    authService.getToken.and.returnValue("jwt-token");
    http.get.and.returnValue(of([message]));

    await service.connect(roomTarget);
    service.loadHistory(roomTarget).subscribe();

    expect(client.stompClient.subscribe as jasmine.Spy).toHaveBeenCalledWith(
      `/topic/rooms/${roomTarget.id}`,
      jasmine.any(Function),
    );
    expect(http.get).toHaveBeenCalledWith(
      `/api/conversations/rooms/${roomTarget.id}/messages`,
    );
  });

  it("uses the owner-only room member and ban endpoints", () => {
    http.get.and.returnValue(of([]));
    http.post.and.returnValue(of(undefined));
    http.delete.and.returnValue(of(undefined));

    service.listRoomMembers(roomTarget.id).subscribe();
    service.inviteRoomMember(roomTarget.id, "guest@example.com").subscribe();
    service.banRoomMember(roomTarget.id, 12, 24).subscribe();
    service.closeRoom(roomTarget.id).subscribe();

    expect(http.get).toHaveBeenCalledWith(
      `/api/rooms/${roomTarget.id}/members`,
    );
    expect(http.post).toHaveBeenCalledWith(
      `/api/rooms/${roomTarget.id}/members`,
      { email: "guest@example.com" },
    );
    expect(http.post).toHaveBeenCalledWith(`/api/rooms/${roomTarget.id}/bans`, {
      userId: 12,
      durationHours: 24,
    });
    expect(http.delete).toHaveBeenCalledWith(`/api/rooms/${roomTarget.id}`);
  });

  it("lists public rooms and updates room visibility", () => {
    http.get.and.returnValue(of([]));
    http.put.and.returnValue(of({}));

    service.listPublicRooms().subscribe();
    service.updateRoomVisibility(roomTarget.id, false).subscribe();

    expect(http.get).toHaveBeenCalledWith("/api/rooms/public");
    expect(http.put).toHaveBeenCalledWith(
      `/api/rooms/${roomTarget.id}/visibility`,
      { isPublic: false },
    );
  });

  it("manages contacts through the user API", () => {
    http.get.and.returnValue(of([]));
    http.post.and.returnValue(of(undefined));
    http.delete.and.returnValue(of(undefined));

    service.listContacts().subscribe();
    service.addContact("guest@example.com").subscribe();
    service.removeContact(12).subscribe();

    expect(http.get).toHaveBeenCalledWith("/api/user/contacts");
    expect(http.post).toHaveBeenCalledWith("/api/user/contacts", {
      email: "guest@example.com",
    });
    expect(http.delete).toHaveBeenCalledWith("/api/user/contacts/12");
  });

  it("creates, lists, joins, and leaves rooms through the API", () => {
    http.get.and.returnValue(of([]));
    http.post.and.returnValue(of({}));
    http.delete.and.returnValue(of(undefined));

    service.listRooms().subscribe();
    service.createRoom("Team room").subscribe();
    service.joinRoom(roomTarget.id).subscribe();
    service.leaveRoom(roomTarget.id).subscribe();

    expect(http.get).toHaveBeenCalledWith("/api/rooms");
    expect(http.post).toHaveBeenCalledWith("/api/rooms", { name: "Team room" });
    expect(http.post).toHaveBeenCalledWith(
      `/api/rooms/${roomTarget.id}/join`,
      {},
    );
    expect(http.delete).toHaveBeenCalledWith(
      `/api/rooms/${roomTarget.id}/membership`,
    );
  });

  it("deactivates the client when disconnected", async () => {
    await service.disconnect();

    expect(client.deactivate).toHaveBeenCalled();
  });
});

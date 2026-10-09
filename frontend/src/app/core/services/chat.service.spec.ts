import { HttpClient } from "@angular/common/http";
import { of } from "rxjs";
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
    http = jasmine.createSpyObj("HttpClient", ["get", "post"]);
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
    Object.defineProperty(client, "connected$", { value: of({}) });
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

    service.connect({ id: "conversation-1", kind: "conversation" });
    await Promise.resolve();

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

    service.listRoomMembers(roomTarget.id).subscribe();
    service.banRoomMember(roomTarget.id, 12, 24).subscribe();

    expect(http.get).toHaveBeenCalledWith(
      `/api/rooms/${roomTarget.id}/members`,
    );
    expect(http.post).toHaveBeenCalledWith(`/api/rooms/${roomTarget.id}/bans`, {
      userId: 12,
      durationHours: 24,
    });
  });

  it("deactivates the client when disconnected", () => {
    service.disconnect();

    expect(client.deactivate).toHaveBeenCalled();
  });
});

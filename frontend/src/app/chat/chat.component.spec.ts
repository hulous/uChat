import { ActivatedRoute, Router } from "@angular/router";
import { signal } from "@angular/core";
import { of } from "rxjs";
import { ChatComponent } from "./chat.component";
import { ChatService, MessageDto } from "../core/services/chat.service";
import { AuthService } from "../core/services/auth";
import { TestBed } from "@angular/core/testing";

describe("ChatComponent", () => {
  let component: ChatComponent;
  let messagesSignal: ReturnType<typeof signal<MessageDto | null>>;
  let closedRoomSignal: ReturnType<typeof signal<string | null>>;
  let chatService: jasmine.SpyObj<ChatService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  const historyMessage: MessageDto = {
    id: "history-1",
    conversationId: "conversation-1",
    senderEmail: "agent@example.com",
    content: "Welcome",
    sentAt: "2026-01-01T12:00:00.000Z",
  };

  beforeEach(() => {
    messagesSignal = signal<MessageDto | null>(null);
    closedRoomSignal = signal<string | null>(null);
    chatService = jasmine.createSpyObj("ChatService", [
      "loadHistory",
      "connect",
      "send",
      "disconnect",
      "listRooms",
      "listRoomMembers",
      "banRoomMember",
      "inviteRoomMember",
    ]);
    authService = jasmine.createSpyObj("AuthService", ["logout", "getEmail"]);
    router = jasmine.createSpyObj("Router", ["navigate"]);
    Object.defineProperty(chatService, "messages", {
      value: messagesSignal,
    });
    Object.defineProperty(chatService, "bannedRoomId", {
      value: signal<string | null>(null),
    });
    Object.defineProperty(chatService, "closedRoomId", {
      value: closedRoomSignal,
    });
    chatService.loadHistory.and.returnValue(of([historyMessage]));
    chatService.listRooms.and.returnValue(
      of([
        {
          id: "room-1",
          name: "Support",
          createdAt: "",
          ownerEmail: "owner@example.com",
          isPublic: true,
        },
      ]),
    );
    chatService.listRoomMembers.and.returnValue(of([]));
    const route = {
      snapshot: {
        paramMap: {
          get: (key: string) =>
            key === "conversationId" ? "conversation-1" : null,
        },
      },
    } as unknown as ActivatedRoute;
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: ChatService, useValue: chatService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ChatComponent());
  });

  it("loads history, connects, and accepts messages for the active conversation", async () => {
    await Promise.resolve();
    messagesSignal.set({
      ...historyMessage,
      id: "live-1",
      content: "Live message",
    });
    TestBed.flushEffects();
    messagesSignal.set({
      ...historyMessage,
      conversationId: "other",
      id: "ignored",
    });
    TestBed.flushEffects();
    for (let index = 0; index < 5; index += 1) {
      await Promise.resolve();
      TestBed.flushEffects();
    }

    expect(chatService.loadHistory).toHaveBeenCalledWith({
      id: "conversation-1",
      kind: "conversation",
    });
    expect(chatService.connect).toHaveBeenCalledWith({
      id: "conversation-1",
      kind: "conversation",
    });
    expect(component.messages().length).toBe(2);
    expect(component.messages()[1].text).toBe("Live message");
  });

  it("uses the demo conversation when the route has no id", async () => {
    const route = {
      snapshot: { paramMap: { get: () => null } },
    } as unknown as ActivatedRoute;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: ChatService, useValue: chatService },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ChatComponent());
    await Promise.resolve();

    expect(chatService.loadHistory).toHaveBeenCalledWith({
      id: "demo",
      kind: "conversation",
    });
    expect(chatService.connect).toHaveBeenCalledWith({
      id: "demo",
      kind: "conversation",
    });
  });

  it("displays the name of the active room", async () => {
    const route = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === "roomId" ? "room-1" : null),
        },
      },
    } as unknown as ActivatedRoute;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: ChatService, useValue: chatService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ChatComponent());

    for (let index = 0; index < 5; index += 1) {
      await Promise.resolve();
      TestBed.flushEffects();
    }

    expect(component.roomName()).toBe("Support");
    expect(chatService.listRooms).toHaveBeenCalled();
    expect(chatService.listRoomMembers).not.toHaveBeenCalled();
  });

  it("loads room members and submits a temporary ban for the owner", async () => {
    authService.getEmail.and.returnValue("owner@example.com");
    chatService.listRoomMembers.and.returnValue(
      of([{ userId: 2, name: "Alex" }]),
    );
    chatService.banRoomMember.and.returnValue(of(undefined));
    const route = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === "roomId" ? "room-1" : null),
        },
      },
    } as unknown as ActivatedRoute;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: ChatService, useValue: chatService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ChatComponent());

    for (let index = 0; index < 5; index += 1) {
      await Promise.resolve();
      TestBed.flushEffects();
    }
    await component.banMember(2);

    expect(component.isRoomOwner()).toBe(true);
    expect(chatService.listRoomMembers).toHaveBeenCalledWith("room-1");
    expect(chatService.banRoomMember).toHaveBeenCalledWith("room-1", 2, 24);
  });

  it("invites an existing user by email and refreshes members", async () => {
    authService.getEmail.and.returnValue("owner@example.com");
    chatService.inviteRoomMember.and.returnValue(of(undefined));
    chatService.listRoomMembers.and.returnValue(of([]));
    const route = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === "roomId" ? "room-1" : null),
        },
      },
    } as unknown as ActivatedRoute;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: ChatService, useValue: chatService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ChatComponent());

    for (let index = 0; index < 5; index += 1) {
      await Promise.resolve();
      TestBed.flushEffects();
    }
    component.inviteEmail.set(" guest@example.com ");
    await component.inviteMember();

    expect(chatService.inviteRoomMember).toHaveBeenCalledWith(
      "room-1",
      "guest@example.com",
    );
    expect(component.inviteEmail()).toBe("");
    expect(component.inviteSucceeded()).toBe(true);
  });

  it("leaves a room when it is closed by its owner", async () => {
    const route = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === "roomId" ? "room-1" : null),
        },
      },
    } as unknown as ActivatedRoute;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: ChatService, useValue: chatService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ChatComponent());

    for (let index = 0; index < 5; index += 1) {
      await Promise.resolve();
      TestBed.flushEffects();
    }
    closedRoomSignal.set("room-1");
    TestBed.flushEffects();

    expect(chatService.disconnect).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(["/rooms"]);
  });

  it("sends trimmed drafts and clears them", () => {
    component.conversationId = "conversation-1";
    component.draft.set("  Hello  ");

    component.sendMessage();

    expect(chatService.send).toHaveBeenCalledWith(
      { id: "conversation-1", kind: "conversation" },
      "Hello",
    );
    expect(component.draft()).toBe("");
  });

  it("logs out and navigates to login", () => {
    component.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(["/login"]);
  });

  it("sends the draft when Enter is pressed", () => {
    component.conversationId = "conversation-1";
    component.draft.set("Hello");
    const event = {
      shiftKey: false,
      preventDefault: jasmine.createSpy("preventDefault"),
    } as unknown as KeyboardEvent;

    component.handleEnterKey(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(chatService.send).toHaveBeenCalledWith(
      { id: "conversation-1", kind: "conversation" },
      "Hello",
    );
  });

  it("keeps the newline behavior for Shift+Enter", () => {
    component.draft.set("Hello");
    const event = {
      shiftKey: true,
      preventDefault: jasmine.createSpy("preventDefault"),
    } as unknown as KeyboardEvent;

    component.handleEnterKey(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(chatService.send).not.toHaveBeenCalled();
  });

  it("ignores empty drafts and disconnects on destroy", () => {
    component.draft.set("   ");

    component.sendMessage();
    TestBed.resetTestingModule();

    expect(chatService.send).not.toHaveBeenCalled();
    expect(chatService.disconnect).toHaveBeenCalled();
  });
});

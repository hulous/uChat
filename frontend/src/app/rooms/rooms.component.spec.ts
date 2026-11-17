import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { of, throwError } from "rxjs";
import { RoomsComponent } from "./rooms.component";
import { ChatService } from "../core/services/chat.service";
import { AuthService } from "../core/services/auth";

describe("RoomsComponent", () => {
  let component: RoomsComponent;
  let chatService: jasmine.SpyObj<ChatService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  const room = {
    id: "room-1",
    name: "Team",
    createdAt: "",
    ownerEmail: "owner@example.com",
    isPublic: true,
  };

  beforeEach(() => {
    chatService = jasmine.createSpyObj("ChatService", [
      "listRooms",
      "listPublicRooms",
      "createRoom",
      "leaveRoom",
      "closeRoom",
      "updateRoomVisibility",
      "joinRoom",
    ]);
    authService = jasmine.createSpyObj("AuthService", ["getEmail"]);
    router = jasmine.createSpyObj("Router", ["navigate"]);
    chatService.listRooms.and.returnValue(of([room]));
    chatService.listPublicRooms.and.returnValue(
      of([room, { ...room, id: "room-2" }]),
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: ChatService, useValue: chatService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    component = TestBed.runInInjectionContext(() => new RoomsComponent());
  });

  it("loads rooms and excludes joined rooms from public rooms", async () => {
    await component.refresh();

    expect(component.rooms()).toEqual([room]);
    expect(component.publicRooms()).toEqual([{ ...room, id: "room-2" }]);
  });

  it("creates a trimmed room and refreshes the lists", async () => {
    chatService.createRoom.and.returnValue(of(room));
    component.name = "  New room ";

    await component.create();

    expect(chatService.createRoom).toHaveBeenCalledWith("New room");
    expect(component.name).toBe("");
  });

  it("joins a room and opens it", async () => {
    chatService.joinRoom.and.returnValue(of(undefined));

    await component.join({ ...room, id: "room-2" });

    expect(chatService.joinRoom).toHaveBeenCalledWith("room-2");
    expect(router.navigate).toHaveBeenCalledWith(["/chat", "rooms", "room-2"]);
  });

  it("exposes operation errors and clears loading state", async () => {
    chatService.createRoom.and.returnValue(
      throwError(() => new Error("failed")),
    );
    component.name = "Room";

    await component.create();

    expect(component.errorMessage()).toBe("rooms.createError");
    expect(component.isCreating()).toBe(false);
  });

  it("sets an error when refresh fails", async () => {
    chatService.listRooms.and.returnValue(throwError(() => new Error("x")));

    await component.refresh();

    expect(component.errorMessage()).toBe("rooms.refreshError");
    expect(component.isRefreshing()).toBe(false);
  });

  it("ignores blank names and concurrent creation", async () => {
    component.name = "   ";
    await component.create();
    component.name = "Room";
    component.isCreating.set(true);
    await component.create();

    expect(chatService.createRoom).not.toHaveBeenCalled();
  });

  it("leaves a room and reports leave errors", async () => {
    chatService.leaveRoom.and.returnValue(of(undefined));
    await component.leave("room-1");
    expect(chatService.leaveRoom).toHaveBeenCalledWith("room-1");
    expect(component.leavingRoomId()).toBeNull();

    chatService.leaveRoom.and.returnValue(throwError(() => new Error("x")));
    await component.leave("room-1");
    expect(component.errorMessage()).toBe("rooms.leaveError");
  });

  it("confirms, cancels and closes a room", async () => {
    component.confirmClose("room-1");
    expect(component.closingRoomId()).toBe("room-1");
    component.cancelClose();
    expect(component.closingRoomId()).toBeNull();

    chatService.closeRoom.and.returnValue(of(undefined));
    component.confirmClose("room-1");
    await component.closeRoom("room-1");
    expect(chatService.closeRoom).toHaveBeenCalledWith("room-1");
    expect(component.closingRoomId()).toBeNull();
  });

  it("reports close errors and skips when already closing", async () => {
    chatService.closeRoom.and.returnValue(throwError(() => new Error("x")));
    await component.closeRoom("room-1");
    expect(component.errorMessage()).toBe("rooms.closeError");

    chatService.closeRoom.calls.reset();
    component.isClosingRoom.set(true);
    await component.closeRoom("room-1");
    expect(chatService.closeRoom).not.toHaveBeenCalled();
  });

  it("toggles visibility only for owners", async () => {
    authService.getEmail.and.returnValue("other@example.com");
    await component.updateVisibility(room);
    expect(chatService.updateRoomVisibility).not.toHaveBeenCalled();

    authService.getEmail.and.returnValue("owner@example.com");
    chatService.updateRoomVisibility.and.returnValue(of(room));
    await component.updateVisibility(room);
    expect(chatService.updateRoomVisibility).toHaveBeenCalledWith(
      "room-1",
      false,
    );

    chatService.updateRoomVisibility.and.returnValue(
      throwError(() => new Error("x")),
    );
    await component.updateVisibility(room);
    expect(component.errorMessage()).toBe("rooms.visibilityError");

    component.isUpdatingVisibility.set(true);
    chatService.updateRoomVisibility.calls.reset();
    await component.updateVisibility(room);
    expect(chatService.updateRoomVisibility).not.toHaveBeenCalled();
  });

  it("reports join errors and ignores concurrent joins", async () => {
    chatService.joinRoom.and.returnValue(throwError(() => new Error("x")));
    await component.join(room);
    expect(component.errorMessage()).toBe("rooms.joinError");

    chatService.joinRoom.calls.reset();
    component.joiningRoomId.set("room-2");
    await component.join(room);
    expect(chatService.joinRoom).not.toHaveBeenCalled();
  });

  it("derives the current page from the router url", () => {
    (router as { url: string }).url = "/account";
    expect(component.currentPage).toBe("account");
    (router as { url: string }).url = "/chat";
    expect(component.currentPage).toBe("chat");
  });

  it("recognizes the current user as room owner", () => {
    authService.getEmail.and.returnValue("owner@example.com");

    expect(component.isOwner(room)).toBe(true);
  });
});

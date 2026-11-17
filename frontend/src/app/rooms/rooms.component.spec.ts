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

  it("recognizes the current user as room owner", () => {
    authService.getEmail.and.returnValue("owner@example.com");

    expect(component.isOwner(room)).toBe(true);
  });
});

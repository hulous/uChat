import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { TranslateModule } from "@ngx-translate/core";
import { ChatService } from "../core/services/chat.service";
import { ChatRoom } from "../core/models/chat-room.interface";
import { AuthService } from "../core/services/auth";
import { PageHeaderComponent } from "../shared/page-header/page-header";

@Component({
  selector: "app-chat-rooms",
  imports: [FormsModule, TranslateModule, PageHeaderComponent],
  templateUrl: "./rooms.component.html",
})
export class RoomsComponent {
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly rooms = signal<ChatRoom[]>([]);
  readonly publicRooms = signal<ChatRoom[]>([]);
  readonly errorMessage = signal("");
  readonly isCreating = signal(false);
  readonly closingRoomId = signal<string | null>(null);
  readonly isClosingRoom = signal(false);
  readonly isUpdatingVisibility = signal(false);
  readonly joiningRoomId = signal<string | null>(null);
  name = "";

  get currentPage(): "chat" | "account" {
    return this.router.url.startsWith("/account") ? "account" : "chat";
  }

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const [rooms, publicRooms] = await Promise.all([
      firstValueFrom(this.chatService.listRooms()),
      firstValueFrom(this.chatService.listPublicRooms()),
    ]);
    this.rooms.set(rooms);
    this.publicRooms.set(
      publicRooms.filter(
        (publicRoom) => !rooms.some((room) => room.id === publicRoom.id),
      ),
    );
  }

  async create(): Promise<void> {
    const roomName = this.name.trim();
    if (!roomName || this.isCreating()) {
      return;
    }

    this.errorMessage.set("");
    this.isCreating.set(true);
    try {
      const room = await firstValueFrom(this.chatService.createRoom(roomName));
      this.name = "";
      await this.refresh();
      await this.open(room);
    } catch {
      this.errorMessage.set("rooms.createError");
    } finally {
      this.isCreating.set(false);
    }
  }

  open(room: ChatRoom): Promise<boolean> {
    return this.router.navigate(["/chat", "rooms", room.id]);
  }

  async leave(roomId: string): Promise<void> {
    await firstValueFrom(this.chatService.leaveRoom(roomId));
    await this.refresh();
  }

  isOwner(room: ChatRoom): boolean {
    return room.ownerEmail === this.authService.getEmail();
  }

  confirmClose(roomId: string): void {
    this.closingRoomId.set(roomId);
    this.errorMessage.set("");
  }

  cancelClose(): void {
    this.closingRoomId.set(null);
  }

  async closeRoom(roomId: string): Promise<void> {
    if (this.isClosingRoom()) {
      return;
    }

    this.errorMessage.set("");
    this.isClosingRoom.set(true);
    try {
      await firstValueFrom(this.chatService.closeRoom(roomId));
      this.closingRoomId.set(null);
      await this.refresh();
    } catch {
      this.errorMessage.set("rooms.closeError");
    } finally {
      this.isClosingRoom.set(false);
    }
  }

  async updateVisibility(room: ChatRoom): Promise<void> {
    if (this.isUpdatingVisibility() || !this.isOwner(room)) {
      return;
    }

    this.errorMessage.set("");
    this.isUpdatingVisibility.set(true);
    try {
      await firstValueFrom(
        this.chatService.updateRoomVisibility(room.id, !room.isPublic),
      );
      await this.refresh();
    } catch {
      this.errorMessage.set("rooms.visibilityError");
    } finally {
      this.isUpdatingVisibility.set(false);
    }
  }

  async join(room: ChatRoom): Promise<void> {
    if (this.joiningRoomId()) {
      return;
    }

    this.errorMessage.set("");
    this.joiningRoomId.set(room.id);
    try {
      await firstValueFrom(this.chatService.joinRoom(room.id));
      await this.refresh();
      await this.open(room);
    } catch {
      this.errorMessage.set("rooms.joinError");
    } finally {
      this.joiningRoomId.set(null);
    }
  }
}

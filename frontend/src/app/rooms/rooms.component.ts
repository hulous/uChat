import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { TranslateModule } from "@ngx-translate/core";
import { ChatService } from "../core/services/chat.service";
import { ChatRoom } from "../core/models/chat-room.interface";
import { AuthService } from "../core/services/auth";

@Component({
  selector: "app-chat-rooms",
  imports: [FormsModule, RouterLink, TranslateModule],
  templateUrl: "./rooms.component.html",
})
export class RoomsComponent {
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly rooms = signal<ChatRoom[]>([]);
  readonly errorMessage = signal("");
  readonly isCreating = signal(false);
  readonly closingRoomId = signal<string | null>(null);
  readonly isClosingRoom = signal(false);
  name = "";

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.rooms.set(await firstValueFrom(this.chatService.listRooms()));
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
}

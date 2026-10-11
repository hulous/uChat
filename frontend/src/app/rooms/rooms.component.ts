import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { TranslateModule } from "@ngx-translate/core";
import { ChatService } from "../core/services/chat.service";
import { ChatRoom } from "../core/models/chat-room.interface";
import { AuthService } from "../core/services/auth";
import { UserResponse } from "../core/models/user-response.interface";

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
  readonly publicRooms = signal<ChatRoom[]>([]);
  readonly errorMessage = signal("");
  readonly isCreating = signal(false);
  readonly closingRoomId = signal<string | null>(null);
  readonly isClosingRoom = signal(false);
  readonly isUpdatingVisibility = signal(false);
  readonly joiningRoomId = signal<string | null>(null);
  readonly contacts = signal<UserResponse[]>([]);
  readonly contactError = signal("");
  contactEmail = "";
  name = "";

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const [rooms, publicRooms, contacts] = await Promise.all([
      firstValueFrom(this.chatService.listRooms()),
      firstValueFrom(this.chatService.listPublicRooms()),
      firstValueFrom(this.chatService.listContacts()),
    ]);
    this.rooms.set(rooms);
    this.publicRooms.set(
      publicRooms.filter(
        (publicRoom) => !rooms.some((room) => room.id === publicRoom.id),
      ),
    );
    this.contacts.set(contacts);
  }

  async addContact(): Promise<void> {
    const email = this.contactEmail.trim();
    if (!email) return;
    try {
      await firstValueFrom(this.chatService.addContact(email));
      this.contactEmail = "";
      this.contacts.set(await firstValueFrom(this.chatService.listContacts()));
      this.contactError.set("");
    } catch {
      this.contactError.set("rooms.contactError");
    }
  }

  async removeContact(userId: number): Promise<void> {
    await firstValueFrom(this.chatService.removeContact(userId));
    this.contacts.update((contacts) => contacts.filter((contact) => contact.id !== userId));
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

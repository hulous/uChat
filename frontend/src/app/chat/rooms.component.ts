import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { ChatService } from "../core/services/chat.service";
import { ChatRoom } from "../core/models/chat-room.interface";

@Component({
  selector: "app-chat-rooms",
  imports: [FormsModule],
  template: `
    <section aria-labelledby="rooms-title">
      <h1 id="rooms-title">Salons de discussion</h1>
      <form (ngSubmit)="create()">
        <label for="room-name">Nouveau salon</label>
        <input id="room-name" name="name" [(ngModel)]="name" required />
        <button type="submit" [disabled]="!name.trim()">Créer</button>
      </form>
      <ul>
        @for (room of rooms(); track room.id) {
          <li>
            <button type="button" (click)="open(room)">{{ room.name }}</button>
            <button type="button" (click)="leave(room.id)">Quitter</button>
          </li>
        } @empty {
          <li>Aucun salon accessible.</li>
        }
      </ul>
    </section>
  `,
})
export class RoomsComponent {
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  readonly rooms = signal<ChatRoom[]>([]);
  name = "";

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.rooms.set(await firstValueFrom(this.chatService.listRooms()));
  }

  async create(): Promise<void> {
    const room = await firstValueFrom(this.chatService.createRoom(this.name.trim()));
    this.name = "";
    await this.refresh();
    await this.open(room);
  }

  open(room: ChatRoom): Promise<boolean> {
    return this.router.navigate(["/chat", "rooms", room.id]);
  }

  async leave(roomId: string): Promise<void> {
    await firstValueFrom(this.chatService.leaveRoom(roomId));
    await this.refresh();
  }
}

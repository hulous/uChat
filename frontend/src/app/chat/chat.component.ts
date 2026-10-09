import { Component, DestroyRef, effect, inject, signal } from "@angular/core";

import { ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import {
  ChatService,
  ChatTarget,
  MessageDto,
} from "../core/services/chat.service";
import { ChatMessage } from "../core/models/chat-message.interface";
import { AuthService } from "../core/services/auth";
import { TranslateModule } from "@ngx-translate/core";
import { UserNavigationComponent } from "../shared/user-navigation/user-navigation";
import { RoomMember } from "../core/models/room-member.interface";

@Component({
  selector: "app-chat",
  imports: [FormsModule, TranslateModule, UserNavigationComponent],
  templateUrl: "./chat.component.html",
})
export class ChatComponent {
  private readonly defaultConversationId = "demo";
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  conversationId = this.defaultConversationId;
  private target: ChatTarget = {
    id: this.defaultConversationId,
    kind: "conversation",
  };
  draft = signal("");
  messages = signal<ChatMessage[]>([]);
  isReady = signal(false);
  roomName = signal<string | null>(null);
  roomMembers = signal<RoomMember[]>([]);
  isRoomOwner = signal(false);
  isLoadingMembers = signal(false);
  isBanningMember = signal(false);
  banError = signal(false);
  banDurationHours = signal(24);

  constructor() {
    effect(() => {
      const message = this.chatService.messages();
      if (message) {
        if (message?.conversationId === this.conversationId) {
          this.messages.update((messages) => [
            ...messages,
            this.toChatMessage(message),
          ]);
        }
      }
    });
    effect(() => {
      if (
        this.target.kind === "room" &&
        this.chatService.bannedRoomId() === this.target.id
      ) {
        this.chatService.disconnect();
        void this.router.navigate(["/rooms"]);
      }
    });
    this.destroyRef.onDestroy(() => this.chatService.disconnect());

    void this.loadConversation();
  }

  private async loadConversation(): Promise<void> {
    const roomId = this.route.snapshot.paramMap.get("roomId");
    const conversationId = this.route.snapshot.paramMap.get("conversationId");
    this.target = roomId
      ? { id: roomId, kind: "room" }
      : {
          id: conversationId ?? this.defaultConversationId,
          kind: "conversation",
        };
    this.conversationId = this.target.id;
    if (this.target.kind === "room") {
      const rooms = await firstValueFrom(this.chatService.listRooms());
      const room = rooms.find((item) => item.id === roomId);
      this.roomName.set(room?.name ?? null);
      this.isRoomOwner.set(room?.ownerEmail === this.authService.getEmail());
      if (this.isRoomOwner()) {
        await this.refreshRoomMembers();
      }
    }

    await this.chatService.connect(this.target);
    const messages = await firstValueFrom(
      this.chatService.loadHistory(this.target),
    );
    this.messages.update((currentMessages) => [
      ...messages.map((message) => this.toChatMessage(message)),
      ...currentMessages,
    ]);
    this.isReady.set(true);
  }

  async banMember(userId: number): Promise<void> {
    if (this.target.kind !== "room" || this.isBanningMember()) {
      return;
    }

    this.banError.set(false);
    this.isBanningMember.set(true);
    try {
      await firstValueFrom(
        this.chatService.banRoomMember(
          this.target.id,
          userId,
          this.banDurationHours(),
        ),
      );
      await this.refreshRoomMembers();
    } catch {
      this.banError.set(true);
    } finally {
      this.isBanningMember.set(false);
    }
  }

  private async refreshRoomMembers(): Promise<void> {
    if (this.target.kind !== "room") {
      return;
    }
    this.isLoadingMembers.set(true);
    try {
      this.roomMembers.set(
        await firstValueFrom(this.chatService.listRoomMembers(this.target.id)),
      );
    } finally {
      this.isLoadingMembers.set(false);
    }
  }

  sendMessage() {
    const content = this.draft().trim();
    if (!content) {
      return;
    }

    this.chatService.send(this.target, content);
    this.draft.set("");
  }

  handleEnterKey(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(["/login"]);
  }

  private toChatMessage(message: MessageDto): ChatMessage {
    return {
      author: message.senderName || message.senderEmail,
      text: message.content,
      timestamp: new Date(message.sentAt).toLocaleTimeString("fr-FR"),
      datetime: message.sentAt,
    };
  }
}

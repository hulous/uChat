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
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-chat",
  imports: [FormsModule, TranslateModule, RouterLink, UserNavigationComponent],
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
      this.roomName.set(rooms.find((room) => room.id === roomId)?.name ?? null);
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

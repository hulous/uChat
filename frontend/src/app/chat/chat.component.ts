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
import { RoomMember } from "../core/models/room-member.interface";
import { UserNavigationComponent } from "../shared/user-navigation/user-navigation";

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
  private target = signal<ChatTarget>({
    id: this.defaultConversationId,
    kind: "conversation",
  });
  draft = signal("");
  isSending = signal(false);
  messages = signal<ChatMessage[]>([]);
  hasMoreHistory = signal(false);
  isLoadingHistory = signal(false);
  private nextHistoryPage = 1;
  isReady = signal(false);
  roomName = signal<string | null>(null);
  roomMembers = signal<RoomMember[]>([]);
  isRoomOwner = signal(false);
  isModerationExpanded = signal(false);
  isLoadingMembers = signal(false);
  isBanningMember = signal(false);
  banError = signal(false);
  banDurationHours = signal(24);
  inviteEmail = signal("");
  isInvitingMember = signal(false);
  inviteError = signal(false);
  inviteSucceeded = signal(false);
  errorMessage = signal("");

  get currentPage(): "chat" | "account" {
    return this.router.url.startsWith("/account") ? "account" : "chat";
  }

  toggleModeration(): void {
    this.isModerationExpanded.update((expanded) => !expanded);
  }

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
      const error = this.chatService.error?.();
      if (error) {
        this.errorMessage.set(`chat.errors.${error}`);
        this.isReady.set(false);
      }
    });
    effect(() => {
      const target = this.target();
      if (
        target.kind === "room" &&
        (this.chatService.bannedRoomId() === target.id ||
          this.chatService.closedRoomId() === target.id)
      ) {
        this.chatService.disconnect();
        void this.router.navigate(["/rooms"]);
      }
    });
    this.destroyRef.onDestroy(() => this.chatService.disconnect());

    void this.loadConversation();
  }

  private async loadConversation(): Promise<void> {
    this.errorMessage.set("");
    const roomId = this.route.snapshot.paramMap.get("roomId");
    const conversationId = this.route.snapshot.paramMap.get("conversationId");
    const target: ChatTarget = roomId
      ? { id: roomId, kind: "room" }
      : {
          id: conversationId ?? this.defaultConversationId,
          kind: "conversation",
        };
    this.messages.set([]);
    this.nextHistoryPage = 1;
    this.chatService.bannedRoomId.set(null);
    this.chatService.closedRoomId.set(null);
    this.isReady.set(false);
    this.target.set(target);
    this.conversationId = target.id;
    try {
      if (target.kind === "room") {
        const rooms = await firstValueFrom(this.chatService.listRooms());
        const room = rooms.find((item) => item.id === roomId);
        this.roomName.set(room?.name ?? null);
        this.isRoomOwner.set(room?.ownerEmail === this.authService.getEmail());
        if (this.isRoomOwner()) {
          await this.refreshRoomMembers();
        }
      }

      await this.chatService.connect(target);
      const historyPage = await firstValueFrom(
        this.chatService.loadHistory(target, 0),
      );
      this.hasMoreHistory.set(!historyPage.last);
      this.messages.update((currentMessages) => [
        ...historyPage.content.map((message) => this.toChatMessage(message)),
        ...currentMessages,
      ]);
      this.isReady.set(true);
    } catch {
      await this.chatService.disconnect();
      this.errorMessage.set("chat.errors.load");
    }
  }

  async loadMoreHistory(): Promise<void> {
    if (this.isLoadingHistory() || !this.hasMoreHistory()) {
      return;
    }

    this.isLoadingHistory.set(true);
    try {
      const historyPage = await firstValueFrom(
        this.chatService.loadHistory(this.target(), this.nextHistoryPage),
      );
      this.nextHistoryPage += 1;
      this.hasMoreHistory.set(!historyPage.last);
      this.messages.update((currentMessages) => [
        ...currentMessages,
        ...historyPage.content.map((message) => this.toChatMessage(message)),
      ]);
    } finally {
      this.isLoadingHistory.set(false);
    }
  }

  async banMember(userId: number): Promise<void> {
    const target = this.target();
    if (target.kind !== "room" || this.isBanningMember()) {
      return;
    }

    this.banError.set(false);
    this.isBanningMember.set(true);
    try {
      await firstValueFrom(
        this.chatService.banRoomMember(
          target.id,
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

  async inviteMember(): Promise<void> {
    const email = this.inviteEmail().trim();
    const target = this.target();
    if (target.kind !== "room" || this.isInvitingMember() || !email) {
      return;
    }

    this.inviteError.set(false);
    this.inviteSucceeded.set(false);
    this.isInvitingMember.set(true);
    try {
      await firstValueFrom(this.chatService.inviteRoomMember(target.id, email));
      this.inviteEmail.set("");
      this.inviteSucceeded.set(true);
      await this.refreshRoomMembers();
    } catch {
      this.inviteError.set(true);
    } finally {
      this.isInvitingMember.set(false);
    }
  }

  private async refreshRoomMembers(): Promise<void> {
    const target = this.target();
    if (target.kind !== "room") {
      return;
    }
    this.isLoadingMembers.set(true);
    try {
      this.roomMembers.set(
        await firstValueFrom(this.chatService.listRoomMembers(target.id)),
      );
    } finally {
      this.isLoadingMembers.set(false);
    }
  }

  sendMessage() {
    const content = this.draft().trim();
    if (!content || this.isSending()) {
      return;
    }

    this.isSending.set(true);
    this.chatService.send(this.target(), content);
    this.draft.set("");
    queueMicrotask(() => this.isSending.set(false));
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

import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom, Subscription } from "rxjs";
import { RxStomp } from "@stomp/rx-stomp";
import SockJS from "sockjs-client";
import { AuthService } from "./auth";
import { MessageDto } from "../models/message-dto.interface";
import { IncomingMessagePayload } from "../models/incoming-message-payload.interface";
import { ChatRoom } from "../models/chat-room.interface";
import { RoomMember } from "../models/room-member.interface";
import { UserResponse } from "../models/user-response.interface";

export { MessageDto } from "../models/message-dto.interface";

export interface ChatTarget {
  id: string;
  kind: "conversation" | "room";
}

export interface MessagePage {
  content: MessageDto[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
}

@Injectable({ providedIn: "root" })
export class ChatService {
  private client = new RxStomp();
  readonly messages = signal<MessageDto | null>(null);
  readonly bannedRoomId = signal<string | null>(null);
  readonly closedRoomId = signal<string | null>(null);
  private connected = false;
  private connectedTarget: ChatTarget | null = null;
  private messageSubscription?: Subscription;
  private transition: Promise<void> = Promise.resolve();
  private connectionGeneration = 0;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
  ) {}

  async connect(target: ChatTarget): Promise<void> {
    const operation = this.transition.then(async () => {
      if (
        this.connected &&
        this.connectedTarget?.id === target.id &&
        this.connectedTarget?.kind === target.kind
      )
        return;

      await this.disconnectNow();
      const generation = ++this.connectionGeneration;
      this.client.configure({
        webSocketFactory: () => new SockJS("/ws"),
        connectHeaders: {
          Authorization: `Bearer ${this.authService.getToken()}`,
        },
        reconnectDelay: 5000,
      });

      this.client.activate();
      await firstValueFrom(this.client.connected$);
      const destination =
        target.kind === "room"
          ? `/topic/rooms/${target.id}`
          : `/topic/conversations/${target.id}`;
      const isCurrent = () =>
        generation === this.connectionGeneration &&
        this.connectedTarget?.id === target.id &&
        this.connectedTarget?.kind === target.kind;
      const roomBanSubscription = this.client.stompClient.subscribe(
        "/user/queue/room-bans",
        (frame) => {
          if (isCurrent()) this.bannedRoomId.set(frame.body);
        },
      );
      const roomClosedSubscription = this.client.stompClient.subscribe(
        "/user/queue/room-closed",
        (frame) => {
          if (isCurrent()) this.closedRoomId.set(frame.body);
        },
      );
      const stompSubscription = this.client.stompClient.subscribe(
        destination,
        (frame) => {
          if (!isCurrent()) return;
          try {
            this.messages.set(JSON.parse(frame.body) as MessageDto);
          } catch {
            /* malformed frame */
          }
        },
      );
      this.messageSubscription = new Subscription(() => {
        stompSubscription.unsubscribe();
        roomBanSubscription.unsubscribe();
        roomClosedSubscription.unsubscribe();
      });
      this.connected = true;
      this.connectedTarget = target;
    });
    this.transition = operation.catch((error) => {
      this.connected = false;
      this.connectedTarget = null;
      throw error;
    });
    return operation;
  }

  send(target: ChatTarget, content: string): void {
    const payload: IncomingMessagePayload = {
      conversationId: target.id,
      kind: target.kind,
      content,
    };
    this.client.publish({
      destination: "/app/chat.send",
      body: JSON.stringify(payload),
    });
  }

  loadHistory(target: ChatTarget, page = 0, size = 30) {
    return this.http.get<MessagePage>(
      target.kind === "room"
        ? `/api/conversations/rooms/${target.id}/messages?page=${page}&size=${size}`
        : `/api/conversations/${target.id}/messages?page=${page}&size=${size}`,
    );
  }

  listRooms() {
    return this.http.get<ChatRoom[]>("/api/rooms");
  }

  listPublicRooms() {
    return this.http.get<ChatRoom[]>("/api/rooms/public");
  }

  createRoom(name: string) {
    return this.http.post<ChatRoom>("/api/rooms", { name });
  }

  joinRoom(roomId: string) {
    return this.http.post<ChatRoom>(`/api/rooms/${roomId}/join`, {});
  }

  updateRoomVisibility(roomId: string, isPublic: boolean) {
    return this.http.put<ChatRoom>(`/api/rooms/${roomId}/visibility`, {
      isPublic,
    });
  }

  leaveRoom(roomId: string) {
    return this.http.delete<void>(`/api/rooms/${roomId}/membership`);
  }

  listRoomMembers(roomId: string) {
    return this.http.get<RoomMember[]>(`/api/rooms/${roomId}/members`);
  }

  inviteRoomMember(roomId: string, email: string) {
    return this.http.post<void>(`/api/rooms/${roomId}/members`, { email });
  }

  closeRoom(roomId: string) {
    return this.http.delete<void>(`/api/rooms/${roomId}`);
  }

  banRoomMember(roomId: string, userId: number, durationHours: number) {
    return this.http.post<void>(`/api/rooms/${roomId}/bans`, {
      userId,
      durationHours,
    });
  }

  listContacts() {
    return this.http.get<UserResponse[]>("/api/user/contacts");
  }

  addContact(email: string) {
    return this.http.post<void>("/api/user/contacts", { email });
  }

  removeContact(userId: number) {
    return this.http.delete<void>(`/api/user/contacts/${userId}`);
  }

  async disconnect(): Promise<void> {
    const operation = this.transition.then(() => this.disconnectNow());
    this.transition = operation;
    await operation;
  }

  private async disconnectNow(): Promise<void> {
    ++this.connectionGeneration;
    this.messageSubscription?.unsubscribe();
    this.messageSubscription = undefined;
    this.connected = false;
    this.connectedTarget = null;
    await this.client.deactivate();
  }
}

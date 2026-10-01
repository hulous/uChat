import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom, Subscription } from "rxjs";
import { RxStomp } from "@stomp/rx-stomp";
import SockJS from "sockjs-client";
import { AuthService } from "./auth";
import { MessageDto } from "../models/message-dto.interface";
import { IncomingMessagePayload } from "../models/incoming-message-payload.interface";
import { ChatRoom } from "../models/chat-room.interface";

export { MessageDto } from "../models/message-dto.interface";

export interface ChatTarget {
  id: string;
  kind: "conversation" | "room";
}

@Injectable({ providedIn: "root" })
export class ChatService {
  private client = new RxStomp();
  readonly messages = signal<MessageDto | null>(null);
  private connected = false;
  private connectedTarget: ChatTarget | null = null;
  private messageSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
  ) {}

  async connect(target: ChatTarget): Promise<void> {
    if (this.connected && this.connectedTarget?.id === target.id && this.connectedTarget?.kind === target.kind) {
      return;
    }

    if (this.connected) {
      this.disconnect();
    }

    this.client.configure({
      webSocketFactory: () => new SockJS("/ws"),
      connectHeaders: {
        Authorization: `Bearer ${this.authService.getToken()}`,
      },
      reconnectDelay: 5000,
    });

    this.client.activate();
    await firstValueFrom(this.client.connected$);
    const destination = target.kind === "room"
      ? `/topic/rooms/${target.id}`
      : `/topic/conversations/${target.id}`;
    const stompSubscription = this.client.stompClient.subscribe(
      destination,
      (frame) => {
        const message: MessageDto = JSON.parse(frame.body);
        this.messages.set(message);
      },
    );
    this.messageSubscription = new Subscription(() =>
      stompSubscription.unsubscribe(),
    );
    this.connected = true;
    this.connectedTarget = target;
  }

  send(conversationId: string, content: string): void {
    const payload: IncomingMessagePayload = { conversationId, content };
    this.client.publish({
      destination: "/app/chat.send",
      body: JSON.stringify(payload),
    });
  }

  loadHistory(target: ChatTarget) {
    return this.http.get<MessageDto[]>(target.kind === "room"
      ? `/api/conversations/rooms/${target.id}/messages`
      : `/api/conversations/${target.id}/messages`);
  }

  listRooms() {
    return this.http.get<ChatRoom[]>("/api/rooms");
  }

  createRoom(name: string) {
    return this.http.post<ChatRoom>("/api/rooms", { name });
  }

  joinRoom(roomId: string) {
    return this.http.post<ChatRoom>(`/api/rooms/${roomId}/join`, {});
  }

  leaveRoom(roomId: string) {
    return this.http.delete<void>(`/api/rooms/${roomId}/membership`);
  }

  disconnect(): void {
    this.messageSubscription?.unsubscribe();
    this.messageSubscription = undefined;
    this.client.deactivate();
    this.connected = false;
    this.connectedTarget = null;
  }
}

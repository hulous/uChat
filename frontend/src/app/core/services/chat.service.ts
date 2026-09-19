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

@Injectable({ providedIn: "root" })
export class ChatService {
  private client = new RxStomp();
  readonly messages = signal<MessageDto | null>(null);
  private connected = false;
  private connectedConversationId: string | null = null;
  private messageSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
  ) {}

  async connect(conversationId: string): Promise<void> {
    if (this.connected && this.connectedConversationId === conversationId) {
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
    const destination = this.isRoomId(conversationId)
      ? `/topic/rooms/${conversationId}`
      : `/topic/conversations/${conversationId}`;
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
    this.connectedConversationId = conversationId;
  }

  send(conversationId: string, content: string): void {
    const payload: IncomingMessagePayload = { conversationId, content };
    this.client.publish({
      destination: "/app/chat.send",
      body: JSON.stringify(payload),
    });
  }

  loadHistory(conversationId: string) {
    return this.http.get<MessageDto[]>(this.isRoomId(conversationId)
      ? `/api/conversations/rooms/${conversationId}/messages`
      : `/api/conversations/${conversationId}/messages`);
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
    this.connectedConversationId = null;
  }

  private isRoomId(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}

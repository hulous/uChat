export interface IncomingMessagePayload {
  conversationId: string;
  kind: "conversation" | "room";
  content: string;
}

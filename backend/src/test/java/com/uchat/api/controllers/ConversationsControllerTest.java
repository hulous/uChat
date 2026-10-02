package com.uchat.api.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.uchat.api.dtos.MessageDto;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.services.ChatRoomService;
import com.uchat.api.services.ChatService;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class ConversationsControllerTest {

  @Mock private ChatService chatService;
  @Mock private ChatRoomService chatRoomService;
  @Mock private Principal principal;

  @InjectMocks private ConversationsController controller;

  @Test
  void getHistoryReturnsMappedMessagesInOrder() {
    String conversationId = "demo";
    MessageDto dto1 = new MessageDto(null, conversationId, "john@example.com", "John", "Hello", null);
    MessageDto dto2 = new MessageDto(null, conversationId, "john@example.com", "John", "Bye", null);

    when(chatService.getConversationHistory(conversationId)).thenReturn(List.of(dto1, dto2));

    List<MessageDto> response = controller.getHistory(conversationId, principal);

    assertEquals(List.of(dto1, dto2), response);
    verify(chatService).getConversationHistory(conversationId);
  }

  @Test
  void getHistoryReturnsEmptyListWhenNoMessagesExist() {
    String conversationId = "empty";

    when(chatService.getConversationHistory(conversationId)).thenReturn(List.of());

    List<MessageDto> response = controller.getHistory(conversationId, principal);

    assertTrue(response.isEmpty());
    verify(chatService).getConversationHistory(conversationId);
  }

  @Test
  void getHistoryKeepsUuidShapedLegacyConversationOnConversationRoute() {
    String conversationId = "550e8400-e29b-41d4-a716-446655440000";
    MessageDto message = new MessageDto(null, conversationId, "john@example.com", "John", "Hello", null);
    when(chatService.getConversationHistory(conversationId)).thenReturn(List.of(message));

    List<MessageDto> response = controller.getHistory(conversationId, principal);

    assertEquals(List.of(message), response);
    verify(chatService).getConversationHistory(conversationId);
    verifyNoInteractions(chatRoomService);
  }

  @Test
  void getRoomHistoryRejectsNonMember() {
    UUID roomId = UUID.randomUUID();
    when(principal.getName()).thenReturn("outsider@example.com");
    when(chatRoomService.hasAccess("outsider@example.com", roomId)).thenReturn(false);

    ApiException exception = assertThrows(
      ApiException.class,
      () -> controller.getRoomHistory(roomId, PageRequest.of(0, 20), principal));

    assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
    verifyNoInteractions(chatService);
  }

  @Test
  void getRoomHistoryReturnsPagedMessages() {
    UUID roomId = UUID.randomUUID();
    Pageable pageable = PageRequest.of(1, 20);
    MessageDto message = new MessageDto(null, roomId.toString(), "john@example.com", "John", "Hello", null);
    when(principal.getName()).thenReturn("john@example.com");
    when(chatRoomService.hasAccess("john@example.com", roomId)).thenReturn(true);
    when(chatService.getConversationHistory(roomId.toString(), pageable)).thenReturn(List.of(message));

    List<MessageDto> response = controller.getRoomHistory(roomId, pageable, principal);

    assertEquals(List.of(message), response);
    verify(chatService).getConversationHistory(roomId.toString(), pageable);
  }
}

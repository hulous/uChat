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
import com.uchat.api.responses.PagedResponse;
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

    var page = new PagedResponse<>(List.of(dto1, dto2), 0, 30, 1, 2, true, true);
    when(chatService.getConversationHistory(conversationId, false, 0, 30)).thenReturn(page);

    var response = controller.getHistory(conversationId, 0, 30, principal);

    assertEquals(page, response);
    verify(chatService).getConversationHistory(conversationId, false, 0, 30);
  }

  @Test
  void getHistoryReturnsEmptyListWhenNoMessagesExist() {
    String conversationId = "empty";

    var page = new PagedResponse<MessageDto>(List.of(), 0, 30, 0, 0, true, true);
    when(chatService.getConversationHistory(conversationId, false, 0, 30)).thenReturn(page);

    var response = controller.getHistory(conversationId, 0, 30, principal);

    assertTrue(response.content().isEmpty());
    verify(chatService).getConversationHistory(conversationId, false, 0, 30);
  }

  @Test
  void getHistoryKeepsUuidShapedLegacyConversationOnConversationRoute() {
    String conversationId = "550e8400-e29b-41d4-a716-446655440000";
    MessageDto message = new MessageDto(null, conversationId, "john@example.com", "John", "Hello", null);
    var page = new PagedResponse<>(List.of(message), 0, 30, 1, 1, true, true);
    when(chatService.getConversationHistory(conversationId, false, 0, 30)).thenReturn(page);

    var response = controller.getHistory(conversationId, 0, 30, principal);

    assertEquals(page, response);
    verify(chatService).getConversationHistory(conversationId, false, 0, 30);
    verifyNoInteractions(chatRoomService);
  }

  @Test
  void getRoomHistoryRejectsNonMember() {
    UUID roomId = UUID.randomUUID();
    when(principal.getName()).thenReturn("outsider@example.com");
    when(chatRoomService.hasAccess("outsider@example.com", roomId)).thenReturn(false);

    ApiException exception = assertThrows(
      ApiException.class,
      () -> controller.getRoomHistory(roomId, 0, 20, principal));

    assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
    verifyNoInteractions(chatService);
  }

  @Test
  void getRoomHistoryReturnsPagedMessages() {
    UUID roomId = UUID.randomUUID();
    MessageDto message = new MessageDto(null, roomId.toString(), "john@example.com", "John", "Hello", null);
    when(principal.getName()).thenReturn("john@example.com");
    when(chatRoomService.hasAccess("john@example.com", roomId)).thenReturn(true);
    var page = new PagedResponse<>(List.of(message), 1, 20, 2, 21, false, true);
    when(chatService.getConversationHistory(roomId.toString(), true, 1, 20)).thenReturn(page);

    var response = controller.getRoomHistory(roomId, 1, 20, principal);

    assertEquals(page, response);
    verify(chatService).getConversationHistory(roomId.toString(), true, 1, 20);
  }
}

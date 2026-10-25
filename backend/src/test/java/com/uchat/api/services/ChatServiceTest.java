package com.uchat.api.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.uchat.api.dtos.IncomingMessageDto;
import com.uchat.api.dtos.MessageDto;
import com.uchat.api.dtos.MessageKind;
import com.uchat.api.entities.Message;
import com.uchat.api.entities.User;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.mappers.MessageMapper;
import com.uchat.api.repositories.MessageRepository;
import com.uchat.api.repositories.ChatRoomRepository;
import com.uchat.api.repositories.UserRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

  @Mock private MessageRepository messageRepository;

  @Mock private UserRepository userRepository;

  @Mock private MessageMapper messageMapper;

  @Mock private SimpMessagingTemplate messagingTemplate;

  @Mock private ChatRoomRepository chatRoomRepository;

  @Mock private ChatRoomService chatRoomService;

  @InjectMocks private ChatService chatService;

  @Test
  void sendMessageSavesAndPublishesMessage() {
    String userEmail = "john@example.com";
    IncomingMessageDto incoming = new IncomingMessageDto("demo", MessageKind.CONVERSATION, "hello world");
    User sender = new User().setId(1).setEmail(userEmail).setName("John").setPassword("secret");
    Message savedMessage =
        new Message()
            .setId(UUID.randomUUID())
            .setConversationId(incoming.conversationId())
            .setSender(sender)
            .setContent(incoming.content())
            .setSentAt(Instant.parse("2025-01-01T12:00:00Z"));
    MessageDto expectedDto =
        new MessageDto(
          savedMessage.getId(), "demo", userEmail, "John", "hello world", savedMessage.getSentAt());

    when(userRepository.findByEmail(userEmail)).thenReturn(Optional.of(sender));
    when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
    when(messageMapper.toDto(savedMessage)).thenReturn(expectedDto);

    MessageDto result = chatService.sendMessage(userEmail, incoming);

    assertEquals(expectedDto, result);
    verify(messagingTemplate).convertAndSend("/topic/conversations/demo", expectedDto);
  }

  @Test
  void sendMessageThrowsWhenAuthenticatedUserIsNotFound() {
    String userEmail = "missing@example.com";
    IncomingMessageDto incoming = new IncomingMessageDto("demo", MessageKind.CONVERSATION, "hello world");

    when(userRepository.findByEmail(userEmail)).thenReturn(Optional.empty());

    IllegalStateException exception =
        assertThrows(
            IllegalStateException.class, () -> chatService.sendMessage(userEmail, incoming));

    assertEquals("Authenticated user not found", exception.getMessage());
  }

  @Test
  void sendMessageKeepsUuidShapedLegacyConversationOutOfRoomAuthorization() {
    String userEmail = "john@example.com";
    String conversationId = "550e8400-e29b-41d4-a716-446655440000";
    IncomingMessageDto incoming = new IncomingMessageDto(conversationId, MessageKind.CONVERSATION, "hello world");
    User sender = new User().setId(1).setEmail(userEmail).setName("John").setPassword("secret");
    Message savedMessage = new Message().setConversationId(conversationId).setSender(sender).setContent(incoming.content());
    MessageDto response = new MessageDto(null, conversationId, userEmail, "John", incoming.content(), null);

    when(userRepository.findByEmail(userEmail)).thenReturn(Optional.of(sender));
    when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
    when(messageMapper.toDto(savedMessage)).thenReturn(response);

    assertEquals(response, chatService.sendMessage(userEmail, incoming));

    verify(messageRepository).save(any(Message.class));
    verifyNoInteractions(chatRoomService, chatRoomRepository);
  }

  @Test
  void sendMessageRejectsRoomForNonMemberWithForbidden() {
    String userEmail = "john@example.com";
    UUID roomId = UUID.randomUUID();
    IncomingMessageDto incoming = new IncomingMessageDto(roomId.toString(), MessageKind.ROOM, "hello world");
    User sender = new User().setId(1).setEmail(userEmail).setName("John").setPassword("secret");

    when(userRepository.findByEmail(userEmail)).thenReturn(Optional.of(sender));
    when(chatRoomService.hasAccess(userEmail, roomId)).thenReturn(false);

    ApiException exception = assertThrows(
        ApiException.class, () -> chatService.sendMessage(userEmail, incoming));

    assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
    verifyNoInteractions(messageRepository, chatRoomRepository);
  }

  @Test
  void sendMessageRejectsMalformedRoomIdWithBadRequest() {
    String userEmail = "john@example.com";
    IncomingMessageDto incoming = new IncomingMessageDto("not-a-uuid", MessageKind.ROOM, "hello world");
    User sender = new User().setId(1).setEmail(userEmail).setName("John").setPassword("secret");

    when(userRepository.findByEmail(userEmail)).thenReturn(Optional.of(sender));

    ApiException exception = assertThrows(
        ApiException.class, () -> chatService.sendMessage(userEmail, incoming));

    assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    verifyNoInteractions(chatRoomService, messageRepository, chatRoomRepository);
  }

  @Test
  void getConversationHistoryReturnsOrderedMessageDtos() {
    String conversationId = "demo";
    User sender = new User().setId(1).setEmail("john@example.com");
    Message first =
        new Message()
            .setId(UUID.randomUUID())
            .setConversationId(conversationId)
            .setSender(sender)
            .setContent("first")
            .setSentAt(Instant.parse("2025-01-01T10:00:00Z"));
    Message second =
        new Message()
            .setId(UUID.randomUUID())
            .setConversationId(conversationId)
            .setSender(sender)
            .setContent("second")
            .setSentAt(Instant.parse("2025-01-01T11:00:00Z"));
    MessageDto firstDto =
        new MessageDto(
          first.getId(), conversationId, sender.getEmail(), sender.getName(), "first", first.getSentAt());
    MessageDto secondDto =
        new MessageDto(
          second.getId(), conversationId, sender.getEmail(), sender.getName(), "second", second.getSentAt());

    when(messageRepository.findByConversationIdAndRoomIsNullOrderBySentAtDescIdDesc(
        conversationId, PageRequest.of(0, 30)))
        .thenReturn(new PageImpl<>(List.of(second, first), PageRequest.of(0, 30), 2));
    when(messageMapper.toDto(first)).thenReturn(firstDto);
    when(messageMapper.toDto(second)).thenReturn(secondDto);

    var result = chatService.getConversationHistory(conversationId, false, 0, 30);

    assertEquals(List.of(firstDto, secondDto), result.content());
  }
}

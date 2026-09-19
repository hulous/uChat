package com.uchat.api.services;

import com.uchat.api.dtos.IncomingMessageDto;
import com.uchat.api.dtos.MessageDto;
import com.uchat.api.entities.Message;
import com.uchat.api.entities.ChatRoom;
import com.uchat.api.entities.User;
import com.uchat.api.mappers.MessageMapper;
import com.uchat.api.repositories.MessageRepository;
import com.uchat.api.repositories.ChatRoomRepository;
import com.uchat.api.repositories.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
public class ChatService {
  private final MessageRepository messageRepository;
  private final UserRepository userRepository;
  private final MessageMapper messageMapper;
  private final SimpMessagingTemplate messagingTemplate;
  private final ChatRoomRepository chatRoomRepository;
  private final ChatRoomService chatRoomService;

  public ChatService(
      MessageRepository messageRepository,
      UserRepository userRepository,
      MessageMapper messageMapper,
      SimpMessagingTemplate messagingTemplate,
      ChatRoomRepository chatRoomRepository,
      ChatRoomService chatRoomService
  ) {
    this.messageRepository = messageRepository;
    this.userRepository = userRepository;
    this.messageMapper = messageMapper;
    this.messagingTemplate = messagingTemplate;
    this.chatRoomRepository = chatRoomRepository;
    this.chatRoomService = chatRoomService;
  }

  public MessageDto sendMessage(String userEmail, IncomingMessageDto incoming) {
    User sender = userRepository
      .findByEmail(userEmail)
      .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));

    Message message = new Message()
      .setConversationId(incoming.conversationId())
      .setSender(sender)
      .setContent(incoming.content())
      .setSentAt(java.time.Instant.now());

    try {
      UUID roomId = UUID.fromString(incoming.conversationId());

      if (!chatRoomService.hasAccess(userEmail, roomId)) {
        throw new IllegalStateException("User is not a member of this chat room");
      }

      ChatRoom room = chatRoomRepository.findById(roomId).orElseThrow();
      message.setRoom(room);
    } catch (IllegalArgumentException ignored) {
      // Keep legacy free-form conversation identifiers working during migration.
    }

    Message saved = messageRepository.save(message);
    MessageDto response = messageMapper.toDto(saved);

    messagingTemplate.convertAndSend("/topic/conversations/" + incoming.conversationId(), response);

    if (message.getRoom() != null) {
      messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoom().getId(), response);
    }

    return response;
  }

  @Transactional(readOnly = true)
  public List<MessageDto> getConversationHistory(String conversationId) {
    return messageRepository
      .findByConversationIdOrderBySentAtAsc(conversationId).stream()
      .map(messageMapper::toDto)
      .toList();
  }

  @Transactional(readOnly = true)
  public List<MessageDto> getConversationHistory(String conversationId, Pageable pageable) {
    return messageRepository
      .findByRoom_IdOrderBySentAtAsc(UUID.fromString(conversationId), pageable)
      .map(messageMapper::toDto).toList();
  }
}

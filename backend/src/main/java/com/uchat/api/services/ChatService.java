package com.uchat.api.services;

import com.uchat.api.dtos.IncomingMessageDto;
import com.uchat.api.dtos.MessageDto;
import com.uchat.api.dtos.MessageKind;
import com.uchat.api.entities.Message;
import com.uchat.api.entities.ChatRoom;
import com.uchat.api.entities.User;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.mappers.MessageMapper;
import com.uchat.api.repositories.MessageRepository;
import com.uchat.api.repositories.ChatRoomRepository;
import com.uchat.api.repositories.UserRepository;
import java.util.List;
import java.util.UUID;
import com.uchat.api.responses.PagedResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
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

    if (MessageKind.ROOM == incoming.kind()) {
      UUID roomId;
      try {
        roomId = UUID.fromString(incoming.conversationId());
      } catch (IllegalArgumentException exception) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid chat room identifier");
      }

      if (!chatRoomService.hasAccess(userEmail, roomId)) {
        throw new ApiException(HttpStatus.FORBIDDEN, "User is not a member of this chat room");
      }

      ChatRoom room = chatRoomRepository.findById(roomId).orElseThrow();
      message.setRoom(room);
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
  public PagedResponse<MessageDto> getConversationHistory(
      String conversationId, boolean room, int page, int size) {
    Pageable pageable = PageRequest.of(page, size);
    Page<Message> result = room
      ? messageRepository.findByRoom_IdOrderBySentAtAscIdAsc(UUID.fromString(conversationId), pageable)
      : messageRepository.findByConversationIdOrderBySentAtAscIdAsc(conversationId, pageable);
    return new PagedResponse<>(
      result.map(messageMapper::toDto).toList(),
      result.getNumber(),
      result.getSize(),
      result.getTotalPages(),
      result.getTotalElements(),
      result.isFirst(),
      result.isLast());
  }
}

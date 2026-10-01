package com.uchat.api.services;

import com.uchat.api.dtos.ChatRoomDto;
import com.uchat.api.dtos.CreateChatRoomDto;
import com.uchat.api.entities.ChatRoom;
import com.uchat.api.entities.User;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.mappers.ChatRoomMapper;
import com.uchat.api.repositories.ChatRoomRepository;
import com.uchat.api.repositories.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatRoomService {
  private final ChatRoomRepository roomRepository;
  private final UserRepository userRepository;
  private final ChatRoomMapper roomMapper;

  public ChatRoomService(ChatRoomRepository roomRepository, UserRepository userRepository, ChatRoomMapper roomMapper) {
    this.roomRepository = roomRepository;
    this.userRepository = userRepository;
    this.roomMapper = roomMapper;
  }

  @Transactional(readOnly = true)
  public List<ChatRoomDto> list(String email) {
    User user = user(email);

    return roomRepository
      .findByMembers_IdOrderByCreatedAtAsc(user.getId()).stream().map(roomMapper::toDto)
      .toList();
  }

  @Transactional
  public ChatRoomDto create(String email, CreateChatRoomDto input) {
    ChatRoom room = new ChatRoom().setName(input.name());
    room.getMembers().add(user(email));

    return roomMapper.toDto(roomRepository.save(room));
  }

  @Transactional
  public ChatRoomDto join(String email, UUID roomId) {
    ChatRoom room = room(roomId);
    room.getMembers().add(user(email));

    return roomMapper.toDto(roomRepository.save(room));
  }

  @Transactional
  public void leave(String email, UUID roomId) {
    ChatRoom room = room(roomId);
    room.getMembers().remove(user(email));
    roomRepository.save(room);
  }

  @Transactional(readOnly = true)
  public boolean hasAccess(String email, UUID roomId) {
    ChatRoom room = room(roomId);

    return room
      .getMembers()
      .stream()
      .anyMatch(member -> member.getEmail().equals(email));
  }

  private User user(String email) {
    return userRepository
      .findByEmail(email)
      .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
  }

  private ChatRoom room(UUID roomId) {
    return roomRepository
      .findById(roomId)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Chat room not found"));
  }
}

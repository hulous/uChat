package com.uchat.api.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uchat.api.dtos.ChatRoomDto;
import com.uchat.api.dtos.CreateChatRoomDto;
import com.uchat.api.entities.ChatRoom;
import com.uchat.api.entities.User;
import com.uchat.api.mappers.ChatRoomMapper;
import com.uchat.api.repositories.ChatRoomRepository;
import com.uchat.api.repositories.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChatRoomServiceTest {
  @Mock private ChatRoomRepository roomRepository;
  @Mock private UserRepository userRepository;
  @Mock private ChatRoomMapper roomMapper;
  @InjectMocks private ChatRoomService service;

  @Test
  void createPersistsRoomWithCreatorAsMember() {
    User user = new User().setId(1).setEmail("john@example.com");
    ChatRoom room = new ChatRoom().setId(UUID.randomUUID()).setName("Support");
    ChatRoomDto dto = new ChatRoomDto(room.getId(), room.getName(), null);
    when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    when(roomRepository.save(any(ChatRoom.class))).thenReturn(room);
    when(roomMapper.toDto(room)).thenReturn(dto);

    assertEquals(dto, service.create(user.getEmail(), new CreateChatRoomDto("Support")));
    ArgumentCaptor<ChatRoom> savedRoom = ArgumentCaptor.forClass(ChatRoom.class);
    verify(roomRepository).save(savedRoom.capture());
    assertTrue(savedRoom.getValue().getMembers().contains(user));
  }
}

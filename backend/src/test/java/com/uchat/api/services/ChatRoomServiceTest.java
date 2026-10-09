package com.uchat.api.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uchat.api.dtos.ChatRoomDto;
import com.uchat.api.dtos.BanRoomMemberDto;
import com.uchat.api.dtos.CreateChatRoomDto;
import com.uchat.api.entities.ChatRoom;
import com.uchat.api.entities.RoomBan;
import com.uchat.api.entities.User;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.mappers.ChatRoomMapper;
import com.uchat.api.repositories.ChatRoomRepository;
import com.uchat.api.repositories.RoomBanRepository;
import com.uchat.api.repositories.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class ChatRoomServiceTest {
  @Mock private ChatRoomRepository roomRepository;
  @Mock private RoomBanRepository banRepository;
  @Mock private UserRepository userRepository;
  @Mock private ChatRoomMapper roomMapper;
  @Mock private SimpMessagingTemplate messagingTemplate;
  @InjectMocks private ChatRoomService service;

  @Test
  void createPersistsRoomWithCreatorAsMember() {
    User user = new User().setId(1).setEmail("john@example.com");
    ChatRoom room = new ChatRoom().setId(UUID.randomUUID()).setName("Support").setOwner(user);
    ChatRoomDto dto = new ChatRoomDto(room.getId(), room.getName(), null, user.getEmail());
    when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    when(roomRepository.save(any(ChatRoom.class))).thenReturn(room);
    when(roomMapper.toDto(room)).thenReturn(dto);

    assertEquals(dto, service.create(user.getEmail(), new CreateChatRoomDto("Support")));
    ArgumentCaptor<ChatRoom> savedRoom = ArgumentCaptor.forClass(ChatRoom.class);
    verify(roomRepository).save(savedRoom.capture());
    assertTrue(savedRoom.getValue().getMembers().contains(user));
    assertEquals(user, savedRoom.getValue().getOwner());
  }

  @Test
  void joinThrowsNotFoundWhenRoomDoesNotExist() {
    UUID roomId = UUID.randomUUID();
    when(roomRepository.findById(roomId)).thenReturn(Optional.empty());

    ApiException exception = assertThrows(ApiException.class, () -> service.join("john@example.com", roomId));

    assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
    assertEquals("Chat room not found", exception.getMessage());
  }

  @Test
  void banRemovesMemberAndPersistsExpiry() {
    UUID roomId = UUID.randomUUID();
    User owner = new User().setId(1).setEmail("owner@example.com");
    User member = new User().setId(2).setEmail("member@example.com");
    ChatRoom room = new ChatRoom().setId(roomId).setOwner(owner);
    room.getMembers().add(owner);
    room.getMembers().add(member);
    when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
    when(banRepository.findByRoom_IdAndUser_Id(roomId, member.getId())).thenReturn(Optional.empty());

    service.banMember(owner.getEmail(), roomId, new BanRoomMemberDto(member.getId(), 24));

    ArgumentCaptor<RoomBan> ban = ArgumentCaptor.forClass(RoomBan.class);
    verify(banRepository).save(ban.capture());
    assertEquals(room, ban.getValue().getRoom());
    assertEquals(member, ban.getValue().getUser());
    assertEquals(owner, ban.getValue().getBannedBy());
    assertTrue(ban.getValue().getBannedUntil().isAfter(java.time.Instant.now()));
    assertTrue(!room.getMembers().contains(member));
    verify(roomRepository).save(room);
    verify(messagingTemplate).convertAndSendToUser(
      member.getEmail(),
      "/queue/room-bans",
      roomId.toString()
    );
  }

  @Test
  void joinRejectsAnActiveBan() {
    UUID roomId = UUID.randomUUID();
    User member = new User().setId(2).setEmail("member@example.com");
    when(roomRepository.findById(roomId)).thenReturn(Optional.of(new ChatRoom()));
    when(userRepository.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
    when(banRepository.existsByRoom_IdAndUser_IdAndBannedUntilAfter(
        org.mockito.ArgumentMatchers.eq(roomId),
        org.mockito.ArgumentMatchers.eq(member.getId()),
        any(java.time.Instant.class))).thenReturn(true);

    ApiException exception = assertThrows(
      ApiException.class,
      () -> service.join(member.getEmail(), roomId)
    );

    assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
  }
}

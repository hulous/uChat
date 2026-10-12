package com.uchat.api.mappers;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.uchat.api.dtos.ChatRoomDto;
import com.uchat.api.entities.ChatRoom;
import com.uchat.api.entities.User;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ChatRoomMapperTest {
  private final ChatRoomMapper mapper = new ChatRoomMapperImpl();

  @Test
  void mapsRoomVisibilityToDto() {
    User owner = new User().setEmail("owner@example.com");
    ChatRoomDto publicRoom = mapper.toDto(
      new ChatRoom().setId(UUID.randomUUID()).setName("Public").setOwner(owner).setPublic(true)
    );
    ChatRoomDto privateRoom = mapper.toDto(
      new ChatRoom().setId(UUID.randomUUID()).setName("Private").setOwner(owner).setPublic(false)
    );

    assertTrue(publicRoom.isPublic());
    assertFalse(privateRoom.isPublic());
  }
}

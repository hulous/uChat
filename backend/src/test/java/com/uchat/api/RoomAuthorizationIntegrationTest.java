package com.uchat.api;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uchat.api.dtos.BanRoomMemberDto;
import com.uchat.api.entities.ChatRoom;
import com.uchat.api.entities.Message;
import com.uchat.api.entities.User;
import com.uchat.api.repositories.ChatRoomRepository;
import com.uchat.api.repositories.MessageRepository;
import com.uchat.api.repositories.RoomBanRepository;
import com.uchat.api.repositories.UserRepository;
import com.uchat.api.services.JwtService;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.MOCK,
    properties = {
      "spring.datasource.url=jdbc:h2:mem:room_authorization_test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"
    })
@AutoConfigureMockMvc
class RoomAuthorizationIntegrationTest {
  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper();
  @Autowired private JwtService jwtService;
  @Autowired private UserRepository userRepository;
  @Autowired private ChatRoomRepository roomRepository;
  @Autowired private RoomBanRepository banRepository;
  @Autowired private MessageRepository messageRepository;

  private User owner;
  private User member;
  private User outsider;
  private ChatRoom room;
  private Message protectedMessage;

  @BeforeEach
  void setUp() {
    owner = saveUser("owner@example.com", "Owner");
    member = saveUser("member@example.com", "Member");
    outsider = saveUser("outsider@example.com", "Outsider");
    room = roomRepository.save(new ChatRoom()
        .setName("Private room")
        .setOwner(owner)
        .setMembers(new java.util.HashSet<>(Set.of(owner, member))));
    protectedMessage = messageRepository.save(new Message()
        .setConversationId(room.getId().toString())
        .setRoom(room)
        .setSender(owner)
        .setContent("private message")
        .setSentAt(Instant.now()));
  }

  @AfterEach
  void tearDown() {
    messageRepository.deleteAll();
    banRepository.deleteAll();
    roomRepository.deleteAll();
    userRepository.deleteAll();
  }

  @Test
  void roomHistoryMatrixDoesNotDisclosePrivateMessages() throws Exception {
    mockMvc.perform(get("/api/conversations/rooms/{roomId}/messages", room.getId()))
        .andExpect(status().isUnauthorized());

    mockMvc.perform(get("/api/conversations/rooms/{roomId}/messages", room.getId())
            .header("Authorization", bearer(outsider)))
        .andExpect(status().isForbidden())
        .andExpect(result -> assertFalse(result.getResponse().getContentAsString()
            .contains(protectedMessage.getContent())));

    mockMvc.perform(get("/api/conversations/rooms/{roomId}/messages", room.getId())
            .header("Authorization", bearer(member)))
        .andExpect(status().isOk())
        .andExpect(result -> assertTrue(result.getResponse().getContentAsString()
            .contains(protectedMessage.getContent())));
  }

  @Test
  void publicRoomIsVisibleButMembershipIsStillRequiredForHistory() throws Exception {
    room.setPublic(true);
    roomRepository.save(room);

    mockMvc.perform(get("/api/rooms/public")
            .header("Authorization", bearer(outsider)))
        .andExpect(status().isOk())
        .andExpect(result -> assertTrue(result.getResponse().getContentAsString()
            .contains(room.getId().toString())));

    mockMvc.perform(get("/api/conversations/rooms/{roomId}/messages", room.getId())
            .header("Authorization", bearer(outsider)))
        .andExpect(status().isForbidden());
  }

  @Test
  void memberCannotManageRoomAndOwnerCanBanThenAccessIsRevoked() throws Exception {
    mockMvc.perform(post("/api/rooms/{roomId}/bans", room.getId())
            .header("Authorization", bearer(member))
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new BanRoomMemberDto(outsider.getId(), 2))))
        .andExpect(status().isForbidden());

    room.getMembers().add(outsider);
    roomRepository.save(room);
    mockMvc.perform(post("/api/rooms/{roomId}/bans", room.getId())
            .header("Authorization", bearer(owner))
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new BanRoomMemberDto(outsider.getId(), 2))))
        .andExpect(status().isNoContent());

    mockMvc.perform(post("/api/rooms/{roomId}/join", room.getId())
            .header("Authorization", bearer(outsider)))
        .andExpect(status().isForbidden());
    mockMvc.perform(get("/api/conversations/rooms/{roomId}/messages", room.getId())
            .header("Authorization", bearer(outsider)))
        .andExpect(status().isForbidden());
  }

  @Test
  void leavingRemovesHistoryAccessAndClosingRemovesTheRoom() throws Exception {
    mockMvc.perform(delete("/api/rooms/{roomId}/membership", room.getId())
            .header("Authorization", bearer(member)))
        .andExpect(status().isNoContent());
    mockMvc.perform(get("/api/conversations/rooms/{roomId}/messages", room.getId())
            .header("Authorization", bearer(member)))
        .andExpect(status().isForbidden());

    mockMvc.perform(delete("/api/rooms/{roomId}", room.getId())
            .header("Authorization", bearer(owner)))
        .andExpect(status().isNoContent());
    mockMvc.perform(get("/api/conversations/rooms/{roomId}/messages", room.getId())
            .header("Authorization", bearer(owner)))
        .andExpect(status().isNotFound())
        .andExpect(result -> assertFalse(result.getResponse().getContentAsString()
            .contains(protectedMessage.getContent())));
  }

  private User saveUser(String email, String name) {
    return userRepository.save(new User().setEmail(email).setName(name).setPassword("password"));
  }

  private String bearer(User user) {
    return "Bearer " + jwtService.generateToken(user);
  }
}

package com.uchat.api.services;

import com.uchat.api.dtos.ChatRoomDto;
import com.uchat.api.dtos.BanRoomMemberDto;
import com.uchat.api.dtos.CreateChatRoomDto;
import com.uchat.api.dtos.RoomMemberDto;
import com.uchat.api.entities.ChatRoom;
import com.uchat.api.entities.RoomBan;
import com.uchat.api.entities.User;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.mappers.ChatRoomMapper;
import com.uchat.api.repositories.ChatRoomRepository;
import com.uchat.api.repositories.RoomBanRepository;
import com.uchat.api.repositories.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Comparator;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatRoomService {
  private final ChatRoomRepository roomRepository;
  private final RoomBanRepository banRepository;
  private final UserRepository userRepository;
  private final ChatRoomMapper roomMapper;
  private final SimpMessagingTemplate messagingTemplate;

  public ChatRoomService(
      ChatRoomRepository roomRepository,
      RoomBanRepository banRepository,
      UserRepository userRepository,
      ChatRoomMapper roomMapper,
      @Lazy SimpMessagingTemplate messagingTemplate
  ) {
    this.roomRepository = roomRepository;
    this.banRepository = banRepository;
    this.userRepository = userRepository;
    this.roomMapper = roomMapper;
    this.messagingTemplate = messagingTemplate;
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
    User owner = user(email);
    ChatRoom room = new ChatRoom().setName(input.name()).setOwner(owner);
    room.getMembers().add(owner);

    return roomMapper.toDto(roomRepository.save(room));
  }

  @Transactional
  public ChatRoomDto join(String email, UUID roomId) {
    ChatRoom room = room(roomId);
    User joiningUser = user(email);
    if (isBanned(roomId, joiningUser.getId())) {
      throw new ApiException(HttpStatus.FORBIDDEN, "You are temporarily banned from this chat room");
    }
    room.getMembers().add(joiningUser);

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
      .anyMatch(member -> member.getEmail().equals(email))
      && !isBanned(roomId, user(email).getId());
  }

  @Transactional(readOnly = true)
  public List<RoomMemberDto> listMembers(String email, UUID roomId) {
    ChatRoom room = room(roomId);
    requireOwner(room, email);

    return room.getMembers().stream()
      .filter(member -> !member.getId().equals(room.getOwner().getId()))
      .sorted(Comparator.comparing(User::getName, String.CASE_INSENSITIVE_ORDER))
      .map(member -> new RoomMemberDto(member.getId(), member.getName()))
      .toList();
  }

  @Transactional
  public void banMember(String email, UUID roomId, BanRoomMemberDto input) {
    ChatRoom room = room(roomId);
    User owner = requireOwner(room, email);
    User target = room.getMembers().stream()
      .filter(member -> member.getId().equals(input.userId()))
      .findFirst()
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Room member not found"));

    if (target.getId().equals(owner.getId())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "The room owner cannot be banned");
    }

    Instant bannedUntil = Instant.now().plusSeconds(input.durationHours() * 3600L);
    RoomBan ban = banRepository.findByRoom_IdAndUser_Id(roomId, target.getId())
      .orElseGet(RoomBan::new);
    ban.setRoom(room)
      .setUser(target)
      .setBannedBy(owner)
      .setBannedUntil(bannedUntil);
    banRepository.save(ban);
    room.getMembers().remove(target);
    roomRepository.save(room);
    messagingTemplate.convertAndSendToUser(
      target.getEmail(),
      "/queue/room-bans",
      roomId.toString()
    );
  }

  private boolean isBanned(UUID roomId, Integer userId) {
    return banRepository.existsByRoom_IdAndUser_IdAndBannedUntilAfter(roomId, userId, Instant.now());
  }

  private User requireOwner(ChatRoom room, String email) {
    if (!room.getOwner().getEmail().equals(email)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Only the room owner can manage members");
    }
    return room.getOwner();
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

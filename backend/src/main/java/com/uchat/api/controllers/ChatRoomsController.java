package com.uchat.api.controllers;

import com.uchat.api.dtos.ChatRoomDto;
import com.uchat.api.dtos.BanRoomMemberDto;
import com.uchat.api.dtos.CreateChatRoomDto;
import com.uchat.api.dtos.InviteRoomMemberDto;
import com.uchat.api.dtos.RoomMemberDto;
import com.uchat.api.services.ChatRoomService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
public class ChatRoomsController {
  private final ChatRoomService service;

  public ChatRoomsController(ChatRoomService service) {
    this.service = service;
  }

  @GetMapping
  public List<ChatRoomDto> list(Principal principal) { return service.list(principal.getName()); }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ChatRoomDto create(Principal principal, @Valid @RequestBody CreateChatRoomDto input) { return service.create(principal.getName(), input); }

  @PostMapping("/{roomId}/join")
  public ChatRoomDto join(Principal principal, @PathVariable UUID roomId) { return service.join(principal.getName(), roomId); }

  @DeleteMapping("/{roomId}/membership")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void leave(Principal principal, @PathVariable UUID roomId) { service.leave(principal.getName(), roomId); }

  @GetMapping("/{roomId}/members")
  public List<RoomMemberDto> members(Principal principal, @PathVariable UUID roomId) {
    return service.listMembers(principal.getName(), roomId);
  }

  @PostMapping("/{roomId}/members")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void invite(
      Principal principal,
      @PathVariable UUID roomId,
      @Valid @RequestBody InviteRoomMemberDto input
  ) {
    service.inviteMember(principal.getName(), roomId, input);
  }

  @PostMapping("/{roomId}/bans")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void ban(Principal principal, @PathVariable UUID roomId, @Valid @RequestBody BanRoomMemberDto input) {
    service.banMember(principal.getName(), roomId, input);
  }
}

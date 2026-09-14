package com.uchat.api.controllers;

import com.uchat.api.dtos.IncomingMessageDto;
import com.uchat.api.services.ChatService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
public class ChatsController {

  private final ChatService chatService;

  public ChatsController(ChatService chatService) {
    this.chatService = chatService;
  }

  @MessageMapping("/chat.send")
  public void send(@Payload @Valid IncomingMessageDto incoming, Principal principal) {
    if (principal == null || principal.getName() == null) {
      return;
    }

    chatService.sendMessage(principal.getName(), incoming);
  }
}

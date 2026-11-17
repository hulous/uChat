package com.uchat.api.controllers;

import com.uchat.api.dtos.IncomingMessageDto;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.services.ChatService;
import com.uchat.api.services.RateLimiter;
import jakarta.validation.Valid;
import java.security.Principal;
import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
public class ChatsController {

  private final ChatService chatService;

  static final int SEND_LIMIT = 30;
  static final Duration SEND_PERIOD = Duration.ofMinutes(1);

  private final RateLimiter rateLimiter;

  public ChatsController(ChatService chatService, RateLimiter rateLimiter) {
    this.chatService = chatService;
    this.rateLimiter = rateLimiter;
  }

  @MessageMapping("/chat.send")
  public void send(@Payload @Valid IncomingMessageDto incoming, Principal principal) {
    if (principal == null || principal.getName() == null) {
      return;
    }

    if (!rateLimiter.tryAcquire("chat.send", principal.getName(), SEND_LIMIT, SEND_PERIOD)) {
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many messages, slow down");
    }

    chatService.sendMessage(principal.getName(), incoming);
  }
}

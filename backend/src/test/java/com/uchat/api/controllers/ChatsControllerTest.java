package com.uchat.api.controllers;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uchat.api.dtos.IncomingMessageDto;
import com.uchat.api.dtos.MessageKind;
import com.uchat.api.dtos.MessageDto;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.services.ChatService;
import com.uchat.api.services.RateLimiter;
import java.security.Principal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChatsControllerTest {

  @Mock private ChatService chatService;

  @Mock private RateLimiter rateLimiter;

  @InjectMocks private ChatsController controller;

  @Test
  void sendPublishesSavedMessageWhenPrincipalIsAuthenticated() {
    Principal principal = () -> "john@example.com";
    IncomingMessageDto incoming = new IncomingMessageDto("demo", MessageKind.CONVERSATION, "hello world");
    MessageDto response =
        new MessageDto(
          null,
          incoming.conversationId(),
          "john@example.com",
          "John",
          incoming.content(),
          Instant.now());

    when(rateLimiter.tryAcquire(anyString(), anyString(), anyInt(), any())).thenReturn(true);
    when(chatService.sendMessage(principal.getName(), incoming)).thenReturn(response);

    controller.send(incoming, principal);

    verify(chatService).sendMessage(principal.getName(), incoming);
  }

  @Test
  void sendDoesNothingWhenPrincipalIsNull() {
    IncomingMessageDto incoming = new IncomingMessageDto("demo", MessageKind.CONVERSATION, "hello world");

    controller.send(incoming, null);

    verify(chatService, never()).sendMessage(anyString(), any(IncomingMessageDto.class));
  }

  @Test
  void sendDelegatesToServiceAndPropagatesException() {
    when(rateLimiter.tryAcquire(anyString(), anyString(), anyInt(), any())).thenReturn(true);
    Principal principal = () -> "missing@example.com";
    IncomingMessageDto incoming = new IncomingMessageDto("demo", MessageKind.CONVERSATION, "hello world");

    when(chatService.sendMessage(principal.getName(), incoming))
        .thenThrow(new IllegalStateException("Authenticated user not found"));

    assertThrows(IllegalStateException.class, () -> controller.send(incoming, principal));
    verify(chatService).sendMessage(principal.getName(), incoming);
  }

  @Test
  void sendIsRejectedWhenRateLimitExceeded() {
    Principal principal = () -> "john@example.com";
    IncomingMessageDto incoming = new IncomingMessageDto("demo", MessageKind.CONVERSATION, "hi");
    when(rateLimiter.tryAcquire(anyString(), anyString(), anyInt(), any())).thenReturn(false);

    ApiException ex = assertThrows(ApiException.class, () -> controller.send(incoming, principal));

    org.junit.jupiter.api.Assertions.assertEquals(
        org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
    verify(chatService, never()).sendMessage(anyString(), any());
  }
}

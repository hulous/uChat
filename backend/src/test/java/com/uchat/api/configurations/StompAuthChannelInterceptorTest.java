package com.uchat.api.configurations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uchat.api.services.JwtService;
import com.uchat.api.services.ChatRoomService;
import java.util.UUID;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

@ExtendWith(MockitoExtension.class)
class StompAuthChannelInterceptorTest {

  @Mock private JwtService jwtService;

  @Mock private UserDetailsService userDetailsService;

  @Mock private ChatRoomService chatRoomService;

  @InjectMocks private StompAuthChannelInterceptor interceptor;

  @Mock private MessageChannel messageChannel;

  @Test
  void preSendRejectsConnectWhenAuthorizationHeaderIsMissing() {
    StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
    Message<byte[]> message =
        MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

    AuthenticationCredentialsNotFoundException exception =
        assertThrows(
            AuthenticationCredentialsNotFoundException.class,
            () -> interceptor.preSend(message, messageChannel));

    assertEquals("Missing token", exception.getMessage());
    verify(jwtService, never()).extractUsername(null);
    verify(userDetailsService, never()).loadUserByUsername("any");
  }

  @Test
  void preSendRejectsConnectWhenTokenIsInvalidOrExpired() {
    String token = "jwt-token";
    StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
    accessor.setNativeHeader("Authorization", "Bearer " + token);
    Message<byte[]> message =
        MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

    when(jwtService.extractUsername(token)).thenReturn("");

    AuthenticationCredentialsNotFoundException exception =
        assertThrows(
            AuthenticationCredentialsNotFoundException.class,
            () -> interceptor.preSend(message, messageChannel));

    assertEquals("Invalid or expired token", exception.getMessage());
    verify(jwtService).extractUsername(token);
    verify(userDetailsService, never()).loadUserByUsername("any");
  }

  @Test
  void preSendAcceptsConnectWhenAuthorizationHeaderIsLowercase() {
    String token = "jwt-token";
    String email = "john@example.com";
    StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
    accessor.setNativeHeader("authorization", "Bearer " + token);
    Message<byte[]> message =
        MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

    UserDetails userDetails =
        User.withUsername(email).password("pwd").authorities(List.of()).build();
    when(jwtService.extractUsername(token)).thenReturn(email);
    when(userDetailsService.loadUserByUsername(email)).thenReturn(userDetails);
    when(jwtService.isTokenValid(token, userDetails)).thenReturn(true);

    Message<?> result = interceptor.preSend(message, messageChannel);

    assertNotNull(result);
    verify(jwtService).extractUsername(token);
    verify(userDetailsService).loadUserByUsername(email);
    verify(jwtService).isTokenValid(token, userDetails);
  }

  @Test
  void preSendRejectsConnectWhenTokenValidationFails() {
    String token = "jwt-token";
    String email = "john@example.com";
    StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
    accessor.setNativeHeader("Authorization", "Bearer " + token);
    Message<byte[]> message =
        MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

    UserDetails userDetails =
        User.withUsername(email).password("pwd").authorities(List.of()).build();
    when(jwtService.extractUsername(token)).thenReturn(email);
    when(userDetailsService.loadUserByUsername(email)).thenReturn(userDetails);
    when(jwtService.isTokenValid(token, userDetails)).thenReturn(false);

    AuthenticationCredentialsNotFoundException exception =
        assertThrows(
            AuthenticationCredentialsNotFoundException.class,
            () -> interceptor.preSend(message, messageChannel));

    assertEquals("Invalid or expired token", exception.getMessage());
    verify(jwtService).extractUsername(token);
    verify(userDetailsService).loadUserByUsername(email);
  }

  @Test
  void preSendAcceptsConnectWhenTokenIsValid() {
    String token = "jwt-token";
    String email = "john@example.com";
    StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
    accessor.setNativeHeader("Authorization", "Bearer " + token);
    Message<byte[]> message =
        MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

    UserDetails userDetails =
        User.withUsername(email).password("pwd").authorities(List.of()).build();
    when(jwtService.extractUsername(token)).thenReturn(email);
    when(userDetailsService.loadUserByUsername(email)).thenReturn(userDetails);
    when(jwtService.isTokenValid(token, userDetails)).thenReturn(true);

    Message<?> result = interceptor.preSend(message, messageChannel);

    assertNotNull(result);
    verify(jwtService).extractUsername(token);
    verify(userDetailsService).loadUserByUsername(email);
    verify(jwtService).isTokenValid(token, userDetails);
  }

  @Test
  void preSendRejectsRoomSubscriptionsForNonMembers() {
    UUID roomId = UUID.randomUUID();
    StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
    accessor.setDestination("/topic/rooms/" + roomId);
    accessor.setUser(
      new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
        "member@example.com", null, List.of()
      )
    );
    Message<byte[]> message =
      MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    when(chatRoomService.hasAccess("member@example.com", roomId)).thenReturn(false);

    assertThrows(
      AccessDeniedException.class,
      () -> interceptor.preSend(message, messageChannel)
    );
  }
}

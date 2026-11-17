package com.uchat.api.dtos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

class InputLimitsTest {
  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  private long violations(Object dto, String property) {
    return validator.validate(dto).stream()
        .filter(v -> v.getPropertyPath().toString().equals(property))
        .count();
  }

  private RegisterUserDto register(String password, String name) {
    return new RegisterUserDto().setEmail("a@example.com").setPassword(password).setName(name);
  }

  @Test
  void registerPasswordLength() {
    assertEquals(1, violations(register("1234567", "A"), "password"));
    assertEquals(0, violations(register("12345678", "A"), "password"));
    assertEquals(1, violations(register("x".repeat(73), "A"), "password"));
  }

  @Test
  void registerNameLength() {
    assertEquals(0, violations(register("12345678", "x".repeat(100)), "name"));
    assertEquals(1, violations(register("12345678", "x".repeat(101)), "name"));
  }

  @Test
  void updateNameAndPasswordMaxLength() {
    UpdateUserDto ok = new UpdateUserDto().setEmail("a@example.com").setName("x".repeat(100));
    assertEquals(0, violations(ok, "name"));
    assertEquals(1, violations(ok.setName("x".repeat(101)), "name"));
    assertEquals(1, violations(ok.setPassword("x".repeat(73)), "password"));
  }

  @Test
  void messageContentMaxLength() {
    var ok = new IncomingMessageDto("demo", MessageKind.CONVERSATION, "x".repeat(2000));
    var tooLong = new IncomingMessageDto("demo", MessageKind.CONVERSATION, "x".repeat(2001));
    assertEquals(0, violations(ok, "content"));
    assertEquals(1, violations(tooLong, "content"));
  }

  @Test
  void conversationIdFormat() {
    String uuid = "550e8400-e29b-41d4-a716-446655440000";
    assertEquals(0, violations(new IncomingMessageDto(uuid, MessageKind.ROOM, "hi"), "conversationId"));
    assertEquals(0, violations(new IncomingMessageDto("conversation-1", MessageKind.ROOM, "hi"), "conversationId"));
    for (String bad : new String[] {"a/b", "../x", "a b", "x".repeat(65), ""}) {
      assertTrue(violations(new IncomingMessageDto(bad, MessageKind.ROOM, "hi"), "conversationId") > 0, bad);
    }
    assertTrue(violations(new IncomingMessageDto(null, MessageKind.ROOM, "hi"), "conversationId") > 0);
  }
}

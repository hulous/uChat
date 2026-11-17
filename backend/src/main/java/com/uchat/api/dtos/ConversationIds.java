package com.uchat.api.dtos;

public final class ConversationIds {
  public static final String PATTERN = "^[A-Za-z0-9_-]{1,64}$";

  private ConversationIds() {}

  public static boolean isValid(String id) {
    return id != null && id.matches(PATTERN);
  }
}

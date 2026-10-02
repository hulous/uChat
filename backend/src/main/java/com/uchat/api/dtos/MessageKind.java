package com.uchat.api.dtos;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MessageKind {
  CONVERSATION("conversation"),
  ROOM("room");

  private final String value;

  MessageKind(String value) {
    this.value = value;
  }

  @JsonCreator
  public static MessageKind fromValue(String value) {
    for (MessageKind kind : values()) {
      if (kind.value.equals(value)) {
        return kind;
      }
    }
    throw new IllegalArgumentException("Unknown message kind: " + value);
  }

  @JsonValue
  public String getValue() {
    return value;
  }
}

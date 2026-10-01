package com.uchat.api.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record IncomingMessageDto(
    String conversationId,
    @NotNull(message = "Message kind is required")
    MessageKind kind,
    @NotBlank(message = "Message content is required")
    String content
) {}

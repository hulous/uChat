package com.uchat.api.dtos;

import jakarta.validation.constraints.NotBlank;

public record IncomingMessageDto(
    String conversationId,
    String kind,
    @NotBlank(message = "Message content is required")
    String content
) {}

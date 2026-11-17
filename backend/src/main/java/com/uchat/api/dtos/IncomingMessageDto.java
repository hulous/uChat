package com.uchat.api.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record IncomingMessageDto(
    @NotBlank(message = "Conversation id is required")
    @Pattern(regexp = ConversationIds.PATTERN, message = "Invalid conversation id format")
    String conversationId,
    @NotNull(message = "Message kind is required")
    MessageKind kind,
    @NotBlank(message = "Message content is required")
    @Size(max = 2000, message = "Message content must be at most 2000 characters")
    String content
) {}

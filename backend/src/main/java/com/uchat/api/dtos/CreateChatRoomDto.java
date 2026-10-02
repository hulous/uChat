package com.uchat.api.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateChatRoomDto(
    @NotBlank @Size(max = 120) String name
) {}

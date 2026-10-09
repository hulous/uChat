package com.uchat.api.dtos;

import jakarta.validation.constraints.NotNull;

public record UpdateRoomVisibilityDto(@NotNull Boolean isPublic) {}

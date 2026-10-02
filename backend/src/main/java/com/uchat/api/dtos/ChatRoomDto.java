package com.uchat.api.dtos;

import java.time.Instant;
import java.util.UUID;

public record ChatRoomDto(UUID id, String name, Instant createdAt) {}

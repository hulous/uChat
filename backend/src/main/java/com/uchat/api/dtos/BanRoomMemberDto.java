package com.uchat.api.dtos;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record BanRoomMemberDto(
  @NotNull Integer userId,
  @NotNull @Min(1) @Max(720) Integer durationHours
) {}

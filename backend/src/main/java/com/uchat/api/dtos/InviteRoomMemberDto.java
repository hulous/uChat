package com.uchat.api.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record InviteRoomMemberDto(@NotBlank @Email String email) {}

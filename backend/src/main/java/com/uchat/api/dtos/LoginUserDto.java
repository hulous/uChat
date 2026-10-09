package com.uchat.api.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.Accessors;

@Getter
@Setter
@NoArgsConstructor
@Accessors(chain = true)
@ToString(exclude = "password")
@Schema(description = "Credentials used to authenticate a user")
public class LoginUserDto {
  @Schema(
      description = "Registered user email address",
      example = "alice@example.com",
      format = "email",
      requiredMode = Schema.RequiredMode.REQUIRED)
  private String email;

  @Schema(
      description = "User password",
      example = "Str0ngP@ssword",
      format = "password",
      requiredMode = Schema.RequiredMode.REQUIRED)
  private String password;
}

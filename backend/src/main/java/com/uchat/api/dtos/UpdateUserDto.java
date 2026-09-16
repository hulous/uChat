package com.uchat.api.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
@Schema(description = "Payload used to update the authenticated user's account")
public class UpdateUserDto {
  @Schema(
    description = "User email address. Must be a valid email and include a top-level domain.",
    example = "alice@example.com",
    pattern = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
  )
  @NotBlank(message = "Email is required")
  @Email(message = "Invalid email format")
  @Pattern(regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$", message = "Invalid email format")
  private String email;

  @Schema(
    description = "Displayed full name",
    example = "Alice Martin"
  )
  @NotBlank(message = "Name is required")
  private String name;

  @Schema(
    description = "New password. Leave blank to keep the current password.",
    example = "Str0ngP@ssword",
    format = "password"
  )
  private String password;
}

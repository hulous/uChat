package com.uchat.api.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.Accessors;

@Getter
@Setter
@NoArgsConstructor
@Schema(description = "Payload used to register a new user")
@Accessors(chain = true)
@ToString(exclude = "password")
public class RegisterUserDto {
  @Schema(
      description = "User email address. Must be a valid email and include a top-level domain.",
      example = "alice@example.com",
      pattern = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
  @NotBlank(message = "Email is required")
  @Email(message = "Invalid email format")
  @Pattern(
      regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
      message = "Invalid email format")
  private String email;

  @Schema(description = "User password", example = "Str0ngP@ssword")
  @NotBlank(message = "Password is required")
  @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
  private String password;

  @Schema(description = "Displayed full name", example = "Alice Martin")
  @Size(max = 100, message = "Name must be at most 100 characters")
  private String name;
}

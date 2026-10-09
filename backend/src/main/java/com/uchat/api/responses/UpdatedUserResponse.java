package com.uchat.api.responses;

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
@ToString
@Schema(description = "Updated user details and refreshed authentication token")
public class UpdatedUserResponse extends UserResponse {
  @Schema(description = "Refreshed JWT bearer token", example = "jwt-token")
  private String token;

  @Schema(description = "Token lifetime in milliseconds", example = "3600000")
  private long expiresIn;
}

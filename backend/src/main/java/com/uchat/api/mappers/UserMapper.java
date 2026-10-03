package com.uchat.api.mappers;

import com.uchat.api.entities.User;
import com.uchat.api.responses.UpdatedUserResponse;
import com.uchat.api.responses.UserResponse;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

  public UserResponse toResponse(User user) {
    if (user == null) {
      return null;
    }

    return new UserResponse()
      .setId(user.getId())
      .setName(user.getName())
      .setEmail(user.getEmail())
      .setCreatedAt(user.getCreatedAt())
      .setUpdatedAt(user.getUpdatedAt());
  }

  public UpdatedUserResponse toUpdatedResponse(User user, String token, long expiresIn) {
    if (user == null) {
      return null;
    }

    UpdatedUserResponse response = new UpdatedUserResponse();
    response.setId(user.getId());
    response.setName(user.getName());
    response.setEmail(user.getEmail());
    response.setCreatedAt(user.getCreatedAt());
    response.setUpdatedAt(user.getUpdatedAt());
    response.setToken(token);
    response.setExpiresIn(expiresIn);

    return response;
  }
}

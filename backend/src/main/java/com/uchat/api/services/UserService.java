package com.uchat.api.services;

import com.uchat.api.entities.User;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.mappers.UserMapper;
import com.uchat.api.repositories.UserRepository;
import com.uchat.api.responses.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class UserService {
  private final UserRepository userRepository;
  private final UserMapper userMapper;

  public UserService(UserRepository userRepository, UserMapper userMapper) {
    this.userRepository = userRepository;
    this.userMapper = userMapper;
  }

  public UserResponse show(Integer id) {
    User user = userRepository.findById(id).orElse(null);
    if (user == null) {
      throw new ApiException(HttpStatus.NOT_FOUND, "User not found");
    }

    return userMapper.toResponse(user);
  }
}

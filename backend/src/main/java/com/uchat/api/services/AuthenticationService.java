package com.uchat.api.services;

import com.uchat.api.exceptions.ApiException;
import com.uchat.api.dtos.LoginUserDto;
import com.uchat.api.dtos.RegisterUserDto;
import com.uchat.api.dtos.UpdateUserDto;
import com.uchat.api.entities.User;
import com.uchat.api.mappers.UserMapper;
import com.uchat.api.repositories.UserRepository;
import com.uchat.api.responses.LoginResponse;
import com.uchat.api.responses.UpdatedUserResponse;
import com.uchat.api.responses.UserResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final UserMapper userMapper;
  private final CurrentUserService currentUserService;

  public AuthenticationService(
      UserRepository userRepository,
      AuthenticationManager authenticationManager,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      UserMapper userMapper,
      CurrentUserService currentUserService) {
    this.authenticationManager = authenticationManager;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.userMapper = userMapper;
    this.currentUserService = currentUserService;
  }

  public User registrate(RegisterUserDto input) {
    if (userRepository.existsByEmail(input.getEmail())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "A user with this email already exists");
    }

    User user = new User()
      .setName(input.getName())
      .setEmail(input.getEmail())
      .setPassword(passwordEncoder.encode(input.getPassword()));

    return userRepository.save(user);
  }

  public User authenticate(LoginUserDto input) {
    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(input.getEmail(), input.getPassword());
    authenticationManager.authenticate(authToken);

    return userRepository
      .findByEmail(input.getEmail())
      .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
  }

  public UserResponse registrateResponse(RegisterUserDto registerUserDto) {
    User registeredUser = registrate(registerUserDto);

    return userMapper.toResponse(registeredUser);
  }

  public LoginResponse authenticateResponse(LoginUserDto loginUserDto) {
    User authenticatedUser = authenticate(loginUserDto);
    String jwtToken = jwtService.generateToken(authenticatedUser);

    return new LoginResponse().setToken(jwtToken).setExpiresIn(jwtService.getExpirationTime());
  }

  public UserResponse authenticatedUser() {
    User currentUser = currentUserService.getCurrentUser();

    return userMapper.toResponse(currentUser);
  }

  @Transactional
  public UpdatedUserResponse updateAuthenticatedUser(UpdateUserDto input) {
    User currentUser = currentUserService.getCurrentUser();
    if (!currentUser.getEmail().equals(input.getEmail())
        && userRepository.existsByEmail(input.getEmail())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "A user with this email already exists");
    }

    currentUser.setName(input.getName()).setEmail(input.getEmail());
    if (input.getPassword() != null && !input.getPassword().isBlank()) {
      currentUser.setPassword(passwordEncoder.encode(input.getPassword()));
    }

    User updatedUser;
    try {
      updatedUser = userRepository.saveAndFlush(currentUser);
    } catch (DataIntegrityViolationException exception) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "A user with this email already exists");
    }

    return userMapper.toUpdatedResponse(
      updatedUser,
      jwtService.generateToken(updatedUser),
      jwtService.getExpirationTime()
    );
  }
}

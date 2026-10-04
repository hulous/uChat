package com.uchat.api.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uchat.api.dtos.LoginUserDto;
import com.uchat.api.dtos.RegisterUserDto;
import com.uchat.api.dtos.UpdateUserDto;
import com.uchat.api.entities.User;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.mappers.UserMapper;
import com.uchat.api.repositories.UserRepository;
import com.uchat.api.responses.LoginResponse;
import com.uchat.api.responses.UpdatedUserResponse;
import com.uchat.api.responses.UserResponse;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

  @Mock private UserRepository userRepository;

  @Mock private AuthenticationManager authenticationManager;

  @Mock private PasswordEncoder passwordEncoder;

  @Mock private JwtService jwtService;

  @Mock private UserMapper userMapper;

  @Mock private CurrentUserService currentUserService;

  @InjectMocks private AuthenticationService service;

  @Test
  void registrateThrowsWhenEmailAlreadyExists() {
    RegisterUserDto dto = new RegisterUserDto().setEmail("john@example.com");
    when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

    ApiException exception = assertThrows(ApiException.class, () -> service.registrate(dto));

    assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    assertEquals("A user with this email already exists", exception.getMessage());
  }

  @Test
  void registrateSavesEncodedPassword() {
    RegisterUserDto dto =
        new RegisterUserDto().setName("John").setEmail("john@example.com").setPassword("raw");
    when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
    when(passwordEncoder.encode("raw")).thenReturn("encoded");

    User saved =
        new User().setId(1).setEmail("john@example.com").setName("John").setPassword("encoded");
    when(userRepository.saveAndFlush(any(User.class))).thenReturn(saved);

    User result = service.registrate(dto);

    assertEquals(1, result.getId());
    assertEquals("encoded", result.getPassword());
  }

  @Test
  void registrateConvertsConcurrentDuplicateEmailToBadRequest() {
    RegisterUserDto dto =
        new RegisterUserDto().setName("John").setEmail("john@example.com").setPassword("raw");
    when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
    when(passwordEncoder.encode("raw")).thenReturn("encoded");
    when(userRepository.saveAndFlush(any(User.class)))
        .thenThrow(new DataIntegrityViolationException("duplicate email"));

    ApiException exception = assertThrows(ApiException.class, () -> service.registrate(dto));

    assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    assertEquals("A user with this email already exists", exception.getMessage());
  }

  @Test
  void authenticateReturnsUserWhenCredentialsAreValid() {
    LoginUserDto dto = new LoginUserDto().setEmail("john@example.com").setPassword("pwd");
    User user = new User().setEmail("john@example.com");

    when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));

    User result = service.authenticate(dto);

    verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    assertEquals("john@example.com", result.getEmail());
  }

  @Test
  void authenticatePassesTheSubmittedCredentialsToAuthenticationManager() {
    LoginUserDto dto = new LoginUserDto().setEmail("john@example.com").setPassword("pwd");
    when(userRepository.findByEmail(dto.getEmail()))
        .thenReturn(Optional.of(new User().setEmail(dto.getEmail())));

    service.authenticate(dto);

    verify(authenticationManager)
        .authenticate(new UsernamePasswordAuthenticationToken(dto.getEmail(), dto.getPassword()));
  }

  @Test
  void authenticateResponseGeneratesTokenForAuthenticatedUser() {
    LoginUserDto dto = new LoginUserDto().setEmail("john@example.com").setPassword("pwd");
    User user = new User().setEmail(dto.getEmail());
    when(userRepository.findByEmail(dto.getEmail())).thenReturn(Optional.of(user));
    when(jwtService.generateToken(user)).thenReturn("jwt-token");
    when(jwtService.getExpirationTime()).thenReturn(3600L);

    LoginResponse result = service.authenticateResponse(dto);

    assertEquals("jwt-token", result.getToken());
    assertEquals(3600L, result.getExpiresIn());
    verify(jwtService).generateToken(user);
  }

  @Test
  void authenticateThrowsWhenUserCannotBeFoundAfterAuth() {
    LoginUserDto dto = new LoginUserDto().setEmail("john@example.com").setPassword("pwd");
    when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());

    UsernameNotFoundException exception =
        assertThrows(UsernameNotFoundException.class, () -> service.authenticate(dto));

    assertEquals("Invalid credentials", exception.getMessage());
  }

  @Test
  void updateAuthenticatedUserChangesProfileAndEncodesPassword() {
    User currentUser = new User()
        .setId(1)
        .setName("Old name")
        .setEmail("old@example.com")
        .setPassword("old-hash");
    UpdateUserDto input = new UpdateUserDto()
        .setName("New name")
        .setEmail("new@example.com")
        .setPassword("new-password");
    UpdatedUserResponse response = new UpdatedUserResponse();
    response.setId(1);
    response.setName("New name");
    response.setEmail("new@example.com");

    when(currentUserService.getCurrentUser()).thenReturn(currentUser);
    when(passwordEncoder.encode("new-password")).thenReturn("new-hash");
    when(userRepository.saveAndFlush(currentUser)).thenReturn(currentUser);
    when(jwtService.generateToken(currentUser)).thenReturn("new-token");
    when(jwtService.getExpirationTime()).thenReturn(3600L);
    when(userMapper.toUpdatedResponse(currentUser, "new-token", 3600L)).thenReturn(response);

    UpdatedUserResponse result = service.updateAuthenticatedUser(input);

    assertEquals(response, result);
    assertEquals("New name", currentUser.getName());
    assertEquals("new@example.com", currentUser.getEmail());
    assertEquals("new-hash", currentUser.getPassword());
    verify(userRepository).saveAndFlush(currentUser);
  }

  @Test
  void updateAuthenticatedUserKeepsPasswordWhenInputIsBlank() {
    User currentUser = new User().setName("Old name").setEmail("old@example.com").setPassword("old-hash");
    UpdateUserDto input = new UpdateUserDto().setName("New name").setEmail("old@example.com").setPassword(" ");
    when(currentUserService.getCurrentUser()).thenReturn(currentUser);
    when(userRepository.saveAndFlush(currentUser)).thenReturn(currentUser);
    when(jwtService.generateToken(currentUser)).thenReturn("token");
    when(jwtService.getExpirationTime()).thenReturn(3600L);
    when(userMapper.toUpdatedResponse(currentUser, "token", 3600L))
      .thenReturn(new UpdatedUserResponse());

    service.updateAuthenticatedUser(input);

    assertEquals("old-hash", currentUser.getPassword());
    verify(passwordEncoder, org.mockito.Mockito.never()).encode(org.mockito.ArgumentMatchers.anyString());
  }

  @Test
  void updateAuthenticatedUserRejectsAnEmailUsedByAnotherUser() {
    User currentUser = new User().setEmail("old@example.com");
    UpdateUserDto input = new UpdateUserDto().setName("Name").setEmail("taken@example.com");
    when(currentUserService.getCurrentUser()).thenReturn(currentUser);
    when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

    ApiException exception = assertThrows(
      ApiException.class, () -> service.updateAuthenticatedUser(input));

    assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    assertEquals("A user with this email already exists", exception.getMessage());
    verify(userRepository, org.mockito.Mockito.never()).save(any(User.class));
  }

  @Test
  void updateAuthenticatedUserConvertsConcurrentDuplicateEmailToBadRequest() {
    User currentUser = new User().setEmail("old@example.com");
    UpdateUserDto input = new UpdateUserDto().setName("Name").setEmail("taken@example.com");
    when(currentUserService.getCurrentUser()).thenReturn(currentUser);
    when(userRepository.existsByEmail("taken@example.com")).thenReturn(false);
    when(userRepository.saveAndFlush(currentUser))
        .thenThrow(new DataIntegrityViolationException("duplicate email"));

    ApiException exception = assertThrows(
        ApiException.class, () -> service.updateAuthenticatedUser(input));

    assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    assertEquals("A user with this email already exists", exception.getMessage());
  }
}

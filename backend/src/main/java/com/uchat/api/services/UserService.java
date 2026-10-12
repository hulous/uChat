package com.uchat.api.services;

import com.uchat.api.entities.User;
import com.uchat.api.dtos.InviteRoomMemberDto;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.mappers.UserMapper;
import com.uchat.api.repositories.UserRepository;
import com.uchat.api.responses.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class UserService {
  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final CurrentUserService currentUserService;

  public UserService(UserRepository userRepository, UserMapper userMapper, CurrentUserService currentUserService) {
    this.userRepository = userRepository;
    this.userMapper = userMapper;
    this.currentUserService = currentUserService;
  }

  public UserResponse show(Integer id) {
    User user = userRepository.findById(id).orElse(null);
    if (user == null) {
      throw new ApiException(HttpStatus.NOT_FOUND, "User not found");
    }

    return userMapper.toResponse(user);
  }

  @Transactional(readOnly = true)
  public List<UserResponse> contacts() {
    return currentUser().getContacts().stream().map(userMapper::toResponse).toList();
  }

  @Transactional
  public void addContact(Integer contactId) {
    User current = currentUser();
    if (current.getId().equals(contactId)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot add yourself as a contact");
    }
    User contact = userRepository.findById(contactId)
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    current.getContacts().add(contact);
    userRepository.save(current);
  }

  @Transactional
  public void addContact(InviteRoomMemberDto input) {
    User contact = userRepository.findByEmail(input.email())
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    addContact(contact.getId());
  }

  @Transactional
  public void removeContact(Integer contactId) {
    User current = currentUser();
    current.getContacts().removeIf(contact -> contact.getId().equals(contactId));
    userRepository.save(current);
  }

  private User currentUser() {
    return currentUserService.getCurrentUser();
  }
}

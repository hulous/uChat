package com.uchat.api.repositories;

import com.uchat.api.entities.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
  Optional<User> findByEmail(String email);

  @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "contacts")
  Optional<User> findWithContactsByEmail(String email);

  boolean existsByEmail(String email);
}

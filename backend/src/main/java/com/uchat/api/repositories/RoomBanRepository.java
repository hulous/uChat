package com.uchat.api.repositories;

import com.uchat.api.entities.RoomBan;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomBanRepository extends JpaRepository<RoomBan, UUID> {
  Optional<RoomBan> findByRoom_IdAndUser_Id(UUID roomId, Integer userId);

  boolean existsByRoom_IdAndUser_IdAndBannedUntilAfter(UUID roomId, Integer userId, Instant now);

  void deleteByRoom_Id(UUID roomId);
}

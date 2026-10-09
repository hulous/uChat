package com.uchat.api.repositories;

import com.uchat.api.entities.ChatRoom;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, UUID> {
  List<ChatRoom> findByMembers_IdOrderByCreatedAtAsc(Integer userId);

  List<ChatRoom> findByIsPublicTrueOrderByCreatedAtAsc();
}

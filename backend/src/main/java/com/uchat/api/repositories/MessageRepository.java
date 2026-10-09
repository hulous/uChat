package com.uchat.api.repositories;

import com.uchat.api.entities.Message;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
  List<Message> findByConversationIdOrderBySentAtAsc(String conversationId);

  Page<Message> findByRoom_IdOrderBySentAtAsc(UUID roomId, Pageable pageable);

  void deleteByRoom_Id(UUID roomId);

  List<Message> findBySenderIdOrderBySentAtAsc(Integer senderId);

  List<Message> findByConversationIdAndSenderIdOrderBySentAtAsc(String conversationId, Integer senderId);
}

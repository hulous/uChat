package com.uchat.api.repositories;

import com.uchat.api.entities.Message;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
  Page<Message> findByConversationIdOrderBySentAtDescIdDesc(String conversationId, Pageable pageable);

  Page<Message> findByRoom_IdOrderBySentAtDescIdDesc(UUID roomId, Pageable pageable);

  void deleteByRoom_Id(UUID roomId);

  java.util.List<Message> findBySenderIdOrderBySentAtAsc(Integer senderId);

  java.util.List<Message> findByConversationIdAndSenderIdOrderBySentAtAsc(String conversationId, Integer senderId);
}

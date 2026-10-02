package com.uchat.api.mappers;

import com.uchat.api.dtos.ChatRoomDto;
import com.uchat.api.entities.ChatRoom;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ChatRoomMapper {
  ChatRoomDto toDto(ChatRoom room);
}

package com.uchat.api.mappers;

import com.uchat.api.dtos.ChatRoomDto;
import com.uchat.api.entities.ChatRoom;
import org.mapstruct.Mapping;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ChatRoomMapper {
  @Mapping(target = "ownerEmail", source = "owner.email")
  @Mapping(target = "isPublic", expression = "java(room.isPublic())")
  ChatRoomDto toDto(ChatRoom room);
}

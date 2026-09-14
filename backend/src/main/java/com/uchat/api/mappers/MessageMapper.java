package com.uchat.api.mappers;

import com.uchat.api.dtos.MessageDto;
import com.uchat.api.entities.Message;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MessageMapper {

  @Mapping(source = "sender.email", target = "senderEmail")
  @Mapping(source = "sender.name", target = "senderName")
  MessageDto toDto(Message message);
}

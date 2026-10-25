package com.uchat.api.controllers;

import com.uchat.api.dtos.MessageDto;
import com.uchat.api.exceptions.ApiException;
import com.uchat.api.responses.ApiMessageResponse;
import com.uchat.api.services.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.security.Principal;
import java.util.UUID;
import com.uchat.api.responses.PagedResponse;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.HttpStatus;
import com.uchat.api.services.ChatRoomService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/conversations")
@Tag(name = "Conversations", description = "Conversation history endpoints")
public class ConversationsController {
  private static final int DEFAULT_PAGE_SIZE = 30;
  private static final int MAX_PAGE_SIZE = 100;

  private final ChatService chatService;
  private final ChatRoomService chatRoomService;

  public ConversationsController(ChatService chatService, ChatRoomService chatRoomService) {
    this.chatService = chatService;
    this.chatRoomService = chatRoomService;
  }

  @GetMapping("/{conversationId}/messages")
  @Operation(
    summary = "Get conversation message history",
    security = {@SecurityRequirement(name = "bearerAuth")})
  @ApiResponses(
    value = {
      @ApiResponse(
        responseCode = "200",
        description = "Conversation messages returned",
        content = @Content(schema = @Schema(implementation = com.uchat.api.responses.PagedResponse.class))),
      @ApiResponse(
        responseCode = "401",
        description = "Unauthorized request",
        content = @Content(schema = @Schema(implementation = ApiMessageResponse.class))),
      @ApiResponse(
        responseCode = "500",
        description = "Server error",
        content = @Content(schema = @Schema(implementation = ApiMessageResponse.class)))
      })
  public PagedResponse<MessageDto> getHistory(
    @Parameter(description = "Conversation identifier", required = true)
    @PathVariable String conversationId,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "30") int size,
    Principal principal
  ) {
    validatePage(page, size);
    return chatService.getConversationHistory(conversationId, false, page, size);
  }

  @GetMapping("/rooms/{roomId}/messages")
  @Operation(
    summary = "Get room message history",
    security = {@SecurityRequirement(name = "bearerAuth")})
  @ApiResponse(responseCode = "200", description = "Room messages returned",
  content = @Content(schema = @Schema(implementation = com.uchat.api.responses.PagedResponse.class)))
  public PagedResponse<MessageDto> getRoomHistory(
    @PathVariable UUID roomId,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "30") int size,
    Principal principal
  ) {
    if (!chatRoomService.hasAccess(principal.getName(), roomId)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "User is not a member of this chat room");
    }

    validatePage(page, size);
    return chatService.getConversationHistory(roomId.toString(), true, page, size);
  }

  private void validatePage(int page, int size) {
    if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
      throw new ApiException(HttpStatus.BAD_REQUEST,
        "page must be non-negative and size must be between 1 and " + MAX_PAGE_SIZE);
    }
  }
}
